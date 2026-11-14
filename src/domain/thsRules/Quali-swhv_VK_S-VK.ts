import type { QualificationDefinition } from "./types";

export const SWHV_RULE: QualificationDefinition = {
  flag: { key: "swhv", label: "swhv-Quali", color: "green" },
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
