import { createServerClient } from "@/lib/supabase/server";
import { toDateString } from "@health-app/utils";
import type { MealLogWithItems } from "@health-app/types";
import { DailyDiary } from "@/components/food-log/daily-diary";
import { CalendarDays } from "lucide-react";

export default async function LogPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = toDateString(new Date());

  const [{ data: logsRaw }, { data: target }] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*, meal_log_items(*)")
      .eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`)
      .lte("logged_at", `${today}T23:59:59`)
      .order("logged_at"),
    supabase
      .from("macro_targets")
      .select("*")
      .eq("user_id", user!.id)
      .is("date", null)
      .maybeSingle(),
  ]);

  const macroTargets = {
    calories: target?.calories ?? 2000,
    protein_g: target?.protein_g ?? 150,
    carbs_g: target?.carbs_g ?? 200,
    fat_g: target?.fat_g ?? 65,
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Food Diary</h1>
          <p className="text-xs text-muted-foreground">{todayLabel}</p>
        </div>
      </div>

      <DailyDiary
        initialLogs={(logsRaw as MealLogWithItems[]) ?? []}
        macroTargets={macroTargets}
        userId={user!.id}
      />
    </div>
  );
}
