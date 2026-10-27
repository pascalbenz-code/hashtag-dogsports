export type IfhMode = "free" | "target" | "simulation";
export type IfhLevel = "FCI-IFH1" | "FCI-IFH2" | "FCI-IFH3";
export type IfhSessionStatus = "draft" | "completed";
export type IfhOutcomeStatus =
  | "completed"
  | "training-ended"
  | "po-terminated"
  | "disqualified"
  | "incomplete";
export type GoalResult = "achieved" | "partial" | "not-achieved" | "unrated";
export type Assessment5 = 1 | 2 | 3 | 4 | 5 | null;
export type IfhRating =
  | "excellent"
  | "very-good"
  | "good"
  | "satisfactory"
  | "insufficient"
  | "unrated";
export type IfhLngLat = [longitude: number, latitude: number];

export interface IfhMapGeneratorSettings {
  desiredSteps: number;
  legCount: number;
  articleCount: number;
  acuteAngleCount: number;
  edgeClearanceMeters: number;
  seed: number;
}

export interface IfhMapPlan {
  coordinateSystem: "WGS84";
  center: IfhLngLat | null;
  zoom: number;
  mapStyle: "streets" | "satellite";
  boundary: IfhLngLat[] | null;
  generatedRoute: IfhLngLat[] | null;
  editedRoute: IfhLngLat[] | null;
  routeSource: "generated" | "manual" | null;
  generatorSettings: IfhMapGeneratorSettings;
  generationWarnings: string[];
  generatorVersion: "IFH-GEO-1";
  updatedAt: string | null;
}

export type TrainingFocus =
  | "Ansatz"
  | "Suchintensität"
  | "Rechte Winkel"
  | "Linke Winkel"
  | "Spitze Winkel"
  | "Halbkreis"
  | "Gegenstände"
  | "Wiederansatz"
  | "Verleitungen"
  | "Geländewechsel"
  | "Wegüberquerungen"
  | "Liegezeit"
  | "Konzentration über die Strecke"
  | "Leinenarbeit des Hundeführers";

export interface IfhArticleEvaluation {
  result: "independent" | "assisted" | "overrun" | "not-found" | "unrated";
  indication: "point" | "pick-up" | "retrieve" | "unrated";
  pointPosition: "down" | "sit" | "stand" | "unrated";
  relation: "straight" | "up-to-30-degrees" | "over-30-degrees" | "unrated";
  confidence: Assessment5;
  unrestAvoidance: Assessment5;
  holdsPosition: boolean | null;
  help: string;
  restart: "direct" | "hesitant" | "extra-command" | "no-restart" | "unrated";
  mediaReference: string;
  note: string;
  rating?: IfhRating;
  /** Nur für den PO-Sonderfall: auch durch den Fährtenleger nicht auffindbar. */
  notFoundByTrackLayer?: boolean | null;
}

export interface IfhArticle {
  id: string;
  number: number;
  material: string;
  ownership?: "own" | "foreign" | "";
  legId: string;
  positionSteps: number | null;
  dimensionsCm: {
    length: number | null;
    width: number | null;
    height: number | null;
  };
  carriedFrom?: string;
  laidAt?: string;
  evaluation: IfhArticleEvaluation;
}

export interface IfhAngle {
  id: string;
  legId: string;
  positionSteps: number | null;
  direction: "left" | "right";
  degrees: number | null;
  type: "right" | "acute";
  evaluation: {
    result: "safe" | "controlled" | "circled" | "lost" | "helped" | "unrated";
    intensityAfter: "steady" | "reduced" | "unrated";
    note: string;
    rating?: IfhRating;
  };
}

export interface IfhCrossTrack {
  id: string;
  legId: string;
  positionSteps: number | null;
  crossingAngle: number | null;
  layer: string;
  laidAt?: string;
  evaluation: {
    result:
      | "no-reaction"
      | "checked-stayed"
      | "switched"
      | "followed"
      | "helped"
      | "unrated";
    note: string;
    rating?: IfhRating;
  };
}

export interface IfhTrackEvent {
  id: string;
  legId: string;
  positionSteps: number | null;
  type: "terrain-change" | "road-crossing" | "distraction" | "aid" | "food";
  note: string;
}

export interface IfhLeg {
  id: string;
  order: number;
  lengthSteps: number | null;
  lengthMeters: number | null;
  ground: "Wiese" | "Acker" | "Waldboden" | "gemischt" | "sonstiges";
  vegetation: string;
  direction: string;
  shape: "straight" | "semicircle";
  semicircleRadiusMeters: number | null;
  semicircleDirection: "left" | "right" | null;
  notes: string;
  evaluation?: {
    rating: IfhRating;
    intensity: Assessment5;
    concentration: Assessment5;
    independence: Assessment5;
    deepNose: Assessment5;
    consistency: Assessment5;
    help: string;
    note: string;
  };
}

export interface IfhTrack {
  legs: IfhLeg[];
  angles: IfhAngle[];
  articles: IfhArticle[];
  crossTracks: IfhCrossTrack[];
  events: IfhTrackEvent[];
  postLastArticleStraightSteps: number | null;
  estimatedStepLengthMeters: number | null;
}

export interface IfhConditions {
  moisture: "" | "trocken" | "feucht" | "nass";
  vegetationHeightCm: number | null;
  surfaceNotes: string;
  temperatureC: number | null;
  windStrength: string;
  windDirection: string;
  weather: string[];
  weatherChanges: string;
  manure: boolean | null;
  wildlifeDistractions: string;
  dogMotivationBefore: Assessment5;
  dogConcentrationBefore: Assessment5;
  dailyCircumstances: string;
  aidsAndFood: string;
}

export interface IfhPause {
  id: string;
  startedAt: string;
  endedAt?: string;
  reason: string;
}

export interface IfhTiming {
  articlePreparationStartedAt?: string;
  layingStartedAt?: string;
  layingEndedAt?: string;
  plannedStartAt?: string;
  actualStartAt?: string;
  searchEndedAt?: string;
  pauses: IfhPause[];
  agingReference: "laying-ended-to-start";
}

export interface IfhSearchQuality {
  intensity: Assessment5;
  confidence: Assessment5;
  concentration: Assessment5;
  deepNose: Assessment5;
  consistency: Assessment5;
  independence: Assessment5;
  handlerCooperation: Assessment5;
  firstThird: Assessment5;
  middleThird: Assessment5;
  lastThird: Assessment5;
  speedInfo: string;
}

export interface IfhHandlerAssessment {
  distanceMeters: number | null;
  lineLengthMeters: number | null;
  lineHandling: string;
  extraCommands: number | null;
  visualSignals: number | null;
  lineAids: number | null;
  atAngles: string;
  atArticles: string;
}

export type IfhRuleEventCode =
  | "extra-search-command-start"
  | "restart-after-recall"
  | "command-before-sign"
  | "missing-search-command"
  | "false-indication-line-end"
  | "false-indication-handler-approach"
  | "visual-aid-resume"
  | "leaving-track-behaviour";

export interface IfhRuleEvent {
  id: string;
  sourceEventKey: string;
  code: IfhRuleEventCode;
  count: number;
  note: string;
}

export interface IfhSession {
  id: string;
  dog: string;
  date: string;
  title: string;
  mode: IfhMode;
  targetLevel: IfhLevel | null;
  location: string;
  trackLayer: string;
  trackOwnership: "own" | "foreign" | "";
  focuses: TrainingFocus[];
  goal: string;
  notes: string;
  status: IfhSessionStatus;
  outcomeStatus: IfhOutcomeStatus;
  goalResult: GoalResult;
  wentWell: string;
  difficult: string;
  nextFocus: string;
  plannedTrack: IfhTrack;
  actualTrack: IfhTrack;
  conditions: IfhConditions;
  timing: IfhTiming;
  searchQuality: IfhSearchQuality;
  handlerAssessment: IfhHandlerAssessment;
  ruleEvents: IfhRuleEvent[];
  manualExamScore: number | null;
  manualAssessmentComplete: boolean;
  rulebookVersion: "FCI-PO-2025";
  mapPlan?: IfhMapPlan;
  createdAt: string;
  updatedAt: string;
}

export interface IfhRuleMetadata {
  id: string;
  levels: IfhLevel[];
  description: string;
  type: "requirement" | "fixed-deduction" | "qualitative" | "status";
  source: "FCI-Prüfungsordnung 2025";
  pages: string;
  version: "FCI-PO-2025";
  verification: "pending-original" | "verified";
}
