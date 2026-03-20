import { pgTable, uuid, text, timestamp, numeric, date, boolean, integer, index, unique } from "drizzle-orm/pg-core";
import { mealTypeEnum, mealStatusEnum, groceryCategoryEnum } from "./enums";
import { users } from "./users";
import { recipes } from "./recipes";

export const mealPlanSlots = pgTable(
  "meal_plan_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    plannedRecipeId: uuid("planned_recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    plannedServings: numeric("planned_servings", { precision: 4, scale: 1 }).notNull().default("1"),
    plannedCalories: numeric("planned_calories", { precision: 7, scale: 1 }),
    plannedProteinG: numeric("planned_protein_g", { precision: 6, scale: 1 }),
    plannedCarbsG: numeric("planned_carbs_g", { precision: 6, scale: 1 }),
    plannedFatG: numeric("planned_fat_g", { precision: 6, scale: 1 }),
    notes: text("notes"),
    status: mealStatusEnum("status").notNull().default("planned"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.date, t.mealType),
    index("idx_meal_plan_slots_user_date").on(t.userId, t.date),
  ]
);

export const groceryLists = pgTable(
  "grocery_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.weekStart)]
);

export const groceryItems = pgTable("grocery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  groceryListId: uuid("grocery_list_id").notNull().references(() => groceryLists.id, { onDelete: "cascade" }),
  ingredientName: text("ingredient_name").notNull(),
  aggregatedQty: numeric("aggregated_qty", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  category: groceryCategoryEnum("category").notNull().default("other"),
  haveOnHand: boolean("have_on_hand").notNull().default(false),
  checked: boolean("checked").notNull().default(false),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  index("idx_grocery_items_list").on(t.groceryListId),
]);
