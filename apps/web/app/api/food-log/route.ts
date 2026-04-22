import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date param required" }, { status: 400 });

  const { data, error } = await supabase
    .from("meal_logs")
    .select("*, meal_log_items(*)")
    .eq("user_id", user.id)
    .gte("logged_at", `${date}T00:00:00`)
    .lte("logged_at", `${date}T23:59:59`)
    .order("logged_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    meal_type?: string;
    logged_at?: string;
    source_type?: string;
    notes?: string;
    confidence_score?: number;
    items: Array<{
      food_name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { meal_type, logged_at, source_type = "manual", notes, confidence_score, items = [] } = body;

  const total_calories = items.reduce((s, i) => s + (i.calories ?? 0), 0);
  const total_protein_g = items.reduce((s, i) => s + (i.protein_g ?? 0), 0);
  const total_carbs_g = items.reduce((s, i) => s + (i.carbs_g ?? 0), 0);
  const total_fat_g = items.reduce((s, i) => s + (i.fat_g ?? 0), 0);

  const { data: log, error: logError } = await supabase
    .from("meal_logs")
    .insert({
      user_id: user.id,
      meal_type: meal_type ?? null,
      logged_at: logged_at ?? new Date().toISOString(),
      source_type,
      notes: notes ?? null,
      confidence_score: confidence_score ?? null,
      total_calories: Math.round(total_calories * 10) / 10,
      total_protein_g: Math.round(total_protein_g * 10) / 10,
      total_carbs_g: Math.round(total_carbs_g * 10) / 10,
      total_fat_g: Math.round(total_fat_g * 10) / 10,
    })
    .select()
    .single();

  if (logError || !log) {
    return NextResponse.json({ error: logError?.message ?? "Failed to save log" }, { status: 500 });
  }

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("meal_log_items").insert(
      items.map((item) => ({
        meal_log_id: log.id,
        food_name: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      }))
    );
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  const { data: full } = await supabase
    .from("meal_logs")
    .select("*, meal_log_items(*)")
    .eq("id", log.id)
    .single();

  return NextResponse.json({ log: full }, { status: 201 });
}
