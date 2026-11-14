import { describe, expect, it } from "vitest";
import { calculateScore } from "./scoring";
import { detectResultAchievements } from "./resultAchievements";
import { filterAndSort } from "./results";
import { makeResult } from "../test/factory";
import type { CompetitionClass, CompetitionType, QualificationKey } from "./types";

const periods = [
  ["swhv", "Vereinsprüfung", 2025, "2024-07-01", "2025-05-30", "SWHV-QUALI-25", "green"],
  ["swhv", "Vereinsprüfung", 2026, "2025-07-01", "2026-05-30", "SWHV-QUALI-26", "green"],
  ["swhv", "Vereinsprüfung", 2027, "2026-07-01", "2027-05-10", "SWHV-QUALI-27", "green"],
  ["dhv", "Verbandsmeisterschaft", 2025, "2025-01-01", "2025-12-31", "DHV-QUALI-25", "blue"],
  ["dhv", "Verbandsmeisterschaft", 2026, "2026-01-01", "2026-12-31", "DHV-QUALI-26", "blue"],
  ["dhv", "Verbandsmeisterschaft", 2027, "2027-01-01", "2027-12-31", "DHV-QUALI-27", "blue"],
  ["vdh", "VDH Deutsche Meisterschaft", 2025, "2024-09-08", "2025-09-06", "VDH-QUALI-25", "red"],
  ["vdh", "VDH Deutsche Meisterschaft", 2026, "2025-09-08", "2026-09-06", "VDH-QUALI-26", "red"],
  ["vdh", "VDH Deutsche Meisterschaft", 2027, "2026-09-08", "2027-09-06", "VDH-QUALI-27", "red"],
] as const;
const resultAt = (date: string, competitionType: CompetitionType, className: CompetitionClass = "FCI-VK3") => makeResult({
  date, competitionType, className, obedience: 60, handlerGender: "male", handlerBirthDate: "1990-01-01",
  hurdles: { time: 0, faults: 0 }, slalom: { time: 0, faults: 0 }, obstacle: { time: 0, faults: 0 },
  crossCountry: { timeSeconds: 0, distanceMeters: 1000, falseStart: false },
});
const offset = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

describe("championship year flags", () => {
  for (const className of ["FCI-VK3", "VDH-S-VK"] as const) {
    it.each(periods)(`${className}: %s %s %s boundaries`, (key, event, year, start, end, label, color) => {
      for (const date of [start, end]) {
        expect(calculateScore(resultAt(date, event, className)).qualifications.filter(q => q.key === key))
          .toEqual([{ key, year, label, color }]);
      }
      for (const date of [offset(start, -1), offset(end, 1)]) {
        expect(calculateScore(resultAt(date, event, className)).qualifications.some(q => q.key === key && q.year === year)).toBe(false);
      }
      const lowScore = resultAt(start, event, className);
      lowScore.hurdles.time = 300;
      expect(calculateScore(lowScore).qualifications).toEqual([]);
      expect(calculateScore({ ...resultAt(start, event, className), obedience: null, hurdles: { time: null, faults: 0 } }).qualifications).toEqual([]);
    });
  }
  it("requires a Verbandsmeisterschaft in the championship calendar year for DHV", () => {
    for (const event of ["Vereinsprüfung", "Kreismeisterschaft", "dhv Deutsche Meisterschaft", "VDH Deutsche Meisterschaft"] as const) {
      expect(calculateScore(resultAt("2027-04-01", event)).qualifications.some(q => q.key === "dhv")).toBe(false);
    }
  });
  it("checks the SWHV period independently when DHV includes SWHV", () => {
    expect(calculateScore(resultAt("2026-06-15", "Verbandsmeisterschaft")).qualifications.map(q => q.label))
      .toEqual(["DHV-QUALI-26", "VDH-QUALI-26"]);
    expect(calculateScore(resultAt("2026-08-01", "Verbandsmeisterschaft")).qualifications.map(q => q.label))
      .toEqual(["SWHV-QUALI-27", "DHV-QUALI-26", "VDH-QUALI-26"]);
  });
  it.each(["2023-05-10", "2028-05-10"])("shows no championship flags outside configured years on %s", date => {
    expect(calculateScore(resultAt(date, "Verbandsmeisterschaft")).qualifications).toEqual([]);
  });
  it("keeps promotions independent of championship periods", () => {
    expect(calculateScore(resultAt("2028-05-10", "Vereinsprüfung", "FCI-VK1")).qualifications)
      .toEqual([{ key: "promotion-vk2", label: "Aufstieg-VK2", color: "gray" }]);
  });
  it("preserves existing qualification filters with annual flags", () => {
    const result = resultAt("2026-11-14", "Vereinsprüfung");
    for (const qualification of ["swhv", "vdh"] as QualificationKey[]) {
      expect(filterAndSort([result], { query: "", className: "all", qualification, includeDrafts: false, sort: "date-desc" })).toEqual([result]);
    }
  });
  it("recognizes a changed championship year during an edit and ignores unchanged annual flags", () => {
    const previous = resultAt("2026-05-10", "Verbandsmeisterschaft");
    const next = { ...previous, date: "2026-11-14" };
    expect(detectResultAchievements([previous], next).newQualifications.map(q => q.label)).toEqual(["SWHV-QUALI-27", "VDH-QUALI-27"]);
    expect(detectResultAchievements([next], next).newQualifications).toEqual([]);
  });
});
