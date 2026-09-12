import { useCallback, useEffect, useState } from "react";
import { getCache, setCache } from "../db/localDb";
import { enqueue, newClientEntryId } from "../db/outbox";
import { getCurrentCoords } from "../location/geofence";
import { useSync } from "../sync/SyncProvider";
import { Job } from "../types";

const ACTIVE_CLOCK_KEY = "activeClock";

interface ActiveClock {
  clientEntryId: string;
  jobId: string;
  jobName: string;
  clockInAt: string;
}

// Tracks "am I clocked in, and where" entirely on-device so the clock
// in/out button works with no connectivity - the outbox syncs it once online.
export function useActiveClock() {
  const [active, setActive] = useState<ActiveClock | null>(null);
  const [loading, setLoading] = useState(true);
  const { syncNow } = useSync();

  useEffect(() => {
    getCache<ActiveClock>(ACTIVE_CLOCK_KEY).then((val) => {
      setActive(val);
      setLoading(false);
    });
  }, []);

  const clockIn = useCallback(async (job: Job) => {
    const coords = await getCurrentCoords();
    const clientEntryId = newClientEntryId();
    const clockInAt = new Date().toISOString();

    await enqueue("clock_in", clientEntryId, {
      jobId: job.id,
      clientEntryId,
      clockInAt,
      lat: coords?.lat,
      lng: coords?.lng,
    });

    const record: ActiveClock = { clientEntryId, jobId: job.id, jobName: job.name, clockInAt };
    await setCache(ACTIVE_CLOCK_KEY, record);
    setActive(record);
    syncNow();
  }, [syncNow]);

  const clockOut = useCallback(async () => {
    if (!active) return;
    const coords = await getCurrentCoords();
    const clockOutAt = new Date().toISOString();

    await enqueue("clock_out", active.clientEntryId, {
      clockOutAt,
      lat: coords?.lat,
      lng: coords?.lng,
    });

    await setCache(ACTIVE_CLOCK_KEY, null);
    setActive(null);
    syncNow();
  }, [active, syncNow]);

  return { active, loading, clockIn, clockOut };
}
