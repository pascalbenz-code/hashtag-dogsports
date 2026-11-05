import { describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import { bestIds, filterAndSort, type ResultFilters } from "./results";

const filters = (overrides: Partial<ResultFilters> = {}): ResultFilters => ({
  query: "",
  className: "all",
  qualification: "all",
  includeDrafts: true,
  sort: "date-desc",
  ...overrides,
});

describe("result queries", () => {
  const a = makeResult({ id: "a", event: "Alpha", date: "2026-01-01", obedience: 50 });
  const b = makeResult({ id: "b", event: "Beta", date: "2026-02-01", obedience: 60 });
  const draft = makeResult({ id: "c", event: "Draft", obedience: null });

  it("filters drafts, class and query", () => {
    expect(filterAndSort([a, b, draft], filters({ query: "be", className: "FCI-VK3", includeDrafts: false })).map((result) => result.id)).toEqual(["b"]);
  });
  it("sorts point results with the highest score first", () => {
    expect(filterAndSort([a, b], filters({ sort: "score-desc" }))[0].id).toBe("b");
  });
  it("sorts HL time results with the lowest time first", () => {
    const fast = makeResult({ id: "fast", className: "VDH-HL", obstacle: { time: 20, faults: 0 }, obstacle2: { time: 21, faults: 0 }, obstacleLeash: "off", obstacle2Leash: "off" });
    const slow = makeResult({ id: "slow", className: "VDH-HL", obstacle: { time: 25, faults: 0 }, obstacle2: { time: 26, faults: 0 }, obstacleLeash: "off", obstacle2Leash: "off" });
    expect(filterAndSort([slow, fast], filters({ sort: "score-desc" }))[0].id).toBe("fast");
  });
  it("marks tied best results within each discipline", () => {
    const best = bestIds([a, { ...a, id: "x" }]);
    expect(best.total).toEqual(new Set(["a", "x"]));
  });
  it("marks the lowest HL total as its discipline best", () => {
    const fast = makeResult({ id: "fast", className: "VDH-HL", obstacle: { time: 20, faults: 0 }, obstacle2: { time: 21, faults: 0 }, obstacleLeash: "off", obstacle2Leash: "off" });
    const slow = makeResult({ id: "slow", className: "VDH-HL", obstacle: { time: 25, faults: 0 }, obstacle2: { time: 26, faults: 0 }, obstacleLeash: "off", obstacle2Leash: "off" });
    expect(bestIds([slow, fast]).total).toEqual(new Set(["fast"]));
  });
  it("excludes drafts from bests", () => {
    expect(bestIds([draft]).total.size).toBe(0);
  });
});
