"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutScheduleWithWorkout, WorkoutType } from "@health-app/types";
import { WorkoutPicker } from "./workout-picker";

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  weight_training: "bg-purple-100 text-purple-700",
  pickleball: "bg-green-100 text-green-700",
  tennis: "bg-yellow-100 text-yellow-700",
  swimming: "bg-blue-100 text-blue-700",
  cardio: "bg-orange-100 text-orange-700",
  recovery: "bg-teal-100 text-teal-700",
  mobility: "bg-teal-100 text-teal-700",
  other: "bg-gray-100 text-gray-600",
};

interface WorkoutCellProps {
  date: string;
  workouts: WorkoutScheduleWithWorkout[];
  userId: string;
  onUpdated: (workouts: WorkoutScheduleWithWorkout[]) => void;
}

export function WorkoutCell({ date, workouts, userId, onUpdated }: WorkoutCellProps) {
  const [showPicker, setShowPicker] = useState(false);

  async function handleAdd(
    workoutId: string | null,
    workoutType: WorkoutType,
    duration: number | null
  ) {
    setShowPicker(false);
    const supabase = createClient();
    const { error } = await supabase.from("workout_schedule").insert({
      user_id: userId,
      date,
      workout_id: workoutId,
      workout_type: workoutType,
      planned_duration: duration,
    });
    if (error) {
      console.error("Failed to schedule workout:", error);
      return;
    }
    const { data } = await supabase
      .from("workout_schedule")
      .select("*, workout:workouts(*)")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at");
    onUpdated((data as WorkoutScheduleWithWorkout[]) ?? []);
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("workout_schedule").delete().eq("id", id);
    onUpdated(workouts.filter((w) => w.id !== id));
  }

  if (workouts.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full h-full min-h-[80px] flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/20 transition-colors group"
        >
          <Plus className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
        </button>
        {showPicker && (
          <WorkoutPicker onSelect={handleAdd} onClose={() => setShowPicker(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="p-2 space-y-1">
        {workouts.map((w) => (
          <div
            key={w.id}
            className={`group relative text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
              WORKOUT_TYPE_COLORS[w.workout_type] ?? WORKOUT_TYPE_COLORS["other"]
            }`}
            title={w.workout?.name ?? w.workout_type}
          >
            <span className="truncate">
              {w.workout?.name ?? w.workout_type.replace(/_/g, " ")}
              {w.planned_duration && (
                <span className="opacity-70"> · {w.planned_duration}m</span>
              )}
            </span>
            <button
              onClick={() => handleRemove(w.id)}
              className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center py-0.5 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/20 rounded transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {showPicker && (
        <WorkoutPicker onSelect={handleAdd} onClose={() => setShowPicker(false)} />
      )}
    </>
  );
}
