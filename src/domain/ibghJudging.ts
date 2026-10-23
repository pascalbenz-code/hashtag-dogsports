import {
  createProvisionalCriteria,
  type JudgingExercise,
  type JudgingLevelDefinition,
} from "./judging";

export type IbghLevel = "FCI-IBGH1" | "FCI-IBGH2" | "FCI-IBGH3";
export type Ibgh3Variant = 1 | 2 | 3 | 4 | 5;

export const IBGH_LEVELS: IbghLevel[] = [
  "FCI-IBGH1",
  "FCI-IBGH2",
  "FCI-IBGH3",
];
export const IBGH3_VARIANTS: Ibgh3Variant[] = [1, 2, 3, 4, 5];

const exercise = (
  id: string,
  label: string,
  maxPoints: JudgingExercise["maxPoints"],
): JudgingExercise => ({
  id,
  label,
  maxPoints,
  criteria: createProvisionalCriteria(id),
});

const fixedDefinitions: Record<
  "FCI-IBGH1" | "FCI-IBGH2",
  JudgingLevelDefinition<IbghLevel>
> = {
  "FCI-IBGH1": {
    level: "FCI-IBGH1",
    maxPoints: 100,
    exercises: [
      exercise("ibgh1-leinenfuehrigkeit", "Leinenführigkeit", 30),
      exercise("ibgh1-freifolge", "Freifolge", 30),
      exercise("ibgh1-absitzen", "Absitzen aus der Bewegung", 15),
      exercise("ibgh1-ablegen", "Ablegen aus der Bewegung", 15),
      exercise("ibgh1-ablage", "Ablegen unter Ablenkung", 10),
    ],
  },
  "FCI-IBGH2": {
    level: "FCI-IBGH2",
    maxPoints: 100,
    exercises: [
      exercise("ibgh2-leinenfuehrigkeit", "Leinenführigkeit", 20),
      exercise("ibgh2-freifolge", "Freifolge", 20),
      exercise("ibgh2-absitzen", "Absitzen aus der Bewegung", 15),
      exercise("ibgh2-ablegen", "Ablegen aus der Bewegung", 15),
      exercise("ibgh2-bringen-ebene", "Bringen auf ebener Erde", 10),
      exercise("ibgh2-voraussenden", "Voraussenden mit Hinlegen", 10),
      exercise("ibgh2-ablage", "Ablegen unter Ablenkung", 10),
    ],
  },
};

const ibgh3Exercises = {
  freifolge: exercise("ibgh3-freifolge", "Freifolge", 20),
  absitzen: exercise("ibgh3-absitzen", "Absitzen aus der Bewegung", 10),
  ablegen: exercise("ibgh3-ablegen", "Ablegen aus der Bewegung", 10),
  steh: exercise("ibgh3-steh", "Steh aus dem Schritt", 10),
  bringenEbene: exercise(
    "ibgh3-bringen-ebene",
    "Bringen auf ebener Erde",
    15,
  ),
  bringenSchraegwand: exercise(
    "ibgh3-bringen-schraegwand",
    "Bringen über eine Schrägwand (140cm)",
    15,
  ),
  voraussenden: exercise(
    "ibgh3-voraussenden",
    "Voraussenden mit Hinlegen",
    10,
  ),
  ablage: exercise("ibgh3-ablage", "Ablegen unter Ablenkung", 10),
};

type Ibgh3ExerciseKey = keyof typeof ibgh3Exercises;

export const IBGH3_VARIANT_ORDERS: Record<
  Ibgh3Variant,
  Ibgh3ExerciseKey[]
> = {
  1: [
    "freifolge",
    "absitzen",
    "steh",
    "bringenEbene",
    "bringenSchraegwand",
    "ablegen",
    "voraussenden",
    "ablage",
  ],
  2: [
    "freifolge",
    "steh",
    "ablegen",
    "bringenSchraegwand",
    "absitzen",
    "bringenEbene",
    "voraussenden",
    "ablage",
  ],
  3: [
    "freifolge",
    "bringenSchraegwand",
    "steh",
    "bringenEbene",
    "ablegen",
    "absitzen",
    "voraussenden",
    "ablage",
  ],
  4: [
    "freifolge",
    "ablegen",
    "absitzen",
    "bringenSchraegwand",
    "bringenEbene",
    "steh",
    "voraussenden",
    "ablage",
  ],
  5: [
    "freifolge",
    "bringenEbene",
    "bringenSchraegwand",
    "ablegen",
    "absitzen",
    "steh",
    "voraussenden",
    "ablage",
  ],
};

export function getIbghDefinition(
  level: IbghLevel,
  variant: Ibgh3Variant = 1,
): JudgingLevelDefinition<IbghLevel> {
  if (level !== "FCI-IBGH3") return fixedDefinitions[level];
  return {
    level,
    maxPoints: 100,
    exercises: IBGH3_VARIANT_ORDERS[variant].map(
      (exerciseKey) => ibgh3Exercises[exerciseKey],
    ),
  };
}
