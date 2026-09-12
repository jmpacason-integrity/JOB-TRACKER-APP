import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Shift } from "../types";

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const day = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(s)} - ${time(e)}`;
}

export default function ScheduleScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    api.get<Shift[]>("/schedule").then(setShifts).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={shifts}
        keyExtractor={(shift) => shift.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No upcoming shifts.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.jobName}>{item.job?.name ?? "Job"}</Text>
            <Text style={styles.time}>{formatRange(item.scheduledStart, item.scheduledEnd)}</Text>
            {item.job?.address && <Text style={styles.address}>{item.job.address}</Text>}
            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  list: { padding: 16 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 32 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  jobName: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  time: { fontSize: 13, color: "#2563EB", marginTop: 4 },
  address: { fontSize: 13, color: "#64748B", marginTop: 2 },
  notes: { fontSize: 13, color: "#334155", marginTop: 6, fontStyle: "italic" },
});
