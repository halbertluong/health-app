"use client";

import { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { parseIngredientLine, joinInstructions } from "@/lib/recipe-helpers";

interface ParsedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  source_url: string | null;
  // Image data extracted from ZIP
  imageDataUrl: string | null;   // base64 data: URL for preview
  imageBlob: Blob | null;        // raw blob for Supabase upload
  imageMimeType: string;
  selected: boolean;
}

// ─── Time parsing ────────────────────────────────────────────────────────────

function parseTimeToMinutes(val: string | null | undefined): number | null {
  if (!val) return null;
  if (val.startsWith("P")) {
    const h = val.match(/(\d+)H/);
    const m = val.match(/(\d+)M/);
    const total = (h?.[1] ? parseInt(h[1]) * 60 : 0) + (m?.[1] ? parseInt(m[1]) : 0);
    return total > 0 ? total : null;
  }
  const hours = val.match(/(\d+)\s*h(?:our)?s?/i);
  const mins  = val.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
  const total = (hours?.[1] ? parseInt(hours[1]) * 60 : 0) + (mins?.[1] ? parseInt(mins[1]) : 0);
  return total > 0 ? total : null;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function textLines(el: Element | null): string[] {
  if (!el) return [];
  const items = el.querySelectorAll("li, p");
  if (items.length > 0) {
    return Array.from(items).map(n => n.textContent?.trim() ?? "").filter(Boolean);
  }
  return (el.textContent ?? "").split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 1);
}

// ─── Recipe Keeper parser ─────────────────────────────────────────────────────

interface RawParsed extends Omit<ParsedRecipe, "imageDataUrl" | "imageBlob" | "imageMimeType"> {
  imagePath: string | null; // relative path inside ZIP e.g. "images/abc.jpg"
}

function parseRecipeKeeperHtml(doc: Document): RawParsed[] {
  const recipeEls = doc.querySelectorAll(".recipe-details");
  if (recipeEls.length === 0) return [];

  return Array.from(recipeEls).map((el) => {
    const name =
      el.querySelector(".recipe-name")?.textContent?.trim() ||
      el.querySelector("h2")?.textContent?.trim() ||
      el.querySelector("h1")?.textContent?.trim() ||
      "Untitled Recipe";

    const description = el.querySelector(".recipe-description")?.textContent?.trim() ?? "";

    // Source URL — try the anchor href first, fall back to plain text
    const sourceAnchor = el.querySelector(".recipe-source-url a, .recipe-source a");
    const sourceText = el.querySelector(".recipe-source-url, .recipe-source")?.textContent?.trim() ?? "";
    const source_url =
      sourceAnchor?.getAttribute("href") ??
      (sourceText.startsWith("http") ? sourceText : null);

    // Photo path (relative to HTML file inside ZIP)
    const imageSrc = el.querySelector(".recipe-photo img, .recipe-image img")?.getAttribute("src") ?? null;
    // Normalise: strip leading "./" or "../"
    const imagePath = imageSrc ? imageSrc.replace(/^\.{1,2}\//, "") : null;

    const ingredients = textLines(el.querySelector(".recipe-ingredients"));
    const instructions = textLines(el.querySelector(".recipe-method"));

    const prepTime = parseTimeToMinutes(el.querySelector(".recipe-preparation-time")?.textContent);
    const cookTime = parseTimeToMinutes(el.querySelector(".recipe-cooking-time")?.textContent);

    const yieldText = el.querySelector(".recipe-yield")?.textContent?.trim() ?? "";
    const servings = yieldText ? parseInt(yieldText) || null : null;

    const nutrition = el.querySelector(".recipe-nutritional-info")?.textContent ?? "";
    const calMatch = nutrition.match(/calorie[^:]*:\s*(\d+)/i);

    return {
      name,
      description,
      ingredients,
      instructions,
      prep_time: prepTime,
      cook_time: cookTime,
      servings,
      calories_per_serving: calMatch?.[1] ? parseInt(calMatch[1]) : null,
      source_url,
      imagePath,
      selected: true,
    };
  });
}

// ─── Schema.org fallback ──────────────────────────────────────────────────────

function parseSchemaOrgHtml(doc: Document): RawParsed[] {
  const recipeEls = doc.querySelectorAll(
    "[itemtype='http://schema.org/Recipe'], [itemtype='https://schema.org/Recipe']"
  );
  if (recipeEls.length === 0) return [];

  const prop = (el: Element, name: string) =>
    el.querySelector(`[itemprop="${name}"]`)?.textContent?.trim() ?? "";
  const propAttr = (el: Element, name: string, attr: string) =>
    el.querySelector(`[itemprop="${name}"]`)?.getAttribute(attr) ?? undefined;

  return Array.from(recipeEls).map((el) => ({
    name: prop(el, "name") || "Untitled Recipe",
    description: prop(el, "description"),
    ingredients: Array.from(el.querySelectorAll("[itemprop='recipeIngredient']"))
      .map(i => i.textContent?.trim() ?? "").filter(Boolean),
    instructions: Array.from(el.querySelectorAll("[itemprop='recipeInstructions']"))
      .map(i => i.textContent?.trim() ?? "").filter(Boolean),
    prep_time: parseTimeToMinutes(propAttr(el, "prepTime", "content") ?? prop(el, "prepTime")),
    cook_time: parseTimeToMinutes(propAttr(el, "cookTime", "content") ?? prop(el, "cookTime")),
    servings: parseInt(prop(el, "recipeYield")) || null,
    calories_per_serving: parseInt(prop(el, "calories").replace(/\D/g, "")) || null,
    source_url: null,
    imagePath: null,
    selected: true,
  }));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipeKeeperImport() {
  const [open, setOpen]               = useState(false);
  const [step, setStep]               = useState<"upload" | "preview" | "done">("upload");
  const [recipes, setRecipes]         = useState<ParsedRecipe[]>([]);
  const [importing, setImporting]     = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const router  = useRouter();

  function reset() {
    setStep("upload");
    setRecipes([]);
    setError(null);
    setImportedCount(0);
    setExpanded(new Set());
  }

  async function handleFile(file: File) {
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);

      const allPaths: string[] = [];
      zip.forEach((path) => allPaths.push(path));

      const htmlFile =
        zip.file(/recipekeeperhtml[/\\]recipes\.html$/i)[0] ??
        zip.file(/recipes\.html$/i)[0] ??
        zip.file(/\.html$/i)[0];

      if (!htmlFile) {
        const fileList = allPaths.slice(0, 8).join(", ");
        setError(
          `No HTML file found in ZIP. Files found: ${fileList || "none"}. ` +
          `Make sure you exported using "HTML" in Recipe Keeper Settings → Export Recipes.`
        );
        return;
      }

      const htmlContent = await htmlFile.async("string");

      // Parse recipes from HTML
      const htmlDoc = new DOMParser().parseFromString(htmlContent, "text/html");
      const rawList =
        parseRecipeKeeperHtml(htmlDoc).length > 0
          ? parseRecipeKeeperHtml(htmlDoc)
          : parseSchemaOrgHtml(htmlDoc);

      if (rawList.length === 0) {
        setError(
          `Found "${htmlFile.name}" but couldn't extract any recipes. ` +
          `Try using "Import with AI" instead — paste the recipe text directly.`
        );
        return;
      }

      // Determine the folder that contains the HTML so we can resolve image paths
      const htmlFolder = htmlFile.name.includes("/")
        ? htmlFile.name.slice(0, htmlFile.name.lastIndexOf("/") + 1)
        : "";

      // Enrich with image blobs from ZIP
      const enriched: ParsedRecipe[] = await Promise.all(
        rawList.map(async (r) => {
          if (!r.imagePath) {
            return { ...r, imageDataUrl: null, imageBlob: null, imageMimeType: "image/jpeg" };
          }

          // Try several path variations to find the image inside the ZIP
          const candidates = [
            htmlFolder + r.imagePath,
            r.imagePath,
            htmlFolder + r.imagePath.replace(/^images\//, ""),
          ];

          let imageFile: JSZip.JSZipObject | null = null;
          for (const candidate of candidates) {
            const found = zip.file(candidate);
            if (found) { imageFile = found; break; }
          }

          if (!imageFile) {
            return { ...r, imageDataUrl: null, imageBlob: null, imageMimeType: "image/jpeg" };
          }

          try {
            const blob = await imageFile.async("blob");
            const ext  = r.imagePath.split(".").pop()?.toLowerCase() ?? "jpg";
            const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            const dataUrl = await blobToDataUrl(blob);
            return { ...r, imageDataUrl: dataUrl, imageBlob: blob, imageMimeType: mime };
          } catch {
            return { ...r, imageDataUrl: null, imageBlob: null, imageMimeType: "image/jpeg" };
          }
        })
      );

      setRecipes(enriched);
      setStep("preview");
    } catch {
      setError("Failed to read ZIP file. Make sure you're uploading a .zip file exported from Recipe Keeper.");
    }
  }

  function toggleSelect(i: number) {
    setRecipes(rs => rs.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  }

  function toggleExpand(i: number) {
    setExpanded(e => { const n = new Set(e); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  async function handleImport() {
    setImporting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    const toImport = recipes.filter(r => r.selected);
    let successCount = 0;

    for (const r of toImport) {
      // Upload image to Supabase storage if present
      let image_url: string | null = null;
      if (r.imageBlob) {
        const ext  = r.imageMimeType.split("/")[1] ?? "jpg";
        const path = `${user.id}/${Date.now()}-${r.name.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.${ext}`;
        const { data: uploaded } = await supabase.storage
          .from("recipe-images")
          .upload(path, r.imageBlob, { contentType: r.imageMimeType, upsert: false });
        if (uploaded) {
          image_url = supabase.storage.from("recipe-images").getPublicUrl(uploaded.path).data.publicUrl;
        }
      }

      // Build description — append source URL if present
      const description = [
        r.description || null,
        r.source_url ? `Source: ${r.source_url}` : null,
      ].filter(Boolean).join("\n\n") || null;

      const { data: inserted, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          user_id: user.id,
          name: r.name,
          description,
          instructions: joinInstructions(r.instructions),
          prep_time: r.prep_time,
          cook_time: r.cook_time,
          servings: r.servings ?? 1,
          calories_per_serving: r.calories_per_serving,
          image_url,
        })
        .select("id")
        .single();

      if (recipeError || !inserted) continue;

      if (r.ingredients.length > 0) {
        const parsedRows = r.ingredients.filter(Boolean).map((line, i) => ({
          ...parseIngredientLine(line, i),
        }));

        // Lookup nutrition for each ingredient
        let nutritionData: Array<{ calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }> = [];
        try {
          const res = await fetch("/api/recipes/nutrition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ingredients: parsedRows.map(ing => ({
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

        const rows = parsedRows.map((ing, i) => ({
          recipe_id: inserted.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          sort_order: ing.sort_order,
          grocery_category: ing.grocery_category,
          calories: nutritionData[i]?.calories ?? null,
          protein_g: nutritionData[i]?.protein_g ?? null,
          carbs_g: nutritionData[i]?.carbs_g ?? null,
          fat_g: nutritionData[i]?.fat_g ?? null,
        }));

        // Compute per-serving totals and update recipe row
        const totals = rows.reduce(
          (s, ing) => ({ cal: s.cal + (ing.calories ?? 0), pro: s.pro + (ing.protein_g ?? 0), carb: s.carb + (ing.carbs_g ?? 0), fat: s.fat + (ing.fat_g ?? 0) }),
          { cal: 0, pro: 0, carb: 0, fat: 0 }
        );
        const servings = Math.max(r.servings ?? 1, 1);
        if (totals.cal > 0) {
          await supabase.from("recipes").update({
            calories_per_serving: Math.round(totals.cal / servings),
            protein_g_per_serving: Math.round(totals.pro / servings * 10) / 10,
            carbs_g_per_serving: Math.round(totals.carb / servings * 10) / 10,
            fat_g_per_serving: Math.round(totals.fat / servings * 10) / 10,
          }).eq("id", inserted.id);
        }

        await supabase.from("recipe_ingredients").insert(rows);
      }

      successCount++;
    }

    setImporting(false);
    setImportedCount(successCount);
    setStep("done");
    router.refresh();
  }

  const selectedCount = recipes.filter(r => r.selected).length;
  const allSelected   = selectedCount === recipes.length && recipes.length > 0;

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="flex items-center gap-2 border border-border text-muted-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Import from Recipe Keeper</span>
        <span className="sm:hidden">Import</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">Recipe Keeper Import</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              {step === "upload" && (
                <div className="p-5 space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium">How to export from Recipe Keeper:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Open Recipe Keeper on your device</li>
                      <li>Go to Settings → Export Recipes</li>
                      <li>Choose <strong>HTML</strong> format</li>
                      <li>Save the ZIP file and upload it here</li>
                    </ol>
                  </div>

                  <div
                    className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium">Drop your ZIP here</p>
                    <p className="text-xs text-muted-foreground mt-1">or tap to browse</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}
                </div>
              )}

              {step === "preview" && (
                <div className="p-5 space-y-3">
                  {/* Summary + select-all */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found <span className="font-semibold text-foreground">{recipes.length}</span> recipes
                      {recipes.some(r => r.imageDataUrl) && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-primary">
                          <ImageIcon className="h-3 w-3" />
                          {recipes.filter(r => r.imageDataUrl).length} with photos
                        </span>
                      )}
                    </p>
                    <button
                      className="text-xs text-primary font-medium"
                      onClick={() => setRecipes(rs => rs.map(r => ({ ...r, selected: !allSelected })))}
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {recipes.map((recipe, i) => (
                      <div
                        key={i}
                        className={`border rounded-xl overflow-hidden transition-colors ${recipe.selected ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={recipe.selected}
                            onChange={() => toggleSelect(i)}
                            className="h-4 w-4 rounded accent-primary shrink-0"
                          />
                          {/* Thumbnail preview */}
                          {recipe.imageDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={recipe.imageDataUrl}
                              alt={recipe.name}
                              className="h-9 w-9 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                          <p className="text-sm font-medium flex-1 truncate">{recipe.name}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {recipe.source_url && (
                              <a
                                href={recipe.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-muted-foreground hover:text-primary"
                                title="View source"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {recipe.ingredients.length > 0 && (
                              <span className="text-xs text-muted-foreground">{recipe.ingredients.length} ing.</span>
                            )}
                            <button onClick={() => toggleExpand(i)} className="text-muted-foreground hover:text-foreground">
                              {expanded.has(i) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {expanded.has(i) && (
                          <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1.5 border-t border-border/50 pt-2">
                            {recipe.imageDataUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={recipe.imageDataUrl}
                                alt={recipe.name}
                                className="w-full h-32 object-cover rounded-lg mb-2"
                              />
                            )}
                            {recipe.description && <p>{recipe.description}</p>}
                            {recipe.source_url && (
                              <p className="flex items-center gap-1">
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate">
                                  {recipe.source_url}
                                </a>
                              </p>
                            )}
                            {recipe.ingredients.length > 0 && (
                              <p>
                                <span className="font-medium text-foreground">Ingredients: </span>
                                {recipe.ingredients.slice(0, 4).join(", ")}
                                {recipe.ingredients.length > 4 ? ` +${recipe.ingredients.length - 4} more` : ""}
                              </p>
                            )}
                            <div className="flex gap-3">
                              {recipe.prep_time && <span>Prep: {recipe.prep_time}m</span>}
                              {recipe.cook_time && <span>Cook: {recipe.cook_time}m</span>}
                              {recipe.calories_per_serving && <span>{recipe.calories_per_serving} cal</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <CheckCircle className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="font-semibold">Import complete!</p>
                      <p className="text-sm text-muted-foreground">{importedCount} recipes added to your library</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            {step === "preview" && (
              <div className="px-5 py-4 border-t shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedCount === 0}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {importing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Importing…
                    </span>
                  ) : `Import ${selectedCount} recipe${selectedCount !== 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
