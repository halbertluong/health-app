interface MacroSummaryBarProps {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroSummaryBar({ label, calories, protein, carbs, fat }: MacroSummaryBarProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-card border rounded-lg text-sm">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <MacroChip label="Calories" value={Math.round(calories)} unit="kcal" color="bg-orange-100 text-orange-700" />
      <MacroChip label="Protein" value={Math.round(protein)} unit="g" color="bg-blue-100 text-blue-700" />
      <MacroChip label="Carbs" value={Math.round(carbs)} unit="g" color="bg-yellow-100 text-yellow-700" />
      <MacroChip label="Fat" value={Math.round(fat)} unit="g" color="bg-red-100 text-red-700" />
    </div>
  );
}

function MacroChip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <span>{label}:</span>
      <span>
        {value} {unit}
      </span>
    </div>
  );
}
