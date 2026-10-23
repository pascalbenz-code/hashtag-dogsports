export type JudgingLevel = "VDH-VK1" | "VDH-VK2" | "VDH-VK3";
export type RatingBasePoints = 3 | 5 | 7 | 10 | 15 | 20 | 30 | 60;
export type PerformanceRating =
  | "Vorzüglich"
  | "Sehr Gut"
  | "Gut"
  | "Befriedigend"
  | "Mangelhaft";

interface RatingBand {
  rating: PerformanceRating;
  minPoints: number;
}

export const RATING_MATRIX: Record<RatingBasePoints, RatingBand[]> = {
  3: [
    { rating: "Vorzüglich", minPoints: 3 },
    { rating: "Sehr Gut", minPoints: 2.7 },
    { rating: "Gut", minPoints: 2.4 },
    { rating: "Befriedigend", minPoints: 2.1 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  5: [
    { rating: "Vorzüglich", minPoints: 5 },
    { rating: "Sehr Gut", minPoints: 4.5 },
    { rating: "Gut", minPoints: 4 },
    { rating: "Befriedigend", minPoints: 3.5 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  7: [
    { rating: "Vorzüglich", minPoints: 6.7 },
    { rating: "Sehr Gut", minPoints: 6.3 },
    { rating: "Gut", minPoints: 5.6 },
    { rating: "Befriedigend", minPoints: 4.9 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  10: [
    { rating: "Vorzüglich", minPoints: 10 },
    { rating: "Sehr Gut", minPoints: 9 },
    { rating: "Gut", minPoints: 8 },
    { rating: "Befriedigend", minPoints: 7 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  15: [
    { rating: "Vorzüglich", minPoints: 14.5 },
    { rating: "Sehr Gut", minPoints: 13.5 },
    { rating: "Gut", minPoints: 12 },
    { rating: "Befriedigend", minPoints: 10.5 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  20: [
    { rating: "Vorzüglich", minPoints: 19.5 },
    { rating: "Sehr Gut", minPoints: 18 },
    { rating: "Gut", minPoints: 16 },
    { rating: "Befriedigend", minPoints: 14 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  30: [
    { rating: "Vorzüglich", minPoints: 29 },
    { rating: "Sehr Gut", minPoints: 27 },
    { rating: "Gut", minPoints: 24 },
    { rating: "Befriedigend", minPoints: 21 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  60: [
    { rating: "Vorzüglich", minPoints: 58 },
    { rating: "Sehr Gut", minPoints: 54 },
    { rating: "Gut", minPoints: 48 },
    { rating: "Befriedigend", minPoints: 42 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
};

export function calculateRating(
  basePoints: RatingBasePoints,
  achievedPoints: number,
): PerformanceRating {
  const points = Number.isFinite(achievedPoints)
    ? Math.min(basePoints, Math.max(0, achievedPoints))
    : 0;
  return RATING_MATRIX[basePoints].find((band) => points >= band.minPoints)!
    .rating;
}

export interface JudgingCriterion {
  id: string;
  label: string;
  maxFaults?: number;
  provisional?: boolean;
}

export interface JudgingExercise {
  id: string;
  label: string;
  maxPoints: RatingBasePoints;
  criteria: JudgingCriterion[];
}

export interface JudgingLevelDefinition {
  level: JudgingLevel;
  maxPoints: RatingBasePoints;
  exercises: JudgingExercise[];
}

export type JudgingFaults = Record<string, number | null>;

const provisionalCriteria = (exerciseId: string): JudgingCriterion[] => [
  {
    id: `${exerciseId}-detail-1`,
    label: "Detailbewertung 1",
    provisional: true,
  },
  {
    id: `${exerciseId}-detail-2`,
    label: "Detailbewertung 2",
    provisional: true,
  },
];

const heelworkCriteria = (exerciseId: string): JudgingCriterion[] =>
  ["Entwicklung", "Kehrtwendung", "Winkel", "Grundstellung"].map(
    (label) => ({
      id: `${exerciseId}-${label.toLocaleLowerCase("de-DE")}`,
      label,
    }),
  );

export const JUDGING_LEVELS: JudgingLevel[] = [
  "VDH-VK1",
  "VDH-VK2",
  "VDH-VK3",
];

export const JUDGING_DEFINITIONS: Record<
  JudgingLevel,
  JudgingLevelDefinition
> = {
  "VDH-VK1": {
    level: "VDH-VK1",
    maxPoints: 60,
    exercises: [
      {
        id: "vk1-leinenfuehrigkeit",
        label: "Leinenführigkeit",
        maxPoints: 15,
        criteria: heelworkCriteria("vk1-leinenfuehrigkeit"),
      },
      {
        id: "vk1-freifolge",
        label: "Freifolge",
        maxPoints: 20,
        criteria: provisionalCriteria("vk1-freifolge"),
      },
      {
        id: "vk1-sitz-abholen",
        label: "Sitz mit Abholen",
        maxPoints: 10,
        criteria: provisionalCriteria("vk1-sitz-abholen"),
      },
      {
        id: "vk1-ablegen-herankommen",
        label: "Ablegen mit Herankommen",
        maxPoints: 15,
        criteria: provisionalCriteria("vk1-ablegen-herankommen"),
      },
    ],
  },
  "VDH-VK2": {
    level: "VDH-VK2",
    maxPoints: 60,
    exercises: [
      {
        id: "vk2-freifolge",
        label: "Freifolge",
        maxPoints: 20,
        criteria: provisionalCriteria("vk2-freifolge"),
      },
      {
        id: "vk2-sitz-abholen",
        label: "Sitz mit Abholen",
        maxPoints: 10,
        criteria: provisionalCriteria("vk2-sitz-abholen"),
      },
      {
        id: "vk2-ablegen-herankommen",
        label: "Ablegen mit Herankommen",
        maxPoints: 15,
        criteria: provisionalCriteria("vk2-ablegen-herankommen"),
      },
      {
        id: "vk2-steh-herankommen",
        label: "Steh mit Herankommen",
        maxPoints: 15,
        criteria: provisionalCriteria("vk2-steh-herankommen"),
      },
    ],
  },
  "VDH-VK3": {
    level: "VDH-VK3",
    maxPoints: 60,
    exercises: [
      {
        id: "vk3-freifolge",
        label: "Freifolge",
        maxPoints: 20,
        criteria: provisionalCriteria("vk3-freifolge"),
      },
      {
        id: "vk3-sitz-abholen",
        label: "Sitz mit Abholen",
        maxPoints: 10,
        criteria: provisionalCriteria("vk3-sitz-abholen"),
      },
      {
        id: "vk3-ablegen-herankommen",
        label: "Ablegen mit Herankommen",
        maxPoints: 15,
        criteria: provisionalCriteria("vk3-ablegen-herankommen"),
      },
      {
        id: "vk3-steh-herankommen",
        label: "Steh mit Herankommen",
        maxPoints: 15,
        criteria: provisionalCriteria("vk3-steh-herankommen"),
      },
    ],
  },
};

export interface JudgingExerciseScore {
  exerciseId: string;
  deductions: number;
  points: number;
  rating: PerformanceRating;
}

export interface JudgingScore {
  total: number;
  deductions: number;
  rating: PerformanceRating;
  exercises: JudgingExerciseScore[];
  errors: string[];
}

export function calculateJudgingScore(
  definition: JudgingLevelDefinition,
  faults: JudgingFaults,
): JudgingScore {
  const errors: string[] = [];
  const exercises = definition.exercises.map((exercise) => {
    const enteredFaults = exercise.criteria.reduce((sum, criterion) => {
      const value = faults[criterion.id] ?? 0;
      if (!Number.isFinite(value) || value < 0) {
        errors.push(`${exercise.label}: ${criterion.label} ist ungültig`);
        return sum;
      }
      if (criterion.maxFaults !== undefined && value > criterion.maxFaults) {
        errors.push(
          `${exercise.label}: ${criterion.label} darf höchstens ${criterion.maxFaults} Fehlerpunkte enthalten`,
        );
      }
      return sum + value;
    }, 0);
    const deductions = Math.min(exercise.maxPoints, enteredFaults);
    return {
      exerciseId: exercise.id,
      deductions,
      points: Math.max(0, exercise.maxPoints - deductions),
      rating: calculateRating(
        exercise.maxPoints,
        Math.max(0, exercise.maxPoints - deductions),
      ),
    };
  });
  const total = exercises.reduce((sum, exercise) => sum + exercise.points, 0);
  return {
    total,
    deductions: definition.maxPoints - total,
    rating: calculateRating(definition.maxPoints, total),
    exercises,
    errors,
  };
}
