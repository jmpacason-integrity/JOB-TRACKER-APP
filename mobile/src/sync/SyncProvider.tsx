import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushOutbox } from "./syncEngine";

interface SyncContextValue {
  isOnline: boolean;
  syncing: boolean;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

const PERIODIC_SYNC_MS = 60 * 1000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const onlineRef = useRef(isOnline);
  onlineRef.current = isOnline;

  const syncNow = async () => {
    if (!onlineRef.current) return;
    setSyncing(true);
    try {
      await flushOutbox();
      setLastSyncedAt(new Date());
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(nowOnline);
      if (nowOnline) syncNow();
    });
    const interval = setInterval(syncNow, PERIODIC_SYNC_MS);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, syncing, lastSyncedAt, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
