import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { createIfhSession } from "../domain/ifh";
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

  it("saves an IFH draft and restores it without changing THS data", async () => {
    const name = `test-${crypto.randomUUID()}`;
    names.push(name);
    const first = new THSDatabase(name);
    const result = makeResult();
    const session = createIfhSession();
    session.dog = "Mika";
    session.title = "Winkeltraining";
    session.plannedTrack.legs.push({
      id: "leg-1",
      order: 1,
      lengthSteps: 200,
      lengthMeters: null,
      ground: "Acker",
      vegetation: "",
      direction: "",
      shape: "straight",
      semicircleRadiusMeters: null,
      semicircleDirection: null,
      notes: "",
    });
    await first.results.put(result);
    await first.ifhSessions.put(session);
    first.close();

    const reopened = new THSDatabase(name);
    expect((await reopened.ifhSessions.get(session.id))?.status).toBe("draft");
    expect(
      (await reopened.ifhSessions.get(session.id))?.plannedTrack.legs[0]
        .lengthSteps,
    ).toBe(200);
    expect(await reopened.results.get(result.id)).toEqual(result);
    reopened.close();
  });

  it("migrates an existing version-1 database additively", async () => {
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
    expect(await migrated.ifhSessions.count()).toBe(0);
    const session = createIfhSession();
    await migrated.ifhSessions.put(session);
    expect(await migrated.ifhSessions.get(session.id)).toEqual(session);
    migrated.close();
  });
});
