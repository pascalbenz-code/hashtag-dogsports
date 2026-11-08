import { describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import {
  clearResultFormStep,
  createBlankResult,
  loadResultFormStep,
  RESULT_FORM_DRAFT_KEY,
  RESULT_FORM_STEP_KEY_PREFIX,
  resetResultForm,
  saveResultFormStep,
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

  it("stores and restores the current wizard step per result id", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(loadResultFormStep("result-1", storage)).toBe(1);
    expect(saveResultFormStep("result-1", 2, storage)).toBe(true);
    expect(saveResultFormStep("result-2", 3, storage)).toBe(true);
    expect(loadResultFormStep("result-1", storage)).toBe(2);
    expect(loadResultFormStep("result-2", storage)).toBe(3);
    expect(values.get(`${RESULT_FORM_STEP_KEY_PREFIX}result-1`)).toBe("2");
  });

  it.each([null, "", "0", "4", "2.5", "NaN", "invalid"])(
    "falls back to step 1 for an invalid stored value %s",
    (stored) => {
      expect(
        loadResultFormStep("result-1", {
          getItem: () => stored,
        }),
      ).toBe(1);
    },
  );

  it("clears only the selected result step", () => {
    const values = new Map<string, string>([
      [`${RESULT_FORM_STEP_KEY_PREFIX}result-1`, "3"],
      [`${RESULT_FORM_STEP_KEY_PREFIX}result-2`, "2"],
      ["unrelated-setting", "keep"],
    ]);

    expect(
      clearResultFormStep("result-1", {
        removeItem: (key) => values.delete(key),
      }),
    ).toBe(true);
    expect(values.has(`${RESULT_FORM_STEP_KEY_PREFIX}result-1`)).toBe(false);
    expect(values.get(`${RESULT_FORM_STEP_KEY_PREFIX}result-2`)).toBe("2");
    expect(values.get("unrelated-setting")).toBe("keep");
  });

  it("handles unavailable browser storage without breaking the form", () => {
    const storageError = new Error("storage unavailable");
    expect(
      loadResultFormStep("result-1", {
        getItem: () => {
          throw storageError;
        },
      }),
    ).toBe(1);
    expect(
      saveResultFormStep("result-1", 2, {
        setItem: () => {
          throw storageError;
        },
      }),
    ).toBe(false);
    expect(
      clearResultFormStep("result-1", {
        removeItem: () => {
          throw storageError;
        },
      }),
    ).toBe(false);
    expect(() =>
      resetResultForm(
        {
          removeItem: () => {
            throw storageError;
          },
        },
        { id: "safe-reset", now: current },
      ),
    ).not.toThrow();
  });
});
