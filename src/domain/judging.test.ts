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
      "Entwicklung",
      "Kehrtwendung",
      "Winkel",
      "Grundstellung",
    ]);
  });

  it.each(["VDH-VK2", "VDH-VK3"] as const)(
    "defines the requested exercises for %s",
    (level) => {
      expect(
        JUDGING_DEFINITIONS[level].exercises.map(({ label, maxPoints }) => [
          label,
          maxPoints,
        ]),
      ).toEqual([
        ["Freifolge", 20],
        ["Sitz mit Abholen", 10],
        ["Ablegen mit Herankommen", 15],
        ["Steh mit Herankommen", 15],
      ]);
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
});
