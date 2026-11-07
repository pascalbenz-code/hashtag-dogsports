import { describe, expect, it } from "vitest";
import {
  calculateJudgingScore,
  calculateRating,
  JUDGING_DEFINITIONS,
  JUDGING_LEVELS,
} from "./judging";

describe("VDH-VK judging", () => {
  it.each([
    [3, 3, "Vorzüglich"],
    [3, 2.7, "Sehr Gut"],
    [3, 2.4, "Gut"],
    [3, 2.1, "Befriedigend"],
    [3, 2, "Mangelhaft"],
    [5, 5, "Vorzüglich"],
    [5, 4.5, "Sehr Gut"],
    [5, 4, "Gut"],
    [5, 3.5, "Befriedigend"],
    [5, 3.4, "Mangelhaft"],
    [7, 6.7, "Vorzüglich"],
    [7, 6.3, "Sehr Gut"],
    [7, 5.6, "Gut"],
    [7, 4.9, "Befriedigend"],
    [7, 4.8, "Mangelhaft"],
    [10, 10, "Vorzüglich"],
    [10, 9, "Sehr Gut"],
    [10, 8, "Gut"],
    [10, 7, "Befriedigend"],
    [10, 6.5, "Mangelhaft"],
    [15, 14.5, "Vorzüglich"],
    [15, 13.5, "Sehr Gut"],
    [15, 12, "Gut"],
    [15, 10.5, "Befriedigend"],
    [15, 10, "Mangelhaft"],
    [20, 19.5, "Vorzüglich"],
    [20, 18, "Sehr Gut"],
    [20, 16, "Gut"],
    [20, 14, "Befriedigend"],
    [20, 13.5, "Mangelhaft"],
    [30, 29, "Vorzüglich"],
    [30, 27, "Sehr Gut"],
    [30, 24, "Gut"],
    [30, 21, "Befriedigend"],
    [30, 20.5, "Mangelhaft"],
    [60, 58, "Vorzüglich"],
    [60, 54, "Sehr Gut"],
    [60, 48, "Gut"],
    [60, 42, "Befriedigend"],
    [60, 41.5, "Mangelhaft"],
  ] as const)(
    "rates %s points with %s achieved as %s",
    (basePoints, achievedPoints, rating) => {
      expect(calculateRating(basePoints, achievedPoints)).toBe(rating);
    },
  );

  it("assigns values between listed increments to the next matching band", () => {
    expect(calculateRating(5, 4.8)).toBe("Sehr Gut");
    expect(calculateRating(15, 14.4)).toBe("Sehr Gut");
  });

  it.each(JUDGING_LEVELS)("defines exactly 60 points for %s", (level) => {
    const definition = JUDGING_DEFINITIONS[level];
    expect(
      definition.exercises.reduce(
        (total, exercise) => total + exercise.maxPoints,
        0,
      ),
    ).toBe(60);
    expect(definition.maxPoints).toBe(60);
  });

  it("defines the requested VK1 exercises and heelwork details", () => {
    const definition = JUDGING_DEFINITIONS["VDH-VK1"];
    expect(definition.exercises.map(({ label, maxPoints }) => [label, maxPoints]))
      .toEqual([
        ["Leinenführigkeit", 15],
        ["Freifolge", 20],
        ["Sitz mit Abholen", 10],
        ["Ablegen mit Herankommen", 15],
      ]);
    expect(definition.exercises[0].criteria.map(({ label }) => label)).toEqual([
      "Anfangsgrundstellung",
      "Position während des Führens",
      "Aufmerksamkeit und Ausdruck",
      "Gangartwechsel und Wendungen",
      "Leinenführung",
      "Halte und Endgrundstellung",
    ]);
  });

  it("defines the requested VK2 exercises", () => {
    expect(
      JUDGING_DEFINITIONS["VDH-VK2"].exercises.map(
        ({ label, maxPoints }) => [label, maxPoints],
      ),
    ).toEqual([
      ["Freifolge", 20],
      ["Sitz mit Abholen", 10],
      ["Ablegen mit Herankommen", 15],
      ["Steh mit Herankommen", 15],
    ]);
  });

  it("defines the requested VK3 running exercises", () => {
    expect(
      JUDGING_DEFINITIONS["VDH-VK3"].exercises.map(
        ({ label, maxPoints }) => [label, maxPoints],
      ),
    ).toEqual([
      ["Freifolge", 20],
      ["Sitz mit Abholen", 10],
      ["Ablegen aus dem Laufschritt mit Herankommen", 15],
      ["Steh aus dem Laufschritt mit Herankommen", 15],
    ]);
  });

  it.each(JUDGING_LEVELS)(
    "contains only complete, uniquely addressable criteria for %s",
    (level) => {
      const criteria = JUDGING_DEFINITIONS[level].exercises.flatMap(
        (exercise) => exercise.criteria,
      );
      expect(criteria.some((criterion) => criterion.provisional)).toBe(false);
      expect(criteria.every((criterion) => criterion.description)).toBe(true);
      expect(new Set(criteria.map((criterion) => criterion.id)).size).toBe(
        criteria.length,
      );
    },
  );

  it("subtracts detail faults and never returns negative exercise points", () => {
    const definition = JUDGING_DEFINITIONS["VDH-VK1"];
    const [heelwork, freedom] = definition.exercises;
    const score = calculateJudgingScore(definition, {
      [heelwork.criteria[0].id]: 1.5,
      [freedom.criteria[0].id]: 2,
    });
    expect(score.total).toBe(56.5);
    expect(score.deductions).toBe(3.5);
    expect(score.rating).toBe("Sehr Gut");
    expect(score.exercises.map((exercise) => exercise.rating)).toEqual([
      "Sehr Gut",
      "Sehr Gut",
      "Vorzüglich",
      "Vorzüglich",
    ]);

    const floored = calculateJudgingScore(definition, {
      [heelwork.criteria[0].id]: 20,
    });
    expect(floored.exercises[0].points).toBe(0);
    expect(floored.exercises[0].deductions).toBe(15);
    expect(floored.total).toBe(45);
    expect(floored.rating).toBe("Befriedigend");
  });

  it("applies fixed position deductions exactly and adds qualitative faults", () => {
    const definition = JUDGING_DEFINITIONS["VDH-VK1"];
    const sit = definition.exercises[2];
    const manualCriterion = sit.criteria.find(
      (criterion) => criterion.inputKind === "manual",
    )!;
    const fixedCriterion = sit.criteria.find(
      (criterion) => criterion.inputKind === "fixed",
    )!;
    const score = calculateJudgingScore(
      definition,
      {
        [manualCriterion.id]: 1,
        // A stale numeric value must not duplicate the triggered fixed rule.
        [fixedCriterion.id]: 5,
      },
      { [fixedCriterion.id]: true },
    );

    expect(score.exercises[2]).toMatchObject({
      deductions: 6,
      points: 4,
      rating: "Mangelhaft",
    });
    expect(score.total).toBe(54);
  });

  it("sets the complete exercise to zero when a zero rule is triggered", () => {
    const definition = JUDGING_DEFINITIONS["VDH-VK3"];
    const down = definition.exercises[2];
    const zeroCriterion = down.criteria.find(
      (criterion) => criterion.inputKind === "exercise-zero",
    )!;
    const score = calculateJudgingScore(
      definition,
      {},
      { [zeroCriterion.id]: true },
    );

    expect(score.exercises[2]).toMatchObject({
      deductions: 15,
      points: 0,
      rating: "Mangelhaft",
    });
    expect(score.total).toBe(45);
  });

  it.each([
    ["VDH-VK1", "Sitz mit Abholen", 3.5],
    ["VDH-VK1", "Ablegen mit Herankommen", 5],
    ["VDH-VK2", "Sitz mit Abholen", 3.5],
    ["VDH-VK2", "Ablegen mit Herankommen", 5],
    ["VDH-VK2", "Steh mit Herankommen", 5],
    ["VDH-VK3", "Sitz mit Abholen", 3.5],
    ["VDH-VK3", "Ablegen aus dem Laufschritt mit Herankommen", 5],
    ["VDH-VK3", "Steh aus dem Laufschritt mit Herankommen", 5],
  ] as const)(
    "translates both Mangelhaft rules for %s / %s into a fixed %s-point deduction",
    (level, exerciseLabel, expectedDeduction) => {
      const definition = JUDGING_DEFINITIONS[level];
      const exerciseIndex = definition.exercises.findIndex(
        (exercise) => exercise.label === exerciseLabel,
      );
      const exercise = definition.exercises[exerciseIndex];
      const deficientCriteria = exercise.criteria.filter(
        (criterion) =>
          criterion.id.endsWith("-position-verlassen") ||
          criterion.id.endsWith("-nachlaufen-ueber-zehn"),
      );

      expect(deficientCriteria).toHaveLength(2);
      for (const criterion of deficientCriteria) {
        expect(criterion).toMatchObject({
          inputKind: "fixed",
          fixedDeduction: expectedDeduction,
          maxFaults: expectedDeduction,
        });
        const score = calculateJudgingScore(
          definition,
          {},
          { [criterion.id]: true },
        );
        expect(score.exercises[exerciseIndex]).toMatchObject({
          deductions: expectedDeduction,
          points: exercise.maxPoints - expectedDeduction,
          rating: "Mangelhaft",
        });
        expect(score.total).toBe(definition.maxPoints - expectedDeduction);
      }
    },
  );
});
