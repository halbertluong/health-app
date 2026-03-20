"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, X, CheckCircle } from "lucide-react";
import { getWeekStart } from "@health-app/utils";

const GOALS = ["general fitness", "weight loss", "muscle gain", "endurance", "flexibility", "stress relief"];

export function WorkoutPlanButton({ workouts, userId }: { workouts: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ plan: any[]; scheduled: number } | null>(null);
  const router = useRouter();

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/workout-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workouts,
        goal: form.get("goal"),
        daysPerWeek: Number(form.get("days")),
        weekStart: getWeekStart(new Date()),
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      setResult(data);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-primary/30 text-primary rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        <Zap className="h-4 w-4" />
        <span className="hidden sm:inline">AI Plan</span>
        <span className="sm:hidden">Plan</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); setResult(null); }} />

          <div
            className="relative z-10 bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">Generate workout plan</h2>
              </div>
              <button onClick={() => { setOpen(false); setResult(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {result ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <CheckCircle className="h-6 w-6" />
                  <div>
                    <p className="font-semibold">Plan created!</p>
                    <p className="text-sm text-muted-foreground">{result.scheduled} workouts scheduled for this week</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {result.plan.map((item: any, i: number) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground shrink-0 w-24">
                        {new Date(item.day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <div>
                        <span className="font-medium">{item.workout_name}</span>
                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setOpen(false); setResult(null); }}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Claude will build a personalised week using your workout library.
                </p>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Goal</label>
                  <select
                    name="goal"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {GOALS.map(g => (
                      <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Days per week</label>
                  <select
                    name="days"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {[2, 3, 4, 5, 6].map(d => (
                      <option key={d} value={d}>{d} days</option>
                    ))}
                  </select>
                </div>

                {workouts.length === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    You have no workouts yet — Claude will suggest a plan based on your goal.
                  </p>
                )}

                {error && <p className="text-destructive text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Generating…
                    </span>
                  ) : "Generate plan"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
