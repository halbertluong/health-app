"use client";

import { Plus } from "lucide-react";
import type { WorkoutScheduleWithWorkout } from "@health-app/types";

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
  if (workouts.length === 0) {
    return (
      <button className="w-full h-full min-h-[80px] flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/20 transition-colors group">
        <Plus className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {workouts.map((w) => (
        <div
          key={w.id}
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${
            WORKOUT_TYPE_COLORS[w.workout_type] ?? WORKOUT_TYPE_COLORS["other"]
          }`}
          title={w.workout?.name ?? w.workout_type}
        >
          {w.workout?.name ?? w.workout_type.replace(/_/g, " ")}
          {w.planned_duration && (
            <span className="opacity-70"> · {w.planned_duration}m</span>
          )}
        </div>
      ))}
    </div>
  );
}
