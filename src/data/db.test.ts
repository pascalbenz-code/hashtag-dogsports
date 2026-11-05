import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import type { DogProfile, HandlerProfile } from "../domain/profiles";
import {
  deleteDogProfile,
  deleteHandlerProfile,
  saveDogProfile,
  saveHandlerProfile,
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
});
