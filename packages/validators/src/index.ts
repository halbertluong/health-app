import { z } from "zod";

// =====================
// RECIPE
// =====================

export const RecipeIngredientSchema = z.object({
  ingredient_name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  grocery_category: z.enum([
    "produce", "meat_seafood", "dairy", "pantry",
    "frozen", "beverages", "household", "other",
  ]),
  calories: z.number().nonnegative().nullable().optional(),
  protein_g: z.number().nonnegative().nullable().optional(),
  carbs_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const CreateRecipeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  instructions: z.string().max(10000).nullable().optional(),
  prep_time: z.number().int().nonnegative().nullable().optional(),
  cook_time: z.number().int().nonnegative().nullable().optional(),
  servings: z.number().positive().max(100),
  serving_size: z.string().max(100).nullable().optional(),
  is_public: z.boolean().optional(),
  source_url: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  source_name: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  is_favorite: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  fiber_g_per_serving: z.number().nonnegative().nullable().optional(),
  sugar_g_per_serving: z.number().nonnegative().nullable().optional(),
  sodium_mg_per_serving: z.number().nonnegative().nullable().optional(),
  cholesterol_mg_per_serving: z.number().nonnegative().nullable().optional(),
  saturated_fat_g_per_serving: z.number().nonnegative().nullable().optional(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
});

export const UpdateRecipeSchema = CreateRecipeSchema.partial();

// =====================
// MEAL PLAN
// =====================

export const CreateMealPlanSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  planned_recipe_id: z.string().uuid().nullable().optional(),
  planned_servings: z.number().positive().max(20),
  notes: z.string().max(500).nullable().optional(),
});

export const UpdateMealPlanSlotSchema = z.object({
  planned_recipe_id: z.string().uuid().nullable().optional(),
  planned_servings: z.number().positive().max(20).optional(),
  status: z
    .enum(["planned", "cooked", "eaten_as_planned", "modified", "skipped", "replaced"])
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

// =====================
// WORKOUT
// =====================

export const WorkoutExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  sets: z.number().int().positive().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  weight_kg: z.number().nonnegative().nullable().optional(),
  duration_s: z.number().int().nonnegative().nullable().optional(),
  distance_m: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const CreateWorkoutSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum([
    "weight_training", "pickleball", "tennis", "swimming",
    "cardio", "recovery", "mobility", "other",
  ]),
  notes: z.string().max(2000).nullable().optional(),
  is_template: z.boolean().optional(),
  exercises: z.array(WorkoutExerciseSchema).optional(),
});

export const ScheduleWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workout_id: z.string().uuid().nullable().optional(),
  workout_type: z.enum([
    "weight_training", "pickleball", "tennis", "swimming",
    "cardio", "recovery", "mobility", "other",
  ]),
  planned_duration: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// =====================
// MEAL LOG
// =====================

export const MealLogItemSchema = z.object({
  food_name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().nonnegative().nullable().optional(),
  protein_g: z.number().nonnegative().nullable().optional(),
  carbs_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().nullable().optional(),
});

export const CreateMealLogSchema = z.object({
  logged_at: z.string().datetime().optional(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable().optional(),
  linked_plan_slot_id: z.string().uuid().nullable().optional(),
  source_type: z.enum(["ate_as_planned", "quick_add", "manual", "ai_photo"]),
  notes: z.string().max(1000).nullable().optional(),
  confidence_score: z.number().min(0).max(1).nullable().optional(),
  items: z.array(MealLogItemSchema).min(1),
});

// =====================
// GROCERY
// =====================

export const GenerateGroceryListSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const UpdateGroceryItemSchema = z.object({
  have_on_hand: z.boolean().optional(),
  checked: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// =====================
// PANTRY
// =====================

export const UpsertPantryItemSchema = z.object({
  ingredient_name: z.string().min(1).max(200),
  quantity: z.number().nonnegative().nullable().optional(),
  unit: z.string().nullable().optional(),
  in_stock: z.boolean(),
  category: z
    .enum(["produce", "meat_seafood", "dairy", "pantry", "frozen", "beverages", "household", "other"])
    .optional(),
});

// =====================
// MACRO TARGETS
// =====================

export const SetMacroTargetSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  calories: z.number().int().positive(),
  protein_g: z.number().positive(),
  carbs_g: z.number().positive(),
  fat_g: z.number().positive(),
});

// =====================
// AI FOOD LOG
// =====================

export const AiFoodLogRequestSchema = z.object({
  image_url: z.string().url(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  linked_plan_slot_id: z.string().uuid().optional(),
});

export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;
export type CreateMealPlanSlotInput = z.infer<typeof CreateMealPlanSlotSchema>;
export type UpdateMealPlanSlotInput = z.infer<typeof UpdateMealPlanSlotSchema>;
export type CreateWorkoutInput = z.infer<typeof CreateWorkoutSchema>;
export type ScheduleWorkoutInput = z.infer<typeof ScheduleWorkoutSchema>;
export type CreateMealLogInput = z.infer<typeof CreateMealLogSchema>;
export type UpsertPantryItemInput = z.infer<typeof UpsertPantryItemSchema>;
export type SetMacroTargetInput = z.infer<typeof SetMacroTargetSchema>;
export type AiFoodLogRequestInput = z.infer<typeof AiFoodLogRequestSchema>;
