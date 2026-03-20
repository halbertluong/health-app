import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name } },
    });
    if (error) Alert.alert("Sign up failed", error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Planner</Text>
        <Text style={styles.subtitle}>Start your journey today.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Create account</Text>

        {(["name", "email", "password"] as const).map((field) => (
          <Controller
            key={field}
            control={control}
            name={field}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={field === "password"}
                  autoCapitalize={field === "name" ? "words" : "none"}
                  keyboardType={field === "email" ? "email-address" : "default"}
                  placeholder={field === "email" ? "you@example.com" : field === "password" ? "••••••••" : "Your name"}
                />
                {errors[field] && <Text style={styles.error}>{errors[field]?.message}</Text>}
              </View>
            )}
          />
        ))}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Creating account..." : "Create account"}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.footerLink}>Sign in</Link>
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
