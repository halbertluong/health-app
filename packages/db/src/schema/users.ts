import { pgTable, uuid, text, timestamp, numeric, date, integer, boolean, unique } from "drizzle-orm/pg-core";
import { groceryCategoryEnum } from "./enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const macroTargets = pgTable(
  "macro_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date"),
    calories: integer("calories").notNull(),
    proteinG: numeric("protein_g", { precision: 6, scale: 1 }).notNull(),
    carbsG: numeric("carbs_g", { precision: 6, scale: 1 }).notNull(),
    fatG: numeric("fat_g", { precision: 6, scale: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.date)]
);

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ingredientName: text("ingredient_name").notNull(),
    quantity: numeric("quantity", { precision: 8, scale: 2 }),
    unit: text("unit"),
    inStock: boolean("in_stock").notNull().default(true),
    category: groceryCategoryEnum("category").notNull().default("other"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.ingredientName)]
);
