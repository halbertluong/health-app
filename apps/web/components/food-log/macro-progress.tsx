"use client";

import { cn } from "@/lib/utils";

interface MacroProgressProps {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

function Bar({ value, target, label, unit, color }: {
  value: number;
  target: number;
  label: string;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const over = target > 0 && value > target * 1.2;
  const amber = target > 0 && value > target && !over;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          <span className={cn(over ? "text-red-500 font-semibold" : amber ? "text-amber-500 font-semibold" : "")}>
            {Math.round(value)}
          </span>
          {target > 0 && <span> / {target}{unit}</span>}
          {target === 0 && <span>{unit}</span>}
        </span>
      </div>
      {target > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-2 rounded-full transition-all", over ? "bg-red-400" : amber ? "bg-amber-400" : color)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function MacroProgress({
  calories, protein_g, carbs_g, fat_g,
  targetCalories = 0, targetProtein = 0, targetCarbs = 0, targetFat = 0,
}: MacroProgressProps) {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold">Today&apos;s Macros</h2>
      <Bar value={calories} target={targetCalories} label="Calories" unit=" kcal" color="bg-orange-400" />
      <div className="grid grid-cols-3 gap-3">
        <Bar value={protein_g} target={targetProtein} label="Protein" unit="g" color="bg-blue-400" />
        <Bar value={carbs_g} target={targetCarbs} label="Carbs" unit="g" color="bg-yellow-400" />
        <Bar value={fat_g} target={targetFat} label="Fat" unit="g" color="bg-red-400" />
      </div>
    </div>
  );
}
