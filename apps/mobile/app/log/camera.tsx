import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? "http://localhost:3000";

export default function CameraScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);

  async function uploadAndAnalyze(uri: string) {
    if (!session?.user) return;
    setAnalyzing(true);

    try {
      // Upload to Supabase Storage
      const fileName = `meal-logs/${session.user.id}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("meal-photos")
        .upload(fileName, blob, { contentType: "image/jpeg" });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from("meal-photos")
        .getPublicUrl(fileName);

      // Call AI analysis API
      const aiRes = await fetch(`${WEB_API_URL}/api/ai/food-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image_url: publicUrl }),
      });

      if (!aiRes.ok) throw new Error("AI analysis failed");

      const aiResult = await aiRes.json();

      // Navigate to confirm screen with results
      router.push({
        pathname: "/log/confirm",
        params: {
          imageUrl: publicUrl,
          aiResult: JSON.stringify(aiResult),
        },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to analyze photo");
    } finally {
      setAnalyzing(false);
    }
  }

  async function takePicture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    await uploadAndAnalyze(photo.uri);
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAndAnalyze(result.assets[0].uri);
    }
  }

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionContainer}>
          <Camera size={48} color="#94a3b8" />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            Allow camera access to take photos of your meals for AI-powered food logging.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={pickFromLibrary}>
            <Text style={styles.pickBtnText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Photo Food Log</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* Overlay guide */}
      <View style={styles.guide} pointerEvents="none">
        <View style={styles.guideBox} />
        <Text style={styles.guideText}>Center your meal in the frame</Text>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.libraryBtn} onPress={pickFromLibrary} disabled={analyzing}>
          <ImageIcon size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureBtn, analyzing && styles.captureBtnDisabled]}
          onPress={takePicture}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#16a34a" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        <View style={{ width: 56 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  permissionTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  permissionText: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
  permissionBtn: { backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  permissionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  pickBtn: { marginTop: 4 },
  pickBtnText: { color: "#16a34a", fontWeight: "600", fontSize: 14 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topBarTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  guide: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  guideBox: { width: 280, height: 280, borderRadius: 20, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", borderStyle: "dashed" },
  guideText: { color: "rgba(255,255,255,0.7)", marginTop: 12, fontSize: 13 },
  bottomBar: { position: "absolute", bottom: 48, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 },
  libraryBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.5)" },
  captureBtnDisabled: { opacity: 0.6 },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#16a34a" },
});
