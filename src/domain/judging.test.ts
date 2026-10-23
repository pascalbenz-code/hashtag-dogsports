import { describe, expect, it } from "vitest";
import {
  calculateJudgingScore,
  JUDGING_DEFINITIONS,
  JUDGING_LEVELS,
} from "./judging";

describe("VDH-VK judging", () => {
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

    const floored = calculateJudgingScore(definition, {
      [heelwork.criteria[0].id]: 20,
    });
    expect(floored.exercises[0].points).toBe(0);
    expect(floored.exercises[0].deductions).toBe(15);
    expect(floored.total).toBe(45);
  });
});
