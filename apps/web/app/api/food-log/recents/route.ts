import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get last 60 days of log items and count frequency by food_name
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data, error } = await supabase
    .from("meal_log_items")
    .select("food_name, calories, protein_g, carbs_g, fat_g, quantity, unit, meal_log_id, meal_logs!inner(user_id, logged_at)")
    .eq("meal_logs.user_id", user.id)
    .gte("meal_logs.logged_at", since.toISOString())
    .order("food_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by food_name, keep most recent macro values
  const map = new Map<string, { food_name: string; count: number; calories: number; protein_g: number; carbs_g: number; fat_g: number; quantity: number; unit: string }>();
  for (const item of (data ?? [])) {
    const key = item.food_name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, {
        food_name: item.food_name,
        count: 1,
        calories: item.calories ?? 0,
        protein_g: item.protein_g ?? 0,
        carbs_g: item.carbs_g ?? 0,
        fat_g: item.fat_g ?? 0,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }

  const sorted = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json({ recents: sorted });
}
