import { createServerClient } from "@/lib/supabase/server";
import { getWeekStart } from "@health-app/utils";
import { TrendingUp, Utensils, Dumbbell, Target } from "lucide-react";

interface ReviewPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { week } = await searchParams;
  const weekStart = week ?? getWeekStart(new Date());
  const weekEnd = getWeekEnd(weekStart);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: logs }, { data: slots }, { data: workouts }] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("logged_at", weekStart + "T00:00:00")
      .lte("logged_at", weekEnd + "T23:59:59"),
    supabase
      .from("meal_plan_slots")
      .select("*")
      .eq("user_id", user!.id)
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("workout_schedule")
      .select("*, workout:workouts(name, type, calories_burned)")
      .eq("user_id", user!.id)
      .gte("date", weekStart)
      .lte("date", weekEnd),
  ]);

  const totalCalories = (logs ?? []).reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
  const totalProtein = (logs ?? []).reduce((s: number, l: any) => s + (l.protein_g ?? 0), 0);
  const totalCarbs = (logs ?? []).reduce((s: number, l: any) => s + (l.carbs_g ?? 0), 0);
  const totalFat = (logs ?? []).reduce((s: number, l: any) => s + (l.fat_g ?? 0), 0);
  const avgCalories = logs && logs.length > 0 ? Math.round(totalCalories / 7) : 0;
  const completedWorkouts = (workouts ?? []).filter((w: any) => w.status === "completed").length;
  const plannedMeals = slots?.length ?? 0;
  const loggedMeals = logs?.length ?? 0;

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dailyCalories = DAYS.map((_, i) => {
    const date = addDays(weekStart, i);
    const dayLogs = (logs ?? []).filter((l: any) => l.logged_at?.startsWith(date));
    return dayLogs.reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
  });
  const maxCalories = Math.max(...dailyCalories, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            {" – "}
            {new Date(weekEnd + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a href={`/review?week=${prevWeek(weekStart)}`} className="border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">← Prev</a>
          <a href={`/review?week=${nextWeek(weekStart)}`} className="border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">Next →</a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<Utensils className="h-4 w-4 text-orange-500" />} label="Avg daily calories" value={`${avgCalories}`} unit="kcal" bg="bg-orange-50 border-orange-200" />
        <SummaryCard icon={<Target className="h-4 w-4 text-blue-500" />} label="Total protein" value={`${Math.round(totalProtein)}`} unit="g" bg="bg-blue-50 border-blue-200" />
        <SummaryCard icon={<Dumbbell className="h-4 w-4 text-purple-500" />} label="Workouts done" value={`${completedWorkouts}`} unit={`/ ${workouts?.length ?? 0}`} bg="bg-purple-50 border-purple-200" />
        <SummaryCard icon={<TrendingUp className="h-4 w-4 text-green-500" />} label="Meals logged" value={`${loggedMeals}`} unit={`/ ${plannedMeals} planned`} bg="bg-green-50 border-green-200" />
      </div>

      {/* Daily calorie bar chart */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-semibold mb-5">Calories by day</h2>
        <div className="flex items-end gap-2 h-32">
          {DAYS.map((day, i) => {
            const cal = dailyCalories[i] ?? 0;
            const pct = maxCalories > 0 ? (cal / maxCalories) * 100 : 0;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{cal > 0 ? cal : ""}</span>
                <div className="w-full rounded-t-md bg-primary/15 relative" style={{ height: "80px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-primary transition-all"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Macros breakdown */}
      {loggedMeals > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Weekly macros total</h2>
          <div className="grid grid-cols-3 gap-4">
            <MacroBar label="Protein" value={Math.round(totalProtein)} unit="g" color="bg-blue-400" />
            <MacroBar label="Carbs" value={Math.round(totalCarbs)} unit="g" color="bg-yellow-400" />
            <MacroBar label="Fat" value={Math.round(totalFat)} unit="g" color="bg-red-400" />
          </div>
        </div>
      )}

      {loggedMeals === 0 && (
        <div className="bg-card border border-dashed rounded-xl p-12 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-sm">No data for this week</p>
          <p className="text-xs text-muted-foreground mt-1">Log meals in the planner to see your weekly review</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, unit, bg }: { icon: React.ReactNode; label: string; value: string; unit: string; bg: string }) {
  return (
    <div className={`border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-muted-foreground">{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{unit}</div>
    </div>
  );
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min((value / 500) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

function getWeekEnd(weekStart: string) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0]!;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

function prevWeek(weekStart: string) {
  return addDays(weekStart, -7);
}

function nextWeek(weekStart: string) {
  return addDays(weekStart, 7);
}
