import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";

interface PendingTimeEntry {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  job: { name: string };
  user: { name: string };
}
interface PendingExpense {
  id: string;
  amount: string;
  category: string;
  job: { name: string };
  user: { name: string };
}

// Mirrors the "pending approvals" home-screen widget concept inside the app
// itself; the full budget/PO manager view lives on the admin web dashboard.
export default function ApprovalsScreen() {
  const [timeEntries, setTimeEntries] = useState<PendingTimeEntry[]>([]);
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);

  const load = useCallback(async () => {
    const [t, e] = await Promise.all([
      api.get<PendingTimeEntry[]>("/time-entries?status=pending"),
      api.get<PendingExpense[]>("/expenses?status=pending"),
    ]);
    setTimeEntries(t);
    setExpenses(e);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approveTime = async (id: string, status: "approved" | "rejected") => {
    await api.patch(`/time-entries/${id}/approval`, { status });
    load();
  };
  const approveExpense = async (id: string, status: "approved" | "rejected") => {
    await api.patch(`/expenses/${id}/approval`, { status });
    load();
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={[
        { type: "header", key: "h1", label: "Time entries" } as const,
        ...timeEntries.map((t) => ({ type: "time" as const, key: t.id, item: t })),
        { type: "header", key: "h2", label: "Expenses" } as const,
        ...expenses.map((e) => ({ type: "expense" as const, key: e.id, item: e })),
      ]}
      keyExtractor={(row) => row.key}
      ListEmptyComponent={<Text style={styles.empty}>Nothing waiting on you.</Text>}
      renderItem={({ item: row }) => {
        if (row.type === "header") {
          return <Text style={styles.sectionHeader}>{row.label}</Text>;
        }
        if (row.type === "time") {
          const t = row.item;
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t.job.name}</Text>
              <Text style={styles.cardMeta}>
                {t.user.name} · {new Date(t.clockInAt).toLocaleString()}
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.approveButton} onPress={() => approveTime(t.id, "approved")}>
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => approveTime(t.id, "rejected")}>
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }
        const e = row.item;
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {e.job.name} · ${Number(e.amount).toFixed(2)}
            </Text>
            <Text style={styles.cardMeta}>
              {e.user.name} · {e.category.replace("_", " ")}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.approveButton} onPress={() => approveExpense(e.id, "approved")}>
                <Text style={styles.buttonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton} onPress={() => approveExpense(e.id, "rejected")}>
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  list: { padding: 16 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 32 },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#94A3B8", marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  cardMeta: { fontSize: 13, color: "#64748B", marginTop: 4 },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  approveButton: { flex: 1, backgroundColor: "#16A34A", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  rejectButton: { flex: 1, backgroundColor: "#DC2626", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
