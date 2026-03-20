import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { todayString, sumPlannedMacros, sumActualMacros, MEAL_TYPE_LABELS } from "@health-app/utils";
import type { MealPlanSlotWithRecipe, WorkoutScheduleWithWorkout } from "@health-app/types";

const MEAL_STATUS_COLORS: Record<string, string> = {
  planned: "#e2e8f0",
  cooked: "#bfdbfe",
  eaten_as_planned: "#bbf7d0",
  modified: "#fef08a",
  skipped: "#e2e8f0",
  replaced: "#e9d5ff",
};

export default function TodayScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const today = todayString();

  const [slots, setSlots] = useState<MealPlanSlotWithRecipe[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutScheduleWithWorkout[]>([]);
  const [actualLogs, setActualLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    if (!session?.user) return;
    const userId = session.user.id;

    const [slotsRes, workoutsRes, logsRes] = await Promise.all([
      supabase
        .from("meal_plan_slots")
        .select("*, recipe:recipes(id, name, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving, servings)")
        .eq("user_id", userId)
        .eq("date", today)
        .order("meal_type"),
      supabase
        .from("workout_schedule")
        .select("*, workout:workouts(id, name, type)")
        .eq("user_id", userId)
        .eq("date", today),
      supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", today + "T00:00:00Z")
        .lte("logged_at", today + "T23:59:59Z"),
    ]);

    setSlots((slotsRes.data ?? []) as MealPlanSlotWithRecipe[]);
    setWorkouts((workoutsRes.data ?? []) as WorkoutScheduleWithWorkout[]);
    setActualLogs(logsRes.data ?? []);
  }

  useEffect(() => { fetchData(); }, [session]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function markAteAsPlanned(slot: MealPlanSlotWithRecipe) {
    if (!session?.user) return;
    await supabase
      .from("meal_plan_slots")
      .update({ status: "eaten_as_planned" })
      .eq("id", slot.id);

    // Create a meal log entry
    const { data: log } = await supabase
      .from("meal_logs")
      .insert({
        user_id: session.user.id,
        meal_type: slot.meal_type,
        linked_plan_slot_id: slot.id,
        source_type: "ate_as_planned",
        total_calories: slot.planned_calories,
        total_protein_g: slot.planned_protein_g,
        total_carbs_g: slot.planned_carbs_g,
        total_fat_g: slot.planned_fat_g,
      })
      .select()
      .single();

    if (log) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, status: "eaten_as_planned" } : s))
      );
      setActualLogs((prev) => [...prev, log]);
    }
  }

  const plannedMacros = sumPlannedMacros(slots);
  const actualMacros = sumActualMacros(actualLogs);
  const calProgress = plannedMacros.calories > 0
    ? Math.min(actualMacros.calories / plannedMacros.calories, 1)
    : 0;
  const name = session?.user?.user_metadata?.["name"] ?? "there";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning, {name} 👋</Text>
          <Text style={styles.date}>
            {new Date(today + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </Text>
        </View>

        {/* Macro progress ring-style bar */}
        <View style={styles.macroCard}>
          <View style={styles.macroRow}>
            <MacroChip label="Planned" cal={Math.round(plannedMacros.calories)} prot={Math.round(plannedMacros.protein_g)} color="#f97316" />
            <MacroChip label="Logged" cal={Math.round(actualMacros.calories)} prot={Math.round(actualMacros.protein_g)} color="#16a34a" />
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${calProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round(actualMacros.calories)} / {Math.round(plannedMacros.calories)} kcal
          </Text>
        </View>

        {/* Meal slots */}
        <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>

        {slots.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No meals planned today.</Text>
            <Text style={styles.emptySubtext}>Plan your week at healthplanner.app</Text>
          </View>
        ) : (
          slots.map((slot) => (
            <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <View style={[styles.statusDot, { backgroundColor: MEAL_STATUS_COLORS[slot.status] ?? "#e2e8f0" }]} />
                <Text style={styles.mealType}>{MEAL_TYPE_LABELS[slot.meal_type]}</Text>
                <Text style={styles.slotStatus}>{slot.status.replace(/_/g, " ")}</Text>
              </View>

              <Text style={styles.recipeName}>{slot.recipe?.name ?? "No recipe"}</Text>

              {slot.planned_calories != null && (
                <Text style={styles.macroText}>
                  {Math.round(Number(slot.planned_calories))} kcal ·{" "}
                  P: {Math.round(Number(slot.planned_protein_g ?? 0))}g ·{" "}
                  C: {Math.round(Number(slot.planned_carbs_g ?? 0))}g ·{" "}
                  F: {Math.round(Number(slot.planned_fat_g ?? 0))}g
                </Text>
              )}

              {slot.status === "planned" && (
                <View style={styles.slotActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => markAteAsPlanned(slot)}
                  >
                    <Text style={styles.actionBtnText}>Ate as Planned</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSecondary]}
                    onPress={() => router.push("/log")}
                  >
                    <Text style={styles.actionBtnSecondaryText}>Log Modified</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        {/* Workouts */}
        {workouts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today&apos;s Workouts</Text>
            {workouts.map((w) => (
              <View key={w.id} style={styles.workoutCard}>
                <Text style={styles.workoutName}>
                  {w.workout?.name ?? w.workout_type.replace(/_/g, " ")}
                </Text>
                {w.planned_duration && (
                  <Text style={styles.workoutMeta}>{w.planned_duration} min planned</Text>
                )}
                <Text style={[styles.workoutStatus, w.status === "completed" && styles.workoutDone]}>
                  {w.status}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroChip({ label, cal, prot, color }: { label: string; cal: number; prot: number; color: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipValue}>{cal} kcal · {prot}g P</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  date: { fontSize: 13, color: "#64748b", marginTop: 2 },
  macroCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  macroRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8 },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  chipValue: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  progressBar: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#16a34a", borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  emptyState: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#64748b" },
  emptySubtext: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  slotCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  mealType: { fontSize: 12, fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 },
  slotStatus: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },
  recipeName: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 4 },
  macroText: { fontSize: 12, color: "#64748b" },
  slotActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  actionBtnSecondary: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  actionBtnSecondaryText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  workoutCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" },
  workoutName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0f172a" },
  workoutMeta: { fontSize: 12, color: "#94a3b8", marginRight: 8 },
  workoutStatus: { fontSize: 12, color: "#94a3b8", textTransform: "capitalize" },
  workoutDone: { color: "#16a34a" },
});
