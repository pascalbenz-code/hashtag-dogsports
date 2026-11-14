import { THS_QUALIFICATION_RULES } from "./thsRules";
import type { AgeGroup } from "./thsRules/types";
import type {
  CompetitionClass,
  CompetitionResult,
  Qualification,
  QualificationKey,
  ScoreBreakdown,
} from "./types";
import { calculateAge } from "./profiles";
import { hurdleFaultsTotal, isValidHurdleFaultDetail } from "./hurdleFaults";
import { areValidSlalomFaultDetails, slalomFaultsTotal } from "./slalomFaults";
import { areValidObstacleFaultDetails, obstacleFaultsTotal } from "./obstacleFaults";
import { hurdleReferenceClass, isVierkampf, normalizedCrossCountryTime } from "./disciplines";

export const BASE_POINTS: Record<CompetitionClass, number> = {
  "FCI-VK1": 250, "FCI-VK2": 255, "FCI-VK3": 265,
  "VDH-S-VK": 340, "VDH-HL": 0, "VDH-DK": 240,
};
const finite = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);
const round = (value: number) => Math.round(value * 100) / 100;

function validateRun(errors: string[], label: string, run: { time: number | null; faults: number | null } | undefined) {
  if (!run || !finite(run.time)) errors.push(`${label}: Laufzeit fehlt`);
  else if (run.time < 0) errors.push(`${label}: Laufzeit darf nicht negativ sein`);
  if (!run || !finite(run.faults)) errors.push(`${label}: Fehlerpunkte fehlen`);
  else if (run.faults < 0) errors.push(`${label}: Fehlerpunkte dürfen nicht negativ sein`);
}

function validateObstacleDetails(errors: string[], label: string, run: CompetitionResult["obstacle"] | undefined) {
  const details = run?.faultDetails ?? [];
  if (!details.length) return;
  if (!areValidObstacleFaultDetails(details)) errors.push(`${label}: Mindestens eine Detailangabe ist ungültig`);
  if (finite(run?.faults) && obstacleFaultsTotal(details) !== run.faults)
    errors.push(`${label}: Fehlerpunkte stimmen nicht mit den Detailangaben überein`);
}

function validateStandardRuns(result: CompetitionResult, errors: string[]) {
  validateRun(errors, "Hürden", result.hurdles);
  validateRun(errors, "Slalom", result.slalom);
  validateRun(errors, "Hindernis", result.obstacle);
  const hurdleDetails = result.hurdles.faultDetails ?? [];
  if (hurdleDetails.length) {
    if (!hurdleDetails.every((detail) => isValidHurdleFaultDetail(detail, hurdleReferenceClass(result.className))))
      errors.push("Hürden: Mindestens eine Detailangabe ist ungültig");
    if (finite(result.hurdles.faults) && hurdleFaultsTotal(hurdleDetails) !== result.hurdles.faults)
      errors.push("Hürden: Fehlerpunkte stimmen nicht mit den Detailangaben überein");
  }
  const slalomDetails = result.slalom.faultDetails ?? [];
  if (slalomDetails.length) {
    if (!areValidSlalomFaultDetails(slalomDetails)) errors.push("Slalom: Mindestens eine Detailangabe ist ungültig");
    if (finite(result.slalom.faults) && slalomFaultsTotal(slalomDetails) !== result.slalom.faults)
      errors.push("Slalom: Fehlerpunkte stimmen nicht mit den Detailangaben überein");
  }
  validateObstacleDetails(errors, "Hindernis", result.obstacle);
}

export function validateResult(result: CompetitionResult): string[] {
  const errors: string[] = [];
  if (!result.date) errors.push("Datum fehlt");
  if (!result.event.trim()) errors.push("Turnier / Verein fehlt");
  if (!result.handlerId || !result.handler.trim()) errors.push("Hundeführer fehlt");
  if (!result.dogId || !result.dog.trim()) errors.push("Hund fehlt");
  if (isVierkampf(result.className)) {
    if (!finite(result.obedience)) errors.push("Unterordnung fehlt");
    else if (result.obedience < 0 || result.obedience > 60) errors.push("Unterordnung muss zwischen 0 und 60 liegen");
    validateStandardRuns(result, errors);
  } else if (result.className === "VDH-DK") {
    validateStandardRuns(result, errors);
    if (!result.hurdlesLeash) errors.push("Hürden: Leinenstatus fehlt");
    if (!result.slalomLeash) errors.push("Slalom: Leinenstatus fehlt");
    if (!result.obstacleLeash) errors.push("Hindernis: Leinenstatus fehlt");
  } else if (result.className === "VDH-S-VK") {
    validateStandardRuns(result, errors);
    const crossCountry = result.crossCountry;
    if (!crossCountry || !finite(crossCountry.timeSeconds)) errors.push("1000-m-Lauf: Laufzeit fehlt");
    else if (crossCountry.timeSeconds < 0) errors.push("1000-m-Lauf: Laufzeit darf nicht negativ sein");
    if (!crossCountry || !finite(crossCountry.distanceMeters)) errors.push("1000-m-Lauf: Streckenlänge fehlt");
    else if (crossCountry.distanceMeters <= 0) errors.push("1000-m-Lauf: Streckenlänge muss größer als 0 sein");
    if (!result.handlerBirthDate || !result.handlerGender)
      errors.push("Hundeführerdaten für Altersklasse und Qualifikation fehlen");
  } else if (result.className === "VDH-HL") {
    validateRun(errors, "Hindernislauf 1", result.obstacle);
    validateRun(errors, "Hindernislauf 2", result.obstacle2);
    validateObstacleDetails(errors, "Hindernislauf 1", result.obstacle);
    validateObstacleDetails(errors, "Hindernislauf 2", result.obstacle2);
    if (!result.obstacleLeash) errors.push("Hindernislauf 1: Leinenstatus fehlt");
    if (!result.obstacle2Leash) errors.push("Hindernislauf 2: Leinenstatus fehlt");
  }
  return errors;
}

const runDeduction = (run: { time: number | null; faults: number | null }) => run.time! + run.faults!;

export function getAgeGroup(birthDate: string, eventDate: string): AgeGroup | null {
  const age = calculateAge(birthDate, new Date(`${eventDate}T12:00:00`));
  if (age === null) return null;
  if (age <= 14) return "youngest";
  if (age <= 18) return "youth";
  if (age <= 49) return "active";
  return "senior";
}

function resultQualifications(result: CompetitionResult, total: number): Qualification[] {
  const matched = new Set<QualificationKey>();
  const ageGroup = getAgeGroup(result.handlerBirthDate ?? "", result.date);
  const gender = result.handlerGender;
  for (const definition of THS_QUALIFICATION_RULES) {
    const qualifies = definition.conditions.some((condition) => {
      if (condition.className !== result.className ||
          !condition.competitionTypes.includes(result.competitionType)) return false;
      if (condition.minObedience !== undefined &&
          (result.obedience === null || result.obedience < condition.minObedience)) return false;
      const threshold = typeof condition.minTotal === "number"
        ? condition.minTotal
        : ageGroup && (gender === "male" || gender === "female")
          ? condition.minTotal[gender][ageGroup] : null;
      return threshold !== null && total >= threshold;
    });
    if (qualifies) matched.add(definition.flag.key);
  }
  // Kumulative Vergabe aus der Konfiguration, unabhängig von der Reihenfolge.
  for (const key of matched) {
    const definition = THS_QUALIFICATION_RULES.find((rule) => rule.flag.key === key);
    for (const included of definition?.includes ?? []) matched.add(included);
  }
  return THS_QUALIFICATION_RULES.filter(({ flag }) => matched.has(flag.key))
    .map(({ flag }) => ({ ...flag }));
}

export function calculateScore(result: CompetitionResult): ScoreBreakdown {
  const errors = validateResult(result);
  if (errors.length) return { total: null, complete: false, qualifications: [], errors };
  let total: number;
  if (result.className === "VDH-HL") {
    total = round(runDeduction(result.obstacle) + runDeduction(result.obstacle2!) +
      (result.obstacleLeash === "on" ? 5 : 0) + (result.obstacle2Leash === "on" ? 5 : 0));
  } else if (result.className === "VDH-DK") {
    const bonus = [result.hurdlesLeash, result.slalomLeash, result.obstacleLeash].filter((mode) => mode === "off").length * 5;
    total = round(240 + bonus - runDeduction(result.hurdles) - runDeduction(result.slalom) - runDeduction(result.obstacle));
  } else if (result.className === "VDH-S-VK") {
    total = round(340 - (result.crossCountry?.falseStart ? 10 : 0) - runDeduction(result.hurdles) -
      runDeduction(result.slalom) - runDeduction(result.obstacle) - normalizedCrossCountryTime(result)!);
  } else {
    total = round(BASE_POINTS[result.className] + result.obedience! - runDeduction(result.hurdles) -
      runDeduction(result.slalom) - runDeduction(result.obstacle));
  }
  const qualifications = resultQualifications(result, total);
  return { total, complete: true, qualifications, errors: [] };
}
