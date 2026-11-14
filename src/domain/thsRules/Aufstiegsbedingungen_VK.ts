import type { QualificationDefinition } from "./types";

// Bestehende technische Klassen- und Flag-IDs beibehalten.
export const PROMOTION_RULES: readonly QualificationDefinition[] = [
  {
    flag: { key: "promotion-vk2", label: "Aufstieg-VK2", color: "gray" },
    conditions: [{
      className: "FCI-VK1", minObedience: 48, minTotal: 250,
      competitionTypes: ["Vereinsprüfung", "Kreismeisterschaft", "Verbandsmeisterschaft", "dhv Deutsche Meisterschaft", "VDH Deutsche Meisterschaft"],
    }],
  },
  {
    flag: { key: "promotion-vk3", label: "Aufstieg-VK3", color: "gray" },
    conditions: [{
      className: "FCI-VK2", minObedience: 48, minTotal: 260,
      competitionTypes: ["Vereinsprüfung", "Kreismeisterschaft"],
    }],
  },
];
