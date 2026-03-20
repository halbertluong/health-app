"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const WORKOUT_TYPES = ["strength", "cardio", "hiit", "yoga", "pilates", "cycling", "running", "other"];

export function NewWorkoutButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("workouts").insert({
      user_id: user!.id,
      name: form.get("name") as string,
      type: form.get("type") as string,
      description: (form.get("description") as string) || null,
      duration_minutes: form.get("duration") ? Number(form.get("duration")) : null,
      calories_burned: form.get("calories") ? Number(form.get("calories")) : null,
      video_url: (form.get("video_url") as string) || null,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New workout</span>
        <span className="sm:hidden">New</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div
            className="relative z-10 bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-base">New workout</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name *</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Upper body strength"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select
                  name="type"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {WORKOUT_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (min)</label>
                  <input
                    name="duration"
                    type="number"
                    min="1"
                    max="300"
                    placeholder="45"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Calories burned</label>
                  <input
                    name="calories"
                    type="number"
                    min="1"
                    placeholder="300"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">YouTube video URL</label>
                <input
                  name="video_url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Optional notes about this workout"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving…" : "Save workout"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
