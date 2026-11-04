import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import { THSDatabase } from "./db";

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
    await legacy.table("results").put(result);
    legacy.close();

    const migrated = new THSDatabase(name);
    expect(await migrated.results.get(result.id)).toEqual(result);
    expect(migrated.tables.map((table) => table.name)).toEqual(["results"]);
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
    expect(migrated.tables.map((table) => table.name)).toEqual(["results"]);
    migrated.close();
  });
});
