import type { QualificationDefinition } from "./types";

export const DHV_RULE: QualificationDefinition = {
  flag: { key: "dhv", label: "dhv-Quali", color: "blue" },
  includes: ["swhv"],
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
