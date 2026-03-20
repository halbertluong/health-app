import { pgTable, uuid, text, timestamp, numeric, date, integer, index, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const healthMetricsDaily = pgTable(
  "health_metrics_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    steps: integer("steps"),
    activeCalories: integer("active_calories"),
    sleepHours: numeric("sleep_hours", { precision: 4, scale: 1 }),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
    restingHr: integer("resting_hr"),
    workoutMinutes: integer("workout_minutes"),
    source: text("source").default("apple_health"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.date),
    index("idx_health_metrics_user_date").on(t.userId, t.date),
  ]
);
