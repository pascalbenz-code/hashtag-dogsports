import type { QualificationDefinition } from "./types";

export const VDH_RULE: QualificationDefinition = {
  flag: { key: "vdh", label: "VDH-Quali", color: "red" },
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
