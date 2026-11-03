export type JudgingLevel = "VDH-VK1" | "VDH-VK2" | "VDH-VK3";
export type RatingBasePoints = 3 | 5 | 7 | 10 | 15 | 20 | 30 | 60 | 70 | 100;
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
  70: [
    { rating: "Vorzüglich", minPoints: 66.5 },
    { rating: "Sehr Gut", minPoints: 63 },
    { rating: "Gut", minPoints: 56 },
    { rating: "Befriedigend", minPoints: 49 },
    { rating: "Mangelhaft", minPoints: 0 },
  ],
  100: [
    { rating: "Vorzüglich", minPoints: 96 },
    { rating: "Sehr Gut", minPoints: 90 },
    { rating: "Gut", minPoints: 80 },
    { rating: "Befriedigend", minPoints: 70 },
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
  description?: string;
  rule?: string;
  element?: "Primär" | "Sekundär" | "Teilbudget" | "Sonderregel";
  maxFaults?: number;
  provisional?: boolean;
  inputKind?: "manual" | "fixed" | "exercise-zero" | "rating-cap";
  fixedDeduction?: number;
  ratingCap?: PerformanceRating;
}

export interface JudgingExercise {
  id: string;
  label: string;
  maxPoints: RatingBasePoints;
  criteria: JudgingCriterion[];
}

export interface JudgingLevelDefinition<TLevel extends string = string> {
  level: TLevel;
  maxPoints: RatingBasePoints;
  exercises: JudgingExercise[];
}

export type JudgingFaults = Record<string, number | null>;
export type JudgingTriggers = Record<string, boolean>;

export const createProvisionalCriteria = (
  exerciseId: string,
): JudgingCriterion[] => [
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

const qualitative = (
  exerciseId: string,
  id: string,
  label: string,
  description: string,
): JudgingCriterion => ({
  id: `${exerciseId}-${id}`,
  label,
  description,
  rule: "Qualitativ",
  inputKind: "manual",
});

const fixed = (
  exerciseId: string,
  id: string,
  label: string,
  description: string,
  deduction: number,
): JudgingCriterion => ({
  id: `${exerciseId}-${id}`,
  label,
  description,
  element: "Sonderregel",
  rule: `fest −${deduction.toLocaleString("de-DE")} P.`,
  inputKind: "fixed",
  fixedDeduction: deduction,
  maxFaults: deduction,
});

const exerciseZero = (
  exerciseId: string,
  id: string,
  label: string,
  description: string,
): JudgingCriterion => ({
  id: `${exerciseId}-${id}`,
  label,
  description,
  element: "Sonderregel",
  rule: "Gesamtübung 0 P.",
  inputKind: "exercise-zero",
});

const ratingCap = (
  exerciseId: string,
  id: string,
  label: string,
  description: string,
): JudgingCriterion => ({
  id: `${exerciseId}-${id}`,
  label,
  description,
  element: "Sonderregel",
  rule: "Teilbewertung · höchstens Mangelhaft",
  inputKind: "rating-cap",
  ratingCap: "Mangelhaft",
});

const positionSpecialRules = (
  exerciseId: string,
  position: "Sitz" | "Platz" | "Steh",
  wrongPositions: string,
  fixedDeduction: number,
  before: "Rückkehrbeginn" | "Abruf",
): JudgingCriterion[] => [
  fixed(
    exerciseId,
    "falsche-position",
    `Hund ${wrongPositions} nach ${position}-HZ`,
    "Weitere Ausführungsfehler werden zusätzlich berücksichtigt.",
    fixedDeduction,
  ),
  exerciseZero(
    exerciseId,
    "sofortiges-nachlaufen",
    "Sofortiges Nachlaufen ohne Ausführung des HZ",
    "Die Unteraufgabe wird vollständig mit 0 Punkten bewertet.",
  ),
  ratingCap(
    exerciseId,
    "position-verlassen",
    `Korrekte Position, danach Verlassen vor ${before}`,
    "Die Prüfungsregel nennt eine mangelhafte Teilbewertung, aber keine feste verbleibende Punktzahl. Der konkrete Abzug bleibt eine manuelle Richterbewertung.",
  ),
  ratingCap(
    exerciseId,
    "nachlaufen-ueber-zehn",
    `Mehr als 10 Schritte Nachlaufen, danach korrektes ${position}`,
    "Die korrekte Position wird noch vor dem Umdrehen des Hundeführers eingenommen. Es gilt eine mangelhafte Teilbewertung, kein automatischer vollständiger Punkteverlust.",
  ),
  exerciseZero(
    exerciseId,
    "abbruch-hundefuehrer",
    "Eigenständiger Übungsabbruch durch den HF",
    `Der Hundeführer bleibt nach dem ${position}-HZ stehen, wirkt stark ein oder geht zum Hund zurück, um die Übung abzubrechen.`,
  ),
];

const sitCriteria = (exerciseId: string): JudgingCriterion[] => [
  qualitative(exerciseId, "anfangsgrundstellung", "Anfangsgrundstellung", "Gerade Ausgangsposition; Angehen mit „Fuß“."),
  qualitative(exerciseId, "entwicklung", "Entwicklung", "10–15 Schritte im Normalschritt; korrekt und aufmerksam bei Fuß."),
  qualitative(exerciseId, "sitz-hz", "Ausführung des Sitz-HZ", "Sofort und in Laufrichtung setzen; der HF geht ohne Gangartänderung oder Körperhilfe weiter."),
  qualitative(exerciseId, "positionshaltung", "Positionshaltung", "Ruhig, gerade und aufmerksam sitzen; der HF entfernt sich weitere mindestens 15 Schritte."),
  qualitative(exerciseId, "abholen-endgrundstellung", "Abholen und Endgrundstellung", "Rückkehr auf Richteranweisung; der HF tritt rechts neben den Hund. Herantreten von vorne oder hinten ist erlaubt."),
  ...positionSpecialRules(exerciseId, "Sitz", "steht oder liegt", 5, "Rückkehrbeginn"),
];

const downCriteria = (
  exerciseId: string,
  running: boolean,
): JudgingCriterion[] => [
  qualitative(exerciseId, "anfangsgrundstellung", "Anfangsgrundstellung", "Gerade Ausgangsposition."),
  ...(running
    ? [
        qualitative(exerciseId, "entwicklung-normal", "Entwicklung im Normalschritt", "Zunächst 10–15 Schritte im Normalschritt gehen."),
        qualitative(exerciseId, "entwicklung-lauf", "Entwicklung im Laufschritt", "Auf ein weiteres „Fuß“ 10–15 Schritte laufen; korrektes und aufmerksames Folgen."),
      ]
    : [qualitative(exerciseId, "entwicklung", "Entwicklung", "10–15 Schritte im Normalschritt; korrektes und aufmerksames Folgen.")]),
  qualitative(exerciseId, "platz-hz", "Ausführung des Platz-HZ", running ? "Sofort aus dem Laufen und in Laufrichtung ablegen; der HF verändert den Laufschritt nicht und gibt keine Körperhilfe." : "Sofort und in Laufrichtung ablegen; der HF verändert seine Gangart nicht und gibt keine Körperhilfe."),
  qualitative(exerciseId, "positionshaltung", "Positionshaltung", `Ruhig, gerade und aufmerksam liegen; der HF entfernt sich weitere mindestens 30 Schritte${running ? " im Laufschritt" : ""}.`),
  qualitative(exerciseId, "herankommen", "Herankommen", "Auf Richteranweisung freudig, schnell und direkt ohne Tempoveränderung herankommen."),
  qualitative(exerciseId, "vorsitz", "Vorsitz", "Dicht und gerade; eine Grätschstellung des HF ist fehlerhaft."),
  qualitative(exerciseId, "endgrundstellung", "Endgrundstellung", "Auf „Fuß“ schnell und gerade links neben dem HF sitzen, Schulterblatt auf Kniehöhe."),
  ...positionSpecialRules(exerciseId, "Platz", "sitzt oder steht", 7, "Abruf"),
];

const standCriteria = (
  exerciseId: string,
  running: boolean,
): JudgingCriterion[] => [
  qualitative(exerciseId, "anfangsgrundstellung", "Anfangsgrundstellung", "Gerade Ausgangsposition."),
  qualitative(exerciseId, "entwicklung", "Entwicklung", running ? "Direkt aus der Grundstellung 10–15 Schritte im Laufschritt; keine vorgeschaltete Normalschrittphase." : "10–15 Schritte im Normalschritt; korrektes und aufmerksames Folgen."),
  qualitative(exerciseId, "steh-hz", "Ausführung des Steh-HZ", `Sofort und in Laufrichtung stehen bleiben; der HF ${running ? "läuft" : "geht"} ohne Gangartänderung und Körperhilfe weiter.`),
  qualitative(exerciseId, "positionshaltung", "Positionshaltung", `Ruhig, gerade und aufmerksam stehen; der HF entfernt sich weitere mindestens 30 Schritte${running ? " im Laufschritt" : ""}.`),
  qualitative(exerciseId, "herankommen", "Herankommen", "Auf Richteranweisung freudig, schnell und direkt ohne Tempoveränderung herankommen."),
  qualitative(exerciseId, "vorsitz", "Vorsitz", "Dicht und gerade; eine Grätschstellung des HF ist fehlerhaft."),
  qualitative(exerciseId, "endgrundstellung", "Endgrundstellung", "Auf „Fuß“ schnell und gerade links neben dem HF sitzen."),
  ...positionSpecialRules(exerciseId, "Steh", "sitzt oder liegt", 7, "Abruf"),
];

const freeHeelworkCriteria = (
  exerciseId: string,
  level: 1 | 2 | 3,
): JudgingCriterion[] => [
  qualitative(exerciseId, "anfangsgrundstellung", "Anfangsgrundstellung", "Gerade und aufmerksam links neben dem HF; der Hund arbeitet frei."),
  qualitative(exerciseId, "position", "Position während der Arbeit", "Schulterblatt auf Kniehöhe; kein Vordrängen, Zurückbleiben, Nachhängen oder seitliches Abweichen."),
  qualitative(exerciseId, "aufmerksamkeit", "Aufmerksamkeit und Ausdruck", "Freudige, schnelle und konzentrierte Arbeit; Unaufmerksamkeit oder Gedrücktheit sind fehlerhaft."),
  qualitative(exerciseId, "gangarten", "Gangarten", level === 1 ? "VK-1-Schema mit Normal- und Laufschritt; kein langsamer Schritt vorgeschrieben." : "Normal-, Lauf- und langsamer Schritt mit deutlich verschiedenen Geschwindigkeiten; Wechsel vom Lauf- zum langsamen Schritt ohne Zwischenschritte."),
  ...(level === 1 ? [] : [qualitative(exerciseId, "wendungen", "Wendungen", "Vorgegebenes Laufschema; insbesondere kein zögerndes Verharren des HF.")]),
  qualitative(exerciseId, "endgrundstellung", level === 1 ? "Abschlussgrundstellung" : "Halte und Endgrundstellung", "Nach der abschließenden Kehrtwendung beziehungsweise beim Halt selbstständig, schnell und gerade sitzen; kein Sitz-HZ."),
];

export const JUDGING_LEVELS: JudgingLevel[] = [
  "VDH-VK1",
  "VDH-VK2",
  "VDH-VK3",
];

export const JUDGING_DEFINITIONS: Record<
  JudgingLevel,
  JudgingLevelDefinition<JudgingLevel>
> = {
  "VDH-VK1": {
    level: "VDH-VK1",
    maxPoints: 60,
    exercises: [
      {
        id: "vk1-leinenfuehrigkeit",
        label: "Leinenführigkeit",
        maxPoints: 15,
        criteria: [
          qualitative("vk1-leinenfuehrigkeit", "anfangsgrundstellung", "Anfangsgrundstellung", "Gerade und aufmerksam links neben dem HF."),
          qualitative("vk1-leinenfuehrigkeit", "position", "Position während des Führens", "Schulterblatt auf Kniehöhe; kein Vordrängen, Zurückbleiben, Nachhängen oder seitliches Abweichen."),
          qualitative("vk1-leinenfuehrigkeit", "aufmerksamkeit", "Aufmerksamkeit und Ausdruck", "Aufmerksam, freudig, schnell und konzentriert; Gedrücktheit ist fehlerhaft."),
          qualitative("vk1-leinenfuehrigkeit", "gangarten-wendungen", "Gangartwechsel und Wendungen", "Vorgegebenes Schema; Unaufmerksamkeit sowie zögerndes Verharren des HF bei Wendungen sind fehlerhaft."),
          qualitative("vk1-leinenfuehrigkeit", "leinenfuehrung", "Leinenführung", "Leine in der linken Hand, frei durchhängend."),
          qualitative("vk1-leinenfuehrigkeit", "halte-endgrundstellung", "Halte und Endgrundstellung", "Der Hund setzt sich selbstständig, schnell und gerade; kein Sitz-HZ oder Herantreten des HF an den Hund."),
        ],
      },
      {
        id: "vk1-freifolge",
        label: "Freifolge",
        maxPoints: 20,
        criteria: freeHeelworkCriteria("vk1-freifolge", 1),
      },
      {
        id: "vk1-sitz-abholen",
        label: "Sitz mit Abholen",
        maxPoints: 10,
        criteria: sitCriteria("vk1-sitz-abholen"),
      },
      {
        id: "vk1-ablegen-herankommen",
        label: "Ablegen mit Herankommen",
        maxPoints: 15,
        criteria: downCriteria("vk1-ablegen-herankommen", false),
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
        criteria: freeHeelworkCriteria("vk2-freifolge", 2),
      },
      {
        id: "vk2-sitz-abholen",
        label: "Sitz mit Abholen",
        maxPoints: 10,
        criteria: sitCriteria("vk2-sitz-abholen"),
      },
      {
        id: "vk2-ablegen-herankommen",
        label: "Ablegen mit Herankommen",
        maxPoints: 15,
        criteria: downCriteria("vk2-ablegen-herankommen", false),
      },
      {
        id: "vk2-steh-herankommen",
        label: "Steh mit Herankommen",
        maxPoints: 15,
        criteria: standCriteria("vk2-steh-herankommen", false),
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
        criteria: freeHeelworkCriteria("vk3-freifolge", 3),
      },
      {
        id: "vk3-sitz-abholen",
        label: "Sitz mit Abholen",
        maxPoints: 10,
        criteria: sitCriteria("vk3-sitz-abholen"),
      },
      {
        id: "vk3-ablegen-herankommen",
        label: "Ablegen aus dem Laufschritt mit Herankommen",
        maxPoints: 15,
        criteria: downCriteria("vk3-ablegen-herankommen", true),
      },
      {
        id: "vk3-steh-herankommen",
        label: "Steh aus dem Laufschritt mit Herankommen",
        maxPoints: 15,
        criteria: standCriteria("vk3-steh-herankommen", true),
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
  triggers: JudgingTriggers = {},
): JudgingScore {
  const errors: string[] = [];
  const exercises = definition.exercises.map((exercise) => {
    const enteredFaults = exercise.criteria.reduce((sum, criterion) => {
      if (criterion.inputKind === "fixed") {
        return sum + (triggers[criterion.id] ? criterion.fixedDeduction ?? 0 : 0);
      }
      if (criterion.inputKind === "exercise-zero") {
        return sum + (triggers[criterion.id] ? exercise.maxPoints : 0);
      }
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
    const points = Math.max(0, exercise.maxPoints - deductions);
    const cappedAtMangelhaft = exercise.criteria.some(
      (criterion) =>
        criterion.inputKind === "rating-cap" && triggers[criterion.id],
    );
    return {
      exerciseId: exercise.id,
      deductions,
      points,
      rating: cappedAtMangelhaft
        ? ("Mangelhaft" as const)
        : calculateRating(exercise.maxPoints, points),
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
