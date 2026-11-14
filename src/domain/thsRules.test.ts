import { describe, expect, it } from "vitest";
import { calculateScore } from "./scoring";
import { makeResult } from "../test/factory";
import { THS_QUALIFICATION_RULES } from "./thsRules";
import { VDH_RULE } from "./thsRules/Quali-vdh_VK_S-VK";
import { DHV_RULE } from "./thsRules/Quali-dhv_VK_S-VK";
import type { CompetitionClass, CompetitionType } from "./types";

const events: CompetitionType[] = ["Vereinsprüfung", "Kreismeisterschaft", "Verbandsmeisterschaft", "dhv Deutsche Meisterschaft", "VDH Deutsche Meisterschaft"];
const births = ["2012-01-01", "2010-01-01", "1990-01-01", "1960-01-01"];
// Unabhängige Referenz des bisherigen Verhaltens; keine Erwartungswerte aus der Konfiguration ableiten.
const sprintThresholds = {
  male: [[210, 225, 250], [210, 230, 260], [250, 245, 270], [230, 240, 260]],
  female: [[200, 220, 240], [200, 225, 250], [240, 240, 263], [220, 235, 250]],
};
const sprintResult = (total: number, competitionType: CompetitionType = "VDH Deutsche Meisterschaft", handlerGender: "male" | "female" = "male", handlerBirthDate = "1990-01-01") => makeResult({
  className: "VDH-S-VK", competitionType, handlerGender, handlerBirthDate,
  hurdles: { time: 340 - total, faults: 0 }, slalom: { time: 0, faults: 0 }, obstacle: { time: 0, faults: 0 },
  crossCountry: { timeSeconds: 0, distanceMeters: 1000, falseStart: false },
});

describe("extracted THS rules", () => {
  for (const gender of ["male", "female"] as const) {
    births.forEach((birth, age) => {
      it(`preserves every sprint boundary and event for ${gender}, age group ${age}`, () => {
        const [swhv, dhv, vdh] = sprintThresholds[gender][age];
        for (const boundary of [swhv, dhv, vdh]) for (const delta of [-0.01, 0, 0.01]) for (const event of events) {
          const target = Math.round((boundary + delta) * 100) / 100;
          const hasDhv = event === "Verbandsmeisterschaft" && target >= dhv;
          const expected = [
            ...((events.indexOf(event) < 2 && target >= swhv) || hasDhv ? ["swhv"] : []),
            ...(hasDhv ? ["dhv"] : []), ...(target >= vdh ? ["vdh"] : []),
          ];
          expect(calculateScore(sprintResult(target, event, gender, birth)).qualifications.map(q => q.key)).toEqual(expected);
        }
      });
    });
  }

  it.each(["FCI-VK1", "FCI-VK2", "FCI-VK3"] as CompetitionClass[])("preserves all Vierkampf boundaries and events for %s", (className) => {
    const base = { "FCI-VK1": 250, "FCI-VK2": 255, "FCI-VK3": 265 }[className as "FCI-VK1" | "FCI-VK2" | "FCI-VK3"];
    for (const event of events) for (const obedience of [47.99, 48, 48.01, 53.99, 54, 54.01]) {
      for (const boundary of [250, 260, 265, 270]) for (const delta of [-0.01, 0, 0.01]) {
        const total = Math.round((boundary + delta) * 100) / 100;
        const score = calculateScore(makeResult({ className, competitionType: event, obedience,
          hurdles: { time: base + obedience - total, faults: 0 },
          slalom: { time: 0, faults: 0 }, obstacle: { time: 0, faults: 0 },
        }));
        const club = events.indexOf(event) < 2;
        const dhv = className === "FCI-VK3" && event === "Verbandsmeisterschaft" && obedience >= 48 && total >= 265;
        const expected = className === "FCI-VK1"
          ? (obedience >= 48 && total >= 250 ? ["promotion-vk2"] : [])
          : className === "FCI-VK2" ? (club && obedience >= 48 && total >= 260 ? ["promotion-vk3"] : [])
          : [...((club && obedience >= 48 && total >= 250) || dhv ? ["swhv"] : []), ...(dhv ? ["dhv"] : []), ...(obedience >= 54 && total >= 270 ? ["vdh"] : [])];
        expect(score.qualifications.map(q => q.key)).toEqual(expected);
      }
    }
  });

  it("applies a threshold and flag change directly to existing results", () => {
    const condition = VDH_RULE.conditions.find(rule => rule.className === "VDH-S-VK")!;
    if (typeof condition.minTotal === "number") throw new Error("Sprint matrix missing");
    const previous = condition.minTotal;
    const flag = { ...VDH_RULE.flag };
    const existing = sprintResult(275);
    try {
      condition.minTotal = { ...previous, male: { ...previous.male, active: 280 } };
      expect(calculateScore(existing).qualifications).toEqual([]);
      VDH_RULE.flag.label = "VDH-Test";
      VDH_RULE.flag.color = "green";
      expect(calculateScore(sprintResult(280)).qualifications).toEqual([{ key: "vdh", label: "VDH-Test", color: "green" }]);
    } finally {
      condition.minTotal = previous;
      Object.assign(VDH_RULE.flag, flag);
    }
  });

  it("reads cumulative flags from configuration", () => {
    const previous = DHV_RULE.includes;
    try {
      DHV_RULE.includes = [];
      expect(calculateScore(sprintResult(245, "Verbandsmeisterschaft")).qualifications.map(q => q.key)).toEqual(["dhv"]);
    } finally {
      DHV_RULE.includes = previous;
    }
  });

  it("keeps configured flag labels and colors for VK and sprint", () => {
    const expected = [
      { key: "swhv", label: "swhv-Quali", color: "green" },
      { key: "dhv", label: "dhv-Quali", color: "blue" },
      { key: "vdh", label: "VDH-Quali", color: "red" },
    ];
    expect(calculateScore(makeResult({ competitionType: "Verbandsmeisterschaft" })).qualifications).toEqual(expected);
    expect(calculateScore(sprintResult(280, "Verbandsmeisterschaft")).qualifications).toEqual(expected);
  });

  it("never awards configured flags to incomplete results", () => {
    for (const rule of THS_QUALIFICATION_RULES) for (const condition of rule.conditions) {
      const result = condition.className === "VDH-S-VK" ? sprintResult(300) : makeResult({ className: condition.className });
      expect(calculateScore({ ...result, hurdles: { time: null, faults: 0 } })).toMatchObject({ complete: false, total: null, qualifications: [] });
    }
  });
});
