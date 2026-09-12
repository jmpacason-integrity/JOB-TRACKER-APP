import * as Crypto from "expo-crypto";
import { getDb } from "./localDb";

export type OutboxType = "clock_in" | "clock_out" | "expense" | "photo";

export interface OutboxRow {
  id: number;
  type: OutboxType;
  client_entry_id: string;
  payload: string;
  file_uri: string | null;
  status: "pending" | "synced" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export function newClientEntryId(): string {
  return Crypto.randomUUID();
}

export async function enqueue(
  type: OutboxType,
  clientEntryId: string,
  payload: Record<string, unknown>,
  fileUri?: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO outbox (type, client_entry_id, payload, file_uri) VALUES (?, ?, ?, ?)`,
    [type, clientEntryId, JSON.stringify(payload), fileUri ?? null],
  );
}

export async function pendingItems(): Promise<OutboxRow[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox WHERE status = 'pending' ORDER BY id ASC`,
  );
}

export async function markSynced(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE outbox SET status = 'synced' WHERE id = ?`, [id]);
}

export async function markFailed(id: number, error: string, permanent: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE outbox SET status = ?, attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [permanent ? "failed" : "pending", error, id],
  );
}
