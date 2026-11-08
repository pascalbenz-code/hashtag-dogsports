import type { CompetitionResult } from "./types";

export const RESULT_FORM_DRAFT_KEY = "dogsport-form-draft";
export const RESULT_FORM_STEP_KEY_PREFIX = "dogsport-form-step:";

export type ResultFormStep = 1 | 2 | 3;

interface ResultFormDefaults {
  id?: string;
  now?: Date;
}

type DraftReader = Pick<Storage, "getItem">;
type DraftRemover = Pick<Storage, "removeItem">;
type StepStorageReader = Pick<Storage, "getItem">;
type StepStorageWriter = Pick<Storage, "setItem">;
type StepStorageRemover = Pick<Storage, "removeItem">;

const stepStorageKey = (resultId: string) =>
  `${RESULT_FORM_STEP_KEY_PREFIX}${encodeURIComponent(resultId)}`;

const isResultFormStep = (value: number): value is ResultFormStep =>
  value === 1 || value === 2 || value === 3;

export function loadResultFormStep(
  resultId: string,
  storage: StepStorageReader = localStorage,
): ResultFormStep {
  if (!resultId) return 1;
  try {
    const value = Number(storage.getItem(stepStorageKey(resultId)));
    return isResultFormStep(value) ? value : 1;
  } catch {
    return 1;
  }
}

export function saveResultFormStep(
  resultId: string,
  step: ResultFormStep,
  storage: StepStorageWriter = localStorage,
): boolean {
  if (!resultId || !isResultFormStep(step)) return false;
  try {
    storage.setItem(stepStorageKey(resultId), String(step));
    return true;
  } catch {
    return false;
  }
}

export function clearResultFormStep(
  resultId: string,
  storage: StepStorageRemover = localStorage,
): boolean {
  if (!resultId) return false;
  try {
    storage.removeItem(stepStorageKey(resultId));
    return true;
  } catch {
    return false;
  }
}

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
  try {
    storage.removeItem(RESULT_FORM_DRAFT_KEY);
  } catch {
    // A blocked localStorage must not prevent creating a clean form.
  }
  return createBlankResult(defaults);
}
