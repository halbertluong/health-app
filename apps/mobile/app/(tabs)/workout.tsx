import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { todayString } from "@health-app/utils";
import type { WorkoutScheduleWithWorkout } from "@health-app/types";

const TYPE_COLORS: Record<string, string> = {
  weight_training: "#8b5cf6",
  pickleball: "#16a34a",
  tennis: "#eab308",
  swimming: "#0ea5e9",
  cardio: "#f97316",
  recovery: "#14b8a6",
  mobility: "#14b8a6",
  other: "#94a3b8",
};

export default function WorkoutScreen() {
  const { session } = useAuthStore();
  const today = todayString();
  const [workouts, setWorkouts] = useState<WorkoutScheduleWithWorkout[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchWorkouts() {
    if (!session?.user) return;
    const { data } = await supabase
      .from("workout_schedule")
      .select("*, workout:workouts(*, workout_exercises(*))")
      .eq("user_id", session.user.id)
      .eq("date", today);
    setWorkouts((data ?? []) as WorkoutScheduleWithWorkout[]);
  }

  useEffect(() => { fetchWorkouts(); }, [session]);

  async function markCompleted(ws: WorkoutScheduleWithWorkout) {
    await supabase
      .from("workout_schedule")
      .update({ status: "completed", actual_duration: ws.planned_duration })
      .eq("id", ws.id);
    setWorkouts((prev) =>
      prev.map((w) => w.id === ws.id ? { ...w, status: "completed" } : w)
    );
  }

  async function markSkipped(ws: WorkoutScheduleWithWorkout) {
    await supabase.from("workout_schedule").update({ status: "skipped" }).eq("id", ws.id);
    setWorkouts((prev) =>
      prev.map((w) => w.id === ws.id ? { ...w, status: "skipped" } : w)
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Log</Text>
        <Text style={styles.subtitle}>
          {new Date(today + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchWorkouts(); setRefreshing(false); }} />}
        contentContainerStyle={styles.scroll}
      >
        {workouts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No workouts scheduled today.</Text>
            <Text style={styles.emptySubtext}>Add workouts from the web planner.</Text>
          </View>
        ) : (
          workouts.map((ws) => {
            const color = TYPE_COLORS[ws.workout_type] ?? TYPE_COLORS["other"]!;
            const done = ws.status === "completed";
            const skipped = ws.status === "skipped";
            return (
              <View key={ws.id} style={[styles.card, done && styles.cardDone]}>
                <View style={[styles.typeTag, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.typeTagText, { color }]}>
                    {ws.workout_type.replace(/_/g, " ")}
                  </Text>
                </View>

                <Text style={styles.workoutName}>
                  {ws.workout?.name ?? ws.workout_type.replace(/_/g, " ")}
                </Text>

                {ws.planned_duration && (
                  <Text style={styles.duration}>{ws.planned_duration} min planned</Text>
                )}

                {ws.workout && (ws.workout as any).workout_exercises?.length > 0 && (
                  <View style={styles.exercises}>
                    {(ws.workout as any).workout_exercises.slice(0, 4).map((ex: any) => (
                      <Text key={ex.id} style={styles.exercise}>
                        • {ex.name}{ex.sets ? ` ${ex.sets}×${ex.reps ?? "—"}` : ""}{ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ""}
                      </Text>
                    ))}
                  </View>
                )}

                {!done && !skipped && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.completeBtn} onPress={() => markCompleted(ws)}>
                      <Text style={styles.completeBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipBtn} onPress={() => markSkipped(ws)}>
                      <Text style={styles.skipBtnText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {done && <Text style={styles.doneLabel}>Completed ✓</Text>}
                {skipped && <Text style={styles.skippedLabel}>Skipped</Text>}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyText: { fontSize: 15, color: "#64748b" },
  emptySubtext: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardDone: { opacity: 0.75 },
  typeTag: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  typeTagText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  workoutName: { fontSize: 17, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  duration: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  exercises: { gap: 3, marginBottom: 12 },
  exercise: { fontSize: 13, color: "#475569" },
  actions: { flexDirection: "row", gap: 8 },
  completeBtn: { flex: 1, backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  completeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  skipBtn: { backgroundColor: "#f1f5f9", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  skipBtnText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
  doneLabel: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  skippedLabel: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
});
