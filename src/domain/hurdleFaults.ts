import type {
  HurdleFaultCode,
  HurdleFaultDetail,
  HurdleFaultPosition,
} from "./types";

export interface HurdleFaultRule {
  code: HurdleFaultCode;
  label: string;
  points: 2 | 4 | 10;
  explanation: string;
  positions: readonly HurdleFaultPosition[];
}

export const HURDLE_POSITIONS: ReadonlyArray<{
  id: HurdleFaultPosition;
  label: string;
}> = [
  { id: "hurdle-1", label: "Hürde 1" },
  { id: "hurdle-2", label: "Hürde 2" },
  { id: "turn-pole", label: "Wendestange" },
  { id: "hurdle-3", label: "Hürde 3" },
  { id: "hurdle-4", label: "Hürde 4" },
  { id: "position-independent", label: "Positionsunabhängig" },
];

const HURDLES: readonly HurdleFaultPosition[] = [
  "hurdle-1",
  "hurdle-2",
  "hurdle-3",
  "hurdle-4",
];

export const HURDLE_FAULT_RULES: readonly HurdleFaultRule[] = [
  {
    code: "not-jumped",
    label: "Stange unterlaufen oder nicht übersprungen",
    points: 4,
    explanation:
      "Die jeweilige Sprungpflicht beachten; zulässiges Danebenlaufen des HF ist kein Fehler.",
    positions: HURDLES,
  },
  {
    code: "bar-dropped",
    label: "Stange abgeworfen",
    points: 2,
    explanation: "Unabhängig davon, ob Hund oder HF den Abwurf verursacht.",
    positions: HURDLES,
  },
  {
    code: "early-or-late",
    label: "Vorprellen oder Nachhängen",
    points: 2,
    explanation: "Kann durch Hund oder HF verursacht sein.",
    positions: HURDLES,
  },
  {
    code: "turn-pole-omitted",
    label: "Wendestange ausgelassen",
    points: 10,
    explanation: "Wenn Hund, HF oder beide sie auslassen.",
    positions: ["turn-pole"],
  },
  {
    code: "turn-pole-crossed",
    label: "Wendestange zur Wegverkürzung überstiegen",
    points: 10,
    explanation: "Das Übersteigen zur Wegverkürzung ist ausdrücklich verboten.",
    positions: ["turn-pole"],
  },
  {
    code: "held-after-start",
    label: "Hund oder Halsband nach dem Starttor festgehalten",
    points: 2,
    explanation: "Körperliche Hilfe nach dem Starttor.",
    positions: ["position-independent"],
  },
];

const positionLabels = new Map(
  HURDLE_POSITIONS.map(({ id, label }) => [id, label]),
);
const rulesByCode = new Map(
  HURDLE_FAULT_RULES.map((rule) => [rule.code, rule]),
);

export const hurdleRulesForPosition = (position: HurdleFaultPosition) =>
  HURDLE_FAULT_RULES.filter((rule) => rule.positions.includes(position));

export const hurdleFaultsTotal = (details: readonly HurdleFaultDetail[]) =>
  details.reduce((total, detail) => total + detail.points, 0);

export function isValidHurdleFaultDetail(
  detail: unknown,
): detail is HurdleFaultDetail {
  if (!detail || typeof detail !== "object") return false;
  const candidate = detail as Partial<HurdleFaultDetail>;
  const rule = candidate.code ? rulesByCode.get(candidate.code) : undefined;
  return (
    typeof candidate.id === "string" &&
    !!candidate.position &&
    !!rule &&
    rule.positions.includes(candidate.position) &&
    candidate.points === rule.points
  );
}

export const formatHurdleFaultDetail = (detail: HurdleFaultDetail) => {
  const rule = rulesByCode.get(detail.code);
  return `${positionLabels.get(detail.position) ?? detail.position}: ${
    rule?.label ?? detail.code
  } (−${detail.points} FP)`;
};
