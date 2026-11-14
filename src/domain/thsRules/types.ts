import type { CompetitionClass, CompetitionType, Qualification, QualificationKey } from "../types";

export type AgeGroup = "youngest" | "youth" | "active" | "senior";
export type SprintThresholds = Readonly<Record<"male" | "female", Readonly<Record<AgeGroup, number>>>>;

export interface QualificationCondition {
  className: CompetitionClass;
  competitionTypes: readonly CompetitionType[];
  minObedience?: number;
  minTotal: number | SprintThresholds;
}

export interface QualificationDefinition {
  flag: Qualification;
  conditions: readonly QualificationCondition[];
  /** Zusätzlich vergebene Flags, auch wenn deren eigene Bedingungen nicht erfüllt sind. */
  includes?: readonly QualificationKey[];
}
