import { createServerClient } from "@/lib/supabase/server";
import { WeeklyPlanner } from "@/components/planner/weekly-planner";
import { getWeekStart } from "@health-app/utils";

interface PlannerPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const { week } = await searchParams;
  const weekStart = week ?? getWeekStart(new Date());

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch meal plan slots for the week
  const { data: slots } = await supabase
    .from("meal_plan_slots")
    .select(`
      *,
      recipe:recipes(
        id, name, image_url, servings,
        calories_per_serving, protein_g_per_serving,
        carbs_g_per_serving, fat_g_per_serving
      )
    `)
    .eq("user_id", user!.id)
    .gte("date", weekStart)
    .lte("date", getWeekEnd(weekStart));

  // Fetch workout schedule for the week
  const { data: workoutSchedule } = await supabase
    .from("workout_schedule")
    .select("*, workout:workouts(id, name, type)")
    .eq("user_id", user!.id)
    .gte("date", weekStart)
    .lte("date", getWeekEnd(weekStart));

  return (
    <div className="space-y-6">
      <WeeklyPlanner
        weekStart={weekStart}
        initialSlots={slots ?? []}
        initialWorkouts={workoutSchedule ?? []}
        userId={user!.id}
      />
    </div>
  );
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0]!;
}
