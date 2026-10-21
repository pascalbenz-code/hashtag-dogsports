import type {
  CompetitionResult,
  CompetitionType,
  Qualification,
  ScoreBreakdown,
} from "./types";

export const BASE_POINTS: Record<CompetitionResult["className"], number> = {
  "FCI-VK1": 250,
  "FCI-VK2": 255,
  "FCI-VK3": 265,
};

const CLUB_AND_DISTRICT: readonly CompetitionType[] = [
  "Vereinsprüfung",
  "Kreismeisterschaft",
];

const ALL_COMPETITION_TYPES: readonly CompetitionType[] = [
  "Vereinsprüfung",
  "Kreismeisterschaft",
  "Verbandsmeisterschaft",
  "dhv Deutsche Meisterschaft",
  "VDH Deutsche Meisterschaft",
];

export const QUALIFICATION_RULES = {
  "FCI-VK1": [
    {
      key: "promotion-vk2",
      label: "Aufstieg-VK2",
      color: "gray",
      minObedience: 48,
      minTotal: 250,
      competitionTypes: ALL_COMPETITION_TYPES,
    },
  ],
  "FCI-VK2": [
    {
      key: "promotion-vk3",
      label: "Aufstieg-VK3",
      color: "gray",
      minObedience: 48,
      minTotal: 260,
      competitionTypes: CLUB_AND_DISTRICT,
    },
  ],
  "FCI-VK3": [
    {
      key: "swhv",
      label: "swhv-Quali",
      color: "green",
      minObedience: 48,
      minTotal: 250,
      competitionTypes: CLUB_AND_DISTRICT,
    },
    {
      key: "dhv",
      label: "dhv-Quali",
      color: "blue",
      minObedience: 48,
      minTotal: 265,
      competitionTypes: ["Verbandsmeisterschaft"],
    },
    {
      key: "vdh",
      label: "VDH-Quali",
      color: "red",
      minObedience: 54,
      minTotal: 270,
      competitionTypes: ALL_COMPETITION_TYPES,
    },
  ],
} as const;

const finite = (value: number | null) =>
  value !== null && Number.isFinite(value);

export function validateResult(result: CompetitionResult): string[] {
  const errors: string[] = [];
  if (!result.date) errors.push("Datum fehlt");
  if (!result.event.trim()) errors.push("Turnier / Verein fehlt");
  if (!finite(result.obedience)) errors.push("Unterordnung fehlt");
  else if (result.obedience! < 0 || result.obedience! > 60)
    errors.push("Unterordnung muss zwischen 0 und 60 liegen");

  for (const [label, run] of [
    ["Hürden", result.hurdles],
    ["Slalom", result.slalom],
    ["Hindernis", result.obstacle],
  ] as const) {
    if (!finite(run.time)) errors.push(`${label}: Laufzeit fehlt`);
    else if (run.time! < 0)
      errors.push(`${label}: Laufzeit darf nicht negativ sein`);
    if (!finite(run.faults)) errors.push(`${label}: Fehlerpunkte fehlen`);
    else if (run.faults! < 0)
      errors.push(`${label}: Fehlerpunkte dürfen nicht negativ sein`);
  }
  return errors;
}

export function calculateScore(result: CompetitionResult): ScoreBreakdown {
  const errors = validateResult(result);
  if (errors.length)
    return { total: null, complete: false, qualifications: [], errors };

  const total =
    Math.round(
      (BASE_POINTS[result.className] +
        result.obedience! -
        result.hurdles.time! -
        result.hurdles.faults! -
        result.slalom.time! -
        result.slalom.faults! -
        result.obstacle.time! -
        result.obstacle.faults!) *
        100,
    ) / 100;

  const matched = new Set(
    QUALIFICATION_RULES[result.className]
      .filter(
        (rule) =>
          result.obedience! >= rule.minObedience &&
          total >= rule.minTotal &&
          (rule.competitionTypes as readonly CompetitionType[]).includes(
            result.competitionType ?? "Vereinsprüfung",
          ),
      )
      .map((rule) => rule.key),
  );

  // Qualifikationen sind hierarchisch: Eine auf der Verbandsmeisterschaft
  // erreichte dhv-Quali schließt die niedrigere swhv-Quali ein.
  if (result.className === "FCI-VK3" && matched.has("dhv")) {
    matched.add("swhv");
  }

  const qualifications = QUALIFICATION_RULES[result.className]
    .filter((rule) => matched.has(rule.key))
    .map(({ key, label, color }) => ({ key, label, color }) as Qualification);

  return { total, complete: true, qualifications, errors: [] };
}
