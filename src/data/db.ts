import { mergeImport, type Backup } from "./backup";
import Dexie, { type EntityTable } from "dexie";
import {
  validateDogProfile,
  validateHandlerProfile,
  type DogProfile,
  type HandlerProfile,
} from "../domain/profiles";
import type { CompetitionResult } from "../domain/types";
import {
  syncRecordKey,
  type QueuedSyncChange,
  type RemoteSyncRecord,
  type SyncEntity,
  type SyncOperation,
} from "../domain/cloudSync";

export interface SyncMetaEntry {
  key: string;
  value: string;
}

export const SYNC_META_KEYS = {
  boundUserId: "bound-user-id",
  lastSyncedAt: "last-synced-at",
} as const;

export class THSDatabase extends Dexie {
  results!: EntityTable<CompetitionResult, "id">;
  handlers!: EntityTable<HandlerProfile, "id">;
  dogs!: EntityTable<DogProfile, "id">;
  syncQueue!: EntityTable<QueuedSyncChange, "id">;
  syncMeta!: EntityTable<SyncMetaEntry, "key">;

  constructor(name = "dogsport") {
    super(name);
    this.version(4).stores({
      results: "id,date,className,createdAt,updatedAt",
      ifhSessions: null,
    });
    this.version(5)
      .stores({
        results:
          "id,date,className,handlerId,dogId,createdAt,updatedAt",
        handlers: "id,name,birthDate,updatedAt",
        dogs: "id,callName,birthDate,updatedAt",
      })
      .upgrade(async (transaction) => {
        const results = await transaction
          .table<CompetitionResult, string>("results")
          .toArray();
        const now = new Date().toISOString();
        const handlers = new Map<string, HandlerProfile>();
        const dogs = new Map<string, DogProfile>();

        for (const result of results) {
          const handlerName = result.handler.trim();
          if (!result.handlerId && handlerName) {
            const key = handlerName.toLocaleLowerCase("de-DE");
            let profile = handlers.get(key);
            if (!profile) {
              profile = {
                id: crypto.randomUUID(),
                name: handlerName,
                birthDate: "",
                gender: "",
                club: "",
                membershipNumber: "",
                createdAt: now,
                updatedAt: now,
              };
              handlers.set(key, profile);
            }
            result.handlerId = profile.id;
          }

          const dogName = result.dog.trim();
          if (!result.dogId && dogName) {
            const key = dogName.toLocaleLowerCase("de-DE");
            let profile = dogs.get(key);
            if (!profile) {
              profile = {
                id: crypto.randomUUID(),
                callName: dogName,
                kennelName: "",
                breed: "",
                birthDate: "",
                gender: "",
                performanceRecordId: "",
                chipNumber: "",
                studbookNumber: "",
                createdAt: now,
                updatedAt: now,
              };
              dogs.set(key, profile);
            }
            result.dogId = profile.id;
          }
        }

        if (handlers.size)
          await transaction.table("handlers").bulkPut([...handlers.values()]);
        if (dogs.size)
          await transaction.table("dogs").bulkPut([...dogs.values()]);
        if (results.length)
          await transaction.table("results").bulkPut(results);
      });
    this.version(6).stores({
      results: "id,date,className,handlerId,dogId,createdAt,updatedAt",
      handlers: "id,name,birthDate,updatedAt",
      dogs: "id,callName,birthDate,updatedAt",
      syncQueue: "id,entity,recordId,operation,updatedAt,userId",
      syncMeta: "key",
    });
  }
}

export const db = new THSDatabase();

async function queueSyncChange(
  database: THSDatabase,
  entity: SyncEntity,
  recordId: string,
  operation: SyncOperation,
  updatedAt: string,
  payload?: unknown,
) {
  const binding = await database.syncMeta.get(SYNC_META_KEYS.boundUserId);
  await database.syncQueue.put({
    id: syncRecordKey(entity, recordId),
    entity,
    recordId,
    operation,
    payload,
    updatedAt,
    userId: binding?.value,
  });
}

export async function saveResult(
  result: CompetitionResult,
  database: THSDatabase = db,
) {
  const now = new Date().toISOString();
  const next = {
    ...result,
    id: result.id || crypto.randomUUID(),
    createdAt: result.createdAt || now,
    updatedAt: now,
  };
  await database.transaction(
    "rw",
    database.results,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.results.put(next);
      await queueSyncChange(
        database,
        "results",
        next.id,
        "upsert",
        now,
        next,
      );
    },
  );
  return next.id;
}

export async function deleteResult(id: string, database: THSDatabase = db) {
  const now = new Date().toISOString();
  await database.transaction(
    "rw",
    database.results,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.results.delete(id);
      await queueSyncChange(database, "results", id, "delete", now);
    },
  );
}

export async function saveHandlerProfile(
  profile: HandlerProfile,
  database: THSDatabase = db,
) {
  const errors = validateHandlerProfile(profile);
  if (errors.length) throw new Error(errors.join(". "));
  const now = new Date().toISOString();
  const next = {
    ...profile,
    id: profile.id || crypto.randomUUID(),
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
  await database.transaction(
    "rw",
    database.handlers,
    database.results,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.handlers.put(next);
      await database.results
        .where("handlerId")
        .equals(next.id)
        .modify({
          handler: next.name,
          handlerBirthDate: next.birthDate,
          handlerGender: next.gender,
          updatedAt: now,
        });
      const affectedResults = await database.results
        .where("handlerId")
        .equals(next.id)
        .toArray();
      await queueSyncChange(
        database,
        "handlers",
        next.id,
        "upsert",
        now,
        next,
      );
      for (const result of affectedResults)
        await queueSyncChange(
          database,
          "results",
          result.id,
          "upsert",
          result.updatedAt,
          result,
        );
    },
  );
  return next.id;
}

export async function saveDogProfile(
  profile: DogProfile,
  database: THSDatabase = db,
) {
  const errors = validateDogProfile(profile);
  if (errors.length) throw new Error(errors.join(". "));
  const now = new Date().toISOString();
  const next = {
    ...profile,
    id: profile.id || crypto.randomUUID(),
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
  await database.transaction(
    "rw",
    database.dogs,
    database.results,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.dogs.put(next);
      await database.results
        .where("dogId")
        .equals(next.id)
        .modify({ dog: next.callName, updatedAt: now });
      const affectedResults = await database.results
        .where("dogId")
        .equals(next.id)
        .toArray();
      await queueSyncChange(
        database,
        "dogs",
        next.id,
        "upsert",
        now,
        next,
      );
      for (const result of affectedResults)
        await queueSyncChange(
          database,
          "results",
          result.id,
          "upsert",
          result.updatedAt,
          result,
        );
    },
  );
  return next.id;
}

export async function deleteHandlerProfile(
  id: string,
  database: THSDatabase = db,
) {
  if (await database.results.where("handlerId").equals(id).count())
    throw new Error(
      "Der Hundeführer wird bereits in Ergebnissen verwendet und kann nicht gelöscht werden.",
    );
  const now = new Date().toISOString();
  await database.transaction(
    "rw",
    database.handlers,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.handlers.delete(id);
      await queueSyncChange(database, "handlers", id, "delete", now);
    },
  );
}

export async function deleteDogProfile(
  id: string,
  database: THSDatabase = db,
) {
  if (await database.results.where("dogId").equals(id).count())
    throw new Error(
      "Der Hund wird bereits in Ergebnissen verwendet und kann nicht gelöscht werden.",
    );
  const now = new Date().toISOString();
  await database.transaction(
    "rw",
    database.dogs,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.dogs.delete(id);
      await queueSyncChange(database, "dogs", id, "delete", now);
    },
  );
}

export async function saveImportedData(
  results: CompetitionResult[],
  handlers: HandlerProfile[],
  dogs: DogProfile[],
  database: THSDatabase = db,
) {
  await database.transaction(
    "rw",
    database.results,
    database.handlers,
    database.dogs,
    database.syncQueue,
    database.syncMeta,
    async () => {
      await database.results.bulkPut(results);
      await database.handlers.bulkPut(handlers);
      await database.dogs.bulkPut(dogs);
      for (const result of results)
        await queueSyncChange(
          database,
          "results",
          result.id,
          "upsert",
          result.updatedAt,
          result,
        );
      for (const handler of handlers)
        await queueSyncChange(
          database,
          "handlers",
          handler.id,
          "upsert",
          handler.updatedAt,
          handler,
        );
      for (const dog of dogs)
        await queueSyncChange(
          database,
          "dogs",
          dog.id,
          "upsert",
          dog.updatedAt,
          dog,
        );
    },
  );
}

/** Merge against current IndexedDB state under the same write transaction. */
export async function importBackup(
  backup: Backup,
  replace = false,
  database: THSDatabase = db,
) {
  return database.transaction("rw", [database.results, database.handlers, database.dogs,
    database.syncQueue, database.syncMeta], async () => {
    const [results, handlers, dogs] = await Promise.all([
      database.results.toArray(), database.handlers.toArray(), database.dogs.toArray(),
    ]);
    const summaries = [mergeImport(results, backup.results, replace),
      mergeImport(handlers, backup.handlers, replace), mergeImport(dogs, backup.dogs, replace)];
    const accepted = <T extends { id: string }>(incoming: T[], existing: { id: string }[]) => {
      const ids = new Set(existing.map((item) => item.id));
      return incoming.filter((item) => replace || !ids.has(item.id));
    };
    await saveImportedData(accepted(backup.results, results), accepted(backup.handlers, handlers),
      accepted(backup.dogs, dogs), database);
    return summaries.reduce((total, item) => ({ added: total.added + item.added,
      replaced: total.replaced + item.replaced, skipped: total.skipped + item.skipped }),
      { added: 0, replaced: 0, skipped: 0 });
  });
}

export async function bindDatabaseToUser(
  userId: string,
  database: THSDatabase = db,
) {
  await database.transaction(
    "rw",
    database.syncMeta,
    database.syncQueue,
    async () => {
      const current = await database.syncMeta.get(SYNC_META_KEYS.boundUserId);
      if (current && current.value !== userId)
        throw new Error(
          "Diese lokale Installation ist bereits mit einem anderen #Dogsports-Konto verbunden. Melde dich mit dem ursprünglichen Konto an, damit keine Daten vermischt werden.",
        );
      await database.syncMeta.put({
        key: SYNC_META_KEYS.boundUserId,
        value: userId,
      });
      await database.syncQueue.toCollection().modify({ userId });
    },
  );
}

export async function getLocalSyncRecords(database: THSDatabase = db) {
  const [results, handlers, dogs] = await Promise.all([
    database.results.toArray(),
    database.handlers.toArray(),
    database.dogs.toArray(),
  ]);
  return [
    ...results.map((payload) => ({
      entity: "results" as const,
      recordId: payload.id,
      payload,
      updatedAt: payload.updatedAt,
    })),
    ...handlers.map((payload) => ({
      entity: "handlers" as const,
      recordId: payload.id,
      payload,
      updatedAt: payload.updatedAt,
    })),
    ...dogs.map((payload) => ({
      entity: "dogs" as const,
      recordId: payload.id,
      payload,
      updatedAt: payload.updatedAt,
    })),
  ];
}

export async function applyRemoteRecords(
  records: RemoteSyncRecord[],
  database: THSDatabase = db,
) {
  await database.transaction(
    "rw",
    database.results,
    database.handlers,
    database.dogs,
    database.syncQueue,
    async () => {
      for (const record of records) {
        const queued = await database.syncQueue.get(
          syncRecordKey(record.entity_type, record.record_id),
        );
        if (
          queued &&
          Date.parse(queued.updatedAt) >= Date.parse(record.client_updated_at)
        )
          continue;
        if (record.entity_type === "results") {
          if (record.deleted_at) await database.results.delete(record.record_id);
          else await database.results.put(record.payload as CompetitionResult);
        } else if (record.entity_type === "handlers") {
          if (record.deleted_at) await database.handlers.delete(record.record_id);
          else await database.handlers.put(record.payload as HandlerProfile);
        } else if (record.deleted_at) {
          await database.dogs.delete(record.record_id);
        } else {
          await database.dogs.put(record.payload as DogProfile);
        }
      }
    },
  );
}

export async function removeQueueChangesIfUnchanged(
  changes: QueuedSyncChange[],
  database: THSDatabase = db,
) {
  await database.transaction("rw", database.syncQueue, async () => {
    for (const change of changes) {
      const current = await database.syncQueue.get(change.id);
      if (
        current?.updatedAt === change.updatedAt &&
        current.operation === change.operation &&
        JSON.stringify(current.payload) === JSON.stringify(change.payload)
      )
        await database.syncQueue.delete(change.id);
    }
  });
}
