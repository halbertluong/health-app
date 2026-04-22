"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, Sparkles } from "lucide-react";
import type { MealLogWithItems, MealType } from "@health-app/types";
import { MacroProgress } from "./macro-progress";
import { LogMealModal } from "./log-meal-modal";
import { cn } from "@/lib/utils";

const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface DailyDiaryProps {
  initialLogs: MealLogWithItems[];
  macroTargets: MacroTargets;
  userId: string;
}

export function DailyDiary({ initialLogs, macroTargets, userId }: DailyDiaryProps) {
  const [logs, setLogs] = useState<MealLogWithItems[]>(initialLogs);
  const [showModal, setShowModal] = useState(false);
  const [defaultMealType, setDefaultMealType] = useState<MealType>("breakfast");

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories ?? 0),
      protein_g: acc.protein_g + (log.total_protein_g ?? 0),
      carbs_g: acc.carbs_g + (log.total_carbs_g ?? 0),
      fat_g: acc.fat_g + (log.total_fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  function openModal(mealType: MealType) {
    setDefaultMealType(mealType);
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/food-log/${id}`, { method: "DELETE" });
  }

  function handleLogged(log: MealLogWithItems) {
    setLogs((prev) => [...prev, log]);
    setShowModal(false);
  }

  const byMealType = new Map<MealType, MealLogWithItems[]>();
  for (const type of MEAL_TYPE_ORDER) byMealType.set(type, []);
  for (const log of logs) {
    const type = (log.meal_type as MealType) ?? "snack";
    byMealType.get(type)?.push(log);
  }

  return (
    <>
      <div className="space-y-4">
        {/* Macro progress */}
        <MacroProgress
          calories={totals.calories}
          protein_g={totals.protein_g}
          carbs_g={totals.carbs_g}
          fat_g={totals.fat_g}
          targetCalories={macroTargets.calories}
          targetProtein={macroTargets.protein_g}
          targetCarbs={macroTargets.carbs_g}
          targetFat={macroTargets.fat_g}
        />

        {/* Meal sections */}
        {MEAL_TYPE_ORDER.map((mealType) => {
          const mealLogs = byMealType.get(mealType) ?? [];
          const mealTotals = mealLogs.reduce(
            (acc, l) => ({ cal: acc.cal + (l.total_calories ?? 0), pro: acc.pro + (l.total_protein_g ?? 0) }),
            { cal: 0, pro: 0 }
          );

          return (
            <div key={mealType} className="bg-card border rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{MEAL_LABELS[mealType]}</h3>
                  {mealLogs.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(mealTotals.cal)} kcal · P: {Math.round(mealTotals.pro)}g
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openModal(mealType)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              {/* Log entries */}
              {mealLogs.length === 0 ? (
                <button
                  onClick={() => openModal(mealType)}
                  className="w-full py-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/10 transition-colors group"
                >
                  <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                </button>
              ) : (
                <div className="divide-y">
                  {mealLogs.map((log) => (
                    <LogEntry key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => openModal("snack")}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showModal && (
        <LogMealModal
          defaultMealType={defaultMealType}
          onLogged={handleLogged}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function LogEntry({ log, onDelete }: { log: MealLogWithItems; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(log.logged_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="px-4 py-3 group">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {log.meal_log_items.map((i) => i.food_name).join(", ")}
            </span>
            {log.source_type === "ai_photo" && (
              <Sparkles className="h-3 w-3 text-primary shrink-0" aria-label="AI analyzed" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {time}
            </span>
            <span>{Math.round(log.total_calories ?? 0)} kcal</span>
            <span className="text-blue-600">P: {Math.round(log.total_protein_g ?? 0)}g</span>
            <span className="text-yellow-600">C: {Math.round(log.total_carbs_g ?? 0)}g</span>
            <span className="text-red-600">F: {Math.round(log.total_fat_g ?? 0)}g</span>
          </div>
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && log.meal_log_items.length > 0 && (
        <div className="mt-2 ml-0 space-y-1 border-t pt-2">
          {log.meal_log_items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.food_name} — {item.quantity} {item.unit}</span>
              <span>{Math.round(item.calories ?? 0)} kcal</span>
            </div>
          ))}
          {log.notes && (
            <p className="text-xs text-muted-foreground/70 italic mt-1">{log.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
