"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import type { MealPlanSlotWithRecipe, WorkoutScheduleWithWorkout } from "@health-app/types";
import { getWeekDates, getWeekStart, DAY_LABELS, MEAL_TYPE_LABELS, toDateString, sumPlannedMacros } from "@health-app/utils";
import { MealSlotCell } from "./meal-slot-cell";
import { WorkoutCell } from "./workout-cell";
import { MacroSummaryBar } from "./macro-summary-bar";
import { cn } from "@/lib/utils";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

interface WeeklyPlannerProps {
  weekStart: string;
  initialSlots: MealPlanSlotWithRecipe[];
  initialWorkouts: WorkoutScheduleWithWorkout[];
  userId: string;
}

export function WeeklyPlanner({
  weekStart,
  initialSlots,
  initialWorkouts,
  userId,
}: WeeklyPlannerProps) {
  const router = useRouter();
  const dates = getWeekDates(weekStart);

  const [slots, setSlots] = useState<MealPlanSlotWithRecipe[]>(initialSlots);
  const [workouts, setWorkouts] = useState<WorkoutScheduleWithWorkout[]>(initialWorkouts);

  // Slot lookup: date+mealType → slot
  const slotMap = new Map<string, MealPlanSlotWithRecipe>();
  for (const slot of slots) {
    slotMap.set(`${slot.date}::${slot.meal_type}`, slot);
  }

  const workoutMap = new Map<string, WorkoutScheduleWithWorkout[]>();
  for (const w of workouts) {
    const existing = workoutMap.get(w.date) ?? [];
    existing.push(w);
    workoutMap.set(w.date, existing);
  }

  function navigateWeek(direction: -1 | 1) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    const newWeek = toDateString(d);
    router.push(`/planner?week=${newWeek}`);
  }

  function goToCurrentWeek() {
    router.push(`/planner?week=${getWeekStart(new Date())}`);
  }

  async function handleGenerateGroceryList() {
    const res = await fetch("/api/grocery/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart }),
    });
    if (res.ok) {
      router.push(`/grocery?week=${weekStart}`);
    }
  }

  // Weekly macro totals
  const weeklyPlanned = sumPlannedMacros(slots);

  const today = toDateString(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold">
              Week of {new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h1>
          </div>

          <button
            onClick={() => navigateWeek(1)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            onClick={goToCurrentWeek}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={handleGenerateGroceryList}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          Generate Grocery List
        </button>
      </div>

      {/* Weekly macro summary */}
      <MacroSummaryBar
        label="Week total (planned)"
        calories={weeklyPlanned.calories}
        protein={weeklyPlanned.protein_g}
        carbs={weeklyPlanned.carbs_g}
        fat={weeklyPlanned.fat_g}
      />

      {/* Planner grid */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {/* Day headers */}
        <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b bg-muted/30">
          <div className="p-3 text-xs font-medium text-muted-foreground">Meal</div>
          {dates.map((date, i) => (
            <div
              key={date}
              className={cn(
                "p-3 text-center border-l",
                date === today && "bg-primary/5"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground">
                {DAY_LABELS[i]}
              </div>
              <div className={cn(
                "text-sm font-semibold mt-0.5",
                date === today && "text-primary"
              )}>
                {new Date(date + "T00:00:00").getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Meal rows */}
        {MEAL_TYPES.map((mealType) => (
          <div key={mealType} className="grid grid-cols-[120px_repeat(7,1fr)] border-b last:border-b-0">
            <div className="p-3 flex items-start">
              <span className="text-xs font-medium text-muted-foreground capitalize">
                {MEAL_TYPE_LABELS[mealType]}
              </span>
            </div>

            {dates.map((date, i) => {
              const slot = slotMap.get(`${date}::${mealType}`);
              return (
                <div
                  key={date}
                  className={cn(
                    "border-l min-h-[100px]",
                    date === today && "bg-primary/5"
                  )}
                >
                  <MealSlotCell
                    date={date}
                    mealType={mealType}
                    slot={slot}
                    userId={userId}
                    onUpdated={(updated) => {
                      setSlots((prev) => {
                        const filtered = prev.filter(
                          (s) => !(s.date === date && s.meal_type === mealType)
                        );
                        return updated ? [...filtered, updated] : filtered;
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Workout row */}
        <div className="grid grid-cols-[120px_repeat(7,1fr)] bg-muted/20">
          <div className="p-3 flex items-start">
            <span className="text-xs font-medium text-muted-foreground">Workout</span>
          </div>

          {dates.map((date) => {
            const dayWorkouts = workoutMap.get(date) ?? [];
            return (
              <div key={date} className={cn("border-l min-h-[80px]", date === today && "bg-primary/5")}>
                <WorkoutCell
                  date={date}
                  workouts={dayWorkouts}
                  userId={userId}
                  onUpdated={(updated) => {
                    setWorkouts((prev) => {
                      const filtered = prev.filter((w) => w.date !== date);
                      return [...filtered, ...updated];
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
