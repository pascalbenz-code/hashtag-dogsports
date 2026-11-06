import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import type { DogProfile, HandlerProfile } from "../domain/profiles";
import { resetResultForm } from "../domain/resultForm";
import {
  applyRemoteRecords,
  bindDatabaseToUser,
  deleteResult,
  deleteDogProfile,
  deleteHandlerProfile,
  saveDogProfile,
  saveHandlerProfile,
  saveResult,
  THSDatabase,
} from "./db";

describe("Dexie persistence", () => {
  const names: string[] = [];
  afterEach(async () => {
    for (const name of names) await new THSDatabase(name).delete();
    names.length = 0;
  });

  it("creates, updates, restores and deletes a result", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const first = new THSDatabase(name);
    const result = makeResult();
    await first.results.put(result);
    await first.results.update(result.id, { event: "Geändert" });
    first.close();
    const reopened = new THSDatabase(name);
    expect((await reopened.results.get(result.id))?.event).toBe("Geändert");
    await reopened.results.delete(result.id);
    expect(await reopened.results.count()).toBe(0);
    reopened.close();
  });

  it("keeps persisted results unchanged when current form inputs are reset", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const database = new THSDatabase(name);
    const stored = makeResult({ event: "Gespeichertes Ergebnis" });
    await database.results.put(stored);

    const cleared = resetResultForm(
      { removeItem: () => undefined },
      {
        id: "new-form-id",
        now: new Date("2026-11-06T08:30:00.000Z"),
      },
    );

    expect(cleared.id).not.toBe(stored.id);
    expect(await database.results.count()).toBe(1);
    expect(await database.results.get(stored.id)).toEqual(stored);
    database.close();
  });

  it("migrates an existing version-1 database without changing THS data", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      results: "id,date,className,createdAt,updatedAt",
    });
    const result = makeResult();
    const legacyResult = { ...result, handlerId: undefined, dogId: undefined };
    await legacy.table("results").put(legacyResult);
    legacy.close();

    const migrated = new THSDatabase(name);
    const stored = await migrated.results.get(result.id);
    expect(stored).toMatchObject({ handler: "Alex", dog: "Fiete" });
    expect(stored?.handlerId).toBeTruthy();
    expect(stored?.dogId).toBeTruthy();
    expect((await migrated.handlers.get(stored!.handlerId!))?.name).toBe("Alex");
    expect((await migrated.dogs.get(stored!.dogId!))?.callName).toBe("Fiete");
    expect(migrated.tables.map((table) => table.name).sort()).toEqual([
      "dogs",
      "handlers",
      "results",
      "syncMeta",
      "syncQueue",
    ]);
    migrated.close();
  });

  it("removes the retired IFH store while preserving existing THS results", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      results: "id,date,className,createdAt,updatedAt",
    });
    legacy.version(2).stores({
      results: "id,date,className,createdAt,updatedAt",
      ifhSessions:
        "id,dog,date,status,mode,targetLevel,trackOwnership,createdAt,updatedAt,*focuses",
    });
    legacy.version(3).stores({
      results: "id,date,className,createdAt,updatedAt",
      ifhSessions:
        "id,dog,date,status,mode,targetLevel,trackOwnership,createdAt,updatedAt,*focuses",
    });
    const result = makeResult();
    await legacy.table("results").put(result);
    await legacy.table("ifhSessions").put({ id: "retired-ifh-session" });
    legacy.close();

    const migrated = new THSDatabase(name);
    expect(await migrated.results.get(result.id)).toEqual(result);
    expect(migrated.tables.map((table) => table.name).sort()).toEqual([
      "dogs",
      "handlers",
      "results",
      "syncMeta",
      "syncQueue",
    ]);
    migrated.close();
  });

  it("updates result name snapshots and protects profiles in use", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const database = new THSDatabase(name);
    const metadata = {
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const handler: HandlerProfile = {
      id: "handler-1",
      name: "Alex Alt",
      birthDate: "1990-05-10",
      gender: "male",
      club: "HSV Test",
      membershipNumber: "123",
      ...metadata,
    };
    const dog: DogProfile = {
      id: "dog-1",
      callName: "Fiete Alt",
      kennelName: "",
      breed: "Border Collie",
      birthDate: "2021-03-12",
      gender: "male",
      performanceRecordId: "LU-1",
      chipNumber: "",
      studbookNumber: "",
      ...metadata,
    };
    await saveHandlerProfile(handler, database);
    await saveDogProfile(dog, database);
    await database.results.put(
      makeResult({ handler: handler.name, dog: dog.callName }),
    );

    await saveHandlerProfile({ ...handler, name: "Alex Neu" }, database);
    await saveDogProfile({ ...dog, callName: "Fiete Neu" }, database);
    expect(await database.results.get("1")).toMatchObject({
      handler: "Alex Neu",
      handlerBirthDate: handler.birthDate,
      handlerGender: handler.gender,
      dog: "Fiete Neu",
    });
    await expect(deleteHandlerProfile(handler.id, database)).rejects.toThrow(
      "bereits in Ergebnissen verwendet",
    );
    await expect(deleteDogProfile(dog.id, database)).rejects.toThrow(
      "bereits in Ergebnissen verwendet",
    );
    database.close();
  });

  it("queues local writes and tombstones without losing offline data", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const database = new THSDatabase(name);
    const result = makeResult();

    await saveResult(result, database);
    expect(await database.results.get(result.id)).toBeTruthy();
    expect(await database.syncQueue.get(`results:${result.id}`)).toMatchObject({
      operation: "upsert",
      recordId: result.id,
    });

    await deleteResult(result.id, database);
    expect(await database.results.get(result.id)).toBeUndefined();
    expect(await database.syncQueue.get(`results:${result.id}`)).toMatchObject({
      operation: "delete",
      payload: undefined,
    });
    database.close();
  });

  it("does not overwrite a newer queued edit during a cloud download", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const database = new THSDatabase(name);
    const result = makeResult({ event: "Neue lokale Änderung" });
    await saveResult(result, database);

    await applyRemoteRecords(
      [
        {
          user_id: "user-1",
          entity_type: "results",
          record_id: result.id,
          payload: {
            ...result,
            event: "Ältere Cloud-Version",
            updatedAt: "2020-01-01T00:00:00.000Z",
          },
          client_updated_at: "2020-01-01T00:00:00.000Z",
          deleted_at: null,
          server_updated_at: "2020-01-01T00:00:00.000Z",
        },
      ],
      database,
    );

    expect((await database.results.get(result.id))?.event).toBe(
      "Neue lokale Änderung",
    );
    expect(await database.syncQueue.get(`results:${result.id}`)).toBeTruthy();
    database.close();
  });

  it("binds one local database to exactly one cloud account", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const database = new THSDatabase(name);
    await saveResult(makeResult(), database);

    await bindDatabaseToUser("user-1", database);
    expect((await database.syncQueue.toArray())[0].userId).toBe("user-1");
    await expect(bindDatabaseToUser("user-2", database)).rejects.toThrow(
      "anderen #Dogsports-Konto",
    );
    database.close();
  });
});
