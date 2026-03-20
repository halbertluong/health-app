import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { getWeekStart, getWeekDates, DAY_LABELS, sumPlannedMacros, sumActualMacros } from "@health-app/utils";

export default function SnapshotScreen() {
  const { session } = useAuthStore();
  const weekStart = getWeekStart(new Date());
  const dates = getWeekDates(weekStart);
  const [slots, setSlots] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    if (!session?.user) return;
    const weekEnd = dates[6]!;
    const userId = session.user.id;

    const [slotsRes, logsRes, workoutsRes] = await Promise.all([
      supabase.from("meal_plan_slots").select("*").eq("user_id", userId).gte("date", weekStart).lte("date", weekEnd),
      supabase.from("meal_logs").select("*").eq("user_id", userId).gte("logged_at", weekStart + "T00:00:00Z").lte("logged_at", weekEnd + "T23:59:59Z"),
      supabase.from("workout_schedule").select("*").eq("user_id", userId).gte("date", weekStart).lte("date", weekEnd),
    ]);

    setSlots(slotsRes.data ?? []);
    setLogs(logsRes.data ?? []);
    setWorkouts(workoutsRes.data ?? []);
  }

  useEffect(() => { fetchData(); }, [session]);

  const weekPlanned = sumPlannedMacros(slots);
  const weekActual = sumActualMacros(logs);

  const workoutsCompleted = workouts.filter((w) => w.status === "completed").length;
  const workoutsPlanned = workouts.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Snapshot</Text>
        <Text style={styles.subtitle}>
          {new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" – "}
          {new Date(dates[6]! + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Planned cal" value={`${Math.round(weekPlanned.calories)}`} unit="kcal" color="#f97316" />
          <SummaryCard label="Logged cal" value={`${Math.round(weekActual.calories)}`} unit="kcal" color="#16a34a" />
          <SummaryCard label="Workouts" value={`${workoutsCompleted}/${workoutsPlanned}`} unit="done" color="#8b5cf6" />
        </View>

        {/* Day-by-day breakdown */}
        <Text style={styles.sectionTitle}>Day-by-Day</Text>
        {dates.map((date, i) => {
          const daySlots = slots.filter((s) => s.date === date);
          const dayLogs = logs.filter((l) => l.logged_at?.startsWith(date));
          const dayWorkout = workouts.find((w) => w.date === date);

          const planned = sumPlannedMacros(daySlots);
          const actual = sumActualMacros(dayLogs);
          const adherence = planned.calories > 0
            ? Math.round((actual.calories / planned.calories) * 100)
            : null;

          return (
            <View key={date} style={styles.dayRow}>
              <View style={styles.dayLabel}>
                <Text style={styles.dayName}>{DAY_LABELS[i]}</Text>
                <Text style={styles.dayDate}>{new Date(date + "T00:00:00").getDate()}</Text>
              </View>

              <View style={styles.dayMacros}>
                <Text style={styles.dayPlanned}>{Math.round(planned.calories)} kcal planned</Text>
                <Text style={styles.dayActual}>{Math.round(actual.calories)} kcal logged</Text>
              </View>

              <View style={styles.dayRight}>
                {adherence !== null && (
                  <Text style={[styles.adherence, adherence >= 80 && styles.adherenceGood]}>
                    {adherence}%
                  </Text>
                )}
                {dayWorkout && (
                  <View style={[styles.workoutDot, dayWorkout.status === "completed" && styles.workoutDotDone]} />
                )}
              </View>
            </View>
          );
        })}

        {/* Macro comparison */}
        <Text style={styles.sectionTitle}>Weekly Macros</Text>
        {[
          { label: "Protein", planned: weekPlanned.protein_g, actual: weekActual.protein_g, color: "#3b82f6" },
          { label: "Carbs", planned: weekPlanned.carbs_g, actual: weekActual.carbs_g, color: "#eab308" },
          { label: "Fat", planned: weekPlanned.fat_g, actual: weekActual.fat_g, color: "#ef4444" },
        ].map(({ label, planned, actual, color }) => (
          <MacroBar key={label} label={label} planned={planned} actual={actual} color={color} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MacroBar({ label, planned, actual, color }: { label: string; planned: number; actual: number; color: string }) {
  const ratio = planned > 0 ? Math.min(actual / planned, 1.2) : 0;
  return (
    <View style={styles.macroBarWrap}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValues}>
          {Math.round(actual)}g / {Math.round(planned)}g
        </Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  summaryValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  summaryUnit: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  summaryLabel: { fontSize: 11, color: "#64748b", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  dayRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 6, gap: 12 },
  dayLabel: { width: 36, alignItems: "center" },
  dayName: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" },
  dayDate: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  dayMacros: { flex: 1 },
  dayPlanned: { fontSize: 12, color: "#64748b" },
  dayActual: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  dayRight: { alignItems: "flex-end", gap: 6 },
  adherence: { fontSize: 13, fontWeight: "700", color: "#f97316" },
  adherenceGood: { color: "#16a34a" },
  workoutDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e2e8f0" },
  workoutDotDone: { backgroundColor: "#8b5cf6" },
  macroBarWrap: { marginBottom: 14 },
  macroBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  macroBarLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  macroBarValues: { fontSize: 13, color: "#64748b" },
  macroBarBg: { height: 8, backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  macroBarFill: { height: 8, borderRadius: 4 },
});
