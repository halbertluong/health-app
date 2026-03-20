import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import { AiFoodLogRequestSchema } from "@health-app/validators";

const anthropic = new Anthropic();

const FOOD_ANALYSIS_PROMPT = `You are a nutrition expert analyzing a food photo.
Identify all visible food items and estimate:
1. What each food item is
2. The approximate portion/quantity
3. Macronutrient estimates (calories, protein, carbs, fat)

Respond with ONLY valid JSON in this exact format:
{
  "foods": [
    {
      "food_name": "string",
      "quantity": number,
      "unit": "string (e.g., 'g', 'oz', 'cup', 'piece', 'slice')",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": number (0-1, your confidence in this identification)
    }
  ],
  "overall_confidence": number (0-1),
  "notes": "any relevant notes about the meal or difficulty identifying items"
}

Be conservative with estimates. If you cannot identify something clearly, include it with low confidence.`;

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = AiFoodLogRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { image_url } = parsed.data;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: image_url,
              } as any,
            },
            {
              type: "text",
              text: FOOD_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch?.[0]) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      foods: result.foods ?? [],
      confidence_score: result.overall_confidence ?? 0.5,
      notes: result.notes ?? "",
      raw_response: rawText,
    });
  } catch (err) {
    console.error("AI food log error:", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
