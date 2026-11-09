import "fake-indexeddb/auto";
import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeResult } from "../test/factory";
import { saveResult, THSDatabase } from "./db";
import { synchronizeCloud } from "./cloudSync";

const databases: THSDatabase[] = [];
afterEach(async () => { await Promise.all(databases.splice(0).map((db) => db.delete())); });
const remote = (overrides = {}) => ({ user_id: "user-1", entity_type: "results", record_id: "1",
  payload: makeResult(), client_updated_at: "2026-05-10T10:00:00Z", server_updated_at: "2026-05-10T10:00:01Z", deleted_at: null, ...overrides });
const setup = (records: unknown[], written: unknown[] = [{ record_id: "1" }]) => {
  const database = new THSDatabase(`cloud-security-${crypto.randomUUID()}`);
  databases.push(database);
  const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
    new Response(JSON.stringify(init?.method === "GET" ? records : written),
      { status: 200, headers: { "Content-Type": "application/json" } }));
  const client = createClient("https://example.invalid", "test-publishable", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch },
  });
  return { database, fetch, client };
};
describe("cloud API boundaries (mock transport, no external requests)", () => {
  it("rejects cross-account responses before changing local data", async () => {
    const { database, client, fetch } = setup([remote({ user_id: "other-user" })]);
    await expect(synchronizeCloud(client, "user-1", database)).rejects.toThrow("anderen Kontos");
    expect(await database.results.count()).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed remote payloads before storing them", async () => {
    const { database, client } = setup([remote({ payload: makeResult({ notes: {} as string }) })]);
    await expect(synchronizeCloud(client, "user-1", database)).rejects.toThrow("beschädigt");
    expect(await database.results.count()).toBe(0);
  });
  it("uses an atomic server-version predicate and retains queued edits on conflict", async () => {
    const { database, client, fetch } = setup([remote()], []);
    await saveResult(makeResult({ event: "Local edit" }), database);
    await expect(synchronizeCloud(client, "user-1", database)).rejects.toThrow("gleichzeitig geändert");
    const [url, init] = fetch.mock.calls[1];
    expect(init?.method).toBe("PATCH");
    const params = new URL(String(url)).searchParams;
    expect(params.get("user_id")).toBe("eq.user-1");
    expect(params.get("record_id")).toBe("eq.1");
    expect(params.get("server_updated_at")).toBe("eq.2026-05-10T10:00:01Z");
    expect(await database.syncQueue.count()).toBe(1);
    expect((await database.results.get("1"))?.event).toBe("Local edit");
  });
  it("acknowledges a successful conditional update", async () => {
    const { database, client } = setup([remote()]);
    await saveResult(makeResult(), database);
    expect((await synchronizeCloud(client, "user-1", database)).uploaded).toBe(1);
    expect(await database.syncQueue.count()).toBe(0);
  });
  it("inserts new rows without an unconditional upsert", async () => {
    const { database, client, fetch } = setup([]);
    await saveResult(makeResult(), database);
    await synchronizeCloud(client, "user-1", database);
    const [, init] = fetch.mock.calls[1];
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Prefer")).not.toContain("merge-duplicates");
  });
});
