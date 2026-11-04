import { describe, expect, it } from "vitest";
import { calculateScore, validateResult } from "./scoring";
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
});
