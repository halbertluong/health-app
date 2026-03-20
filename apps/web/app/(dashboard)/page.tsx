import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWeekStart, todayString, sumPlannedMacros, sumActualMacros } from "@health-app/utils";
import Link from "next/link";
import { CalendarDays, ChefHat, ShoppingCart, Dumbbell } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayString();
  const weekStart = getWeekStart(new Date());

  // Today's meal plan
  const { data: todaySlots } = await supabase
    .from("meal_plan_slots")
    .select("*, recipe:recipes(name)")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("meal_type");

  // Today's actual logs
  const { data: todayLogs } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", today + "T00:00:00")
    .lte("logged_at", today + "T23:59:59");

  // Today's workouts
  const { data: todayWorkouts } = await supabase
    .from("workout_schedule")
    .select("*, workout:workouts(name, type)")
    .eq("user_id", user.id)
    .eq("date", today);

  const plannedMacros = sumPlannedMacros((todaySlots ?? []) as any);
  const actualMacros = sumActualMacros((todayLogs ?? []) as any);

  const name = user.user_metadata?.["name"] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good morning, {name} 👋</h1>
        <p className="text-muted-foreground mt-1">
          {new Date(today + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Planned calories"
          value={`${Math.round(plannedMacros.calories)} kcal`}
          sub={`${Math.round(plannedMacros.protein_g)}g protein`}
          color="bg-orange-50 border-orange-200"
        />
        <StatCard
          label="Logged calories"
          value={`${Math.round(actualMacros.calories)} kcal`}
          sub={`${Math.round(actualMacros.protein_g)}g protein`}
          color="bg-green-50 border-green-200"
        />
        <StatCard
          label="Meals planned"
          value={String(todaySlots?.length ?? 0)}
          sub={`${todaySlots?.filter((s: any) => s.status !== "planned").length ?? 0} completed`}
          color="bg-blue-50 border-blue-200"
        />
        <StatCard
          label="Workouts today"
          value={String(todayWorkouts?.length ?? 0)}
          sub={`${todayWorkouts?.filter((w: any) => w.status === "completed").length ?? 0} done`}
          color="bg-purple-50 border-purple-200"
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: `/planner?week=${weekStart}`, icon: CalendarDays, label: "Weekly Planner", desc: "Plan your meals" },
          { href: "/recipes", icon: ChefHat, label: "Recipes", desc: "Manage your recipes" },
          { href: `/grocery?week=${weekStart}`, icon: ShoppingCart, label: "Grocery List", desc: "This week's list" },
          { href: "/workouts", icon: Dumbbell, label: "Workouts", desc: "Your workout library" },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <Icon className="h-6 w-6 text-primary mb-3" />
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
          </Link>
        ))}
      </div>

      {/* Today's plan preview */}
      {todaySlots && todaySlots.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Today&apos;s Meal Plan</h2>
          <div className="space-y-2">
            {(todaySlots as any[]).map((slot) => (
              <div key={slot.id} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-xs text-muted-foreground capitalize">{slot.meal_type}</span>
                <span className="font-medium">{slot.recipe?.name ?? "No recipe"}</span>
                {slot.planned_calories && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round(slot.planned_calories)} kcal
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
