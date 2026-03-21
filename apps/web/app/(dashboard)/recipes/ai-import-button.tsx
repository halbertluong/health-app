"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Link2, Image, FileText, Type, AlertCircle, ChevronRight, Check, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseIngredientLine, joinInstructions } from "@/lib/recipe-helpers";
import type { ExtractedRecipe } from "@/app/api/recipes/extract/route";

type SourceTab = "url" | "image" | "pdf" | "text";

const TABS: { id: SourceTab; label: string; icon: React.ElementType }[] = [
  { id: "url", label: "Website", icon: Link2 },
  { id: "image", label: "Photo", icon: Image },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "text", label: "Text", icon: Type },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AiImportButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SourceTab>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<ExtractedRecipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function resetState() {
    setTab("url");
    setUrl("");
    setText("");
    setFile(null);
    setError(null);
    setRecipe(null);
    setSaved(false);
  }

  function handleClose() {
    setOpen(false);
    resetState();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxMb = tab === "pdf" ? 20 : 5;
    if (f.size > maxMb * 1024 * 1024) {
      setError(`File too large. Max ${maxMb}MB.`);
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setError(null); }
  }

  async function handleExtract() {
    setError(null);
    setLoading(true);
    setRecipe(null);

    try {
      let body: Record<string, unknown>;

      if (tab === "url") {
        if (!url.trim()) { setError("Please enter a URL."); setLoading(false); return; }
        body = { type: "url", url: url.trim() };
      } else if (tab === "text") {
        if (!text.trim()) { setError("Please paste some text."); setLoading(false); return; }
        body = { type: "text", text: text.trim() };
      } else if (tab === "image" || tab === "pdf") {
        if (!file) { setError("Please select a file."); setLoading(false); return; }
        const base64 = await fileToBase64(file);
        body = { type: tab, base64, mediaType: file.type };
      } else {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: { recipe?: ExtractedRecipe; error?: string };
      try {
        data = await res.json() as { recipe?: ExtractedRecipe; error?: string };
      } catch {
        setError(`Server error (HTTP ${res.status}). Please try again.`);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (HTTP ${res.status}).`);
      } else if (data.recipe) {
        setRecipe(data.recipe);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!recipe) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Parse ingredient lines
    const parsedIngredients = recipe.ingredients
      .filter(Boolean)
      .map((line, i) => parseIngredientLine(line, i));

    // Auto-calculate nutrition per ingredient
    let nutritionData: Array<{ calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }> = [];
    try {
      const res = await fetch("/api/recipes/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: parsedIngredients.map(ing => ({
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        nutritionData = data.ingredients;
      }
    } catch { /* skip nutrition if API fails */ }

    const enriched = parsedIngredients.map((ing, i) => ({
      ...ing,
      calories: nutritionData[i]?.calories ?? null,
      protein_g: nutritionData[i]?.protein_g ?? null,
      carbs_g: nutritionData[i]?.carbs_g ?? null,
      fat_g: nutritionData[i]?.fat_g ?? null,
    }));

    // Compute per-serving totals from ingredient nutrition; fall back to AI-extracted macros
    const totals = enriched.reduce(
      (s, ing) => ({ cal: s.cal + (ing.calories ?? 0), pro: s.pro + (ing.protein_g ?? 0), carb: s.carb + (ing.carbs_g ?? 0), fat: s.fat + (ing.fat_g ?? 0) }),
      { cal: 0, pro: 0, carb: 0, fat: 0 }
    );
    const servings = Math.max(recipe.servings ?? 1, 1);
    const calories_per_serving = totals.cal > 0 ? Math.round(totals.cal / servings) : recipe.calories_per_serving;
    const protein_g_per_serving = totals.pro > 0 ? Math.round(totals.pro / servings * 10) / 10 : recipe.protein_g_per_serving;
    const carbs_g_per_serving = totals.carb > 0 ? Math.round(totals.carb / servings * 10) / 10 : recipe.carbs_g_per_serving;
    const fat_g_per_serving = totals.fat > 0 ? Math.round(totals.fat / servings * 10) / 10 : recipe.fat_g_per_serving;

    const { data: inserted, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name: recipe.name,
        description: recipe.description ?? null,
        instructions: joinInstructions(recipe.instructions),
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings ?? 1,
        calories_per_serving,
        protein_g_per_serving,
        carbs_g_per_serving,
        fat_g_per_serving,
        source_url: tab === "url" && url ? url : null,
      })
      .select("id")
      .single();

    if (recipeError || !inserted) {
      setSaving(false);
      setError(recipeError?.message ?? "Failed to save recipe.");
      return;
    }

    if (enriched.length > 0) {
      await supabase.from("recipe_ingredients").insert(
        enriched.map(ing => ({
          recipe_id: inserted.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          sort_order: ing.sort_order,
          grocery_category: ing.grocery_category,
          calories: ing.calories,
          protein_g: ing.protein_g,
          carbs_g: ing.carbs_g,
          fat_g: ing.fat_g,
        }))
      );
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => handleClose(), 1200);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); resetState(); }}
        className="flex items-center gap-2 border border-primary/30 text-primary rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Import with AI</span>
        <span className="sm:hidden">AI Import</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          <div
            className="relative z-10 bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">
                  {recipe ? "Review Recipe" : "Import Recipe with AI"}
                </h2>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {!recipe ? (
                <div className="p-5 space-y-4">
                  {/* Source tabs */}
                  <div className="flex gap-1 bg-muted rounded-xl p-1">
                    {TABS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setFile(null); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          tab === t.id
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <t.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Source hint */}
                  <p className="text-xs text-muted-foreground">
                    {tab === "url" && "Paste any recipe page, blog, social media post, or YouTube URL."}
                    {tab === "image" && "Upload a photo of a recipe card, screenshot, or food photo with caption."}
                    {tab === "pdf" && "Upload a PDF cookbook page, meal plan, or saved recipe document."}
                    {tab === "text" && "Paste a recipe from anywhere — DMs, notes, emails, or any text."}
                  </p>

                  {/* Input area */}
                  {tab === "url" && (
                    <div className="relative">
                      <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleExtract()}
                        placeholder="https://..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  )}

                  {tab === "text" && (
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Paste recipe text here…"
                      rows={7}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                  )}

                  {(tab === "image" || tab === "pdf") && (
                    <div
                      className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                        file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={tab === "image" ? "image/*" : "application/pdf"}
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {file ? (
                        <div className="p-4 flex items-center gap-3">
                          {tab === "image" && file.type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={URL.createObjectURL(file)}
                              alt="preview"
                              className="h-16 w-16 object-cover rounded-lg shrink-0"
                            />
                          ) : (
                            <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                            <button
                              className="text-xs text-primary mt-1"
                              onClick={e => { e.stopPropagation(); setFile(null); }}
                            >
                              Change file
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-10 text-center">
                          <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm font-medium">
                            {tab === "image" ? "Drop a photo here" : "Drop a PDF here"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tab === "image" ? "JPEG, PNG, WEBP up to 5MB" : "PDF up to 20MB"} — or tap to browse
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleExtract}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Extracting recipe…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extract Recipe
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <RecipePreview recipe={recipe} onChange={setRecipe} />
              )}
            </div>

            {/* Footer for review step */}
            {recipe && (
              <div
                className="px-5 py-4 border-t shrink-0 flex gap-3"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
              >
                <button
                  onClick={() => { setRecipe(null); setError(null); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Back
                </button>
                {error && (
                  <p className="flex-1 text-xs text-destructive flex items-center">{error}</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    saved
                      ? "bg-green-600 text-white"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  }`}
                >
                  {saved ? (
                    <><Check className="h-4 w-4" /> Saved!</>
                  ) : saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>Save Recipe <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function RecipePreview({
  recipe,
  onChange,
}: {
  recipe: ExtractedRecipe;
  onChange: (r: ExtractedRecipe) => void;
}) {
  function update(field: keyof ExtractedRecipe, value: unknown) {
    onChange({ ...recipe, [field]: value });
  }

  function updateListItem(field: "ingredients" | "instructions", index: number, value: string) {
    const arr = [...recipe[field]];
    arr[index] = value;
    update(field, arr);
  }

  function addListItem(field: "ingredients" | "instructions") {
    update(field, [...recipe[field], ""]);
  }

  function removeListItem(field: "ingredients" | "instructions", index: number) {
    update(field, recipe[field].filter((_, i) => i !== index));
  }

  return (
    <div className="p-5 space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recipe Name</label>
        <input
          value={recipe.name}
          onChange={e => update("name", e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Description */}
      {recipe.description && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
          <textarea
            value={recipe.description}
            onChange={e => update("description", e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
        </div>
      )}

      {/* Time & servings row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Prep (min)", field: "prep_time" as const },
          { label: "Cook (min)", field: "cook_time" as const },
          { label: "Servings", field: "servings" as const },
        ].map(({ label, field }) => (
          <div key={field} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
            <input
              type="number"
              min="0"
              value={recipe[field] ?? ""}
              onChange={e => update(field, e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        ))}
      </div>

      {/* Macros row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Cal", field: "calories_per_serving" as const },
          { label: "Protein g", field: "protein_g_per_serving" as const },
          { label: "Carbs g", field: "carbs_g_per_serving" as const },
          { label: "Fat g", field: "fat_g_per_serving" as const },
        ].map(({ label, field }) => (
          <div key={field} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
            <input
              type="number"
              min="0"
              value={recipe[field] ?? ""}
              onChange={e => update(field, e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-input bg-background px-2.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        ))}
      </div>

      {/* Ingredients */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Ingredients ({recipe.ingredients.length})
        </label>
        <div className="space-y-1.5">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={ing}
                onChange={e => updateListItem("ingredients", i, e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                onClick={() => removeListItem("ingredients", i)}
                className="shrink-0 text-muted-foreground hover:text-destructive p-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addListItem("ingredients")}
            className="text-xs text-primary font-medium flex items-center gap-1 px-1"
          >
            + Add ingredient
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Instructions ({recipe.instructions.length} steps)
        </label>
        <div className="space-y-2">
          {recipe.instructions.map((step, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-xs font-semibold flex items-center justify-center mt-2 text-muted-foreground">
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={e => updateListItem("instructions", i, e.target.value)}
                rows={2}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <button
                onClick={() => removeListItem("instructions", i)}
                className="shrink-0 text-muted-foreground hover:text-destructive p-2 mt-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addListItem("instructions")}
            className="text-xs text-primary font-medium flex items-center gap-1 px-1"
          >
            + Add step
          </button>
        </div>
      </div>
    </div>
  );
}
