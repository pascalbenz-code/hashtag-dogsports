import type {
  HurdleFaultCode,
  HurdleFaultDetail,
  HurdleFaultPosition,
} from "./types";

type HurdleClass = "FCI-VK1" | "FCI-VK2" | "FCI-VK3";

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
  { id: "hurdle-5", label: "Hürde 5" },
  { id: "hurdle-6", label: "Hürde 6" },
  { id: "position-independent", label: "Positionsunabhängig" },
];

const VK1_AND_VK2_HURDLES: readonly HurdleFaultPosition[] = [
  "hurdle-1",
  "hurdle-2",
  "hurdle-3",
  "hurdle-4",
];

const VK3_HURDLES: readonly HurdleFaultPosition[] = [
  ...VK1_AND_VK2_HURDLES,
  "hurdle-5",
  "hurdle-6",
];

const HURDLE_POSITIONS_BY_CLASS: Record<
  HurdleClass,
  readonly HurdleFaultPosition[]
> = {
  "FCI-VK1": VK1_AND_VK2_HURDLES,
  "FCI-VK2": VK1_AND_VK2_HURDLES,
  "FCI-VK3": VK3_HURDLES,
};

export const HURDLE_FAULT_RULES: readonly HurdleFaultRule[] = [
  {
    code: "not-jumped",
    label: "Stange unterlaufen oder nicht übersprungen",
    points: 4,
    explanation:
      "Die jeweilige Sprungpflicht beachten; zulässiges Danebenlaufen des HF ist kein Fehler.",
    positions: VK3_HURDLES,
  },
  {
    code: "bar-dropped",
    label: "Stange abgeworfen",
    points: 2,
    explanation: "Unabhängig davon, ob Hund oder HF den Abwurf verursacht.",
    positions: VK3_HURDLES,
  },
  {
    code: "early-or-late",
    label: "Vorprellen oder Nachhängen",
    points: 2,
    explanation: "Kann durch Hund oder HF verursacht sein.",
    positions: VK3_HURDLES,
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

export const hurdlePositionsForClass = (
  className: HurdleClass,
) => HURDLE_POSITIONS_BY_CLASS[className];

export const hurdleFaultsTotal = (details: readonly HurdleFaultDetail[]) =>
  details.reduce((total, detail) => total + detail.points, 0);

export function isValidHurdleFaultDetail(
  detail: unknown,
  className?: HurdleClass,
): detail is HurdleFaultDetail {
  if (!detail || typeof detail !== "object") return false;
  const candidate = detail as Partial<HurdleFaultDetail>;
  const rule = candidate.code ? rulesByCode.get(candidate.code) : undefined;
  const validForClass =
    !className ||
    candidate.position === "turn-pole" ||
    candidate.position === "position-independent" ||
    HURDLE_POSITIONS_BY_CLASS[className].includes(candidate.position!);
  return (
    typeof candidate.id === "string" &&
    !!candidate.position &&
    !!rule &&
    rule.positions.includes(candidate.position) &&
    candidate.points === rule.points &&
    validForClass
  );
}

export const formatHurdleFaultDetail = (detail: HurdleFaultDetail) => {
  const rule = rulesByCode.get(detail.code);
  return `${positionLabels.get(detail.position) ?? detail.position}: ${
    rule?.label ?? detail.code
  } (−${detail.points} FP)`;
};
