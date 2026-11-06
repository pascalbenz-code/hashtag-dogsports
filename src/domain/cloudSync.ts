export type SyncEntity = "results" | "handlers" | "dogs";
export type SyncOperation = "upsert" | "delete";

export interface LocalSyncRecord {
  entity: SyncEntity;
  recordId: string;
  payload: unknown;
  updatedAt: string;
}

export interface QueuedSyncChange {
  id: string;
  entity: SyncEntity;
  recordId: string;
  operation: SyncOperation;
  payload?: unknown;
  updatedAt: string;
  userId?: string;
}

export interface RemoteSyncRecord {
  user_id: string;
  entity_type: SyncEntity;
  record_id: string;
  payload: unknown | null;
  client_updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
}

export interface SyncDecision {
  upload: QueuedSyncChange[];
  download: RemoteSyncRecord[];
  removeQueueIds: string[];
}

export const syncRecordKey = (entity: SyncEntity, recordId: string) =>
  `${entity}:${recordId}`;

const timestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Resolves all local/remote records deterministically. Explicit queued changes
 * take precedence while they are at least as new as the cloud copy. Otherwise
 * the newer cloud copy wins. Records that predate cloud sync are uploaded on
 * the first run even though they do not have a queue entry yet.
 */
export function decideSync(
  localRecords: LocalSyncRecord[],
  queue: QueuedSyncChange[],
  remoteRecords: RemoteSyncRecord[],
): SyncDecision {
  const local = new Map(
    localRecords.map((record) => [
      syncRecordKey(record.entity, record.recordId),
      record,
    ]),
  );
  const queued = new Map(queue.map((change) => [change.id, change]));
  const remote = new Map(
    remoteRecords.map((record) => [
      syncRecordKey(record.entity_type, record.record_id),
      record,
    ]),
  );
  const keys = new Set([...local.keys(), ...queued.keys(), ...remote.keys()]);
  const decision: SyncDecision = {
    upload: [],
    download: [],
    removeQueueIds: [],
  };

  for (const key of keys) {
    const localRecord = local.get(key);
    const queuedChange = queued.get(key);
    const remoteRecord = remote.get(key);
    const remoteTime = remoteRecord
      ? timestamp(remoteRecord.client_updated_at)
      : -1;

    if (queuedChange) {
      if (!remoteRecord || timestamp(queuedChange.updatedAt) >= remoteTime) {
        decision.upload.push(queuedChange);
      } else {
        decision.download.push(remoteRecord);
        decision.removeQueueIds.push(key);
      }
      continue;
    }

    if (!remoteRecord && localRecord) {
      decision.upload.push({
        id: key,
        entity: localRecord.entity,
        recordId: localRecord.recordId,
        operation: "upsert",
        payload: localRecord.payload,
        updatedAt: localRecord.updatedAt,
      });
      continue;
    }

    if (!remoteRecord) continue;
    if (!localRecord) {
      if (!remoteRecord.deleted_at) decision.download.push(remoteRecord);
      continue;
    }

    if (timestamp(localRecord.updatedAt) > remoteTime) {
      decision.upload.push({
        id: key,
        entity: localRecord.entity,
        recordId: localRecord.recordId,
        operation: "upsert",
        payload: localRecord.payload,
        updatedAt: localRecord.updatedAt,
      });
    } else if (
      remoteRecord.deleted_at ||
      timestamp(localRecord.updatedAt) < remoteTime
    ) {
      decision.download.push(remoteRecord);
    }
  }

  return decision;
}
