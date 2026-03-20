"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Clock, Flame, Play } from "lucide-react";
import { WORKOUT_CATALOG, type CatalogWorkout } from "@/lib/catalog/workouts";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const TYPE_FILTERS = ["all", "hiit", "strength", "yoga", "cardio", "pilates", "cycling", "running"];

export function WorkoutCatalogSection({ existingNames }: { existingNames: string[] }) {
  const [filter, setFilter] = useState("all");
  const [added, setAdded] = useState<Set<string>>(new Set(existingNames.map(n => n.toLowerCase())));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const router = useRouter();

  const filtered = filter === "all"
    ? WORKOUT_CATALOG
    : WORKOUT_CATALOG.filter(w => w.type === filter);

  async function handleAdd(workout: CatalogWorkout) {
    if (added.has(workout.name.toLowerCase()) || pending.has(workout.name)) return;

    setPending(p => new Set(p).add(workout.name));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("workouts").insert({
      user_id: user.id,
      name: workout.name,
      type: workout.type,
      duration_minutes: workout.duration_minutes,
      calories_burned: workout.calories_burned,
      description: workout.description,
      video_url: `https://www.youtube.com/watch?v=${workout.video_id}`,
    });

    setAdded(a => new Set(a).add(workout.name.toLowerCase()));
    setPending(p => { const n = new Set(p); n.delete(workout.name); return n; });
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Discover Workouts</h2>
        <span className="text-xs text-muted-foreground">{WORKOUT_CATALOG.length} workouts</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {TYPE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t === "all" ? "All" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Workout cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-3 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 scrollbar-none">
        {filtered.map(workout => {
          const isAdded = added.has(workout.name.toLowerCase());
          const isLoading = pending.has(workout.name);
          const thumbnailUrl = `https://img.youtube.com/vi/${workout.video_id}/mqdefault.jpg`;

          return (
            <div
              key={workout.name}
              className="shrink-0 w-60 sm:w-auto bg-card border rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt={workout.name}
                  className="w-full h-32 object-cover"
                />
                {/* Play overlay */}
                <a
                  href={`https://www.youtube.com/watch?v=${workout.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
                    <Play className="h-4 w-4 text-primary fill-primary ml-0.5" />
                  </div>
                </a>
                {/* Type badge */}
                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                  {workout.type}
                </span>
                {/* Channel */}
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full truncate max-w-[7rem]">
                  {workout.channel}
                </span>
              </div>

              <div className="p-3">
                <p className="font-semibold text-sm leading-tight mb-1.5">{workout.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{workout.duration_minutes}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3" />{workout.calories_burned} kcal
                  </span>
                </div>

                <button
                  onClick={() => handleAdd(workout)}
                  disabled={isAdded || isLoading}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    isAdded
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  }`}
                >
                  {isAdded ? (
                    <><Check className="h-3.5 w-3.5" /> Added</>
                  ) : isLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <><Plus className="h-3.5 w-3.5" /> Add to Library</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
