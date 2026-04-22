import { createServerClient } from "@/lib/supabase/server";
import { toDateString } from "@health-app/utils";
import { AnalyticsDashboard } from "@/components/food-log/analytics-dashboard";
import { TrendingUp } from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch 90 days of meal logs
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data: logs } = await supabase
    .from("meal_logs")
    .select("logged_at, meal_type, total_calories, total_protein_g, total_carbs_g, total_fat_g")
    .eq("user_id", user!.id)
    .gte("logged_at", since.toISOString())
    .order("logged_at");

  // Build day-by-day data for the last 90 days
  const dayMap = new Map<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number; count: number }>();
  for (const log of logs ?? []) {
    const date = log.logged_at.split("T")[0] as string;
    const existing = dayMap.get(date) ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 };
    existing.calories += log.total_calories ?? 0;
    existing.protein_g += log.total_protein_g ?? 0;
    existing.carbs_g += log.total_carbs_g ?? 0;
    existing.fat_g += log.total_fat_g ?? 0;
    existing.count++;
    dayMap.set(date, existing);
  }

  // Build continuous 90-day array
  const dailyData = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const date = toDateString(d);
    const entry = dayMap.get(date);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      date,
      label,
      calories: entry?.calories ?? 0,
      protein_g: entry?.protein_g ?? 0,
      carbs_g: entry?.carbs_g ?? 0,
      fat_g: entry?.fat_g ?? 0,
      log_count: entry?.count ?? 0,
    };
  });

  // Meal type breakdown
  const mealTypeMap = new Map<string, { total_cal: number; total_pro: number; count: number }>();
  for (const log of logs ?? []) {
    if (!log.meal_type) continue;
    const existing = mealTypeMap.get(log.meal_type) ?? { total_cal: 0, total_pro: 0, count: 0 };
    existing.total_cal += log.total_calories ?? 0;
    existing.total_pro += log.total_protein_g ?? 0;
    existing.count++;
    mealTypeMap.set(log.meal_type, existing);
  }

  const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack"];
  const mealTypeBreakdown = mealTypeOrder
    .filter((t) => mealTypeMap.has(t))
    .map((t) => {
      const m = mealTypeMap.get(t)!;
      return {
        meal_type: t,
        avg_calories: m.count > 0 ? m.total_cal / m.count : 0,
        avg_protein_g: m.count > 0 ? m.total_pro / m.count : 0,
        count: m.count,
      };
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-xs text-muted-foreground">Macro trends from your food diary</p>
        </div>
      </div>

      <AnalyticsDashboard dailyData={dailyData} mealTypeBreakdown={mealTypeBreakdown} />
    </div>
  );
}
