import { pgTable, uuid, text, timestamp, numeric, integer, boolean, index } from "drizzle-orm/pg-core";
import { groceryCategoryEnum } from "./enums";
import { users } from "./users";

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: numeric("servings", { precision: 4, scale: 1 }).notNull().default("1"),
  imageUrl: text("image_url"),
  caloriesPerServing: numeric("calories_per_serving", { precision: 7, scale: 1 }),
  proteinGPerServing: numeric("protein_g_per_serving", { precision: 6, scale: 1 }),
  carbsGPerServing: numeric("carbs_g_per_serving", { precision: 6, scale: 1 }),
  fatGPerServing: numeric("fat_g_per_serving", { precision: 6, scale: 1 }),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_recipes_user").on(t.userId),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  ingredientName: text("ingredient_name").notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  groceryCategory: groceryCategoryEnum("grocery_category").notNull().default("other"),
  calories: numeric("calories", { precision: 7, scale: 1 }),
  proteinG: numeric("protein_g", { precision: 6, scale: 1 }),
  carbsG: numeric("carbs_g", { precision: 6, scale: 1 }),
  fatG: numeric("fat_g", { precision: 6, scale: 1 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  index("idx_recipe_ingredients_recipe").on(t.recipeId),
]);
