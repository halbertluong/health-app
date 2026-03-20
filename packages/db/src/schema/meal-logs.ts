import { pgTable, uuid, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { mealTypeEnum, logSourceEnum } from "./enums";
import { users } from "./users";
import { mealPlanSlots } from "./meal-plans";

export const mealLogs = pgTable("meal_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  mealType: mealTypeEnum("meal_type"),
  linkedPlanSlotId: uuid("linked_plan_slot_id").references(() => mealPlanSlots.id, { onDelete: "set null" }),
  sourceType: logSourceEnum("source_type").notNull(),
  notes: text("notes"),
  imageUrl: text("image_url"),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }),
  totalCalories: numeric("total_calories", { precision: 7, scale: 1 }),
  totalProteinG: numeric("total_protein_g", { precision: 6, scale: 1 }),
  totalCarbsG: numeric("total_carbs_g", { precision: 6, scale: 1 }),
  totalFatG: numeric("total_fat_g", { precision: 6, scale: 1 }),
}, (t) => [
  index("idx_meal_logs_user_date").on(t.userId, t.loggedAt),
]);

export const mealLogItems = pgTable("meal_log_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealLogId: uuid("meal_log_id").notNull().references(() => mealLogs.id, { onDelete: "cascade" }),
  foodName: text("food_name").notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  calories: numeric("calories", { precision: 7, scale: 1 }),
  proteinG: numeric("protein_g", { precision: 6, scale: 1 }),
  carbsG: numeric("carbs_g", { precision: 6, scale: 1 }),
  fatG: numeric("fat_g", { precision: 6, scale: 1 }),
}, (t) => [
  index("idx_meal_log_items_log").on(t.mealLogId),
]);
