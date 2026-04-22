import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

const ANALYSIS_PROMPT = `You are a nutrition expert analyzing a meal.
Identify every food item and estimate macronutrients accurately.

Respond with ONLY valid JSON in this exact format:
{
  "foods": [
    {
      "food_name": "string",
      "quantity": number,
      "unit": "string (e.g. 'g', 'oz', 'cup', 'piece', 'slice', 'tbsp')",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "suggestion": "string — one concrete lower-calorie or higher-protein swap or tip relevant to this specific meal (e.g. 'Swap the white rice for cauliflower rice to save ~120 kcal while keeping the meal filling'). If the meal is already very healthy, say so briefly.",
  "confidence_score": number (0-1)
}

Be conservative and accurate. Use the text description as the primary source of truth; use the image (if provided) to confirm portions and spot items not mentioned.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { description?: string; image_base64?: string; meal_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { description = "", image_base64 } = body;

  if (!description.trim() && !image_base64) {
    return NextResponse.json({ error: "Provide a description or image" }, { status: 400 });
  }

  const userContent: Anthropic.MessageParam["content"] = [];

  if (image_base64) {
    // Strip data URL prefix if present
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const mediaType = image_base64.startsWith("data:image/png") ? "image/png"
      : image_base64.startsWith("data:image/webp") ? "image/webp"
      : image_base64.startsWith("data:image/gif") ? "image/gif"
      : "image/jpeg";

    userContent.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64Data },
    });
  }

  userContent.push({
    type: "text",
    text: description.trim()
      ? `${ANALYSIS_PROMPT}\n\nMeal description from user: "${description.trim()}"`
      : ANALYSIS_PROMPT,
  });

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      const apiErr = err as { status: number; message?: string; error?: { message?: string } };
      const msg = apiErr.error?.message ?? apiErr.message ?? "Anthropic API error";
      return NextResponse.json({ error: msg }, { status: apiErr.status as number });
    }
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
  }

  const jsonMatch = firstBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      foods: result.foods ?? [],
      suggestion: result.suggestion ?? "",
      confidence_score: result.confidence_score ?? 0.8,
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
