import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Extract a complete recipe from the provided content (website, image, PDF, or text).

Return ONLY a valid JSON object — no markdown, no code fences, no explanation:
{
  "name": "Recipe name",
  "description": "1-2 sentence description",
  "ingredients": ["quantity + ingredient, e.g. 2 cups all-purpose flour"],
  "instructions": ["Step 1: ...", "Step 2: ..."],
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "calories_per_serving": 400,
  "protein_g_per_serving": 30,
  "carbs_g_per_serving": 40,
  "fat_g_per_serving": 15
}

Use null for numeric fields you cannot determine. If multiple recipes are present, extract the most prominent one.`;

export interface ExtractedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  protein_g_per_serving: number | null;
  carbs_g_per_serving: number | null;
  fat_g_per_serving: number | null;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    type: "url" | "image" | "pdf" | "text";
    url?: string;
    base64?: string;
    mediaType?: string;
    text?: string;
  };

  let messageContent: Anthropic.MessageParam["content"];

  if (body.type === "url") {
    if (!body.url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let pageContent = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(body.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,*/*",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: controller.signal,
          redirect: "follow",
        });
        const html = await res.text();
        // Strip scripts/styles, collapse whitespace
        pageContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim()
          .slice(0, 20000);
      } finally {
        clearTimeout(timeout);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Request timed out. The site took too long to respond."
        : "Could not fetch that URL. The site may block automated requests — try pasting the recipe text directly instead.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    messageContent = [
      {
        type: "text",
        text: `Extract a recipe from this webpage.\n\nURL: ${body.url}\n\nPage text:\n${pageContent}`,
      },
    ];
  } else if (body.type === "image") {
    if (!body.base64 || !body.mediaType) {
      return NextResponse.json({ error: "Image data required" }, { status: 400 });
    }
    messageContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: body.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: body.base64,
        },
      },
      { type: "text", text: "Extract the recipe from this image." },
    ];
  } else if (body.type === "pdf") {
    if (!body.base64) return NextResponse.json({ error: "PDF data required" }, { status: 400 });
    messageContent = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: body.base64 },
      } as any,
      { type: "text", text: "Extract the recipe from this document." },
    ];
  } else if (body.type === "text") {
    if (!body.text) return NextResponse.json({ error: "Text required" }, { status: 400 });
    messageContent = [{ type: "text", text: `Extract a recipe from this text:\n\n${body.text}` }];
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: messageContent }],
    });

    const raw = (message.content[0] as Anthropic.TextBlock).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not extract a recipe from that content." }, { status: 422 });
    }

    let recipe: ExtractedRecipe;
    try {
      recipe = JSON.parse(jsonMatch[0]) as ExtractedRecipe;
    } catch {
      return NextResponse.json({ error: "Failed to parse extracted recipe." }, { status: 500 });
    }

    return NextResponse.json({ recipe });
  } catch (err: unknown) {
    // Surface the actual Anthropic API error (e.g. credit balance, invalid key, rate limit)
    if (err && typeof err === "object" && "status" in err) {
      const apiErr = err as { status: number; message?: string; error?: { message?: string } };
      const msg = apiErr.error?.message ?? apiErr.message ?? "Anthropic API error";
      if (apiErr.status === 400 && msg.includes("credit")) {
        return NextResponse.json(
          { error: "The AI service is out of credits. Please add credits at console.anthropic.com → Plans & Billing." },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: msg }, { status: apiErr.status });
    }
    const msg = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
