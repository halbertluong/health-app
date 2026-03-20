import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { Trash2, Check } from "lucide-react-native";
import type { AiFoodItem } from "@health-app/types";

export default function ConfirmScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { imageUrl, aiResult } = useLocalSearchParams<{ imageUrl: string; aiResult: string }>();

  const parsed = JSON.parse(aiResult ?? "{}");
  const [foods, setFoods] = useState<AiFoodItem[]>(parsed.foods ?? []);
  const [saving, setSaving] = useState(false);

  const confidence = parsed.confidence_score ?? 0;
  const totalCal = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
  const totalProt = foods.reduce((s, f) => s + (f.protein_g ?? 0), 0);
  const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g ?? 0), 0);
  const totalFat = foods.reduce((s, f) => s + (f.fat_g ?? 0), 0);

  function updateFood(index: number, field: keyof AiFoodItem, value: string | number) {
    setFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: typeof value === "string" ? value : Number(value) } : f))
    );
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveLog() {
    if (!session?.user || foods.length === 0) return;
    setSaving(true);

    const { data: log, error: logErr } = await supabase
      .from("meal_logs")
      .insert({
        user_id: session.user.id,
        source_type: "ai_photo",
        image_url: imageUrl,
        confidence_score: confidence,
        total_calories: totalCal,
        total_protein_g: totalProt,
        total_carbs_g: totalCarbs,
        total_fat_g: totalFat,
      })
      .select()
      .single();

    if (logErr || !log) {
      Alert.alert("Error", "Failed to save meal log");
      setSaving(false);
      return;
    }

    await supabase.from("meal_log_items").insert(
      foods.map((f) => ({
        meal_log_id: log.id,
        food_name: f.food_name,
        quantity: f.quantity,
        unit: f.unit,
        calories: f.calories,
        protein_g: f.protein_g,
        carbs_g: f.carbs_g,
        fat_g: f.fat_g,
      }))
    );

    router.replace("/(tabs)/today");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Meal Log</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Photo preview */}
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
        )}

        {/* Confidence */}
        <View style={[styles.confidenceBadge, confidence >= 0.7 ? styles.confHigh : styles.confLow]}>
          <Text style={styles.confidenceText}>
            {Math.round(confidence * 100)}% confidence · Review and edit before saving
          </Text>
        </View>

        {/* Macro totals */}
        <View style={styles.totalsRow}>
          {[
            { label: "Cal", value: Math.round(totalCal), color: "#f97316" },
            { label: "Prot", value: Math.round(totalProt) + "g", color: "#3b82f6" },
            { label: "Carbs", value: Math.round(totalCarbs) + "g", color: "#eab308" },
            { label: "Fat", value: Math.round(totalFat) + "g", color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <View key={label} style={[styles.totalChip, { borderColor: color }]}>
              <Text style={[styles.totalValue, { color }]}>{value}</Text>
              <Text style={styles.totalLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Detected foods */}
        <Text style={styles.sectionTitle}>Detected Foods</Text>
        {foods.map((food, i) => (
          <View key={i} style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <TextInput
                style={styles.foodName}
                value={food.food_name}
                onChangeText={(v) => updateFood(i, "food_name", v)}
              />
              <TouchableOpacity onPress={() => removeFood(i)} style={styles.removeBtn}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.foodRow}>
              <View style={styles.foodField}>
                <Text style={styles.foodFieldLabel}>Qty</Text>
                <TextInput
                  style={styles.foodFieldInput}
                  value={String(food.quantity)}
                  onChangeText={(v) => updateFood(i, "quantity", parseFloat(v) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.foodField}>
                <Text style={styles.foodFieldLabel}>Unit</Text>
                <TextInput
                  style={styles.foodFieldInput}
                  value={food.unit}
                  onChangeText={(v) => updateFood(i, "unit", v)}
                />
              </View>
              <View style={styles.foodField}>
                <Text style={styles.foodFieldLabel}>Cal</Text>
                <TextInput
                  style={styles.foodFieldInput}
                  value={String(food.calories ?? 0)}
                  onChangeText={(v) => updateFood(i, "calories", parseFloat(v) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.foodField}>
                <Text style={styles.foodFieldLabel}>P(g)</Text>
                <TextInput
                  style={styles.foodFieldInput}
                  value={String(food.protein_g ?? 0)}
                  onChangeText={(v) => updateFood(i, "protein_g", parseFloat(v) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.confidenceBar]}>
              <View style={[styles.confidenceBarFill, { width: `${(food.confidence ?? 0) * 100}%` }]} />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, (saving || foods.length === 0) && styles.saveBtnDisabled]}
          onPress={saveLog}
          disabled={saving || foods.length === 0}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Meal Log"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {},
  backText: { color: "#16a34a", fontWeight: "600", fontSize: 14 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  scroll: { padding: 16, paddingBottom: 48 },
  photo: { width: "100%", height: 220, borderRadius: 16, marginBottom: 12 },
  confidenceBadge: { borderRadius: 8, padding: 10, marginBottom: 16 },
  confHigh: { backgroundColor: "#f0fdf4" },
  confLow: { backgroundColor: "#fffbeb" },
  confidenceText: { fontSize: 12, color: "#475569", textAlign: "center" },
  totalsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  totalChip: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 8, alignItems: "center" },
  totalValue: { fontSize: 16, fontWeight: "800" },
  totalLabel: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  foodCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10 },
  foodHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  foodName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0f172a", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  removeBtn: { padding: 4 },
  foodRow: { flexDirection: "row", gap: 8 },
  foodField: { flex: 1 },
  foodFieldLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 4 },
  foodFieldInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, backgroundColor: "#f8fafc" },
  confidenceBar: { height: 3, backgroundColor: "#e2e8f0", borderRadius: 2, marginTop: 10, overflow: "hidden" },
  confidenceBarFill: { height: 3, backgroundColor: "#16a34a", borderRadius: 2 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
