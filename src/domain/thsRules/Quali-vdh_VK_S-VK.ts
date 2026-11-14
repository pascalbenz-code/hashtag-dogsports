import type { QualificationDefinition } from "./types";

export const VDH_RULE: QualificationDefinition = {
  flag: { key: "vdh", label: "VDH-QUALI", color: "red" },
  periods: [
    { year: 2025, startDate: "2024-09-08", endDate: "2025-09-06", label: "VDH-QUALI-25" },
    { year: 2026, startDate: "2025-09-08", endDate: "2026-09-06", label: "VDH-QUALI-26" },
    { year: 2027, startDate: "2026-09-08", endDate: "2027-09-06", label: "VDH-QUALI-27" },
  ],
  conditions: [
    {
      className: "FCI-VK3", minObedience: 54, minTotal: 270,
      competitionTypes: ["Vereinsprüfung", "Kreismeisterschaft", "Verbandsmeisterschaft", "dhv Deutsche Meisterschaft", "VDH Deutsche Meisterschaft"],
    },
    {
      className: "VDH-S-VK",
      competitionTypes: ["Vereinsprüfung", "Kreismeisterschaft", "Verbandsmeisterschaft", "dhv Deutsche Meisterschaft", "VDH Deutsche Meisterschaft"],
      // Jüngstenklasse / Jugendklasse / Aktivenklasse / Seniorenklasse
      minTotal: {
        male: { youngest: 250, youth: 260, active: 270, senior: 260 },
        female: { youngest: 240, youth: 250, active: 263, senior: 250 },
      },
    },
  ],
};
