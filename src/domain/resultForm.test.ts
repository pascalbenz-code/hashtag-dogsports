import { describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import {
  createBlankResult,
  RESULT_FORM_DRAFT_KEY,
  resetResultForm,
} from "./resultForm";

describe("result form state", () => {
  const current = new Date("2026-11-06T08:30:00.000Z");

  it("creates a new, fully empty result form with safe defaults", () => {
    const result = createBlankResult({ id: "new-result", now: current });

    expect(result).toMatchObject({
      id: "new-result",
      date: "2026-11-06",
      competitionType: "Vereinsprüfung",
      className: "FCI-VK1",
      event: "",
      handlerId: "",
      dogId: "",
      obedience: null,
      notes: "",
      hurdlesLeash: "on",
      slalomLeash: "on",
      obstacleLeash: "on",
      obstacle2Leash: "on",
    });
    expect(result.hurdles).toEqual({
      time: null,
      faults: null,
      faultDetails: [],
    });
    expect(result.slalom).toEqual({
      time: null,
      faults: null,
      faultDetails: [],
    });
    expect(result.obstacle).toEqual({
      time: null,
      faults: null,
      faultDetails: [],
    });
    expect(result.obstacle2).toEqual({
      time: null,
      faults: null,
      faultDetails: [],
    });
    expect(result.crossCountry).toEqual({
      timeSeconds: null,
      distanceMeters: 1000,
      falseStart: false,
    });
  });

  it("removes only the current draft and uses a new id", () => {
    const values = new Map([
      [RESULT_FORM_DRAFT_KEY, JSON.stringify(makeResult())],
      ["unrelated-setting", "keep"],
    ]);
    const storedResult = makeResult({ event: "Gespeichert" });
    const before = structuredClone(storedResult);

    const cleared = resetResultForm(
      { removeItem: (key) => values.delete(key) },
      { id: "fresh-id", now: current },
    );

    expect(values.has(RESULT_FORM_DRAFT_KEY)).toBe(false);
    expect(values.get("unrelated-setting")).toBe("keep");
    expect(cleared.id).toBe("fresh-id");
    expect(cleared.id).not.toBe(storedResult.id);
    expect(storedResult).toEqual(before);
  });
});
