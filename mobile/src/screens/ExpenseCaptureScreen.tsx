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
import { ExpenseCategory } from "../types";

type ParamList = { ExpenseCapture: { jobId: string; jobName: string } };

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "materials", label: "Materials" },
  { value: "fuel", label: "Fuel" },
  { value: "tools_equipment", label: "Tools/Equipment" },
  { value: "labour_subcontract", label: "Subcontractor" },
  { value: "permits_fees", label: "Permits/Fees" },
  { value: "other", label: "Other" },
];

export default function ExpenseCaptureScreen() {
  const route = useRoute<RouteProp<ParamList, "ExpenseCapture">>();
  const navigation = useNavigation<any>();
  const { jobId, jobName } = route.params;
  const { syncNow } = useSync();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("materials");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const takeReceiptPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed to photograph a receipt.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const clientEntryId = newClientEntryId();
      await enqueue(
        "expense",
        clientEntryId,
        {
          jobId,
          clientEntryId,
          amount: value,
          category,
          description,
          spentAt: new Date().toISOString(),
        },
        photoUri || undefined,
      );
      syncNow();
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Log Expense</Text>
      <Text style={styles.subtitle}>{jobName}</Text>

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
      />

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

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        placeholder="What was this for?"
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.photoButton} onPress={takeReceiptPhoto}>
        <Text style={styles.photoButtonText}>{photoUri ? "Retake Receipt Photo" : "Photograph Receipt"}</Text>
      </TouchableOpacity>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

      <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "Saving…" : "Save Expense"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
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
  photoButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  photoButtonText: { color: "#2563EB", fontWeight: "600" },
  preview: { width: "100%", height: 200, borderRadius: 10, marginTop: 12 },
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
