export type DisciplineKey = "obedience" | "hurdles" | "slalom" | "obstacle";
export type RunningKey = Exclude<DisciplineKey, "obedience">;
export type CompetitionType =
  | "Vereinsprüfung"
  | "Kreismeisterschaft"
  | "Verbandsmeisterschaft"
  | "dhv Deutsche Meisterschaft"
  | "VDH Deutsche Meisterschaft";

export type CompetitionClass =
  | "FCI-VK1"
  | "FCI-VK2"
  | "FCI-VK3"
  | "VDH-S-VK"
  | "VDH-HL"
  | "VDH-DK";
export type LeashMode = "on" | "off";

export interface RunInput {
  time: number | null;
  faults: number | null;
}

export type HurdleFaultPosition =
  | "hurdle-1"
  | "hurdle-2"
  | "turn-pole"
  | "hurdle-3"
  | "hurdle-4"
  | "hurdle-5"
  | "hurdle-6"
  | "position-independent";

export type HurdleFaultCode =
  | "not-jumped"
  | "bar-dropped"
  | "early-or-late"
  | "turn-pole-omitted"
  | "turn-pole-crossed"
  | "held-after-start";

export interface HurdleFaultDetail {
  id: string;
  position: HurdleFaultPosition;
  code: HurdleFaultCode;
  points: 2 | 4 | 10;
}

export interface HurdleRunInput extends RunInput {
  faultDetails?: HurdleFaultDetail[];
}

export type SlalomFaultPosition =
  | "gate-1"
  | "gate-2"
  | "gate-3"
  | "gate-4"
  | "position-independent";

export type SlalomFaultCode = "gate-omitted" | "held-after-start";

export interface SlalomFaultDetail {
  id: string;
  position: SlalomFaultPosition;
  code: SlalomFaultCode;
  points: 2 | 4;
}

export interface SlalomRunInput extends RunInput {
  faultDetails?: SlalomFaultDetail[];
}

export type ObstacleFaultPosition =
  | "hurdle-1"
  | "oxer"
  | "tunnel"
  | "plank"
  | "barrel"
  | "hoop"
  | "high-long"
  | "hurdle-2"
  | "position-independent";

export type ObstacleFaultCode =
  | "obstacle-omitted"
  | "oxer-bar-1-dropped"
  | "oxer-bar-2-dropped"
  | "plank-side-mount"
  | "plank-side-dismount"
  | "high-long-bar-1-dropped"
  | "high-long-bar-2-dropped"
  | "high-long-bar-1-under"
  | "high-long-bar-2-under"
  | "held-after-start";

export interface ObstacleFaultDetail {
  id: string;
  position: ObstacleFaultPosition;
  code: ObstacleFaultCode;
  points: 1 | 2 | 4;
}

export interface ObstacleRunInput extends RunInput {
  faultDetails?: ObstacleFaultDetail[];
}

export interface CompetitionResult {
  id: string;
  date: string;
  competitionType: CompetitionType;
  event: string;
  handlerId?: string;
  handlerBirthDate?: string;
  handlerGender?: "male" | "female" | "";
  dogId?: string;
  dog: string;
  handler: string;
  className: CompetitionClass;
  obedience: number | null;
  hurdles: HurdleRunInput;
  hurdlesLeash?: LeashMode;
  slalom: SlalomRunInput;
  slalomLeash?: LeashMode;
  obstacle: ObstacleRunInput;
  obstacleLeash?: LeashMode;
  obstacle2?: ObstacleRunInput;
  obstacle2Leash?: LeashMode;
  crossCountry?: {
    timeSeconds: number | null;
    distanceMeters: number | null;
    falseStart: boolean;
  };
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
