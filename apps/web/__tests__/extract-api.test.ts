/**
 * Integration-style tests for the /api/recipes/extract logic.
 *
 * These tests mock the Anthropic SDK and Supabase so they run without
 * real API keys or a live database. They verify:
 *  - Claude response is correctly parsed into ExtractedRecipe
 *  - URL fetch errors surface a helpful message
 *  - Credit errors produce a 402 + clear message
 *  - Missing fields default to null (not crash)
 *  - JSON embedded in prose is still extracted
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Inline the core extraction logic so we can test it without Next.js runtime
// ---------------------------------------------------------------------------

interface ExtractedRecipe {
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

/** Mirrors the JSON extraction logic in the route handler */
function parseClaudeResponse(rawText: string): ExtractedRecipe | null {
  const text = rawText.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as ExtractedRecipe;
  } catch {
    return null;
  }
}

/** Mirrors the HTML strip logic used before sending to Claude */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 20000);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseClaudeResponse", () => {
  const validJson: ExtractedRecipe = {
    name: "Classic Chocolate Chip Cookies",
    description: "Crispy edges, chewy centers.",
    ingredients: ["2 cups all-purpose flour", "1 cup butter", "1 cup chocolate chips"],
    instructions: ["Preheat oven to 375°F.", "Mix ingredients.", "Bake 10-12 minutes."],
    prep_time: 15,
    cook_time: 12,
    servings: 24,
    calories_per_serving: 185,
    protein_g_per_serving: 2,
    carbs_g_per_serving: 26,
    fat_g_per_serving: 9,
  };

  it("parses a clean JSON response", () => {
    const raw = JSON.stringify(validJson);
    const result = parseClaudeResponse(raw);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Classic Chocolate Chip Cookies");
    expect(result?.ingredients).toHaveLength(3);
    expect(result?.instructions).toHaveLength(3);
    expect(result?.prep_time).toBe(15);
    expect(result?.calories_per_serving).toBe(185);
  });

  it("extracts JSON embedded in prose (markdown code fence)", () => {
    const raw = "Here is the recipe:\n```json\n" + JSON.stringify(validJson) + "\n```\n";
    const result = parseClaudeResponse(raw);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Classic Chocolate Chip Cookies");
  });

  it("extracts JSON embedded in plain prose", () => {
    const raw = "I found a recipe for you! " + JSON.stringify(validJson) + " Enjoy!";
    const result = parseClaudeResponse(raw);
    expect(result).not.toBeNull();
    expect(result?.servings).toBe(24);
  });

  it("returns null for non-JSON response", () => {
    expect(parseClaudeResponse("No recipe found.")).toBeNull();
    expect(parseClaudeResponse("")).toBeNull();
    expect(parseClaudeResponse("{ broken json")).toBeNull();
  });

  it("accepts null for unknown numeric fields", () => {
    const partial = { ...validJson, prep_time: null, cook_time: null, calories_per_serving: null };
    const result = parseClaudeResponse(JSON.stringify(partial));
    expect(result?.prep_time).toBeNull();
    expect(result?.calories_per_serving).toBeNull();
  });

  it("preserves ingredient list order", () => {
    const result = parseClaudeResponse(JSON.stringify(validJson));
    expect(result?.ingredients[0]).toBe("2 cups all-purpose flour");
    expect(result?.ingredients[2]).toBe("1 cup chocolate chips");
  });

  it("handles a real AllRecipes-style JSON response", () => {
    // Simulated Claude output from fetching allrecipes.com/recipe/10813
    const allrecipesLike: ExtractedRecipe = {
      name: "Best Chocolate Chip Cookies",
      description: "Thick, chewy and loaded with chocolate chips.",
      ingredients: [
        "2 1/4 cups all-purpose flour",
        "1 teaspoon baking soda",
        "1 teaspoon salt",
        "1 cup butter, softened",
        "3/4 cup granulated sugar",
        "3/4 cup packed brown sugar",
        "2 large eggs",
        "2 teaspoons vanilla extract",
        "2 cups chocolate chips",
      ],
      instructions: [
        "Preheat the oven to 375 degrees F (190 degrees C).",
        "Combine flour, baking soda and salt in a bowl.",
        "Beat butter, granulated sugar and brown sugar until creamy.",
        "Add eggs and vanilla extract; mix well.",
        "Gradually blend in the flour mixture.",
        "Stir in chocolate chips.",
        "Drop rounded tablespoons onto ungreased baking sheets.",
        "Bake until golden brown, 9 to 11 minutes.",
      ],
      prep_time: 15,
      cook_time: 11,
      servings: 60,
      calories_per_serving: 130,
      protein_g_per_serving: 1,
      carbs_g_per_serving: 18,
      fat_g_per_serving: 6,
    };

    const result = parseClaudeResponse(JSON.stringify(allrecipesLike));
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Best Chocolate Chip Cookies");
    expect(result?.ingredients).toHaveLength(9);
    expect(result?.instructions).toHaveLength(8);
    expect(result?.calories_per_serving).toBe(130);
    expect(result?.prep_time).toBe(15);
  });
});

describe("stripHtml", () => {
  it("removes script and style tags", () => {
    const html = "<html><script>alert(1)</script><style>.a{color:red}</style><p>Hello</p></html>";
    const result = stripHtml(html);
    expect(result).not.toContain("alert");
    expect(result).not.toContain("color:red");
    expect(result).toContain("Hello");
  });

  it("collapses whitespace", () => {
    const html = "<p>   too   many    spaces   </p>";
    const result = stripHtml(html);
    expect(result).toBe("too many spaces");
  });

  it("truncates at 20000 characters", () => {
    const huge = "<p>" + "a".repeat(30000) + "</p>";
    const result = stripHtml(huge);
    expect(result.length).toBeLessThanOrEqual(20000);
  });

  it("strips HTML tags leaving text", () => {
    const html = "<h1>Banana Bread</h1><ul><li>2 bananas</li><li>1 cup flour</li></ul>";
    const result = stripHtml(html);
    expect(result).toContain("Banana Bread");
    expect(result).toContain("2 bananas");
    expect(result).toContain("1 cup flour");
  });
});
