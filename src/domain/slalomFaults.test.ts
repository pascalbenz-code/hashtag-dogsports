import { describe, expect, it } from "vitest";
import {
  areValidSlalomFaultDetails,
  formatSlalomFaultDetail,
  isValidSlalomFaultDetail,
  slalomFaultsTotal,
  slalomRulesForPosition,
} from "./slalomFaults";

describe("slalom fault details", () => {
  it("assigns four points to each omitted course gate", () => {
    expect(slalomRulesForPosition("gate-2")[0]).toMatchObject({
      code: "gate-omitted",
      points: 4,
    });
    expect(slalomRulesForPosition("gate-5")[0]).toMatchObject({
      code: "gate-omitted",
      points: 4,
    });
  });

  it("keeps physical help position-independent", () => {
    expect(slalomRulesForPosition("position-independent")[0]).toMatchObject({
      code: "held-after-start",
      points: 2,
    });
  });

  it("validates, sums and formats details", () => {
    const details = [
      { id: "gate", position: "gate-2", code: "gate-omitted", points: 4 },
      { id: "help", position: "position-independent", code: "held-after-start", points: 2 },
    ] as const;
    expect(details.every(isValidSlalomFaultDetail)).toBe(true);
    expect(slalomFaultsTotal(details)).toBe(6);
    expect(formatSlalomFaultDetail(details[0])).toBe(
      "Slalomtor 2: Streckentor nicht durchlaufen (−4 FP)",
    );
  });

  it("rejects invented positions and point values", () => {
    expect(isValidSlalomFaultDetail({ id: "x", position: "gate-5", code: "gate-omitted", points: 4 })).toBe(true);
    expect(isValidSlalomFaultDetail({ id: "x", position: "gate-6", code: "gate-omitted", points: 4 })).toBe(false);
    expect(isValidSlalomFaultDetail({ id: "x", position: "gate-1", code: "gate-omitted", points: 8 })).toBe(false);
  });

  it("rejects duplicate deductions for the same omitted gate", () => {
    expect(
      areValidSlalomFaultDetails([
        { id: "a", position: "gate-5", code: "gate-omitted", points: 4 },
        { id: "b", position: "gate-5", code: "gate-omitted", points: 4 },
      ]),
    ).toBe(false);
  });
});
