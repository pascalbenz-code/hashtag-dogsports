import { describe, expect, it } from "vitest";
import {
  formatHurdleFaultDetail,
  hurdleFaultsTotal,
  hurdleRulesForPosition,
  isValidHurdleFaultDetail,
} from "./hurdleFaults";
import type { HurdleFaultDetail } from "./types";

const detail: HurdleFaultDetail = {
  id: "fault-1",
  position: "hurdle-2",
  code: "bar-dropped",
  points: 2,
};

describe("hurdle fault details", () => {
  it("offers only position-specific rules", () => {
    expect(hurdleRulesForPosition("hurdle-2").map((rule) => rule.points)).toEqual([
      4, 2, 2,
    ]);
    expect(
      hurdleRulesForPosition("turn-pole").map((rule) => rule.points),
    ).toEqual([10, 10]);
    expect(hurdleRulesForPosition("position-independent")).toHaveLength(1);
    expect(hurdleRulesForPosition("hurdle-6").map((rule) => rule.points)).toEqual([
      4, 2, 2,
    ]);
  });

  it("adds multiple faults at the same hurdle", () => {
    expect(
      hurdleFaultsTotal([
        detail,
        { ...detail, id: "fault-2", code: "early-or-late" },
      ]),
    ).toBe(4);
  });

  it("validates the rule, position and fixed deduction as one unit", () => {
    expect(isValidHurdleFaultDetail(detail)).toBe(true);
    expect(isValidHurdleFaultDetail({ ...detail, points: 4 })).toBe(false);
    expect(
      isValidHurdleFaultDetail({ ...detail, position: "turn-pole" }),
    ).toBe(false);
  });

  it("allows hurdles 5 and 6 only for VK3", () => {
    const vk3Detail = { ...detail, position: "hurdle-6" as const };
    expect(isValidHurdleFaultDetail(vk3Detail, "FCI-VK3")).toBe(true);
    expect(isValidHurdleFaultDetail(vk3Detail, "FCI-VK2")).toBe(false);
    expect(isValidHurdleFaultDetail(detail, "FCI-VK2")).toBe(true);
  });

  it("formats a readable German summary", () => {
    expect(formatHurdleFaultDetail(detail)).toBe(
      "Hürde 2: Stange abgeworfen (−2 FP)",
    );
  });
});
