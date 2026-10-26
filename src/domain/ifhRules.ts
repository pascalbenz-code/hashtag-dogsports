import { calculateTiming, trackSummary } from "./ifh";
import type {
  IfhLevel,
  IfhRuleMetadata,
  IfhSession,
  IfhTrack,
} from "./ifhTypes";

const ALL: IfhLevel[] = ["FCI-IFH1", "FCI-IFH2", "FCI-IFH3"];
const rule = (
  id: string,
  levels: IfhLevel[],
  description: string,
  type: IfhRuleMetadata["type"] = "requirement",
  pages = "67–76",
): IfhRuleMetadata => ({
  id,
  levels,
  description,
  type,
  source: "FCI-Prüfungsordnung 2025",
  pages,
  version: "FCI-PO-2025",
  verification: "pending-original",
});

export const IFH_RULES: IfhRuleMetadata[] = [
  rule("IFH1-OWN-TRACK", ["FCI-IFH1"], "FCI-IFH1 wird als Eigenfährte gelegt."),
  rule(
    "IFH2-FOREIGN-TRACK",
    ["FCI-IFH2"],
    "FCI-IFH2 wird als Fremdfährte gelegt.",
  ),
  rule(
    "IFH3-FOREIGN-TRACK",
    ["FCI-IFH3"],
    "FCI-IFH3 wird als Fremdfährte gelegt.",
  ),
  rule(
    "IFH1-STRUCTURE",
    ["FCI-IFH1"],
    "Mindestens 800 Schritte, 5 Schenkel, 4 Winkel und 3 Gegenstände.",
  ),
  rule(
    "IFH2-STRUCTURE",
    ["FCI-IFH2"],
    "Mindestens 1.200 Schritte, 7 Schenkel, 6 Winkel und 4 Gegenstände.",
  ),
  rule(
    "IFH3-STRUCTURE",
    ["FCI-IFH3"],
    "Mindestens 1.800 Schritte, 8 Schenkel, 7 Winkel und 7 Gegenstände.",
  ),
  rule(
    "IFH3-SEMICIRCLE",
    ["FCI-IFH3"],
    "Ein Schenkel ist ein Halbkreis mit ungefähr 30 m Radius.",
  ),
  rule("IFH1-ANGLES", ["FCI-IFH1"], "Vier Winkel mit etwa 90°."),
  rule(
    "IFH2-ANGLES",
    ["FCI-IFH2"],
    "Sechs Winkel: die ersten fünf etwa 90°, der letzte 30–60°.",
  ),
  rule(
    "IFH3-ANGLES",
    ["FCI-IFH3"],
    "Sieben Winkel, davon zwei mit 30–60°, die übrigen etwa 90°; Ein- und Ausgang des Halbkreises etwa 90°.",
  ),
  rule(
    "IFH1-ARTICLE-POINTS",
    ["FCI-IFH1"],
    "Drei Gegenstände mit jeweils 7 Gegenstandspunkten.",
  ),
  rule(
    "IFH2-ARTICLE-POINTS",
    ["FCI-IFH2"],
    "Vier Gegenstände: dreimal 5 und einmal 6 Gegenstandspunkte; der 6-Punkte-Gegenstand wird ohne eindeutigen Quellenbeleg keiner Position zugeordnet.",
  ),
  rule(
    "IFH3-ARTICLE-POINTS",
    ["FCI-IFH3"],
    "Sieben Gegenstände mit jeweils 3 Gegenstandspunkten.",
  ),
  rule(
    "IFH1-AGING",
    ["FCI-IFH1"],
    "Mindestliegezeit 90 Minuten; maximale Ausarbeitungszeit 30 Minuten.",
  ),
  rule(
    "IFH2-AGING",
    ["FCI-IFH2"],
    "Mindestliegezeit 120 Minuten; maximale Ausarbeitungszeit 30 Minuten.",
  ),
  rule(
    "IFH3-AGING",
    ["FCI-IFH3"],
    "Mindestliegezeit 180 Minuten; maximale Ausarbeitungszeit 45 Minuten.",
  ),
  rule("IFH-LINE", ALL, "Die Fährtenleine ist 10 Meter lang."),
  rule(
    "IFH-CROSS-TRACKS",
    ["FCI-IFH2", "FCI-IFH3"],
    "Zwei Verleitungen durch eine zweite Person, etwa 30 Minuten vor dem Ansatz.",
  ),
  rule(
    "IFH-CROSS-TRACK-TIME",
    ["FCI-IFH2", "FCI-IFH3"],
    "Die Verleitungen werden 30 Minuten vor dem Ansatz gelegt.",
  ),
  rule(
    "IFH-TIME-LIMIT",
    ALL,
    "Die maximale Ausarbeitungszeit beträgt in IFH1/2 30 Minuten und in IFH3 45 Minuten; die Sonderregel auf dem letzten Schenkel ist zu berücksichtigen.",
    "status",
  ),
  rule(
    "IFH-ANGLE-SPACING",
    ALL,
    "Zwischen Winkeln liegen mindestens 50 Schritte.",
  ),
  rule(
    "IFH-FIRST-ARTICLE",
    ALL,
    "Der erste Gegenstand liegt frühestens nach 100 Schritten.",
  ),
  rule(
    "IFH-ARTICLE-ANGLE-DISTANCE",
    ALL,
    "Gegenstände liegen nicht innerhalb von 20 Schritten vor oder nach Winkeln.",
  ),
  rule(
    "IFH-LAST-ARTICLE",
    ALL,
    "Der letzte Gegenstand liegt am Ende; danach geht der Fährtenleger mindestens 10 Schritte gerade weiter.",
  ),
  rule("IFH-ARTICLE-DIMENSIONS", ALL, "Gegenstandsmaße: 10 × 2–3 × 0,5–1 cm."),
  rule(
    "IFH-ARTICLE-MATERIALS",
    ALL,
    "Innerhalb einer Fährte werden unterschiedliche Gegenstandsmaterialien verwendet.",
  ),
  rule(
    "IFH-ARTICLE-CARRIED",
    ALL,
    "Gegenstände wurden mindestens 30 Minuten vom zuständigen Fährtenleger getragen.",
  ),
  rule(
    "IFH-CROSS-TRACK-POSITION",
    ["FCI-IFH2", "FCI-IFH3"],
    "Verleitungen liegen nicht auf erstem oder letztem Schenkel, nicht zweimal auf demselben Schenkel und mindestens 40 Schritte von Winkeln entfernt.",
  ),
  rule(
    "IFH-CROSS-TRACK-ANGLE",
    ["FCI-IFH2", "FCI-IFH3"],
    "Der Kreuzungswinkel einer Verleitung beträgt mindestens 60°.",
  ),
  rule(
    "IFH-DEDUCT-EXTRA-START",
    ALL,
    "Zusätzliches Such-HZ am ersten Ansatz: je −1,5 Punkte, höchstens zwei Zusatz-HZ.",
    "fixed-deduction",
  ),
  rule(
    "IFH-DEDUCT-RESTART",
    ALL,
    "Erneuter Ansatz nach Rückruf unter den beschriebenen Voraussetzungen: −4 Punkte.",
    "fixed-deduction",
  ),
  rule(
    "IFH-DEDUCT-COMMAND",
    ALL,
    "Such-HZ vor dem Abgangsschild oder fehlendes HZ: −1 Punkt.",
    "fixed-deduction",
  ),
  rule(
    "IFH-DEDUCT-FALSE-INDICATION",
    ALL,
    "Fehlanzeige: −1 Punkt am Leinenende mit zusätzlichem HZ; −2 Punkte beim Herantreten.",
    "fixed-deduction",
  ),
  rule(
    "IFH-DEDUCT-VISUAL-AID",
    ALL,
    "Sichtzeichen zum Aufnehmen der Fährte: −2 Punkte.",
    "fixed-deduction",
  ),
  rule(
    "IFH-QUALITATIVE-SEARCH",
    ALL,
    "Suchintensität, Selbstvertrauen, Konzentration, Nasenarbeit, Gleichmäßigkeit, Selbstständigkeit und Zusammenarbeit werden qualitativ bewertet.",
    "qualitative",
  ),
  rule(
    "IFH-ANGLE-CONTROL",
    ALL,
    "Kontrolle am Winkel ohne Verlassen der Fährte wird nicht automatisch als Fehler gewertet.",
    "qualitative",
  ),
  rule(
    "IFH-CROSS-TRACK-CONTROL",
    ALL,
    "Prüfen einer Verleitung bei Verbleib auf der Fährte wird nicht automatisch als Fehler gewertet.",
    "qualitative",
  ),
  rule(
    "IFH-ARTICLE-INDICATION",
    ALL,
    "Wechsel der Verweisposition, Zurückschauen bei gehaltener Position und bis 30° schräges Verweisen sind nicht automatisch fehlerhaft; stark unterstütztes Verweisen gilt als überlaufen.",
    "qualitative",
  ),
  rule(
    "IFH-ARTICLE-NOT-FOUND",
    ALL,
    "Nicht auffindbare Gegenstände werden separat dokumentiert und benötigen die stufenspezifische Sonderbehandlung der Originalquelle; sie werden nicht pauschal dem Hund zugerechnet.",
    "status",
  ),
  rule(
    "IFH-PAGE70-GUIDE",
    ALL,
    "Skizze und Positionstabellen sind Orientierungshilfen unter Berücksichtigung von Wind, Hundegröße und Verweisposition; keine verbindliche automatische Fotobewertung.",
    "qualitative",
    "70",
  ),
  rule(
    "IFH-STATUS",
    ALL,
    "Abbruch nach PO und Disqualifikation sind getrennte Ergebnisstatus.",
    "status",
  ),
];

export type RuleCheckStatus = "conform" | "deviation" | "not-checkable";
export interface IfhRuleCheck {
  ruleId: string;
  label: string;
  status: RuleCheckStatus;
  detail: string;
}

const levelProfile: Record<
  IfhLevel,
  {
    steps: number;
    legs: number;
    angles: number;
    articles: number;
    aging: number;
    search: number;
    ownership: "own" | "foreign";
    crossTracks: number;
  }
> = {
  "FCI-IFH1": {
    steps: 800,
    legs: 5,
    angles: 4,
    articles: 3,
    aging: 90,
    search: 30,
    ownership: "own",
    crossTracks: 0,
  },
  "FCI-IFH2": {
    steps: 1200,
    legs: 7,
    angles: 6,
    articles: 4,
    aging: 120,
    search: 30,
    ownership: "foreign",
    crossTracks: 2,
  },
  "FCI-IFH3": {
    steps: 1800,
    legs: 8,
    angles: 7,
    articles: 7,
    aging: 180,
    search: 45,
    ownership: "foreign",
    crossTracks: 2,
  },
};

const check = (
  ruleId: string,
  label: string,
  value: boolean | null,
  success: string,
  failure: string,
  missing = "Nicht genügend Daten eingegeben.",
): IfhRuleCheck => ({
  ruleId,
  label,
  status: value === null ? "not-checkable" : value ? "conform" : "deviation",
  detail: value === null ? missing : value ? success : failure,
});

const globalPosition = (
  track: IfhTrack,
  legId: string,
  position: number | null,
) => {
  if (position === null) return null;
  const sorted = [...track.legs].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((leg) => leg.id === legId);
  if (
    index < 0 ||
    sorted.slice(0, index).some((leg) => leg.lengthSteps === null)
  )
    return null;
  return (
    sorted
      .slice(0, index)
      .reduce((sum, leg) => sum + (leg.lengthSteps ?? 0), 0) + position
  );
};

export function validateIfhStructure(session: IfhSession): IfhRuleCheck[] {
  if (!session.targetLevel) return [];
  const level = session.targetLevel;
  const profile = levelProfile[level];
  const track =
    session.actualTrack.legs.length > 0
      ? session.actualTrack
      : session.plannedTrack;
  const summary = trackSummary(track);
  const result: IfhRuleCheck[] = [];
  const timing = calculateTiming(session.timing, session.timing.searchEndedAt);
  result.push(
    check(
      level === "FCI-IFH1"
        ? "IFH1-OWN-TRACK"
        : `${level.replace("FCI-", "")}-FOREIGN-TRACK`,
      "Fährtenart",
      session.trackOwnership
        ? session.trackOwnership === profile.ownership
        : null,
      profile.ownership === "own"
        ? "Eigenfährte erfasst."
        : "Fremdfährte erfasst.",
      profile.ownership === "own"
        ? "Für diese Stufe ist eine Eigenfährte vorgesehen."
        : "Für diese Stufe ist eine Fremdfährte vorgesehen.",
    ),
  );
  const anglesKnown =
    track.angles.length === profile.angles &&
    track.angles.every((angle) => angle.degrees !== null);
  const angleProfileMatches = (() => {
    if (!anglesKnown) return null;
    if (level === "FCI-IFH1")
      return track.angles.every((angle) => angle.type === "right");
    if (level === "FCI-IFH2")
      return (
        track.angles.slice(0, 5).every((angle) => angle.type === "right") &&
        track.angles[5].type === "acute" &&
        track.angles[5].degrees! >= 30 &&
        track.angles[5].degrees! <= 60
      );
    const acute = track.angles.filter((angle) => angle.type === "acute");
    return (
      acute.length === 2 &&
      acute.every((angle) => angle.degrees! >= 30 && angle.degrees! <= 60) &&
      track.angles.filter((angle) => angle.type === "right").length === 5
    );
  })();
  result.push(
    check(
      `${level.replace("FCI-", "")}-ANGLES`,
      "Winkelprofil",
      angleProfileMatches,
      "Anzahl und Typen der Winkel entsprechen dem Zielprofil.",
      "Anzahl oder Typen der Winkel weichen vom Zielprofil ab.",
      "Für die Winkelprüfung werden alle Winkel einschließlich Gradzahl benötigt. ‚Etwa 90°‘ wird nicht in eine erfundene feste Toleranz umgewandelt.",
    ),
  );
  const structureKnown = summary.totalSteps !== null && track.legs.length > 0;
  result.push(
    check(
      `${level.replace("FCI-", "")}-STRUCTURE`,
      "Grundaufbau",
      structureKnown
        ? summary.totalSteps! >= profile.steps &&
            summary.legs === profile.legs &&
            summary.angles === profile.angles &&
            summary.articles === profile.articles
        : null,
      `${summary.totalSteps} Schritte, ${summary.legs} Schenkel, ${summary.angles} Winkel und ${summary.articles} Gegenstände entsprechen dem Profil.`,
      `Zielprofil: mindestens ${profile.steps} Schritte, ${profile.legs} Schenkel, ${profile.angles} Winkel und ${profile.articles} Gegenstände.`,
    ),
  );
  result.push({
    ruleId: "IFH-TIME-LIMIT",
    label: "Ausarbeitungszeit",
    status:
      timing.searchMinutes === null
        ? "not-checkable"
        : timing.searchMinutes <= profile.search
          ? "conform"
          : "not-checkable",
    detail:
      timing.searchMinutes === null
        ? "Tatsächlicher Ansatz und Suchende werden benötigt."
        : timing.searchMinutes <= profile.search
          ? `${Math.round(timing.searchMinutes)} Minuten innerhalb des hinterlegten Zeitlimits.`
          : `${Math.round(timing.searchMinutes)} Minuten überschreiten ${profile.search} Minuten. Die Sonderregel für den letzten Schenkel muss manuell geprüft werden; es erfolgt kein automatischer Abbruch.`,
  });
  if (level === "FCI-IFH3") {
    const semicircles = track.legs.filter((leg) => leg.shape === "semicircle");
    result.push(
      check(
        "IFH3-SEMICIRCLE",
        "Halbkreis",
        track.legs.length
          ? semicircles.length === 1 &&
              semicircles[0].semicircleRadiusMeters !== null &&
              semicircles[0].semicircleRadiusMeters === 30
          : null,
        "Ein Halbkreis mit ungefähr 30 m Radius ist erfasst.",
        "Erforderlich ist ein Halbkreis-Schenkel mit ungefähr 30 m Radius.",
      ),
    );
  }
  result.push(
    check(
      `${level.replace("FCI-", "")}-AGING`,
      "Liegezeit",
      timing.agingMinutes === null
        ? null
        : timing.agingMinutes >= profile.aging,
      `Liegezeit ${Math.round(timing.agingMinutes ?? 0)} Minuten.`,
      `Mindestens ${profile.aging} Minuten vorgesehen; erfasst sind ${Math.round(timing.agingMinutes ?? 0)} Minuten.`,
      "Legeende und tatsächlicher Ansatz werden benötigt. Berechnungskonvention: Legeende bis Ansatz; die Originalquelle ist hierzu noch visuell zu prüfen.",
    ),
    check(
      "IFH-LINE",
      "Fährtenleine",
      session.handlerAssessment.lineLengthMeters === null
        ? null
        : session.handlerAssessment.lineLengthMeters === 10,
      "10-Meter-Fährtenleine erfasst.",
      "Die erfasste Leinenlänge weicht von 10 Metern ab.",
    ),
  );
  if (level !== "FCI-IFH1") {
    result.push(
      check(
        "IFH-CROSS-TRACKS",
        "Verleitungen",
        track.crossTracks.length
          ? track.crossTracks.length === profile.crossTracks
          : null,
        "Zwei Verleitungen erfasst.",
        "Für das Zielprofil sind zwei Verleitungen vorgesehen.",
      ),
    );
    const actualStart = session.timing.actualStartAt;
    result.push(
      check(
        "IFH-CROSS-TRACK-TIME",
        "Legezeit der Verleitungen",
        !actualStart ||
          track.crossTracks.length !== 2 ||
          track.crossTracks.some((crossing) => !crossing.laidAt)
          ? null
          : track.crossTracks.every(
              (crossing) =>
                (new Date(actualStart).getTime() -
                  new Date(crossing.laidAt!).getTime()) /
                  60_000 >=
                30,
            ),
        "Beide Verleitungen wurden mindestens 30 Minuten vor dem Ansatz gelegt.",
        "Mindestens eine Verleitung wurde weniger als 30 Minuten vor dem Ansatz gelegt.",
      ),
    );
  }
  const anglePositions = track.angles
    .map((angle) => globalPosition(track, angle.legId, angle.positionSteps))
    .sort((a, b) => (a ?? 0) - (b ?? 0));
  result.push(
    check(
      "IFH-ANGLE-SPACING",
      "Abstand zwischen Winkeln",
      anglePositions.length < 2 ||
        anglePositions.some((position) => position === null)
        ? null
        : anglePositions.every((position, index) =>
            index === 0 ? true : position! - anglePositions[index - 1]! >= 50,
          ),
      "Alle bekannten Winkelabstände betragen mindestens 50 Schritte.",
      "Mindestens ein Winkelabstand liegt unter 50 Schritten.",
    ),
  );
  const articlePositions = track.articles
    .map((article) =>
      globalPosition(track, article.legId, article.positionSteps),
    )
    .sort((a, b) => (a ?? 0) - (b ?? 0));
  result.push(
    check(
      "IFH-FIRST-ARTICLE",
      "Erster Gegenstand",
      articlePositions.length === 0 || articlePositions[0] === null
        ? null
        : articlePositions[0] >= 100,
      "Der erste Gegenstand liegt frühestens nach 100 Schritten.",
      "Der erste Gegenstand liegt vor Schritt 100.",
    ),
    check(
      "IFH-ARTICLE-ANGLE-DISTANCE",
      "Gegenstandsabstand zu Winkeln",
      articlePositions.length === 0 ||
        articlePositions.some((position) => position === null) ||
        anglePositions.some((position) => position === null)
        ? null
        : articlePositions.every((article) =>
            anglePositions.every((angle) => Math.abs(article! - angle!) > 20),
          ),
      "Alle Gegenstände liegen mehr als 20 Schritte von Winkeln entfernt.",
      "Mindestens ein Gegenstand liegt innerhalb von 20 Schritten vor oder nach einem Winkel.",
    ),
  );
  const lastLeg = [...track.legs].sort((a, b) => a.order - b.order).at(-1);
  const lastArticle = [...track.articles]
    .sort((a, b) => a.number - b.number)
    .at(-1);
  result.push(
    check(
      "IFH-LAST-ARTICLE",
      "Letzter Gegenstand und Nachgang",
      !lastLeg ||
        !lastArticle ||
        lastLeg.lengthSteps === null ||
        lastArticle.positionSteps === null ||
        track.postLastArticleStraightSteps === null
        ? null
        : lastArticle.legId === lastLeg.id &&
            lastArticle.positionSteps === lastLeg.lengthSteps &&
            track.postLastArticleStraightSteps >= 10,
      "Letzter Gegenstand am Ende und mindestens 10 Schritte gerader Nachgang erfasst.",
      "Position des letzten Gegenstands oder gerader Nachgang weichen ab.",
    ),
  );
  const dimensionsKnown =
    track.articles.length > 0 &&
    track.articles.every((article) =>
      Object.values(article.dimensionsCm).every((value) => value !== null),
    );
  result.push(
    check(
      "IFH-ARTICLE-DIMENSIONS",
      "Gegenstandsmaße",
      !dimensionsKnown
        ? null
        : track.articles.every(
            (article) =>
              article.dimensionsCm.length === 10 &&
              article.dimensionsCm.width! >= 2 &&
              article.dimensionsCm.width! <= 3 &&
              article.dimensionsCm.height! >= 0.5 &&
              article.dimensionsCm.height! <= 1,
          ),
      "Alle Maße entsprechen den hinterlegten Grenzen.",
      "Mindestens ein Gegenstand weicht von 10 × 2–3 × 0,5–1 cm ab.",
    ),
    check(
      "IFH-ARTICLE-MATERIALS",
      "Gegenstandsmaterialien",
      track.articles.length < 2 ||
        track.articles.some((article) => !article.material.trim())
        ? null
        : new Set(
            track.articles.map((article) =>
              article.material.trim().toLocaleLowerCase("de-DE"),
            ),
          ).size === track.articles.length,
      "Unterschiedliche Materialien erfasst.",
      "Mindestens zwei Gegenstände verwenden dasselbe Material.",
    ),
  );
  const carriedKnown =
    track.articles.length > 0 &&
    track.articles.every((article) => article.carriedFrom && article.laidAt);
  result.push(
    check(
      "IFH-ARTICLE-CARRIED",
      "Tragezeit der Gegenstände",
      !carriedKnown
        ? null
        : track.articles.every(
            (article) =>
              (new Date(article.laidAt!).getTime() -
                new Date(article.carriedFrom!).getTime()) /
                60_000 >=
              30,
          ),
      "Mindestens 30 Minuten Tragezeit je Gegenstand erfasst.",
      "Mindestens ein Gegenstand wurde weniger als 30 Minuten getragen.",
    ),
  );
  if (level !== "FCI-IFH1") {
    const firstLeg = [...track.legs].sort((a, b) => a.order - b.order)[0];
    const crossingLegIds = track.crossTracks.map((crossing) => crossing.legId);
    result.push(
      check(
        "IFH-CROSS-TRACK-POSITION",
        "Position der Verleitungen",
        track.crossTracks.length === 0 || !firstLeg || !lastLeg
          ? null
          : crossingLegIds.every(
              (legId) => legId !== firstLeg.id && legId !== lastLeg.id,
            ) &&
              new Set(crossingLegIds).size === crossingLegIds.length &&
              track.crossTracks.every((crossing) => {
                const crossingPosition = globalPosition(
                  track,
                  crossing.legId,
                  crossing.positionSteps,
                );
                return (
                  crossingPosition !== null &&
                  anglePositions.every(
                    (angle) =>
                      angle !== null && Math.abs(crossingPosition - angle) > 40,
                  )
                );
              }),
        "Verleitungen liegen auf unterschiedlichen mittleren Schenkeln und mehr als 40 Schritte von Winkeln entfernt.",
        "Mindestens eine Positionsregel für Verleitungen ist nicht erfüllt.",
      ),
      check(
        "IFH-CROSS-TRACK-ANGLE",
        "Kreuzungswinkel der Verleitungen",
        track.crossTracks.length === 0 ||
          track.crossTracks.some((crossing) => crossing.crossingAngle === null)
          ? null
          : track.crossTracks.every(
              (crossing) => crossing.crossingAngle! >= 60,
            ),
        "Alle Kreuzungswinkel betragen mindestens 60°.",
        "Mindestens ein Kreuzungswinkel liegt unter 60°.",
      ),
    );
  }
  return result;
}

export const ifhProfile = (level: IfhLevel) => levelProfile[level];
