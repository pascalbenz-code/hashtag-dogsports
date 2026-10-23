export type JudgingLevel = "VDH-VK1" | "VDH-VK2" | "VDH-VK3";

export interface JudgingCriterion {
  id: string;
  label: string;
  maxFaults?: number;
  provisional?: boolean;
}

export interface JudgingExercise {
  id: string;
  label: string;
  maxPoints: number;
  criteria: JudgingCriterion[];
}

export interface JudgingLevelDefinition {
  level: JudgingLevel;
  maxPoints: number;
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
}

export interface JudgingScore {
  total: number;
  deductions: number;
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
    };
  });
  const total = exercises.reduce((sum, exercise) => sum + exercise.points, 0);
  return {
    total,
    deductions: definition.maxPoints - total,
    exercises,
    errors,
  };
}
