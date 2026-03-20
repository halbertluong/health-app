import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { aggregateGroceryItems } from "@health-app/utils";
import { GenerateGroceryListSchema } from "@health-app/validators";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = GenerateGroceryListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { week_start } = parsed.data;

  // Calculate week end (Sunday)
  const weekEnd = (() => {
    const d = new Date(week_start + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  })();

  // Fetch all meal plan slots for the week with recipe ingredients
  const { data: slots, error: slotsError } = await supabase
    .from("meal_plan_slots")
    .select(`
      *,
      recipe:recipes(
        id, name, servings,
        recipe_ingredients(*)
      )
    `)
    .eq("user_id", user.id)
    .gte("date", week_start)
    .lte("date", weekEnd)
    .not("planned_recipe_id", "is", null);

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  // Fetch pantry items to mark have_on_hand
  const { data: pantryItems } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("in_stock", true);

  // Aggregate ingredients
  const aggregated = aggregateGroceryItems(
    (slots ?? []) as any,
    (pantryItems ?? []) as any
  );

  // Upsert grocery list
  const { data: list, error: listError } = await supabase
    .from("grocery_lists")
    .upsert(
      { user_id: user.id, week_start, generated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: "Failed to create grocery list" }, { status: 500 });
  }

  // Delete existing items and re-insert
  await supabase.from("grocery_items").delete().eq("grocery_list_id", list.id);

  if (aggregated.length > 0) {
    const { error: itemsError } = await supabase.from("grocery_items").insert(
      aggregated.map((item, i) => ({
        ...item,
        grocery_list_id: list.id,
        sort_order: i,
      }))
    );

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ list_id: list.id, item_count: aggregated.length });
}
