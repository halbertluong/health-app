"use client";

import { useState, useEffect } from "react";
import { Search, X, Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Workout, WorkoutType } from "@health-app/types";

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: "weight_training", label: "Weight Training" },
  { value: "cardio", label: "Cardio" },
  { value: "pickleball", label: "Pickleball" },
  { value: "tennis", label: "Tennis" },
  { value: "swimming", label: "Swimming" },
  { value: "recovery", label: "Recovery" },
  { value: "mobility", label: "Mobility" },
  { value: "other", label: "Other" },
];

interface WorkoutPickerProps {
  onSelect: (workoutId: string | null, workoutType: WorkoutType, duration: number | null) => void;
  onClose: () => void;
}

export function WorkoutPicker({ onSelect, onClose }: WorkoutPickerProps) {
  const [search, setSearch] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [duration, setDuration] = useState<number | "">("");
  const [tab, setTab] = useState<"library" | "type">("library");

  useEffect(() => {
    async function fetchWorkouts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("workouts")
        .select("*")
        .order("name");
      setWorkouts((data as Workout[]) ?? []);
      setLoading(false);
    }
    fetchWorkouts();
  }, []);

  const filtered = search
    ? workouts.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    : workouts;

  function handleConfirm() {
    if (tab === "library" && selectedWorkout) {
      onSelect(selectedWorkout.id, selectedWorkout.type, duration === "" ? null : duration);
    } else if (tab === "type" && selectedType) {
      onSelect(null, selectedType, duration === "" ? null : duration);
    }
  }

  const canConfirm = tab === "library" ? !!selectedWorkout : !!selectedType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Schedule a Workout</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => { setTab("library"); setSelectedType(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "library"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            From Library
          </button>
          <button
            onClick={() => { setTab("type"); setSelectedWorkout(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "type"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Type
          </button>
        </div>

        {tab === "library" ? (
          <>
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search workouts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
            </div>

            {/* Workout list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  {search ? "No workouts match your search." : "No workouts in library."}{" "}
                  <a href="/workouts" className="text-primary underline">
                    Add workouts
                  </a>
                </div>
              ) : (
                filtered.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => setSelectedWorkout(workout)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedWorkout?.id === workout.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{workout.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                        {workout.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {workout.notes && (
                      <p className="text-xs text-muted-foreground mt-1 ml-5.5 line-clamp-1">{workout.notes}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {WORKOUT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedType(value)}
                className={`p-3 rounded-lg text-left text-sm font-medium transition-colors border ${
                  selectedType === value
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "hover:bg-muted border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Duration + confirm */}
        {canConfirm && (
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">Duration (min):</label>
              <input
                type="number"
                min={1}
                max={480}
                placeholder="Optional"
                value={duration}
                onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleConfirm}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Add to Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
