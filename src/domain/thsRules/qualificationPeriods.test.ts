import { describe, expect, it } from "vitest";
import { matchingQualificationPeriods } from "./qualificationPeriods";
import { THS_QUALIFICATION_RULES } from "./index";

const dayOffset = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

describe("qualification periods", () => {
  for (const definition of THS_QUALIFICATION_RULES) {
    for (const period of definition.periods ?? []) {
      it(`includes both boundaries and excludes adjacent days for ${period.label}`, () => {
        expect(matchingQualificationPeriods(period.startDate, [period])).toEqual([period]);
        expect(matchingQualificationPeriods(period.endDate, [period])).toEqual([period]);
        expect(matchingQualificationPeriods(dayOffset(period.startDate, -1), [period])).toEqual([]);
        expect(matchingQualificationPeriods(dayOffset(period.endDate, 1), [period])).toEqual([]);
      });
    }
  }
  it.each(["", "2026-02-30", "2026-13-01", "2026-1-01", "invalid", "2026-05-10T12:00:00Z"])("rejects invalid event date %s", date => {
    expect(matchingQualificationPeriods(date, [{ year: 2026, startDate: "2025-01-01", endDate: "2027-12-31", label: "Test" }])).toEqual([]);
  });
  it("keeps overlapping periods independently eligible", () => {
    const periods = [
      { year: 2026, startDate: "2025-01-01", endDate: "2026-12-31", label: "Test-26" },
      { year: 2027, startDate: "2026-01-01", endDate: "2027-12-31", label: "Test-27" },
    ];
    expect(matchingQualificationPeriods("2026-06-01", periods)).toEqual(periods);
  });
});
