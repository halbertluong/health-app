import { pgTable, uuid, text, timestamp, numeric, date, integer, index } from "drizzle-orm/pg-core";
import { workoutTypeEnum, workoutStatusEnum } from "./enums";
import { users } from "./users";

export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: workoutTypeEnum("type").notNull(),
  notes: text("notes"),
  isTemplate: integer("is_template").notNull().default(0), // 0 = false, 1 = true (bool compat)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_workouts_user").on(t.userId),
]);

export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
  durationS: integer("duration_s"),
  distanceM: numeric("distance_m", { precision: 8, scale: 2 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  index("idx_workout_exercises_workout").on(t.workoutId),
]);

export const workoutSchedule = pgTable("workout_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  workoutId: uuid("workout_id").references(() => workouts.id, { onDelete: "set null" }),
  workoutType: workoutTypeEnum("workout_type").notNull(),
  plannedDuration: integer("planned_duration"),
  actualDuration: integer("actual_duration"),
  status: workoutStatusEnum("status").notNull().default("planned"),
  notes: text("notes"),
  healthKitId: text("health_kit_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_workout_schedule_user_date").on(t.userId, t.date),
]);
