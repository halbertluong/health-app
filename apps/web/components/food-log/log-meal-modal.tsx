"use client";

import { useState, useRef, useCallback } from "react";
import { X, Camera, Sparkles, Plus, Minus, Lightbulb, ChevronRight } from "lucide-react";
import type { MealLogWithItems, MealType } from "@health-app/types";
import { cn } from "@/lib/utils";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

interface FoodItem {
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface RecentFood {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  quantity: number;
  unit: string;
  count: number;
}

interface LogMealModalProps {
  onLogged: (log: MealLogWithItems) => void;
  onClose: () => void;
  defaultMealType?: MealType;
}

type Step = "input" | "review";
type Tab = "describe" | "recent";

export function LogMealModal({ onLogged, onClose, defaultMealType = "breakfast" }: LogMealModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [tab, setTab] = useState<Tab>("describe");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [description, setDescription] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(0.8);
  const [recents, setRecents] = useState<RecentFood[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadRecents() {
    if (recents !== null) return;
    const res = await fetch("/api/food-log/recents");
    if (res.ok) {
      const data = await res.json();
      setRecents(data.recents ?? []);
    } else {
      setRecents([]);
    }
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    if (t === "recent") loadRecents();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImageBase64(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/food-log/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, image_base64: imageBase64, meal_type: mealType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Analysis failed"); return; }
      setFoods(data.foods ?? []);
      setSuggestion(data.suggestion ?? "");
      setConfidenceScore(data.confidence_score ?? 0.8);
      setStep("review");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function addRecentFood(food: RecentFood) {
    setFoods((prev) => {
      const existing = prev.find((f) => f.food_name.toLowerCase() === food.food_name.toLowerCase());
      if (existing) return prev;
      return [...prev, {
        food_name: food.food_name,
        quantity: food.quantity,
        unit: food.unit,
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
      }];
    });
    setStep("review");
  }

  function updateFoodField(index: number, field: keyof FoodItem, value: string | number) {
    setFoods((prev) => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  const totals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories ?? 0),
      protein_g: acc.protein_g + (f.protein_g ?? 0),
      carbs_g: acc.carbs_g + (f.carbs_g ?? 0),
      fat_g: acc.fat_g + (f.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  async function handleSave() {
    if (foods.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type: mealType,
          logged_at: new Date().toISOString(),
          source_type: imageBase64 ? "ai_photo" : description ? "manual" : "quick_add",
          confidence_score: confidenceScore,
          notes: description || null,
          items: foods,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      onLogged(data.log as MealLogWithItems);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {step === "review" && (
              <button onClick={() => setStep("input")} className="text-muted-foreground hover:text-foreground mr-1">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
            <h2 className="font-semibold">{step === "input" ? "Log a Meal" : "Review & Confirm"}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === "input" && (
            <div className="p-4 space-y-4">
              {/* Meal type */}
              <div className="flex gap-2">
                {MEAL_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMealType(value)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      mealType === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted-foreground/20 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => handleTabChange("describe")}
                  className={cn("px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                    tab === "describe" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  Describe / Photo
                </button>
                <button
                  onClick={() => handleTabChange("recent")}
                  className={cn("px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                    tab === "recent" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  Recent Foods
                </button>
              </div>

              {tab === "describe" && (
                <div className="space-y-3">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you ate… e.g. 'grilled chicken breast with white rice and steamed broccoli'"
                    className="w-full h-28 px-3 py-2 rounded-xl border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  />

                  {/* Photo upload */}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Food preview" className="w-full h-36 object-cover rounded-xl" />
                      <button
                        onClick={() => { setImageBase64(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground text-sm hover:border-primary/40 hover:text-foreground transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      Add a photo (optional)
                    </button>
                  )}

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || (!description.trim() && !imageBase64)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    {analyzing ? "Analyzing…" : "Analyze with AI"}
                  </button>
                </div>
              )}

              {tab === "recent" && (
                <div className="space-y-2">
                  {recents === null ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
                  ) : recents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No recent foods yet. Log a meal to see them here.</p>
                  ) : (
                    recents.map((food) => (
                      <button
                        key={food.food_name}
                        onClick={() => addRecentFood(food)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border hover:bg-muted/40 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">{food.food_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {food.quantity} {food.unit} · {Math.round(food.calories)} kcal · P: {Math.round(food.protein_g)}g
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60">{food.count}×</span>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {step === "review" && (
            <div className="p-4 space-y-4">
              {/* AI Suggestion */}
              {suggestion && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">{suggestion}</p>
                </div>
              )}

              {/* Food items */}
              <div className="space-y-2">
                {foods.map((food, i) => (
                  <div key={i} className="border rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <input
                        value={food.food_name}
                        onChange={(e) => updateFoodField(i, "food_name", e.target.value)}
                        className="flex-1 text-sm font-medium bg-transparent border-b border-transparent hover:border-muted focus:border-primary focus:outline-none"
                      />
                      <button onClick={() => removeFood(i)} className="shrink-0 p-0.5 hover:text-red-500 text-muted-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Qty:</span>
                        <input
                          type="number"
                          value={food.quantity}
                          onChange={(e) => updateFoodField(i, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-14 bg-muted/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <input
                          value={food.unit}
                          onChange={(e) => updateFoodField(i, "unit", e.target.value)}
                          className="w-12 bg-muted/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{Math.round(food.calories)}</span> kcal
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      {[
                        { key: "protein_g" as const, label: "Protein", color: "text-blue-600" },
                        { key: "carbs_g" as const, label: "Carbs", color: "text-yellow-600" },
                        { key: "fat_g" as const, label: "Fat", color: "text-red-600" },
                      ].map(({ key, label, color }) => (
                        <div key={key} className={cn("flex items-center gap-1", color)}>
                          <span>{label}:</span>
                          <input
                            type="number"
                            value={food[key]}
                            onChange={(e) => updateFoodField(i, key, parseFloat(e.target.value) || 0)}
                            className="w-10 bg-muted/40 rounded px-1 py-px text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <span>g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setFoods((prev) => [...prev, { food_name: "", quantity: 1, unit: "serving", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }])}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add item
                </button>
              </div>

              {/* Totals */}
              <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Calories", value: Math.round(totals.calories), unit: "kcal", color: "text-orange-600" },
                  { label: "Protein", value: Math.round(totals.protein_g), unit: "g", color: "text-blue-600" },
                  { label: "Carbs", value: Math.round(totals.carbs_g), unit: "g", color: "text-yellow-600" },
                  { label: "Fat", value: Math.round(totals.fat_g), unit: "g", color: "text-red-600" },
                ].map(({ label, value, unit, color }) => (
                  <div key={label}>
                    <div className={cn("text-base font-bold", color)}>{value}</div>
                    <div className="text-[10px] text-muted-foreground">{unit} {label}</div>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="p-4 border-t shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || foods.length === 0}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : `Log ${MEAL_TYPES.find((m) => m.value === mealType)?.label}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
