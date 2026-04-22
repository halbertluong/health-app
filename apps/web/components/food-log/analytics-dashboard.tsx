"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface DayData {
  date: string;
  label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  log_count: number;
}

interface MealTypeBreakdown {
  meal_type: string;
  avg_calories: number;
  avg_protein_g: number;
  count: number;
}

interface AnalyticsDashboardProps {
  dailyData: DayData[];
  mealTypeBreakdown: MealTypeBreakdown[];
}

type Range = "7d" | "30d" | "90d";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function avg(arr: number[]) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function AnalyticsDashboard({ dailyData, mealTypeBreakdown }: AnalyticsDashboardProps) {
  const [range, setRange] = useState<Range>("30d");

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const filtered = dailyData.slice(-days);
  const loggedDays = filtered.filter((d) => d.log_count > 0);

  const avgCal = Math.round(avg(loggedDays.map((d) => d.calories)));
  const avgPro = Math.round(avg(loggedDays.map((d) => d.protein_g)));
  const bestDay = loggedDays.reduce<DayData | null>((best, d) => (!best || d.calories > best.calories ? d : best), null);
  const bestProteinDay = loggedDays.reduce<DayData | null>((best, d) => (!best || d.protein_g > best.protein_g ? d : best), null);

  // Tooltip formatter
  const calTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-background border rounded-lg p-2 text-xs shadow">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {Math.round(p.value)}{p.dataKey.includes("cal") ? " kcal" : "g"}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Range tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        {(["7d", "30d", "90d"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              range === r ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "3 months"}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg daily calories" value={`${avgCal}`} unit="kcal" color="text-orange-600" />
        <StatCard label="Avg daily protein" value={`${avgPro}`} unit="g" color="text-blue-600" />
        <StatCard label="Days logged" value={`${loggedDays.length}`} unit={`/ ${filtered.length}`} color="text-green-600" />
        <StatCard label="Best protein day" value={bestProteinDay ? `${Math.round(bestProteinDay.protein_g)}g` : "—"} unit={bestProteinDay?.label ?? ""} color="text-purple-600" />
      </div>

      {loggedDays.length === 0 ? (
        <div className="bg-card border border-dashed rounded-xl p-16 text-center text-muted-foreground">
          <p className="font-medium">No data logged yet</p>
          <p className="text-sm mt-1">Start logging meals in Food Diary to see trends here.</p>
        </div>
      ) : (
        <>
          {/* Calorie + Protein trend */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Calories & Protein Trend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={filtered} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="cal" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="pro" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip content={calTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="cal"
                  type="monotone"
                  dataKey="calories"
                  name="Calories"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="pro"
                  type="monotone"
                  dataKey="protein_g"
                  name="Protein (g)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Macro breakdown bar chart */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Daily Macro Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filtered} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={calTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="protein_g" name="Protein (g)" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="carbs_g" name="Carbs (g)" stackId="a" fill="#eab308" />
                <Bar dataKey="fat_g" name="Fat (g)" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Meal type breakdown */}
          {mealTypeBreakdown.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-semibold mb-1">Meal Breakdown</h2>
              <p className="text-xs text-muted-foreground mb-4">Averages per meal type over logged days</p>
              <div className="space-y-3">
                {mealTypeBreakdown.map((m) => (
                  <div key={m.meal_type} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium shrink-0">{MEAL_LABELS[m.meal_type] ?? m.meal_type}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{Math.round(m.avg_calories)} kcal avg</span>
                        <span className="text-blue-600">· P: {Math.round(m.avg_protein_g)}g avg</span>
                        <span className="ml-auto">{m.count} logs</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.min((m.avg_calories / 800) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Insight text */}
              <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {buildInsight(mealTypeBreakdown, avgCal, avgPro)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}

function buildInsight(breakdown: MealTypeBreakdown[], avgCal: number, avgPro: number): string {
  const biggest = breakdown.reduce<MealTypeBreakdown | null>(
    (b, m) => (!b || m.avg_calories > b.avg_calories ? m : b), null
  );
  const smallest = breakdown.reduce<MealTypeBreakdown | null>(
    (b, m) => (!b || m.avg_calories < b.avg_calories ? m : b), null
  );
  const label = (m: MealTypeBreakdown | null) => MEAL_LABELS[m?.meal_type ?? ""] ?? m?.meal_type ?? "";

  const parts: string[] = [];
  if (biggest) parts.push(`${label(biggest)} is your biggest meal at ~${Math.round(biggest.avg_calories)} kcal avg.`);
  if (smallest && smallest !== biggest) parts.push(`${label(smallest)} is your lightest at ~${Math.round(smallest.avg_calories)} kcal.`);
  if (avgPro > 0 && avgPro < 100) parts.push("Consider boosting protein — aim for 30g+ per main meal.");
  if (avgCal > 0 && avgCal > 2500) parts.push("Your daily average is above 2500 kcal — review portion sizes if losing weight is a goal.");
  return parts.join(" ") || "Keep logging consistently to see personalized insights.";
}
