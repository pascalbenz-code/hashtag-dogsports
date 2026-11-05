import type { CompetitionClass, CompetitionResult } from "./types";

export const COMPETITION_CLASSES: readonly CompetitionClass[] = [
  "FCI-VK1",
  "FCI-VK2",
  "FCI-VK3",
  "VDH-S-VK",
  "VDH-HL",
  "VDH-DK",
];

export const CLASS_LABELS: Record<CompetitionClass, string> = {
  "FCI-VK1": "VDH-VK1",
  "FCI-VK2": "VDH-VK2",
  "FCI-VK3": "VDH-VK3",
  "VDH-S-VK": "VDH-S-VK · Sprint-Vierkampf",
  "VDH-HL": "VDH-HL · Hindernislauf",
  "VDH-DK": "VDH-DK · Dreikampf",
};

export const isVierkampf = (className: CompetitionClass) =>
  className === "FCI-VK1" || className === "FCI-VK2" || className === "FCI-VK3";
export const isTimeResult = (className: CompetitionClass) => className === "VDH-HL";
export const hurdleReferenceClass = (
  className: CompetitionClass,
): "FCI-VK1" | "FCI-VK2" | "FCI-VK3" =>
  className === "VDH-S-VK"
    ? "FCI-VK3"
    : className === "VDH-DK"
      ? "FCI-VK2"
      : className === "VDH-HL"
        ? "FCI-VK1"
        : className;

export const normalizedCrossCountryTime = (result: CompetitionResult) => {
  const run = result.crossCountry;
  if (!run || run.timeSeconds === null || run.distanceMeters === null || run.distanceMeters <= 0)
    return null;
  return Math.round(((run.timeSeconds * 1000) / run.distanceMeters / 10) * 100) / 100;
};
