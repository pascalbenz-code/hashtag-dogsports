import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeResult } from "../test/factory";
import { parseBackup, readBackupFile, serializeBackup, toCsv } from "./backup";
import { MAX_BACKUP_BYTES, MAX_BACKUP_RECORDS, MAX_FAULT_DETAILS } from "./validation";
import { applyRemoteRecords, importBackup, removeQueueChangesIfUnchanged, saveResult, THSDatabase } from "./db";

const databases: THSDatabase[] = [];
afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
  vi.useRealTimers();
});
const database = () => {
  const db = new THSDatabase(`security-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
};

describe("untrusted backups and exports", () => {
  it.each(["=1+1", "+1+1", "-1+1", "@SUM(A1)", " \t=1+1", "\ttext", "\rtext", "\ntext"])(
    "neutralizes spreadsheet formulas and control prefixes: %j", (value) => {
      expect(toCsv([makeResult({ event: value })])).toContain(`"'${value}"`);
    });
  it("keeps ordinary text, quotes and decimal commas", () => {
    const csv = toCsv([makeResult({ event: 'HSV "Test"; Süd' })]);
    expect(csv).toContain('"HSV ""Test""; Süd"');
    expect(csv).toContain('"12,03"');
  });
  it.each([
    { handler: {} }, { dog: null }, { notes: [] }, { date: "2026-02-31" },
    { id: "" }, { createdAt: null }, { updatedAt: "yesterday" },
    { obedience: "55" }, { hurdles: { time: {}, faults: 0 } },
    { obstacle2: {} }, { crossCountry: { timeSeconds: 1, distanceMeters: 1000, falseStart: "false" } },
    { handlerGender: "admin" }, { obstacleLeash: "invalid" },
  ])("rejects malformed fields before persistence: %j", (override) => {
    expect(() => parseBackup(JSON.stringify({ app: "#Dogsports", results: [{ ...makeResult(), ...override }] }))).toThrow();
  });
  it("rejects overflowing numeric literals", () => {
    const text = serializeBackup([makeResult()]).replace('"obedience": 55', '"obedience": 1e999');
    expect(() => parseBackup(text)).toThrow();
  });
  it("retains incomplete drafts and legacy formats", () => {
    const draft = makeResult({ obedience: null, handler: "", dog: "", date: "" });
    expect(parseBackup(serializeBackup([draft])).results[0]).toEqual(draft);
    expect(parseBackup(JSON.stringify({ app: "#Dogsport", version: 1, results: [makeResult()] })).results).toHaveLength(1);
  });
  it("rejects malformed profile lists, metadata and duplicate IDs", () => {
    expect(() => parseBackup(JSON.stringify({ app: "#Dogsports", results: [], dogs: {} }))).toThrow();
    expect(() => parseBackup(serializeBackup([makeResult(), makeResult()]))).toThrow("doppelte IDs");
    expect(() => parseBackup(JSON.stringify({ app: "#Dogsports", results: [], handlers: [{ id: "h", name: "A", birthDate: "", gender: "", club: "", membershipNumber: "" }] }))).toThrow();
  });
  it("rejects oversized files before reading bytes", async () => {
    const text = vi.fn();
    await expect(readBackupFile({ size: MAX_BACKUP_BYTES + 1, text })).rejects.toThrow("zu groß");
    expect(text).not.toHaveBeenCalled();
  });
  it("bounds decoded backup size, records and quadratic detail validation", () => {
    expect(() => parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1))).toThrow("zu groß");
    expect(() => parseBackup(JSON.stringify({ app: "#Dogsports", results: Array(MAX_BACKUP_RECORDS + 1).fill(null) }))).toThrow("zu viele");
    expect(() => parseBackup(serializeBackup([makeResult({ obstacle: { time: 1, faults: 0, faultDetails: Array(MAX_FAULT_DETAILS + 1).fill({}) } })]))).toThrow();
  });
});

describe("atomic import and sync queue", () => {
  it("does not overwrite a concurrent edit when importing unrelated records", async () => {
    const db = database();
    await saveResult(makeResult({ event: "Newer local edit" }), db);
    const previousQueue = await db.syncQueue.get("results:1");
    const incoming = parseBackup(serializeBackup([makeResult({ id: "2" })]));
    expect(await importBackup(incoming, false, db)).toEqual({ added: 1, replaced: 0, skipped: 0 });
    expect((await db.results.get("1"))?.event).toBe("Newer local edit");
    expect(await db.syncQueue.get("results:1")).toEqual(previousQueue);
  });
  it("skips conflicts by default and replaces only with explicit intent", async () => {
    const db = database();
    await saveResult(makeResult(), db);
    const incoming = parseBackup(serializeBackup([makeResult({ event: "Imported" })]));
    expect((await importBackup(incoming, false, db)).skipped).toBe(1);
    expect((await db.results.get("1"))?.event).toBe("HSV Test");
    expect((await importBackup(incoming, true, db)).replaced).toBe(1);
    expect((await db.results.get("1"))?.event).toBe("Imported");
  });
  it("keeps an equally timestamped local edit while applying a remote download", async () => {
    const db = database();
    await saveResult(makeResult({ event: "Local wins ties" }), db);
    const queued = (await db.syncQueue.toArray())[0];
    await applyRemoteRecords([{ user_id: "user-1", entity_type: "results", record_id: "1",
      payload: makeResult({ event: "Remote" }), client_updated_at: queued.updatedAt,
      server_updated_at: queued.updatedAt, deleted_at: null }], db);
    expect((await db.results.get("1"))?.event).toBe("Local wins ties");
  });
  it("preserves an edit in the same millisecond as the uploaded snapshot", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));
    const db = database();
    await saveResult(makeResult(), db);
    const uploaded = (await db.syncQueue.toArray())[0];
    await saveResult(makeResult({ event: "Concurrent edit" }), db);
    await removeQueueChangesIfUnchanged([uploaded], db);
    expect(await db.syncQueue.count()).toBe(1);
    const current = (await db.syncQueue.toArray())[0];
    await removeQueueChangesIfUnchanged([current], db);
    expect(await db.syncQueue.count()).toBe(0);
  });
});
