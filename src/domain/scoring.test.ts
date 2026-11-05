import { describe, expect, it } from "vitest";
import { calculateScore, getAgeGroup, validateResult } from "./scoring";
import { makeResult } from "../test/factory";
import type { CompetitionType } from "./types";

describe("FCI scoring and qualifications", () => {
  it("matches the cumulative VK3 example at a Verbandsmeisterschaft", () => {
    const score = calculateScore(
      makeResult({ competitionType: "Verbandsmeisterschaft" }),
    );
    expect(score.total).toBe(278.52);
    expect(score.qualifications.map((q) => q.key)).toEqual([
      "swhv",
      "dhv",
      "vdh",
    ]);
  });

  it("qualifies VK1 exactly at its boundaries independent of tournament type", () => {
    const score = calculateScore(
      makeResult({
        className: "FCI-VK1",
        obedience: 48,
        hurdles: { time: 16, faults: 0 },
        slalom: { time: 16, faults: 0 },
        obstacle: { time: 16, faults: 0 },
        competitionType: "VDH Deutsche Meisterschaft",
      }),
    );
    expect(score.total).toBe(250);
    expect(score.qualifications.map((q) => q.key)).toEqual(["promotion-vk2"]);
  });

  it.each(["Vereinsprüfung", "Kreismeisterschaft"] as CompetitionType[])(
    "qualifies VK2 at its boundaries for %s",
    (competitionType) => {
      const score = calculateScore(
        makeResult({
          className: "FCI-VK2",
          competitionType,
          obedience: 48,
          hurdles: { time: 14, faults: 0 },
          slalom: { time: 14, faults: 0 },
          obstacle: { time: 15, faults: 0 },
        }),
      );
      expect(score.total).toBe(260);
      expect(score.qualifications.map((q) => q.key)).toEqual(["promotion-vk3"]);
    },
  );

  it("does not grant Aufstieg-VK3 at a Verbandsmeisterschaft", () => {
    const score = calculateScore(
      makeResult({
        className: "FCI-VK2",
        competitionType: "Verbandsmeisterschaft",
        obedience: 55,
      }),
    );
    expect(score.qualifications).toEqual([]);
  });

  it("grants swhv only at Vereinsprüfung or Kreismeisterschaft", () => {
    const club = calculateScore(
      makeResult({ competitionType: "Vereinsprüfung", obedience: 53 }),
    );
    const national = calculateScore(
      makeResult({
        competitionType: "dhv Deutsche Meisterschaft",
        obedience: 53,
      }),
    );
    expect(club.qualifications.map((q) => q.key)).toEqual(["swhv"]);
    expect(national.qualifications).toEqual([]);
  });

  it("grants dhv at a Verbandsmeisterschaft and includes swhv cumulatively", () => {
    const score = calculateScore(
      makeResult({ competitionType: "Verbandsmeisterschaft", obedience: 53 }),
    );
    expect(score.qualifications.map((q) => q.key)).toEqual(["swhv", "dhv"]);
  });

  it.each([
    "Vereinsprüfung",
    "Kreismeisterschaft",
    "Verbandsmeisterschaft",
    "dhv Deutsche Meisterschaft",
    "VDH Deutsche Meisterschaft",
  ] as CompetitionType[])("grants VDH at %s", (competitionType) => {
    const score = calculateScore(makeResult({ competitionType }));
    expect(score.qualifications.map((q) => q.key)).toContain("vdh");
  });

  it("keeps incomplete entries as drafts without qualifications", () => {
    const score = calculateScore(
      makeResult({
        event: "",
        obedience: null,
        hurdles: { time: null, faults: null },
        slalom: { time: null, faults: null },
        obstacle: { time: null, faults: null },
      }),
    );
    expect(score.complete).toBe(false);
    expect(score.total).toBeNull();
    expect(score.qualifications).toEqual([]);
  });

  it("rejects invalid numeric input", () => {
    expect(
      validateResult(
        makeResult({ obedience: 61, slalom: { time: -2, faults: -1 } }),
      ),
    ).toHaveLength(3);
  });

  it("uses the detailed hurdle sum exactly once in the existing total", () => {
    const score = calculateScore(
      makeResult({
        className: "FCI-VK1",
        hurdles: {
          time: 12.03,
          faults: 12,
          faultDetails: [
            {
              id: "bar-2",
              position: "hurdle-2",
              code: "bar-dropped",
              points: 2,
            },
            {
              id: "turn",
              position: "turn-pole",
              code: "turn-pole-omitted",
              points: 10,
            },
          ],
        },
      }),
    );

    expect(score.complete).toBe(true);
    expect(score.total).toBe(251.52);
  });

  it("rejects a mismatch between hurdle details and entered fault points", () => {
    const result = makeResult({
      className: "FCI-VK2",
      hurdles: {
        time: 12.03,
        faults: 4,
        faultDetails: [
          {
            id: "bar-2",
            position: "hurdle-2",
            code: "bar-dropped",
            points: 2,
          },
        ],
      },
    });

    expect(validateResult(result)).toContain(
      "Hürden: Fehlerpunkte stimmen nicht mit den Detailangaben überein",
    );
  });

  it("uses the detailed slalom sum exactly once in the existing total", () => {
    const score = calculateScore(
      makeResult({
        slalom: {
          time: 14.2,
          faults: 6,
          faultDetails: [
            {
              id: "gate-2",
              position: "gate-2",
              code: "gate-omitted",
              points: 4,
            },
            {
              id: "help",
              position: "position-independent",
              code: "held-after-start",
              points: 2,
            },
          ],
        },
      }),
    );

    expect(score.complete).toBe(true);
    expect(score.total).toBe(276.33);
  });

  it("rejects invalid or mismatched slalom detail points", () => {
    const result = makeResult({
      slalom: {
        time: 14.2,
        faults: 2,
        faultDetails: [
          {
            id: "gate-2",
            position: "gate-2",
            code: "gate-omitted",
            points: 4,
          },
        ],
      },
    });
    expect(validateResult(result)).toContain(
      "Slalom: Fehlerpunkte stimmen nicht mit den Detailangaben überein",
    );
  });

  it("uses detailed obstacle-course faults exactly once", () => {
    const score = calculateScore(
      makeResult({
        obstacle: {
          time: 9.44,
          faults: 7,
          faultDetails: [
            { id: "oxer", position: "oxer", code: "oxer-bar-1-dropped", points: 1 },
            { id: "plank", position: "plank", code: "plank-side-mount", points: 4 },
            { id: "high-long", position: "high-long", code: "high-long-bar-2-under", points: 2 },
          ],
        },
      }),
    );
    expect(score.complete).toBe(true);
    expect(score.total).toBe(273.52);
  });

  it("rejects a mismatch between obstacle details and entered fault points", () => {
    const result = makeResult({
      obstacle: {
        time: 9.44,
        faults: 2,
        faultDetails: [
          { id: "plank", position: "plank", code: "plank-side-mount", points: 4 },
        ],
      },
    });
    expect(validateResult(result)).toContain(
      "Hindernis: Fehlerpunkte stimmen nicht mit den Detailangaben überein",
    );
  });

  it("accepts VK3 details on hurdles 5 and 6", () => {
    const result = makeResult({
      className: "FCI-VK3",
      hurdles: {
        time: 12.03,
        faults: 6,
        faultDetails: [
          {
            id: "hurdle-5-not-jumped",
            position: "hurdle-5",
            code: "not-jumped",
            points: 4,
          },
          {
            id: "hurdle-6-dropped",
            position: "hurdle-6",
            code: "bar-dropped",
            points: 2,
          },
        ],
      },
    });

    expect(validateResult(result)).toEqual([]);
    expect(calculateScore(result).total).toBe(272.52);
  });

  it("rejects hurdles 5 and 6 for VK1 and VK2", () => {
    const result = makeResult({
      className: "FCI-VK2",
      hurdles: {
        time: 12.03,
        faults: 2,
        faultDetails: [
          {
            id: "hurdle-6-dropped",
            position: "hurdle-6",
            code: "bar-dropped",
            points: 2,
          },
        ],
      },
    });

    expect(validateResult(result)).toContain(
      "Hürden: Mindestens eine Detailangabe ist ungültig",
    );
  });
});

describe("additional THS disciplines", () => {
  it("adds both HL runs, faults and five seconds for each leashed run", () => {
    const score = calculateScore(
      makeResult({
        className: "VDH-HL",
        obstacle: { time: 30, faults: 4 },
        obstacleLeash: "off",
        obstacle2: { time: 31, faults: 0 },
        obstacle2Leash: "on",
      }),
    );
    expect(score.total).toBe(70);
    expect(score.qualifications).toEqual([]);
  });

  it("calculates DK from 240 points and five bonus points per off-leash discipline", () => {
    const score = calculateScore(
      makeResult({
        className: "VDH-DK",
        hurdles: { time: 20, faults: 2 },
        slalom: { time: 20, faults: 2 },
        obstacle: { time: 20, faults: 2 },
        hurdlesLeash: "on",
        slalomLeash: "off",
        obstacleLeash: "off",
      }),
    );
    expect(score.total).toBe(184);
    expect(score.qualifications).toEqual([]);
  });

  it("matches the supplied sprint-four-event formula to two decimals", () => {
    const score = calculateScore(
      makeResult({
        className: "VDH-S-VK",
        handlerGender: "male",
        handlerBirthDate: "1990-01-01",
        hurdles: { time: 24, faults: 4 },
        slalom: { time: 24, faults: 0 },
        obstacle: { time: 24.01, faults: 0 },
        crossCountry: { timeSeconds: 652, distanceMeters: 973, falseStart: false },
      }),
    );
    expect(score.total).toBe(196.98);
  });

  it("deducts ten sprint points for a false start", () => {
    const base = makeResult({
      className: "VDH-S-VK",
      handlerGender: "female",
      handlerBirthDate: "1990-01-01",
      hurdles: { time: 20, faults: 0 },
      slalom: { time: 20, faults: 0 },
      obstacle: { time: 20, faults: 0 },
      crossCountry: { timeSeconds: 600, distanceMeters: 1000, falseStart: false },
    });
    expect(calculateScore({ ...base, crossCountry: { ...base.crossCountry!, falseStart: true } }).total)
      .toBe(calculateScore(base).total! - 10);
  });

  it("maps the global THS age classes at their boundaries", () => {
    expect(getAgeGroup("2012-05-11", "2026-05-10")).toBe("youngest");
    expect(getAgeGroup("2011-05-10", "2026-05-10")).toBe("youth");
    expect(getAgeGroup("2007-05-10", "2026-05-10")).toBe("active");
    expect(getAgeGroup("1976-05-10", "2026-05-10")).toBe("senior");
  });

  it.each([
    ["male", "1990-01-01", 250, "Vereinsprüfung", ["swhv"]],
    ["female", "1960-01-01", 220, "Kreismeisterschaft", ["swhv"]],
    ["male", "2010-01-01", 230, "Verbandsmeisterschaft", ["swhv", "dhv"]],
    ["female", "1990-01-01", 263, "VDH Deutsche Meisterschaft", ["vdh"]],
  ] as const)(
    "applies sprint qualification threshold for %s born %s",
    (handlerGender, handlerBirthDate, target, competitionType, expected) => {
      const score = calculateScore(
        makeResult({
          className: "VDH-S-VK",
          competitionType,
          handlerGender,
          handlerBirthDate,
          hurdles: { time: 340 - target, faults: 0 },
          slalom: { time: 0, faults: 0 },
          obstacle: { time: 0, faults: 0 },
          crossCountry: { timeSeconds: 0, distanceMeters: 1000, falseStart: false },
        }),
      );
      expect(score.qualifications.map((qualification) => qualification.key)).toEqual(expected);
    },
  );
});
