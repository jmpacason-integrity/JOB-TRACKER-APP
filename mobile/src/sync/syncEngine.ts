import { api, ApiError } from "../api/client";
import { OutboxRow, markFailed, markSynced, pendingItems } from "../db/outbox";

let syncing = false;

async function syncOne(item: OutboxRow): Promise<void> {
  const payload = JSON.parse(item.payload);

  switch (item.type) {
    case "clock_in":
      await api.post("/time-entries", payload);
      break;
    case "clock_out":
      await api.patch(`/time-entries/by-client/${item.client_entry_id}/clock-out`, payload);
      break;
    case "expense": {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
      if (item.file_uri) {
        form.append("receipt", { uri: item.file_uri, name: "receipt.jpg", type: "image/jpeg" } as any);
      }
      await api.postForm("/expenses", form);
      break;
    }
    case "photo": {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
      form.append("photo", { uri: item.file_uri, name: "photo.jpg", type: "image/jpeg" } as any);
      await api.postForm("/photos", form);
      break;
    }
  }
}

// Drains the local outbox in order, so a device that was offline all day
// replays its actions (clock-ins before clock-outs, etc.) once back online.
export async function flushOutbox(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const items = await pendingItems();
    for (const item of items) {
      try {
        await syncOne(item);
        await markSynced(item.id);
        synced += 1;
      } catch (err) {
        const isClientError = err instanceof ApiError && err.status >= 400 && err.status < 500;
        await markFailed(item.id, err instanceof Error ? err.message : String(err), isClientError);
        failed += 1;
        // Stop on the first failure to preserve ordering (e.g. a clock-out
        // shouldn't sync before its clock-in), unless it's a permanent
        // client error for this item specifically, in which case skip it.
        if (!isClientError) break;
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}
