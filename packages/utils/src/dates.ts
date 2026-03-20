/** Get Monday of the week containing the given date (YYYY-MM-DD) */
export function getWeekStart(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return toDateString(monday);
}

/** Get all 7 dates (Mon–Sun) for a week given Monday's date */
export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(toDateString(d));
  }
  return dates;
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MEAL_TYPE_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
