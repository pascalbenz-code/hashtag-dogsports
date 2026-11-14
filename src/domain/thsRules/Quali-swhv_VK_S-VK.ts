import type { QualificationDefinition } from "./types";

export const SWHV_RULE: QualificationDefinition = {
  flag: { key: "swhv", label: "SWHV-QUALI", color: "green" },
  periods: [
    { year: 2025, startDate: "2024-07-01", endDate: "2025-05-30", label: "SWHV-QUALI-25" },
    { year: 2026, startDate: "2025-07-01", endDate: "2026-05-30", label: "SWHV-QUALI-26" },
    { year: 2027, startDate: "2026-07-01", endDate: "2027-05-10", label: "SWHV-QUALI-27" },
  ],
  conditions: [
    {
      className: "FCI-VK3", minObedience: 48, minTotal: 250,
      competitionTypes: ["Vereinsprüfung", "Kreismeisterschaft"],
    },
    {
      className: "VDH-S-VK",
      competitionTypes: ["Vereinsprüfung", "Kreismeisterschaft"],
      // Jüngstenklasse / Jugendklasse / Aktivenklasse / Seniorenklasse
      minTotal: {
        male: { youngest: 210, youth: 210, active: 250, senior: 230 },
        female: { youngest: 200, youth: 200, active: 240, senior: 220 },
      },
    },
  ],
};
