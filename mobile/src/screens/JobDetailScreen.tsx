import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { Job } from "../types";

type ParamList = { JobDetail: { jobId: string } };

export default function JobDetailScreen() {
  const route = useRoute<RouteProp<ParamList, "JobDetail">>();
  const navigation = useNavigation<any>();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    api.get<Job>(`/jobs/${route.params.jobId}`).then(setJob).catch(() => {});
  }, [route.params.jobId]);

  if (!job) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{job.name}</Text>
      {job.clientName && <Text style={styles.meta}>Client: {job.clientName}</Text>}
      {job.address && <Text style={styles.meta}>{job.address}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("ExpenseCapture", { jobId: job.id, jobName: job.name })}
        >
          <Text style={styles.actionText}>Log Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("PhotoCapture", { jobId: job.id, jobName: job.name })}
        >
          <Text style={styles.actionText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {job.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{job.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { textAlign: "center", marginTop: 40, color: "#64748B" },
  title: { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  meta: { fontSize: 14, color: "#64748B", marginTop: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "600" },
  notesBox: { marginTop: 24, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  notesLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 4 },
  notesText: { fontSize: 14, color: "#0F172A" },
});
