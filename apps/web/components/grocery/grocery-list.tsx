"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { GroceryItem, GroceryList as GroceryListType } from "@health-app/types";
import { groupByCategory, GROCERY_CATEGORY_LABELS } from "@health-app/utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface GroceryListProps {
  list: GroceryListType & { grocery_items: GroceryItem[] };
}

export function GroceryList({ list }: GroceryListProps) {
  const [items, setItems] = useState<GroceryItem[]>(list.grocery_items);

  const supabase = createClient();

  async function toggleChecked(item: GroceryItem) {
    const newChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    );
    await supabase
      .from("grocery_items")
      .update({ checked: newChecked })
      .eq("id", item.id);
  }

  async function toggleHaveOnHand(item: GroceryItem) {
    const newHave = !item.have_on_hand;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, have_on_hand: newHave, checked: newHave } : i
      )
    );
    await supabase
      .from("grocery_items")
      .update({ have_on_hand: newHave, checked: newHave })
      .eq("id", item.id);
  }

  const grouped = groupByCategory(items);
  const categories = Object.keys(grouped) as Array<keyof typeof grouped>;
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Shopping progress</span>
          <span className="text-muted-foreground">
            {checkedCount}/{items.length} items
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Category groups */}
      {categories.map((category) => {
        const categoryItems = grouped[category] ?? [];
        const allChecked = categoryItems.every((i) => i.checked);

        return (
          <div key={category} className="bg-card border rounded-lg overflow-hidden">
            <div className={cn(
              "flex items-center gap-2 px-4 py-3 border-b font-medium text-sm",
              allChecked && "opacity-50"
            )}>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              {GROCERY_CATEGORY_LABELS[category]}
              <span className="ml-auto text-xs text-muted-foreground">
                {categoryItems.filter((i) => !i.checked).length} remaining
              </span>
            </div>

            <div className="divide-y">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    item.checked && "bg-muted/30"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleChecked(item)}
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      item.checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary"
                    )}
                  >
                    {item.checked && <Check className="h-3 w-3" />}
                  </button>

                  {/* Name + qty */}
                  <div className={cn("flex-1", item.checked && "line-through text-muted-foreground")}>
                    <span className="text-sm font-medium">{item.ingredient_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {item.aggregated_qty} {item.unit}
                    </span>
                  </div>

                  {/* Have on hand toggle */}
                  <button
                    onClick={() => toggleHaveOnHand(item)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border transition-colors",
                      item.have_on_hand
                        ? "bg-green-100 border-green-300 text-green-700"
                        : "border-muted text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {item.have_on_hand ? "Have it" : "Need"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No items in this grocery list.
        </div>
      )}
    </div>
  );
}
