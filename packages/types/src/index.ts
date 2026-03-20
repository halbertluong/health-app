// =====================
// ENUMS
// =====================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealStatus =
  | "planned"
  | "cooked"
  | "eaten_as_planned"
  | "modified"
  | "skipped"
  | "replaced";
export type WorkoutType =
  | "weight_training"
  | "pickleball"
  | "tennis"
  | "swimming"
  | "cardio"
  | "recovery"
  | "mobility"
  | "other";
export type WorkoutStatus = "planned" | "completed" | "skipped" | "partial";
export type GroceryCategory =
  | "produce"
  | "meat_seafood"
  | "dairy"
  | "pantry"
  | "frozen"
  | "beverages"
  | "household"
  | "other";
export type LogSource = "ate_as_planned" | "quick_add" | "manual" | "ai_photo";

// =====================
// MODELS
// =====================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MacroTarget {
  id: string;
  user_id: string;
  date: string | null; // null = default targets
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  prep_time: number | null; // minutes
  cook_time: number | null; // minutes
  servings: number;
  image_url: string | null;
  calories_per_serving: number | null;
  protein_g_per_serving: number | null;
  carbs_g_per_serving: number | null;
  fat_g_per_serving: number | null;
  fiber_g_per_serving: number | null;
  sugar_g_per_serving: number | null;
  sodium_mg_per_serving: number | null;
  cholesterol_mg_per_serving: number | null;
  saturated_fat_g_per_serving: number | null;
  source_url: string | null;
  source_name: string | null;
  serving_size: string | null;
  notes: string | null;
  rating: number | null; // 1–5
  difficulty: "easy" | "medium" | "hard" | null;
  is_favorite: boolean;
  categories: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  grocery_category: GroceryCategory;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  sort_order: number;
}

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: RecipeIngredient[];
}

export interface MealPlanSlot {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  planned_recipe_id: string | null;
  planned_servings: number;
  planned_calories: number | null;
  planned_protein_g: number | null;
  planned_carbs_g: number | null;
  planned_fat_g: number | null;
  notes: string | null;
  status: MealStatus;
  created_at: string;
  updated_at: string;
}

export interface MealPlanSlotWithRecipe extends MealPlanSlot {
  recipe: Recipe | null;
}

export interface GroceryList {
  id: string;
  user_id: string;
  week_start: string;
  generated_at: string;
}

export interface GroceryItem {
  id: string;
  grocery_list_id: string;
  ingredient_name: string;
  aggregated_qty: number;
  unit: string;
  category: GroceryCategory;
  have_on_hand: boolean;
  checked: boolean;
  notes: string | null;
  sort_order: number;
}

export interface PantryItem {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  in_stock: boolean;
  category: GroceryCategory;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  type: WorkoutType;
  notes: string | null;
  is_template: boolean;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_s: number | null;
  distance_m: number | null;
  notes: string | null;
  sort_order: number;
}

export interface WorkoutWithExercises extends Workout {
  workout_exercises: WorkoutExercise[];
}

export interface WorkoutSchedule {
  id: string;
  user_id: string;
  date: string;
  workout_id: string | null;
  workout_type: WorkoutType;
  planned_duration: number | null;
  actual_duration: number | null;
  status: WorkoutStatus;
  notes: string | null;
  health_kit_id: string | null;
  created_at: string;
}

export interface WorkoutScheduleWithWorkout extends WorkoutSchedule {
  workout: Workout | null;
}

export interface MealLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType | null;
  linked_plan_slot_id: string | null;
  source_type: LogSource;
  notes: string | null;
  image_url: string | null;
  confidence_score: number | null;
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
}

export interface MealLogItem {
  id: string;
  meal_log_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface MealLogWithItems extends MealLog {
  meal_log_items: MealLogItem[];
}

export interface HealthMetricsDaily {
  id: string;
  user_id: string;
  date: string;
  steps: number | null;
  active_calories: number | null;
  sleep_hours: number | null;
  weight_kg: number | null;
  resting_hr: number | null;
  workout_minutes: number | null;
  source: string;
  synced_at: string;
}

// =====================
// API TYPES
// =====================

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DayMacroSummary {
  date: string;
  planned: Macros;
  actual: Macros;
}

export interface AiFoodLogResult {
  foods: AiFoodItem[];
  confidence_score: number;
  raw_response: string;
}

export interface AiFoodItem {
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}
