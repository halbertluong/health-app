import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      Alert.alert("Sign in failed", error.message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Planner</Text>
        <Text style={styles.subtitle}>Plan. Execute. Review. Improve.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Sign in</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
              />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoComplete="current-password"
                placeholder="••••••••"
              />
              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/signup" style={styles.footerLink}>
            Sign up
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "800", color: "#16a34a" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  form: { backgroundColor: "#fff", borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  formTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#f8fafc" },
  error: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  button: { backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#64748b", fontSize: 13 },
  footerLink: { color: "#16a34a", fontWeight: "600", fontSize: 13 },
});
