import { createServerClient } from "@/lib/supabase/server";
import { GroceryList } from "@/components/grocery/grocery-list";
import { getWeekStart } from "@health-app/utils";

interface GroceryPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function GroceryPage({ searchParams }: GroceryPageProps) {
  const { week } = await searchParams;
  const weekStart = week ?? getWeekStart(new Date());

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: list } = await supabase
    .from("grocery_lists")
    .select("*, grocery_items(*)")
    .eq("user_id", user!.id)
    .eq("week_start", weekStart)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grocery List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of {new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })}
          </p>
        </div>
        <a
          href={`/planner?week=${weekStart}`}
          className="text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 transition-colors"
        >
          ← Back to Planner
        </a>
      </div>

      {list ? (
        <GroceryList list={list as any} />
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>No grocery list for this week yet.</p>
          <p className="text-sm mt-1">
            Go to the{" "}
            <a href={`/planner?week=${weekStart}`} className="text-primary underline">
              Weekly Planner
            </a>{" "}
            and click &ldquo;Generate Grocery List&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}
