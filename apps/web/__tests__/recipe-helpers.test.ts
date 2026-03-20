import { describe, it, expect } from "vitest";
import { parseIngredientLine, joinInstructions } from "../lib/recipe-helpers";

describe("parseIngredientLine", () => {
  it("parses a standard quantity + unit + name", () => {
    const result = parseIngredientLine("2 cups all-purpose flour", 0);
    expect(result.quantity).toBe(2);
    expect(result.unit).toMatch(/cup/i);
    expect(result.ingredient_name).toBe("all-purpose flour");
    expect(result.sort_order).toBe(0);
    expect(result.grocery_category).toBe("other");
  });

  it("parses tablespoon abbreviation", () => {
    const result = parseIngredientLine("1 tbsp olive oil", 1);
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe("tbsp");
    expect(result.ingredient_name).toBe("olive oil");
  });

  it("parses teaspoon abbreviation", () => {
    const result = parseIngredientLine("1/2 tsp salt", 0);
    expect(result.quantity).toBeCloseTo(0.5, 2);
    expect(result.unit).toBe("tsp");
    expect(result.ingredient_name).toBe("salt");
  });

  it("parses fractions like 1/4", () => {
    const result = parseIngredientLine("1/4 cup sugar", 0);
    expect(result.quantity).toBeCloseTo(0.25, 2);
  });

  it("parses decimal quantities", () => {
    const result = parseIngredientLine("1.5 pounds chicken breast", 0);
    expect(result.quantity).toBe(1.5);
    expect(result.unit).toMatch(/pound/i);
    expect(result.ingredient_name).toBe("chicken breast");
  });

  it("handles ingredient with no quantity or unit", () => {
    const result = parseIngredientLine("salt and pepper to taste", 0);
    expect(result.ingredient_name.length).toBeGreaterThan(0);
    expect(result.quantity).toBeGreaterThan(0);
  });

  it("handles unicode fractions", () => {
    const result = parseIngredientLine("½ cup milk", 0);
    expect(result.quantity).toBeCloseTo(0.5, 2);
    expect(result.unit).toMatch(/cup/i);
    expect(result.ingredient_name).toBe("milk");
  });

  it("preserves sort_order", () => {
    const r0 = parseIngredientLine("1 cup water", 0);
    const r3 = parseIngredientLine("1 cup water", 3);
    expect(r0.sort_order).toBe(0);
    expect(r3.sort_order).toBe(3);
  });

  it("parses ounces", () => {
    const result = parseIngredientLine("8 oz cream cheese", 0);
    expect(result.quantity).toBe(8);
    expect(result.unit).toMatch(/oz/i);
    expect(result.ingredient_name).toBe("cream cheese");
  });

  it("parses grams", () => {
    const result = parseIngredientLine("200g dark chocolate", 0);
    expect(result.quantity).toBe(200);
    expect(result.unit).toMatch(/g/i);
  });

  it("handles empty string gracefully", () => {
    const result = parseIngredientLine("  ", 0);
    expect(result.ingredient_name.length).toBeGreaterThanOrEqual(0);
    expect(result.quantity).toBeGreaterThan(0);
  });
});

describe("joinInstructions", () => {
  it("joins steps with newlines", () => {
    const steps = ["Preheat oven to 350°F.", "Mix ingredients.", "Bake for 30 minutes."];
    const result = joinInstructions(steps);
    expect(result).toBe("Preheat oven to 350°F.\nMix ingredients.\nBake for 30 minutes.");
  });

  it("filters empty strings", () => {
    const result = joinInstructions(["Step 1", "", "Step 2", "  "]);
    expect(result).toBe("Step 1\nStep 2");
  });

  it("returns empty string for empty array", () => {
    expect(joinInstructions([])).toBe("");
  });

  it("round-trips via split", () => {
    const steps = ["Step A", "Step B", "Step C"];
    const joined = joinInstructions(steps);
    const split = joined.split("\n").filter(Boolean);
    expect(split).toEqual(steps);
  });
});
