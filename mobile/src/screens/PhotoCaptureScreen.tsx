import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { enqueue, newClientEntryId } from "../db/outbox";
import { useSync } from "../sync/SyncProvider";
import { PhotoCategory } from "../types";

type ParamList = { PhotoCapture: { jobId: string; jobName: string } };

const CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: "before", label: "Before" },
  { value: "during", label: "During" },
  { value: "after", label: "After" },
  { value: "issue", label: "Issue" },
  { value: "other", label: "Other" },
];

export default function PhotoCaptureScreen() {
  const route = useRoute<RouteProp<ParamList, "PhotoCapture">>();
  const navigation = useNavigation<any>();
  const { jobId, jobName } = route.params;
  const { syncNow } = useSync();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<PhotoCategory>("during");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed to take a job-site photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    if (!photoUri) {
      Alert.alert("Take a photo first");
      return;
    }
    setSubmitting(true);
    try {
      const clientEntryId = newClientEntryId();
      await enqueue(
        "photo",
        clientEntryId,
        { jobId, clientEntryId, category, caption, takenAt: new Date().toISOString() },
        photoUri,
      );
      syncNow();
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Add Photo</Text>
      <Text style={styles.subtitle}>{jobName}</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No photo yet</Text>
        </View>
      )}

      <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
        <Text style={styles.photoButtonText}>{photoUri ? "Retake Photo" : "Take Photo"}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.categoryChip, category === c.value && styles.categoryChipActive]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe what's in the photo"
        value={caption}
        onChangeText={setCaption}
      />

      <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "Saving…" : "Save Photo"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  preview: { width: "100%", height: 260, borderRadius: 10, marginBottom: 12 },
  placeholder: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  placeholderText: { color: "#94A3B8" },
  photoButton: {
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  photoButtonText: { color: "#2563EB", fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6, marginTop: 16 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  categoryText: { color: "#334155", fontSize: 13 },
  categoryTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 40,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
