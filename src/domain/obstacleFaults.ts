import type {
  ObstacleFaultCode,
  ObstacleFaultDetail,
  ObstacleFaultPosition,
} from "./types";

export interface ObstacleFaultRule {
  code: ObstacleFaultCode;
  label: string;
  points: 1 | 2 | 4;
  explanation: string;
  positions: readonly ObstacleFaultPosition[];
}

export const COURSE_OBSTACLES: readonly ObstacleFaultPosition[] = [
  "hurdle-1", "oxer", "tunnel", "plank", "barrel", "hoop", "high-long", "hurdle-2",
];

export const OBSTACLE_POSITIONS: ReadonlyArray<{ id: ObstacleFaultPosition; label: string }> = [
  { id: "hurdle-1", label: "Hürde 1" },
  { id: "oxer", label: "Oxer" },
  { id: "tunnel", label: "Tunnel" },
  { id: "plank", label: "Laufdiele" },
  { id: "barrel", label: "Tonne" },
  { id: "hoop", label: "Durchsprung" },
  { id: "high-long", label: "Hoch-Weit" },
  { id: "hurdle-2", label: "Hürde 2" },
  { id: "position-independent", label: "Positionsunabhängig" },
];

export const OBSTACLE_FAULT_RULES: readonly ObstacleFaultRule[] = [
  {
    code: "obstacle-omitted", label: "Hindernis ausgelassen", points: 4,
    explanation: "Hindernisse müssen in vorgeschriebener Reihenfolge und Laufrichtung bewältigt werden.",
    positions: COURSE_OBSTACLES,
  },
  {
    code: "oxer-bar-1-dropped", label: "Stange 1 abgeworfen", points: 1,
    explanation: "Die erste Stange in Laufrichtung wird einzeln bewertet.", positions: ["oxer"],
  },
  {
    code: "oxer-bar-2-dropped", label: "Stange 2 abgeworfen", points: 1,
    explanation: "Die zweite Stange in Laufrichtung wird einzeln bewertet.", positions: ["oxer"],
  },
  {
    code: "plank-side-mount", label: "Seitliches Aufspringen", points: 4,
    explanation: "Verspätetes beziehungsweise seitliches Aufspringen ist fehlerhaft.", positions: ["plank"],
  },
  {
    code: "plank-side-dismount", label: "Seitliches Abspringen", points: 2,
    explanation: "Verfrühtes beziehungsweise seitliches Abspringen ist fehlerhaft.", positions: ["plank"],
  },
  {
    code: "high-long-bar-1-dropped", label: "Stange 1 abgeworfen", points: 1,
    explanation: "Die erste Stange in Laufrichtung wird einzeln bewertet.", positions: ["high-long"],
  },
  {
    code: "high-long-bar-2-dropped", label: "Stange 2 abgeworfen", points: 1,
    explanation: "Die zweite Stange in Laufrichtung wird einzeln bewertet.", positions: ["high-long"],
  },
  {
    code: "high-long-bar-1-under", label: "Stange 1 unterlaufen", points: 2,
    explanation: "Die erste Stange in Laufrichtung wird einzeln bewertet.", positions: ["high-long"],
  },
  {
    code: "high-long-bar-2-under", label: "Stange 2 unterlaufen", points: 2,
    explanation: "Die zweite Stange in Laufrichtung wird einzeln bewertet.", positions: ["high-long"],
  },
  {
    code: "held-after-start", label: "Hund oder Halsband nach dem Starttor festgehalten", points: 2,
    explanation: "Körperliche Hilfe nach dem Starttor.", positions: ["position-independent"],
  },
];

const labels = new Map(OBSTACLE_POSITIONS.map(({ id, label }) => [id, label]));
const rules = new Map(OBSTACLE_FAULT_RULES.map((rule) => [rule.code, rule]));

export const obstacleRulesForPosition = (position: ObstacleFaultPosition) =>
  OBSTACLE_FAULT_RULES.filter((rule) => rule.positions.includes(position));
export const obstacleFaultsTotal = (details: readonly ObstacleFaultDetail[]) =>
  details.reduce((sum, detail) => sum + detail.points, 0);

export function isValidObstacleFaultDetail(detail: unknown): detail is ObstacleFaultDetail {
  if (!detail || typeof detail !== "object") return false;
  const candidate = detail as Partial<ObstacleFaultDetail>;
  const rule = candidate.code ? rules.get(candidate.code) : undefined;
  return typeof candidate.id === "string" && !!candidate.position && !!rule &&
    rule.positions.includes(candidate.position) && candidate.points === rule.points;
}

const highLongBar = (code: ObstacleFaultCode) => {
  if (code.includes("bar-1")) return "bar-1";
  if (code.includes("bar-2")) return "bar-2";
  return null;
};

export function obstacleFaultConflicts(
  details: readonly ObstacleFaultDetail[],
  position: ObstacleFaultPosition,
  code: ObstacleFaultCode,
) {
  if (code === "held-after-start") return false;
  if (details.some((detail) => detail.position === position && detail.code === code)) return true;
  const atPosition = details.filter((detail) => detail.position === position);
  if (
    code === "obstacle-omitted" ||
    atPosition.some((detail) => detail.code === "obstacle-omitted")
  ) return atPosition.length > 0;
  if (position === "high-long") {
    const bar = highLongBar(code);
    if (bar && atPosition.some((detail) => highLongBar(detail.code) === bar)) return true;
  }
  return false;
}

export function areValidObstacleFaultDetails(details: unknown[]) {
  if (!details.every(isValidObstacleFaultDetail)) return false;
  const uniqueEvents = new Set<string>();
  for (const [index, detail] of details.entries()) {
    if (detail.code === "held-after-start") continue;
    const event = `${detail.position}:${detail.code}`;
    if (uniqueEvents.has(event)) return false;
    uniqueEvents.add(event);
    const others = details.filter((_, candidateIndex) => candidateIndex !== index);
    if (obstacleFaultConflicts(others, detail.position, detail.code)) return false;
  }
  return true;
}

export const formatObstacleFaultDetail = (detail: ObstacleFaultDetail) => {
  const rule = rules.get(detail.code);
  return `${labels.get(detail.position) ?? detail.position}: ${rule?.label ?? detail.code} (−${detail.points} FP)`;
};
