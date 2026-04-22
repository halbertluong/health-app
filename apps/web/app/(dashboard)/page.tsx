import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toDateString, sumActualMacros } from "@health-app/utils";
import Link from "next/link";
import { UtensilsCrossed, TrendingUp, CalendarDays, Dumbbell } from "lucide-react";
import { DashboardGreeting } from "./dashboard-greeting";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = toDateString(new Date());

  const [{ data: todayLogs }, { data: todayWorkouts }, { data: target }] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*, meal_log_items(*)")
      .eq("user_id", user.id)
      .gte("logged_at", `${today}T00:00:00`)
      .lte("logged_at", `${today}T23:59:59`),
    supabase
      .from("workout_schedule")
      .select("*, workout:workouts(name, type)")
      .eq("user_id", user.id)
      .eq("date", today),
    supabase
      .from("macro_targets")
      .select("*")
      .eq("user_id", user.id)
      .is("date", null)
      .maybeSingle(),
  ]);

  const actualMacros = sumActualMacros((todayLogs ?? []) as any);
  const targetCal = target?.calories ?? 2000;
  const targetPro = target?.protein_g ?? 150;
  const calPct = targetCal > 0 ? Math.min(Math.round((actualMacros.calories / targetCal) * 100), 100) : 0;
  const proPct = targetPro > 0 ? Math.min(Math.round((actualMacros.protein_g / targetPro) * 100), 100) : 0;

  const name = user.user_metadata?.["name"] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <DashboardGreeting name={name} />
        <p className="text-muted-foreground mt-1">
          {new Date(`${today}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Today's macro snapshot */}
      <div className="bg-card border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Today&apos;s Progress</h2>
          <Link href="/log" className="text-xs text-primary hover:underline">Open diary →</Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ProgressStat
            label="Calories"
            value={Math.round(actualMacros.calories)}
            target={targetCal}
            unit="kcal"
            pct={calPct}
            barColor="bg-orange-400"
          />
          <ProgressStat
            label="Protein"
            value={Math.round(actualMacros.protein_g)}
            target={targetPro}
            unit="g"
            pct={proPct}
            barColor="bg-blue-400"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {todayLogs?.length ?? 0} meal{todayLogs?.length !== 1 ? "s" : ""} logged today
          {todayWorkouts && todayWorkouts.length > 0 && (
            <> · {todayWorkouts.length} workout{todayWorkouts.length !== 1 ? "s" : ""} scheduled</>
          )}
        </div>
      </div>

      {/* Primary CTA */}
      <Link
        href="/log"
        className="flex items-center gap-4 bg-primary text-primary-foreground rounded-xl p-5 hover:bg-primary/90 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">Log a meal</div>
          <div className="text-sm opacity-80">Snap a photo or describe what you ate</div>
        </div>
      </Link>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/analytics", icon: TrendingUp, label: "Analytics", desc: "Macro trends & insights" },
          { href: "/planner", icon: CalendarDays, label: "Meal Planner", desc: "Plan your week" },
          { href: "/workouts", icon: Dumbbell, label: "Workouts", desc: "Log your training" },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-card border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <Icon className="h-5 w-5 text-primary mb-2" />
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProgressStat({
  label, value, target, unit, pct, barColor,
}: {
  label: string; value: number; target: number; unit: string; pct: number; barColor: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value} / {target}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
