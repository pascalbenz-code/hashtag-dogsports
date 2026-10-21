export type DisciplineKey = "obedience" | "hurdles" | "slalom" | "obstacle";
export type RunningKey = Exclude<DisciplineKey, "obedience">;
export type CompetitionType =
  | "Vereinsprüfung"
  | "Kreismeisterschaft"
  | "Verbandsmeisterschaft"
  | "dhv Deutsche Meisterschaft"
  | "VDH Deutsche Meisterschaft";

export interface RunInput {
  time: number | null;
  faults: number | null;
}
export interface CompetitionResult {
  id: string;
  date: string;
  competitionType: CompetitionType;
  event: string;
  dog: string;
  handler: string;
  className: "FCI-VK1" | "FCI-VK2" | "FCI-VK3";
  obedience: number | null;
  hurdles: RunInput;
  slalom: RunInput;
  obstacle: RunInput;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type QualificationKey =
  | "promotion-vk2"
  | "promotion-vk3"
  | "swhv"
  | "dhv"
  | "vdh";
export interface Qualification {
  key: QualificationKey;
  label: string;
  color: "gray" | "green" | "blue" | "red";
}

export interface ScoreBreakdown {
  total: number | null;
  complete: boolean;
  qualifications: Qualification[];
  errors: string[];
}
