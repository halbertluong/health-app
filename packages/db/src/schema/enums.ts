import { pgEnum } from "drizzle-orm/pg-core";

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const mealStatusEnum = pgEnum("meal_status", [
  "planned",
  "cooked",
  "eaten_as_planned",
  "modified",
  "skipped",
  "replaced",
]);

export const workoutTypeEnum = pgEnum("workout_type", [
  "weight_training",
  "pickleball",
  "tennis",
  "swimming",
  "cardio",
  "recovery",
  "mobility",
  "other",
]);

export const workoutStatusEnum = pgEnum("workout_status", [
  "planned",
  "completed",
  "skipped",
  "partial",
]);

export const groceryCategoryEnum = pgEnum("grocery_category", [
  "produce",
  "meat_seafood",
  "dairy",
  "pantry",
  "frozen",
  "beverages",
  "household",
  "other",
]);

export const logSourceEnum = pgEnum("log_source", [
  "ate_as_planned",
  "quick_add",
  "manual",
  "ai_photo",
]);
