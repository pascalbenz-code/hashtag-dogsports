import { hasMetadata, isDate } from "./validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDogProfile, isHandlerProfile } from "../domain/profiles";
import {
  decideSync,
  syncRecordKey,
  type QueuedSyncChange,
  type RemoteSyncRecord,
} from "../domain/cloudSync";
import { parseBackup } from "./backup";
import {
  applyRemoteRecords,
  bindDatabaseToUser,
  db,
  getLocalSyncRecords,
  removeQueueChangesIfUnchanged,
  SYNC_META_KEYS,
  type THSDatabase,
} from "./db";

const PAGE_SIZE = 500;

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

function validateRemoteRecord(value: unknown): RemoteSyncRecord {
  if (!value || typeof value !== "object")
    throw new Error("Die Cloud enthält einen ungültigen Datensatz.");
  const record = value as Partial<RemoteSyncRecord>;
  if (
    typeof record.user_id !== "string" ||
    !["results", "handlers", "dogs"].includes(record.entity_type ?? "") ||
    typeof record.record_id !== "string" ||
    !isIsoDate(record.client_updated_at) ||
    !isIsoDate(record.server_updated_at) ||
    (record.deleted_at !== null && !isIsoDate(record.deleted_at))
  )
    throw new Error("Die Cloud enthält einen Datensatz mit ungültigem Schema.");
  if (!record.deleted_at) {
    if ((record.entity_type === "handlers" || record.entity_type === "dogs") &&
        (!record.payload || typeof record.payload !== "object" ||
         !hasMetadata(record.payload) || !isDate((record.payload as { birthDate?: unknown }).birthDate)))
      throw new Error("Ein Profil in der Cloud hat ungültige Metadaten.");
    if (record.entity_type === "handlers" && !isHandlerProfile(record.payload))
      throw new Error("Ein Hundeführerprofil in der Cloud ist beschädigt.");
    if (record.entity_type === "dogs" && !isDogProfile(record.payload))
      throw new Error("Ein Hundeprofil in der Cloud ist beschädigt.");
    if (record.entity_type === "results") {
      try {
        const result = parseBackup(
          JSON.stringify({ app: "#Dogsports", results: [record.payload] }),
        ).results[0];
        if (result.id !== record.record_id) throw new Error();
        record.payload = result;
      } catch {
        throw new Error("Ein Ergebnis in der Cloud ist beschädigt.");
      }
    }
    if ((record.payload as { id?: unknown } | null)?.id !== record.record_id)
      throw new Error("Cloud-ID und Datensatz-ID stimmen nicht überein.");
  }
  return record as RemoteSyncRecord;
}

async function fetchAllRemoteRecords(
  client: SupabaseClient,
  userId: string,
) {
  const records: RemoteSyncRecord[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("dogsports_records")
      .select("*")
      .eq("user_id", userId)
      .order("entity_type", { ascending: true })
      .order("record_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []).map(validateRemoteRecord);
    if (page.some((record) => record.user_id !== userId))
      throw new Error("Die Cloud-Antwort enthält Daten eines anderen Kontos.");
    records.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return records;
}

export interface CloudSyncSummary {
  uploaded: number;
  downloaded: number;
  pending: number;
  syncedAt: string;
}

export async function synchronizeCloud(
  client: SupabaseClient,
  userId: string,
  database: THSDatabase = db,
): Promise<CloudSyncSummary> {
  await bindDatabaseToUser(userId, database);
  const [localRecords, queuedChanges, remoteRecords] = await Promise.all([
    getLocalSyncRecords(database),
    database.syncQueue.toArray(),
    fetchAllRemoteRecords(client, userId),
  ]);
  const foreignQueueItem = queuedChanges.find(
    (change) => change.userId && change.userId !== userId,
  );
  if (foreignQueueItem)
    throw new Error(
      "Die lokale Warteschlange gehört zu einem anderen #Dogsports-Konto.",
    );

  const decision = decideSync(localRecords, queuedChanges, remoteRecords);
  if (decision.upload.length) {
    const remoteById = new Map(remoteRecords.map((record) =>
      [syncRecordKey(record.entity_type, record.record_id), record]));
    // Compare-and-swap prevents a stale device from overwriting a concurrent edit.
    for (const change of decision.upload) {
      const row = {
        user_id: userId,
        entity_type: change.entity,
        record_id: change.recordId,
        payload: change.operation === "delete" ? null : change.payload,
        client_updated_at: change.updatedAt,
        deleted_at: change.operation === "delete" ? change.updatedAt : null,
      };
      const previous = remoteById.get(syncRecordKey(change.entity, change.recordId));
      const query = previous
        ? client.from("dogsports_records").update(row)
          .eq("user_id", userId).eq("entity_type", change.entity)
          .eq("record_id", change.recordId).eq("server_updated_at", previous.server_updated_at)
        : client.from("dogsports_records").insert(row);
      const { data, error } = await query.select("record_id");
      if (error) throw error;
      if (data?.length !== 1)
        throw new Error("Ein Cloud-Datensatz wurde gleichzeitig geändert. Lokale Änderungen bleiben vorgemerkt. Bitte erneut synchronisieren.");
    }
  }

  if (decision.download.length)
    await applyRemoteRecords(decision.download, database);

  const resolvedRemoteChanges = decision.removeQueueIds
    .map((id) => queuedChanges.find((change) => change.id === id))
    .filter((change): change is QueuedSyncChange => Boolean(change));
  await removeQueueChangesIfUnchanged(
    [...decision.upload, ...resolvedRemoteChanges],
    database,
  );
  const syncedAt = new Date().toISOString();
  await database.syncMeta.put({
    key: SYNC_META_KEYS.lastSyncedAt,
    value: syncedAt,
  });
  return {
    uploaded: decision.upload.length,
    downloaded: decision.download.length,
    pending: await database.syncQueue.count(),
    syncedAt,
  };
}
