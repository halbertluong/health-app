import { createServerClient } from "@/lib/supabase/server";
import { Dumbbell, Clock, Flame } from "lucide-react";
import { NewWorkoutButton } from "./new-workout-button";
import { WorkoutPlanButton } from "./workout-plan-button";
import { WorkoutCatalogSection } from "./catalog-section";

export default async function WorkoutsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: workouts }, { data: schedule }] = await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workout_schedule")
      .select("workout_id, workout:workouts(id, name, type, duration_minutes, calories_burned, video_url)")
      .eq("user_id", user!.id)
      .order("date", { ascending: false })
      .limit(50),
  ]);

  // Find most-used workouts by frequency in schedule
  const freqMap: Record<string, number> = {};
  for (const s of schedule ?? []) {
    const id = s.workout_id;
    if (id) freqMap[id] = (freqMap[id] ?? 0) + 1;
  }
  const recentIds = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  const frequent = (workouts ?? []).filter((w) => recentIds.includes(w.id));

  const existingNames = (workouts ?? []).map((w: any) => w.name as string);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-muted-foreground mt-1">Your library & discover new ones</p>
        </div>
        <div className="flex items-center gap-2">
          <WorkoutPlanButton workouts={workouts ?? []} userId={user!.id} />
          <NewWorkoutButton />
        </div>
      </div>

      {/* Most-used workouts */}
      {frequent.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Most Used</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {frequent.map((w: any) => (
              <WorkoutCard key={w.id} workout={w} compact />
            ))}
          </div>
        </section>
      )}

      {/* Full library */}
      {workouts && workouts.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">My Library</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.map((w: any) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!workouts || workouts.length === 0) && (
        <div className="bg-card border border-dashed rounded-xl p-12 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-sm">No workouts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add from the catalog below or create your own</p>
        </div>
      )}

      {/* Discover catalog */}
      <WorkoutCatalogSection existingNames={existingNames} />
    </div>
  );
}

function WorkoutCard({ workout: w, compact }: { workout: any; compact?: boolean }) {
  const videoId = extractYouTubeId(w.video_url);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  return (
    <div className="bg-card border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
      {thumbnail && (
        <a href={w.video_url} target="_blank" rel="noopener noreferrer" className="block relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail} alt={w.name} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-primary ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </a>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-tight">{w.name}</h3>
          <span className="shrink-0 text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
            {w.type ?? "general"}
          </span>
        </div>
        {!compact && w.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{w.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {w.duration_minutes && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{w.duration_minutes}m</span>
          )}
          {w.calories_burned && (
            <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{w.calories_burned} kcal</span>
          )}
        </div>
      </div>
    </div>
  );
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/);
  return match?.[1] ?? null;
}
