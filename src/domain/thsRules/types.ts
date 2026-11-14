import type { CompetitionClass, CompetitionType, Qualification, QualificationKey } from "../types";

export type AgeGroup = "youngest" | "youth" | "active" | "senior";
export type SprintThresholds = Readonly<Record<"male" | "female", Readonly<Record<AgeGroup, number>>>>;

export interface QualificationCondition {
  className: CompetitionClass;
  competitionTypes: readonly CompetitionType[];
  minObedience?: number;
  minTotal: number | SprintThresholds;
}

export interface QualificationPeriod {
  year: number;
  /** Inklusive Grenzen, Datum im Format JJJJ-MM-TT. */
  startDate: string;
  endDate: string;
  label: string;
}

export interface QualificationDefinition {
  flag: Qualification;
  periods?: readonly QualificationPeriod[];
  conditions: readonly QualificationCondition[];
  /** Zusätzlich vergebene Flags, auch wenn deren eigene Bedingungen nicht erfüllt sind. */
  includes?: readonly QualificationKey[];
}
