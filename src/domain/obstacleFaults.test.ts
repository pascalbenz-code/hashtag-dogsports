import { describe, expect, it } from "vitest";
import {
  areValidObstacleFaultDetails,
  formatObstacleFaultDetail,
  obstacleFaultsTotal,
  obstacleRulesForPosition,
} from "./obstacleFaults";

describe("obstacle course fault details", () => {
  it("offers omission for all eight obstacles", () => {
    for (const position of ["hurdle-1", "oxer", "tunnel", "plank", "barrel", "hoop", "high-long", "hurdle-2"] as const)
      expect(obstacleRulesForPosition(position)).toContainEqual(expect.objectContaining({ code: "obstacle-omitted", points: 4 }));
  });
  it("uses the discipline-specific bar deductions", () => {
    expect(obstacleRulesForPosition("oxer")).toContainEqual(expect.objectContaining({ code: "oxer-bar-1-dropped", points: 1 }));
    expect(obstacleRulesForPosition("high-long")).toContainEqual(expect.objectContaining({ code: "high-long-bar-1-under", points: 2 }));
  });
  it("sums and formats details", () => {
    const details = [
      { id: "a", position: "plank", code: "plank-side-mount", points: 4 },
      { id: "b", position: "high-long", code: "high-long-bar-2-dropped", points: 1 },
    ] as const;
    expect(areValidObstacleFaultDetails([...details])).toBe(true);
    expect(obstacleFaultsTotal(details)).toBe(5);
    expect(formatObstacleFaultDetail(details[0])).toBe("Laufdiele: Seitliches Aufspringen (−4 FP)");
  });
  it("rejects duplicate events and two outcomes for the same high-long bar", () => {
    expect(areValidObstacleFaultDetails([
      { id: "a", position: "oxer", code: "oxer-bar-1-dropped", points: 1 },
      { id: "b", position: "oxer", code: "oxer-bar-1-dropped", points: 1 },
    ])).toBe(false);
    expect(areValidObstacleFaultDetails([
      { id: "a", position: "high-long", code: "high-long-bar-1-dropped", points: 1 },
      { id: "b", position: "high-long", code: "high-long-bar-1-under", points: 2 },
    ])).toBe(false);
  });
});
