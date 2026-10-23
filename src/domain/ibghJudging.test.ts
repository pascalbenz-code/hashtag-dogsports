import { describe, expect, it } from "vitest";
import { calculateJudgingScore, calculateRating } from "./judging";
import {
  getIbghDefinition,
  IBGH3_VARIANTS,
  IBGH_LEVELS,
  type Ibgh3Variant,
} from "./ibghJudging";

const labels = (variant: Ibgh3Variant) =>
  getIbghDefinition("FCI-IBGH3", variant).exercises.map(
    (exercise) => exercise.label,
  );

describe("FCI-IBGH judging", () => {
  it.each([
    [70, 66.5, "Vorzüglich"],
    [70, 63, "Sehr Gut"],
    [70, 56, "Gut"],
    [70, 49, "Befriedigend"],
    [70, 48.5, "Mangelhaft"],
    [100, 96, "Vorzüglich"],
    [100, 90, "Sehr Gut"],
    [100, 80, "Gut"],
    [100, 70, "Befriedigend"],
    [100, 69.5, "Mangelhaft"],
  ] as const)(
    "rates %s points with %s achieved as %s",
    (basePoints, achievedPoints, rating) => {
      expect(calculateRating(basePoints, achievedPoints)).toBe(rating);
    },
  );

  it.each(IBGH_LEVELS)("defines exactly 100 points for %s", (level) => {
    const definition = getIbghDefinition(level);
    expect(
      definition.exercises.reduce(
        (total, exercise) => total + exercise.maxPoints,
        0,
      ),
    ).toBe(100);
    expect(definition.maxPoints).toBe(100);
  });

  it("defines IBGH1 in the requested order", () => {
    expect(
      getIbghDefinition("FCI-IBGH1").exercises.map(
        ({ label, maxPoints }) => [label, maxPoints],
      ),
    ).toEqual([
      ["Leinenführigkeit", 30],
      ["Freifolge", 30],
      ["Absitzen aus der Bewegung", 15],
      ["Ablegen aus der Bewegung", 15],
      ["Ablegen unter Ablenkung", 10],
    ]);
  });

  it("defines IBGH2 in the requested order", () => {
    expect(
      getIbghDefinition("FCI-IBGH2").exercises.map(
        ({ label, maxPoints }) => [label, maxPoints],
      ),
    ).toEqual([
      ["Leinenführigkeit", 20],
      ["Freifolge", 20],
      ["Absitzen aus der Bewegung", 15],
      ["Ablegen aus der Bewegung", 15],
      ["Bringen auf ebener Erde", 10],
      ["Voraussenden mit Hinlegen", 10],
      ["Ablegen unter Ablenkung", 10],
    ]);
  });

  it.each(IBGH3_VARIANTS)(
    "keeps every IBGH3 variant at 100 points (variant %s)",
    (variant) => {
      const definition = getIbghDefinition("FCI-IBGH3", variant);
      expect(definition.exercises).toHaveLength(8);
      expect(
        definition.exercises.reduce(
          (total, exercise) => total + exercise.maxPoints,
          0,
        ),
      ).toBe(100);
    },
  );

  it("orders all five IBGH3 variants exactly as specified", () => {
    expect(labels(1)).toEqual([
      "Freifolge",
      "Absitzen aus der Bewegung",
      "Steh aus dem Schritt",
      "Bringen auf ebener Erde",
      "Bringen über eine Schrägwand (140cm)",
      "Ablegen aus der Bewegung",
      "Voraussenden mit Hinlegen",
      "Ablegen unter Ablenkung",
    ]);
    expect(labels(2)).toEqual([
      "Freifolge",
      "Steh aus dem Schritt",
      "Ablegen aus der Bewegung",
      "Bringen über eine Schrägwand (140cm)",
      "Absitzen aus der Bewegung",
      "Bringen auf ebener Erde",
      "Voraussenden mit Hinlegen",
      "Ablegen unter Ablenkung",
    ]);
    expect(labels(3)).toEqual([
      "Freifolge",
      "Bringen über eine Schrägwand (140cm)",
      "Steh aus dem Schritt",
      "Bringen auf ebener Erde",
      "Ablegen aus der Bewegung",
      "Absitzen aus der Bewegung",
      "Voraussenden mit Hinlegen",
      "Ablegen unter Ablenkung",
    ]);
    expect(labels(4)).toEqual([
      "Freifolge",
      "Ablegen aus der Bewegung",
      "Absitzen aus der Bewegung",
      "Bringen über eine Schrägwand (140cm)",
      "Bringen auf ebener Erde",
      "Steh aus dem Schritt",
      "Voraussenden mit Hinlegen",
      "Ablegen unter Ablenkung",
    ]);
    expect(labels(5)).toEqual([
      "Freifolge",
      "Bringen auf ebener Erde",
      "Bringen über eine Schrägwand (140cm)",
      "Ablegen aus der Bewegung",
      "Absitzen aus der Bewegung",
      "Steh aus dem Schritt",
      "Voraussenden mit Hinlegen",
      "Ablegen unter Ablenkung",
    ]);
  });

  it("calculates exercise and total ratings from detail faults", () => {
    const definition = getIbghDefinition("FCI-IBGH1");
    const firstCriterion = definition.exercises[0].criteria[0];
    const score = calculateJudgingScore(definition, {
      [firstCriterion.id]: 4,
    });
    expect(score.exercises[0].points).toBe(26);
    expect(score.exercises[0].rating).toBe("Gut");
    expect(score.total).toBe(96);
    expect(score.rating).toBe("Vorzüglich");
  });

  it.each(IBGH_LEVELS)(
    "provides complete, uniquely addressable detail criteria for %s",
    (level) => {
      const definition = getIbghDefinition(level);
      const criteria = definition.exercises.flatMap(
        (exercise) => exercise.criteria,
      );

      expect(criteria.length).toBeGreaterThan(definition.exercises.length * 4);
      expect(new Set(criteria.map(({ id }) => id)).size).toBe(criteria.length);
      expect(
        criteria.every(
          ({ description, provisional }) =>
            Boolean(description?.trim()) && provisional !== true,
        ),
      ).toBe(true);
    },
  );

  it("combines qualitative and fixed IBGH1 deductions correctly", () => {
    const definition = getIbghDefinition("FCI-IBGH1");
    const score = calculateJudgingScore(definition, {
      "ibgh1-leinenfuehrigkeit-position": 1.5,
      "ibgh1-absitzen-fehlposition": 7.5,
    });

    expect(score.exercises[0]).toMatchObject({
      deductions: 1.5,
      points: 28.5,
      rating: "Sehr Gut",
    });
    expect(score.exercises[2]).toMatchObject({
      deductions: 7.5,
      points: 7.5,
      rating: "Mangelhaft",
    });
    expect(score.total).toBe(91);
    expect(score.rating).toBe("Sehr Gut");
  });

  it("adds several IBGH2 special-rule deductions with decimal precision", () => {
    const definition = getIbghDefinition("FCI-IBGH2");
    const score = calculateJudgingScore(definition, {
      "ibgh2-bringen-ebene-beginn-ohne-hz": 2,
      "ibgh2-voraussenden-hinlegen-zusatz-hz": 1.5,
      "ibgh2-voraussenden-stoppen-zusatz-hz": 2.5,
    });

    expect(score.exercises[4].points).toBe(8);
    expect(score.exercises[5].points).toBe(6);
    expect(score.total).toBe(94);
    expect(score.rating).toBe("Sehr Gut");
  });

  it("applies IBGH3 wall budgets and still caps an exercise at zero", () => {
    const definition = getIbghDefinition("FCI-IBGH3", 3);
    const wallIndex = definition.exercises.findIndex(
      ({ id }) => id === "ibgh3-bringen-schraegwand",
    );

    const oneJumpMissing = calculateJudgingScore(definition, {
      "ibgh3-bringen-schraegwand-ein-sprung-fehlt": 5,
    });
    expect(oneJumpMissing.exercises[wallIndex]).toMatchObject({
      deductions: 5,
      points: 10,
    });
    expect(oneJumpMissing.total).toBe(95);

    const noPartialRating = calculateJudgingScore(definition, {
      "ibgh3-bringen-schraegwand-keine-teilbewertung": 15,
      "ibgh3-bringen-schraegwand-hinsprung": 3.5,
    });
    expect(noPartialRating.exercises[wallIndex]).toMatchObject({
      deductions: 15,
      points: 0,
      rating: "Mangelhaft",
    });
    expect(noPartialRating.total).toBe(85);
  });

  it("reports deductions above a criterion-specific maximum", () => {
    const definition = getIbghDefinition("FCI-IBGH2");
    const score = calculateJudgingScore(definition, {
      "ibgh2-voraussenden-hinlegen-zusatz-hz": 4,
    });

    expect(score.errors).toContain(
      "Voraussenden mit Hinlegen: Zusatz-HZ zum Hinlegen darf höchstens 3.5 Fehlerpunkte enthalten",
    );
  });
});
