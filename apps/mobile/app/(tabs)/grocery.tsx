import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { getWeekStart, groupByCategory, GROCERY_CATEGORY_LABELS } from "@health-app/utils";
import type { GroceryItem, GroceryCategory } from "@health-app/types";

export default function GroceryScreen() {
  const { session } = useAuthStore();
  const weekStart = getWeekStart(new Date());
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchList() {
    if (!session?.user) return;
    const { data: list } = await supabase
      .from("grocery_lists")
      .select("id, grocery_items(*)")
      .eq("user_id", session.user.id)
      .eq("week_start", weekStart)
      .single();

    if (list) {
      setListId(list.id);
      setItems((list as any).grocery_items ?? []);
    }
  }

  useEffect(() => { fetchList(); }, [session]);

  async function toggleChecked(item: GroceryItem) {
    const newChecked = !item.checked;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: newChecked } : i));
    await supabase.from("grocery_items").update({ checked: newChecked }).eq("id", item.id);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchList();
    setRefreshing(false);
  }

  const grouped = groupByCategory(items);
  const categories = Object.keys(grouped) as GroceryCategory[];
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Grocery List</Text>
        <Text style={styles.subtitle}>Week of {new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: items.length > 0 ? `${(checkedCount / items.length) * 100}%` : "0%" }]} />
        </View>
        <Text style={styles.progressLabel}>{checkedCount}/{items.length} items</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}
      >
        {listId === null ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No grocery list for this week.</Text>
            <Text style={styles.emptySubtext}>Generate one from the web planner.</Text>
          </View>
        ) : (
          categories.map((cat) => {
            const catItems = grouped[cat] ?? [];
            return (
              <View key={cat} style={styles.category}>
                <Text style={styles.categoryLabel}>{GROCERY_CATEGORY_LABELS[cat]}</Text>
                {catItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.item, item.checked && styles.itemChecked]}
                    onPress={() => toggleChecked(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                      {item.checked && <Check size={12} color="#fff" />}
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                        {item.ingredient_name}
                      </Text>
                      <Text style={styles.itemQty}>
                        {item.aggregated_qty} {item.unit}
                      </Text>
                    </View>
                    {item.have_on_hand && (
                      <View style={styles.haveBadge}>
                        <Text style={styles.haveBadgeText}>Have it</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  progress: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#16a34a", borderRadius: 3 },
  progressLabel: { fontSize: 12, color: "#64748b", width: 64, textAlign: "right" },
  scroll: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyText: { fontSize: 15, color: "#64748b" },
  emptySubtext: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  category: { marginBottom: 20 },
  categoryLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 6, gap: 12 },
  itemChecked: { opacity: 0.6 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  itemContent: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  itemNameChecked: { textDecorationLine: "line-through", color: "#94a3b8" },
  itemQty: { fontSize: 12, color: "#64748b", marginTop: 2 },
  haveBadge: { backgroundColor: "#dcfce7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  haveBadgeText: { fontSize: 11, color: "#16a34a", fontWeight: "600" },
});
