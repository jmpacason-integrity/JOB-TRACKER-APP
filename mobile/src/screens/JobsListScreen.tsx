import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api/client";
import { useActiveClock } from "../clock/useActiveClock";
import { getCache, setCache } from "../db/localDb";
import { useSync } from "../sync/SyncProvider";
import { Job } from "../types";

export default function JobsListScreen() {
  const navigation = useNavigation<any>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { active, clockIn, clockOut } = useActiveClock();
  const { isOnline, syncing, lastSyncedAt } = useSync();

  const load = useCallback(async () => {
    try {
      const fresh = await api.get<Job[]>("/jobs");
      setJobs(fresh);
      await setCache("jobs", fresh);
    } catch {
      const cached = await getCache<Job[]>("jobs");
      if (cached) setJobs(cached);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.dot, { backgroundColor: isOnline ? "#22C55E" : "#F59E0B" }]} />
        <Text style={styles.statusText}>
          {isOnline ? (syncing ? "Syncing…" : "Online") : "Offline - actions will sync later"}
          {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}` : ""}
        </Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No jobs assigned yet.</Text>}
        renderItem={({ item }) => {
          const isActiveJob = active?.jobId === item.id;
          const canClockIn = !active || isActiveJob;
          return (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
                <Text style={styles.jobName}>{item.name}</Text>
                {item.address && <Text style={styles.jobAddress}>{item.address}</Text>}
                <Text style={styles.jobStatus}>{item.status.replace("_", " ")}</Text>
              </TouchableOpacity>

              {isActiveJob ? (
                <TouchableOpacity style={styles.clockOutButton} onPress={clockOut}>
                  <Text style={styles.clockButtonText}>Clock Out</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.clockInButton, !canClockIn && styles.buttonDisabled]}
                  disabled={!canClockIn}
                  onPress={() => clockIn(item)}
                >
                  <Text style={styles.clockButtonText}>Clock In</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0F172A",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: "#E2E8F0", fontSize: 12 },
  list: { padding: 16 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  jobName: { fontSize: 17, fontWeight: "600", color: "#0F172A" },
  jobAddress: { fontSize: 13, color: "#64748B", marginTop: 2 },
  jobStatus: { fontSize: 12, color: "#2563EB", marginTop: 6, textTransform: "capitalize" },
  clockInButton: {
    marginTop: 12,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  clockOutButton: {
    marginTop: 12,
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  clockButtonText: { color: "#fff", fontWeight: "600" },
});
