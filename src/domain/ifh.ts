import type {
  Assessment5,
  IfhConditions,
  IfhHandlerAssessment,
  IfhArticle,
  IfhLevel,
  IfhRuleEvent,
  IfhSearchQuality,
  IfhSession,
  IfhTiming,
  IfhTrack,
} from "./ifhTypes";

const id = () => crypto.randomUUID();
const isoNow = () => new Date().toISOString();
const localDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const emptyTrack = (): IfhTrack => ({
  legs: [],
  angles: [],
  articles: [],
  crossTracks: [],
  events: [],
  postLastArticleStraightSteps: null,
  estimatedStepLengthMeters: null,
});

export const emptyConditions = (): IfhConditions => ({
  moisture: "",
  vegetationHeightCm: null,
  surfaceNotes: "",
  temperatureC: null,
  windStrength: "",
  windDirection: "",
  weather: [],
  weatherChanges: "",
  manure: null,
  wildlifeDistractions: "",
  dogMotivationBefore: null,
  dogConcentrationBefore: null,
  dailyCircumstances: "",
  aidsAndFood: "",
});

export const emptyTiming = (): IfhTiming => ({
  pauses: [],
  agingReference: "laying-ended-to-start",
});

const emptyQuality = (): IfhSearchQuality => ({
  intensity: null,
  confidence: null,
  concentration: null,
  deepNose: null,
  consistency: null,
  independence: null,
  handlerCooperation: null,
  firstThird: null,
  middleThird: null,
  lastThird: null,
  speedInfo: "",
});

const emptyHandler = (): IfhHandlerAssessment => ({
  distanceMeters: null,
  lineLengthMeters: null,
  lineHandling: "",
  extraCommands: null,
  visualSignals: null,
  lineAids: null,
  atAngles: "",
  atArticles: "",
});

export function createIfhSession(): IfhSession {
  const now = isoNow();
  return {
    id: id(),
    dog: "",
    date: localDate(),
    title: "",
    mode: "free",
    targetLevel: null,
    location: "",
    trackLayer: "",
    trackOwnership: "",
    focuses: [],
    goal: "",
    notes: "",
    status: "draft",
    outcomeStatus: "incomplete",
    goalResult: "unrated",
    wentWell: "",
    difficult: "",
    nextFocus: "",
    plannedTrack: emptyTrack(),
    actualTrack: emptyTrack(),
    conditions: emptyConditions(),
    timing: emptyTiming(),
    searchQuality: emptyQuality(),
    handlerAssessment: emptyHandler(),
    ruleEvents: [],
    manualExamScore: null,
    manualAssessmentComplete: false,
    rulebookVersion: "FCI-PO-2025",
    createdAt: now,
    updatedAt: now,
  };
}

export function trackSummary(track: IfhTrack) {
  const knownSteps = track.legs.filter((leg) => leg.lengthSteps !== null);
  const totalSteps = knownSteps.reduce(
    (sum, leg) => sum + (leg.lengthSteps ?? 0),
    0,
  );
  const measuredMeters = track.legs.filter((leg) => leg.lengthMeters !== null);
  const totalMeasuredMeters = measuredMeters.reduce(
    (sum, leg) => sum + (leg.lengthMeters ?? 0),
    0,
  );
  const estimatedMeters =
    track.estimatedStepLengthMeters !== null &&
    knownSteps.length === track.legs.length &&
    track.legs.length > 0
      ? totalSteps * track.estimatedStepLengthMeters
      : null;
  return {
    totalSteps:
      track.legs.length > 0 && knownSteps.length === track.legs.length
        ? totalSteps
        : null,
    totalMeasuredMeters:
      measuredMeters.length === track.legs.length && track.legs.length > 0
        ? totalMeasuredMeters
        : null,
    estimatedMeters,
    legs: track.legs.length,
    angles: track.angles.length,
    articles: track.articles.length,
    crossTracks: track.crossTracks.length,
  };
}

const minutesBetween = (start?: string, end?: string) => {
  if (!start || !end) return null;
  const duration = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(duration) && duration >= 0 ? duration / 60_000 : null;
};

export function calculateTiming(timing: IfhTiming, now = isoNow()) {
  const activeEnd = timing.searchEndedAt ?? now;
  return {
    agingMinutes: minutesBetween(timing.layingEndedAt, timing.actualStartAt),
    plannedAgingMinutes: minutesBetween(
      timing.layingEndedAt,
      timing.plannedStartAt,
    ),
    searchMinutes: minutesBetween(timing.actualStartAt, activeEnd),
    pauseMinutes: timing.pauses.reduce(
      (sum, pause) =>
        sum +
        (minutesBetween(pause.startedAt, pause.endedAt ?? activeEnd) ?? 0),
      0,
    ),
    running: Boolean(timing.actualStartAt && !timing.searchEndedAt),
  };
}

const DEDUCTIONS: Record<
  IfhRuleEvent["code"],
  { label: string; points: (count: number) => number }
> = {
  "extra-search-command-start": {
    label: "Zusätzliches Such-HZ am ersten Ansatz",
    points: (count) => Math.min(2, Math.max(0, count)) * 1.5,
  },
  "restart-after-recall": {
    label: "Erneuter Ansatz nach Rückruf",
    points: () => 4,
  },
  "command-before-sign": {
    label: "Such-HZ vor dem Abgangsschild",
    points: () => 1,
  },
  "missing-search-command": {
    label: "Fehlendes Such-HZ",
    points: () => 1,
  },
  "false-indication-line-end": {
    label: "Fehlanzeige, HF bleibt am Leinenende",
    points: () => 1,
  },
  "false-indication-handler-approach": {
    label: "Fehlanzeige mit Herantreten des HF",
    points: () => 2,
  },
  "visual-aid-resume": {
    label: "Sichtzeichen zum Aufnehmen der Fährte",
    points: () => 2,
  },
  "leaving-track-behaviour": {
    label: "Faseln, Urinieren oder Stuhlgang",
    points: () => 8,
  },
};

export function calculateFixedDeductions(events: IfhRuleEvent[]) {
  const unique = new Map<string, IfhRuleEvent>();
  for (const event of events) {
    const key = event.sourceEventKey.trim() || event.id;
    if (!unique.has(key)) unique.set(key, event);
  }
  const items = [...unique.values()].map((event) => ({
    eventId: event.id,
    sourceEventKey: event.sourceEventKey,
    code: event.code,
    label: DEDUCTIONS[event.code].label,
    points: DEDUCTIONS[event.code].points(event.count),
  }));
  return {
    items,
    total: items.reduce((sum, item) => sum + item.points, 0),
    duplicatesIgnored: events.length - items.length,
  };
}

export function getNotFoundArticleTreatment(
  level: IfhLevel | null,
  article: IfhArticle,
  missingAndNotFoundCount = 1,
) {
  if (article.evaluation.result !== "not-found") return null;
  if (!level) {
    return {
      status: "unresolved" as const,
      message: "Ohne Zielstufe ist keine PO-Sonderbehandlung ableitbar.",
    };
  }
  if (level === "FCI-IFH1") {
    return {
      status: "no-points" as const,
      message:
        "FCI-IFH1: Für den nicht gefundenen Gegenstand werden keine Punkte vergeben, da die Fährte selbst gelegt wird.",
    };
  }
  if (article.evaluation.notFoundByTrackLayer === true) {
    return {
      status: "no-deduction" as const,
      message:
        missingAndNotFoundCount > 1
          ? "Auch vom Fährtenleger nicht gefunden: keine Entwertung; bei mehreren solchen Gegenständen wird eine neue Fährte angeboten. Bei Ablehnung werden nur gefundene Gegenstände gewertet."
          : "Auch vom Fährtenleger nicht gefunden: Nach PO erfolgt keine Entwertung.",
    };
  }
  return {
    status: "unresolved" as const,
    message:
      article.evaluation.notFoundByTrackLayer === false
        ? "Der Gegenstand wurde vom Fährtenleger gefunden; die Ausnahme für nicht auffindbare Gegenstände greift nicht. Die Prüfungsbewertung bleibt manuell."
        : "Noch klären, ob auch der Fährtenleger den Gegenstand nicht finden konnte.",
  };
}

export function duplicateIfhSession(source: IfhSession): IfhSession {
  const copy = createIfhSession();
  return {
    ...copy,
    dog: source.dog,
    title: `${source.title || "Fährtentraining"} – Kopie`,
    mode: source.mode,
    targetLevel: source.targetLevel,
    location: source.location,
    trackLayer: source.trackLayer,
    trackOwnership: source.trackOwnership,
    focuses: [...source.focuses],
    goal: source.goal,
    plannedTrack: structuredClone(source.plannedTrack),
  };
}

const assessed = <T>(items: T[], result: (item: T) => string) =>
  items.filter((item) => result(item) !== "unrated");

export function calculateIfhProgress(sessions: IfhSession[]) {
  const completed = sessions.filter(
    (session) => session.status === "completed",
  );
  const articles = completed.flatMap((session) => session.actualTrack.articles);
  const ratedArticles = assessed(
    articles,
    (article) => article.evaluation.result,
  );
  const foundArticles = ratedArticles.filter(
    (article) => article.evaluation.result !== "not-found",
  );
  const independentArticles = foundArticles.filter(
    (article) => article.evaluation.result === "independent",
  );
  const angles = completed.flatMap((session) => session.actualTrack.angles);
  const ratedAngles = assessed(angles, (angle) => angle.evaluation.result);
  const safeAngles = ratedAngles.filter((angle) =>
    ["safe", "controlled"].includes(angle.evaluation.result),
  );
  const crossTracks = completed.flatMap(
    (session) => session.actualTrack.crossTracks,
  );
  const ratedCrossTracks = assessed(
    crossTracks,
    (crossTrack) => crossTrack.evaluation.result,
  );
  const passedCrossTracks = ratedCrossTracks.filter((crossTrack) =>
    ["no-reaction", "checked-stayed"].includes(crossTrack.evaluation.result),
  );
  const restarts = foundArticles.filter(
    (article) => article.evaluation.restart !== "unrated",
  );
  const directRestarts = restarts.filter(
    (article) => article.evaluation.restart === "direct",
  );
  const quality = completed.flatMap((session) =>
    [
      session.searchQuality.intensity,
      session.searchQuality.confidence,
      session.searchQuality.concentration,
      session.searchQuality.deepNose,
      session.searchQuality.consistency,
      session.searchQuality.independence,
      session.searchQuality.handlerCooperation,
    ].filter((value): value is Exclude<Assessment5, null> => value !== null),
  );
  const goals = completed.filter((session) => session.goalResult !== "unrated");
  const goalsReached = goals.filter(
    (session) => session.goalResult === "achieved",
  );
  const countBy = (values: string[]) =>
    values.reduce<Record<string, number>>((counts, value) => {
      const key = value.trim() || "Nicht angegeben";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  const materialCounts = countBy(
    ratedArticles.map((article) => article.material || "Nicht angegeben"),
  );
  const angleCounts = countBy(
    ratedAngles.map(
      (angle) =>
        `${angle.direction === "left" ? "Links" : "Rechts"} · ${angle.type === "acute" ? "spitz" : "rechtwinklig"}`,
    ),
  );
  const groundCounts = countBy(
    completed.flatMap((session) =>
      session.actualTrack.legs.map((leg) => leg.ground),
    ),
  );
  const helpCounts = {
    articles: ratedArticles.filter(
      (article) => article.evaluation.result === "assisted",
    ).length,
    angles: ratedAngles.filter((angle) => angle.evaluation.result === "helped")
      .length,
    crossTracks: ratedCrossTracks.filter(
      (crossing) => crossing.evaluation.result === "helped",
    ).length,
    ruleEvents: completed.reduce(
      (sum, session) => sum + session.ruleEvents.length,
      0,
    ),
  };
  const completedDistances = completed
    .map((session) => trackSummary(session.actualTrack).totalSteps)
    .filter((value): value is number => value !== null);
  const agingTimes = completed
    .map((session) => calculateTiming(session.timing).agingMinutes)
    .filter((value): value is number => value !== null);
  return {
    completed: completed.length,
    articles: {
      success: independentArticles.length,
      total: foundArticles.length,
    },
    articlesNotFound: ratedArticles.length - foundArticles.length,
    angles: { success: safeAngles.length, total: ratedAngles.length },
    crossTracks: {
      success: passedCrossTracks.length,
      total: ratedCrossTracks.length,
    },
    restarts: { success: directRestarts.length, total: restarts.length },
    goals: { success: goalsReached.length, total: goals.length },
    qualityAverage:
      quality.length > 0
        ? quality.reduce((sum, value) => sum + value, 0) / quality.length
        : null,
    materialCounts,
    angleCounts,
    groundCounts,
    helpCounts,
    averageSteps:
      completedDistances.length > 0
        ? completedDistances.reduce((sum, value) => sum + value, 0) /
          completedDistances.length
        : null,
    averageAgingMinutes:
      agingTimes.length > 0
        ? agingTimes.reduce((sum, value) => sum + value, 0) / agingTimes.length
        : null,
  };
}

export interface IfhSuggestion {
  id: string;
  title: string;
  observation: string;
  sampleSize: number;
  comparableConditions: string;
  focus: string;
  insufficient: boolean;
}

export function generateIfhSuggestions(
  sessions: IfhSession[],
): IfhSuggestion[] {
  const completed = sessions.filter(
    (session) => session.status === "completed",
  );
  const suggestions: IfhSuggestion[] = [];
  const left = completed.flatMap((session) =>
    session.actualTrack.angles.filter((angle) => angle.direction === "left"),
  );
  const ratedLeft = left.filter(
    (angle) => angle.evaluation.result !== "unrated",
  );
  const weakLeft = ratedLeft.filter((angle) =>
    ["circled", "lost", "helped"].includes(angle.evaluation.result),
  );
  if (weakLeft.length > 0) {
    suggestions.push({
      id: "left-angles",
      title: "Linke Winkel gezielt variieren",
      observation: `${weakLeft.length} von ${ratedLeft.length} bewerteten linken Winkeln benötigten Korrektur oder gingen verloren.`,
      sampleSize: ratedLeft.length,
      comparableConditions:
        "Bewertete linke Winkel aus abgeschlossenen Einheiten",
      focus: "Linke Winkel",
      insufficient: completed.length < 3 || ratedLeft.length < 5,
    });
  }
  const articles = completed.flatMap((session) => session.actualTrack.articles);
  const ratedRestarts = articles.filter(
    (article) => article.evaluation.restart !== "unrated",
  );
  const helpedRestarts = ratedRestarts.filter((article) =>
    ["hesitant", "extra-command", "no-restart"].includes(
      article.evaluation.restart,
    ),
  );
  if (helpedRestarts.length > 0) {
    suggestions.push({
      id: "restart",
      title: "Wiederansatz als Schwerpunkt",
      observation: `${helpedRestarts.length} von ${ratedRestarts.length} bewerteten Wiederansätzen waren nicht direkt.`,
      sampleSize: ratedRestarts.length,
      comparableConditions:
        "Bewertete Gegenstände aus abgeschlossenen Einheiten",
      focus: "Wiederansatz",
      insufficient: completed.length < 3 || ratedRestarts.length < 5,
    });
  }
  const thirds = completed.filter(
    (session) =>
      session.searchQuality.firstThird !== null &&
      session.searchQuality.lastThird !== null,
  );
  const lateDrop = thirds.filter(
    (session) =>
      (session.searchQuality.firstThird ?? 0) -
        (session.searchQuality.lastThird ?? 0) >=
      1,
  );
  if (lateDrop.length > 0) {
    suggestions.push({
      id: "last-third",
      title: "Letztes Drittel unter ähnlichen Bedingungen vergleichen",
      observation: `${lateDrop.length} von ${thirds.length} Einheiten zeigen einen Qualitätsabfall zum letzten Drittel.`,
      sampleSize: thirds.length,
      comparableConditions:
        "Einheiten mit Bewertung des ersten und letzten Drittels",
      focus: "Konzentration über die Strecke",
      insufficient: completed.length < 3 || thirds.length < 5,
    });
  }
  const foreign = completed.filter(
    (session) => session.trackOwnership === "foreign",
  );
  if (completed.length >= 3 && foreign.length < 3) {
    suggestions.push({
      id: "foreign-track",
      title: "Fremdfährte als mögliche Ergänzung",
      observation: `${foreign.length} von ${completed.length} abgeschlossenen Einheiten waren Fremdfährten.`,
      sampleSize: completed.length,
      comparableConditions: "Alle abgeschlossenen Einheiten",
      focus: "Fremdfährte",
      insufficient: false,
    });
  }
  const materialCounts = completed
    .flatMap((session) => session.actualTrack.articles)
    .filter((article) => article.evaluation.result !== "unrated")
    .reduce<Record<string, number>>((counts, article) => {
      const material = article.material.trim().toLocaleLowerCase("de-DE");
      if (material) counts[material] = (counts[material] ?? 0) + 1;
      return counts;
    }, {});
  const materialSample = Object.values(materialCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const rareMaterials = Object.entries(materialCounts)
    .filter(([, count]) => count < 2)
    .map(([material]) => material);
  if (rareMaterials.length > 0) {
    suggestions.push({
      id: "materials",
      title: "Selten trainierte Materialien ergänzen",
      observation: `${rareMaterials.join(", ")} wurden jeweils erst einmal bewertet.`,
      sampleSize: materialSample,
      comparableConditions:
        "Bewertete Gegenstände aus abgeschlossenen Einheiten",
      focus: "Gegenstände",
      insufficient: completed.length < 3 || materialSample < 5,
    });
  }
  return suggestions.map((suggestion) =>
    suggestion.insufficient
      ? {
          ...suggestion,
          title: "Bisher wenige Daten",
          observation: `${suggestion.observation} Für ein belastbares Muster werden mindestens drei Einheiten und fünf bewertete Ereignisse benötigt.`,
        }
      : suggestion,
  );
}
