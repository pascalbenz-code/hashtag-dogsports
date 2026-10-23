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
});
