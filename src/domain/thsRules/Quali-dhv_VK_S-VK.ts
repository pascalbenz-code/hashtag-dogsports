import type { QualificationDefinition } from "./types";

export const DHV_RULE: QualificationDefinition = {
  flag: { key: "dhv", label: "DHV-QUALI", color: "blue" },
  includes: ["swhv"],
  periods: [
    { year: 2025, startDate: "2025-01-01", endDate: "2025-12-31", label: "DHV-QUALI-25" },
    { year: 2026, startDate: "2026-01-01", endDate: "2026-12-31", label: "DHV-QUALI-26" },
    { year: 2027, startDate: "2027-01-01", endDate: "2027-12-31", label: "DHV-QUALI-27" },
  ],
  conditions: [
    {
      className: "FCI-VK3", minObedience: 48, minTotal: 265,
      competitionTypes: ["Verbandsmeisterschaft"],
    },
    {
      className: "VDH-S-VK",
      competitionTypes: ["Verbandsmeisterschaft"],
      // Jüngstenklasse / Jugendklasse / Aktivenklasse / Seniorenklasse
      minTotal: {
        male: { youngest: 225, youth: 230, active: 245, senior: 240 },
        female: { youngest: 220, youth: 225, active: 240, senior: 235 },
      },
    },
  ],
};
