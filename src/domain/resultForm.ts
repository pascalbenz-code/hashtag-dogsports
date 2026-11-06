import type { CompetitionResult } from "./types";

export const RESULT_FORM_DRAFT_KEY = "dogsport-form-draft";

interface ResultFormDefaults {
  id?: string;
  now?: Date;
}

type DraftReader = Pick<Storage, "getItem">;
type DraftRemover = Pick<Storage, "removeItem">;

export function createBlankResult(
  defaults: ResultFormDefaults = {},
): CompetitionResult {
  const current = defaults.now ?? new Date();
  const timestamp = current.toISOString();
  return {
    id: defaults.id ?? crypto.randomUUID(),
    date: timestamp.slice(0, 10),
    competitionType: "Vereinsprüfung",
    event: "",
    handlerId: "",
    handlerBirthDate: "",
    handlerGender: "",
    dogId: "",
    dog: "",
    handler: "",
    className: "FCI-VK1",
    obedience: null,
    hurdles: { time: null, faults: null, faultDetails: [] },
    hurdlesLeash: "on",
    slalom: { time: null, faults: null, faultDetails: [] },
    slalomLeash: "on",
    obstacle: { time: null, faults: null, faultDetails: [] },
    obstacleLeash: "on",
    obstacle2: { time: null, faults: null, faultDetails: [] },
    obstacle2Leash: "on",
    crossCountry: {
      timeSeconds: null,
      distanceMeters: 1000,
      falseStart: false,
    },
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function loadNewResultForm(
  storage: DraftReader = localStorage,
): CompetitionResult {
  try {
    const saved = storage.getItem(RESULT_FORM_DRAFT_KEY);
    return saved
      ? {
          ...createBlankResult(),
          ...(JSON.parse(saved) as CompetitionResult),
        }
      : createBlankResult();
  } catch {
    return createBlankResult();
  }
}

export function resetResultForm(
  storage: DraftRemover = localStorage,
  defaults: ResultFormDefaults = {},
): CompetitionResult {
  storage.removeItem(RESULT_FORM_DRAFT_KEY);
  return createBlankResult(defaults);
}
