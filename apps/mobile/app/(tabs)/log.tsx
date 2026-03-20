import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle, Zap, PenLine, Camera } from "lucide-react-native";

const LOG_METHODS = [
  {
    key: "ate_as_planned",
    label: "Ate as Planned",
    description: "Mark a planned meal as eaten",
    icon: CheckCircle,
    color: "#16a34a",
    bg: "#f0fdf4",
    route: "/log/ate-as-planned",
  },
  {
    key: "quick_add",
    label: "Quick Add",
    description: "Log a saved or recent meal",
    icon: Zap,
    color: "#0ea5e9",
    bg: "#f0f9ff",
    route: "/log/quick-add",
  },
  {
    key: "manual",
    label: "Manual Entry",
    description: "Search and enter food manually",
    icon: PenLine,
    color: "#8b5cf6",
    bg: "#faf5ff",
    route: "/log/manual",
  },
  {
    key: "ai_photo",
    label: "Photo Log",
    description: "Take a photo — AI estimates your macros",
    icon: Camera,
    color: "#f59e0b",
    bg: "#fffbeb",
    route: "/log/camera",
  },
] as const;

export default function LogScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Log a Meal</Text>
          <Text style={styles.subtitle}>Choose how you want to log</Text>
        </View>

        <View style={styles.grid}>
          {LOG_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <TouchableOpacity
                key={method.key}
                style={[styles.card, { backgroundColor: method.bg }]}
                onPress={() => router.push(method.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, { backgroundColor: method.color + "20" }]}>
                  <Icon size={28} color={method.color} />
                </View>
                <Text style={styles.cardLabel}>{method.label}</Text>
                <Text style={styles.cardDesc}>{method.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  grid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", borderRadius: 20, padding: 20, gap: 10 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  cardDesc: { fontSize: 12, color: "#64748b", lineHeight: 16 },
});
