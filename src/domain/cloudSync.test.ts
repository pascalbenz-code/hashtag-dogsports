import { describe, expect, it } from "vitest";
import {
  decideSync,
  type LocalSyncRecord,
  type QueuedSyncChange,
  type RemoteSyncRecord,
} from "./cloudSync";

const local = (updatedAt = "2026-01-01T10:00:00.000Z"): LocalSyncRecord => ({
  entity: "results",
  recordId: "result-1",
  payload: { id: "result-1", updatedAt },
  updatedAt,
});

const queued = (
  operation: QueuedSyncChange["operation"] = "upsert",
  updatedAt = "2026-01-01T11:00:00.000Z",
): QueuedSyncChange => ({
  id: "results:result-1",
  entity: "results",
  recordId: "result-1",
  operation,
  payload: operation === "upsert" ? local(updatedAt).payload : undefined,
  updatedAt,
});

const remote = (
  updatedAt = "2026-01-01T09:00:00.000Z",
  deletedAt: string | null = null,
): RemoteSyncRecord => ({
  user_id: "user-1",
  entity_type: "results",
  record_id: "result-1",
  payload: deletedAt ? null : local(updatedAt).payload,
  client_updated_at: updatedAt,
  deleted_at: deletedAt,
  server_updated_at: updatedAt,
});

describe("cloud sync conflict resolution", () => {
  it("uploads existing offline data on the first sync", () => {
    const result = decideSync([local()], [], []);
    expect(result.upload).toHaveLength(1);
    expect(result.upload[0].operation).toBe("upsert");
  });

  it("keeps a newer queued local edit", () => {
    const result = decideSync([local()], [queued()], [remote()]);
    expect(result.upload).toEqual([queued()]);
    expect(result.download).toEqual([]);
  });

  it("uses a newer cloud edit and resolves the old queue item", () => {
    const cloud = remote("2026-01-01T12:00:00.000Z");
    const result = decideSync([local()], [queued()], [cloud]);
    expect(result.download).toEqual([cloud]);
    expect(result.removeQueueIds).toEqual(["results:result-1"]);
  });

  it("propagates queued deletions as tombstones", () => {
    const deletion = queued("delete");
    const result = decideSync([], [deletion], [remote()]);
    expect(result.upload).toEqual([deletion]);
  });

  it("applies a newer remote tombstone locally", () => {
    const cloud = remote(
      "2026-01-01T12:00:00.000Z",
      "2026-01-01T12:00:00.000Z",
    );
    const result = decideSync([local()], [], [cloud]);
    expect(result.download).toEqual([cloud]);
    expect(result.upload).toEqual([]);
  });
});
