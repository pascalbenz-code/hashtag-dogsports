import type {
  SlalomFaultCode,
  SlalomFaultDetail,
  SlalomFaultPosition,
} from "./types";

export interface SlalomFaultRule {
  code: SlalomFaultCode;
  label: string;
  points: 2 | 4;
  explanation: string;
  positions: readonly SlalomFaultPosition[];
}

const GATES: readonly SlalomFaultPosition[] = [
  "gate-1",
  "gate-2",
  "gate-3",
  "gate-4",
];

export const SLALOM_POSITIONS: ReadonlyArray<{
  id: SlalomFaultPosition;
  label: string;
}> = [
  { id: "gate-1", label: "Slalomtor 1" },
  { id: "gate-2", label: "Slalomtor 2" },
  { id: "gate-3", label: "Slalomtor 3" },
  { id: "gate-4", label: "Slalomtor 4" },
  { id: "position-independent", label: "Positionsunabhängig" },
];

export const SLALOM_FAULT_RULES: readonly SlalomFaultRule[] = [
  {
    code: "gate-omitted",
    label: "Streckentor nicht durchlaufen",
    points: 4,
    explanation:
      "Gilt, wenn HF, Hund oder beide das Tor nicht durchlaufen; nur einmal je Torereignis.",
    positions: GATES,
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
  SLALOM_POSITIONS.map(({ id, label }) => [id, label]),
);
const rulesByCode = new Map(
  SLALOM_FAULT_RULES.map((rule) => [rule.code, rule]),
);

export const slalomRulesForPosition = (position: SlalomFaultPosition) =>
  SLALOM_FAULT_RULES.filter((rule) => rule.positions.includes(position));

export const slalomFaultsTotal = (details: readonly SlalomFaultDetail[]) =>
  details.reduce((total, detail) => total + detail.points, 0);

export function isValidSlalomFaultDetail(
  detail: unknown,
): detail is SlalomFaultDetail {
  if (!detail || typeof detail !== "object") return false;
  const candidate = detail as Partial<SlalomFaultDetail>;
  const rule = candidate.code ? rulesByCode.get(candidate.code) : undefined;
  return (
    typeof candidate.id === "string" &&
    !!candidate.position &&
    !!rule &&
    rule.positions.includes(candidate.position) &&
    candidate.points === rule.points
  );
}

export function areValidSlalomFaultDetails(details: unknown[]) {
  if (!details.every(isValidSlalomFaultDetail)) return false;
  const omittedGates = new Set<SlalomFaultPosition>();
  for (const detail of details) {
    if (detail.code !== "gate-omitted") continue;
    if (omittedGates.has(detail.position)) return false;
    omittedGates.add(detail.position);
  }
  return true;
}

export const formatSlalomFaultDetail = (detail: SlalomFaultDetail) => {
  const rule = rulesByCode.get(detail.code);
  return `${positionLabels.get(detail.position) ?? detail.position}: ${
    rule?.label ?? detail.code
  } (−${detail.points} FP)`;
};
