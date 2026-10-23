import {
  type JudgingCriterion,
  type JudgingExercise,
  type JudgingLevelDefinition,
} from "./judging";

export type IbghLevel = "FCI-IBGH1" | "FCI-IBGH2" | "FCI-IBGH3";
export type Ibgh3Variant = 1 | 2 | 3 | 4 | 5;

export const IBGH_LEVELS: IbghLevel[] = [
  "FCI-IBGH1",
  "FCI-IBGH2",
  "FCI-IBGH3",
];
export const IBGH3_VARIANTS: Ibgh3Variant[] = [1, 2, 3, 4, 5];

type CriterionOptions = Pick<
  JudgingCriterion,
  "element" | "maxFaults" | "rule"
>;

const criterion = (
  exerciseId: string,
  id: string,
  label: string,
  description: string,
  options: CriterionOptions = {},
): JudgingCriterion => ({
  id: `${exerciseId}-${id}`,
  label,
  description,
  ...options,
});

const generalExecution = (
  exerciseId: string,
  maxPoints: JudgingExercise["maxPoints"],
): JudgingCriterion =>
  criterion(
    exerciseId,
    "allgemeine-ausfuehrung",
    "Allgemeine HZ- und Ausführungsfehler",
    "Ein zusätzliches Hörzeichen: −1,5 Punkte; zwei zusätzliche Hörzeichen: −2,5 Punkte. Erfolgt nach insgesamt drei Hörzeichen keine Ausführung, erhält die Übung 0 Punkte. Eine Ausführung ohne gefordertes Hörzeichen kostet −2 Punkte; dies gilt nicht für ausdrücklich ohne HZ verlangte Handlungen wie das selbstständige Sitzen beim Halt. Angst, Stress, unerlaubte Hilfen, fehlerhafte Grundstellungen oder Zeittakte sind qualitativ zu entwerten. Das Nachholen einer vollständig vergessenen Übung ist allein kein Fehler.",
    {
      element: "Sonderregel",
      maxFaults: maxPoints,
      rule: "−1,5 / −2,5 / bis 0 Punkte",
    },
  );

const heelworkCriteria = (
  exerciseId: string,
  maxPoints: 20 | 30,
  withLeash: boolean,
): JudgingCriterion[] => [
  criterion(
    exerciseId,
    "grundstellungen",
    "Anfangs- und Endgrundstellung",
    "Der Hund sitzt gerade und aufmerksam links am Hundeführer; das Schulterblatt befindet sich auf Kniehöhe. Die abschließende Grundstellung wird korrekt eingenommen.",
    { element: "Sekundär", rule: "Qualitativ" },
  ),
  criterion(
    exerciseId,
    "position",
    "Position während der Arbeit",
    `Korrekte Position ${withLeash ? "an lockerer Leine" : "ohne Leine"}. Vorlaufen, Zurückbleiben und seitliches Abweichen sind fehlerhaft.`,
    { element: "Primär", rule: "Qualitativ" },
  ),
  criterion(
    exerciseId,
    "ausdruck",
    "Ausdruck und Arbeitsweise",
    "Motivierte, freie, konzentrierte und selbstsichere Arbeit. Unaufmerksamkeit sowie unsicheres, verkrampftes oder abnormales Laufen werden entwertet.",
    { element: "Primär", rule: "Qualitativ" },
  ),
  criterion(
    exerciseId,
    "laufschema",
    "Laufschema, Wendungen, Gangarten und Halte",
    "Das vorgeschriebene Schema ist vollständig zu zeigen. Gangartwechsel erfolgen deutlich und ohne Zwischenschritte; beim Halt sitzt der Hund direkt und selbstständig. Soweit gefordert, wird die Personengruppe korrekt durchlaufen.",
    { rule: "Qualitativ" },
  ),
  generalExecution(exerciseId, maxPoints),
];

const positionExerciseCriteria = (
  exerciseId: string,
  maxPoints: 10 | 15,
  position: "Sitz" | "Platz" | "Steh",
  recall: boolean,
  level: 1 | 2 | 3,
): JudgingCriterion[] => {
  const half = maxPoints / 2;
  const wrongPositions =
    position === "Sitz"
      ? "steht oder liegt"
      : position === "Platz"
        ? "sitzt oder steht"
        : "sitzt oder liegt";
  const items: JudgingCriterion[] = [
    criterion(
      exerciseId,
      "entwicklung",
      "Teil 1: Grundstellung und Entwicklung",
      `Die ersten ${half.toLocaleString("de-DE")} Punkte umfassen Anfangsgrundstellung, eine Entwicklung über 10–15 Schritte und die Vorbereitung des Hörzeichens. ${level === 1 ? "In FCI-IBGH1 darf der Hundeführer vor dem Hörzeichen anhalten." : "Der Hundeführer verändert beim Hörzeichen seinen Bewegungsablauf nicht und sieht sich nicht um."}`,
      { element: "Sekundär", rule: `Teilbudget ${half} P.` },
    ),
    criterion(
      exerciseId,
      "position-hz",
      `Teil 1: ${position} und HZ-Annahme`,
      `Der Hund nimmt die Position ${position} direkt, gerade, entschlossen und selbstsicher ein. Dieses primäre Element gehört zum ersten 50-%-Teilbudget.`,
      { element: "Primär", rule: `Teilbudget ${half} P.` },
    ),
    criterion(
      exerciseId,
      "aufmerksamkeit",
      recall
        ? "Teil 2: Aufmerksamkeit beim Entfernen"
        : "Teil 2: Aufmerksamkeit und Abschluss",
      `${recall ? "Der Hund bleibt ruhig und aufmerksam liegen, während sich der Hundeführer mindestens 30 Schritte entfernt." : `Der Hund bleibt ruhig und aufmerksam in der Position ${position}; der Hundeführer entfernt sich mindestens 15 Schritte, kehrt zurück und beendet die Übung in korrekter Grundstellung.`} Dieses Element gehört zum zweiten 50-%-Teilbudget.`,
      { element: "Sekundär", rule: `Teilbudget ${half} P.` },
    ),
  ];
  if (recall) {
    items.push(
      criterion(
        exerciseId,
        "zulauf",
        "Teil 2: Zulauf, Vorsitz und Endgrundstellung",
        "Freudiger, zielstrebiger und direkter Zulauf. Der Hund zeigt einen dichten, geraden Vorsitz oder nimmt direkt die Endgrundstellung ein; die abschließende Grundstellung ist korrekt.",
        { element: "Primär", rule: `Teilbudget ${half} P.` },
      ),
    );
  }
  items.push(
    criterion(
      exerciseId,
      "fehlposition",
      `Fehlposition: Hund ${wrongPositions}`,
      `Bei einer falschen Position entfallen ${half.toLocaleString("de-DE")} Punkte. Weitere Ausführungsfehler werden zusätzlich abgezogen; höchstens 50 % der Übungspunkte verbleiben.`,
      { element: "Sonderregel", maxFaults: half, rule: `fest −${half} P.` },
    ),
  );
  if (recall) {
    items.push(
      criterion(
        exerciseId,
        "kein-herankommen",
        "Kein Herankommen nach zwei Zusatz-HZ",
        "Kommt der Hund auch nach dem zweiten Zusatz-Hörzeichen nicht, wird er abgeholt. Die gesamte Übung erhält 0 Punkte; die Prüfung wird anschließend fortgesetzt.",
        {
          element: "Sonderregel",
          maxFaults: maxPoints,
          rule: "Gesamtübung 0 P.",
        },
      ),
    );
  }
  items.push(generalExecution(exerciseId, maxPoints));
  return items;
};

const distractionCriteria = (
  exerciseId: string,
  level: 1 | 2 | 3,
): JudgingCriterion[] => {
  const distance = level === 1 ? 10 : level === 2 ? 20 : 30;
  const visibility =
    level === 1
      ? "seitwärts zum Hund und in Sichtweite"
      : level === 2
        ? "mit dem Rücken zum Hund und in Sichtweite"
        : "außer Sicht des Hundes";
  const completedExercise = level === 1 ? 3 : level === 2 ? 4 : 5;
  return [
    criterion(
      exerciseId,
      "grundstellungen",
      "Anfangs- und Endgrundstellung",
      "Der Hund nimmt die Grundstellungen korrekt ein.",
      { element: "Sekundär", rule: "Qualitativ" },
    ),
    criterion(
      exerciseId,
      "sicheres-liegen",
      "Sicheres Liegen und Ruhe",
      `Der Hund liegt ruhig auf derselben Stelle. Der Hundeführer befindet sich mindestens ${distance} m entfernt, ${visibility}.`,
      { element: "Primär", rule: "Qualitativ" },
    ),
    criterion(
      exerciseId,
      "verlassen-spaet",
      "Ablageplatz mehr als 3 m verlassen – Teilbewertung möglich",
      `Hat der andere Hund Übung ${completedExercise} bereits beendet, werden 5 Punkte abgezogen; weitere Fehler kommen hinzu. Ab diesem Zeitpunkt ist eine Teilbewertung möglich.`,
      { element: "Sonderregel", maxFaults: 5, rule: "fest −5 P." },
    ),
    criterion(
      exerciseId,
      "verlassen-frueh",
      "Ablageplatz mehr als 3 m zu früh verlassen",
      `Verlässt der Hund den Platz, bevor der andere Hund Übung ${completedExercise} beendet hat, ist keine Teilbewertung vorgesehen. Für eine Nullbewertung sind 10 Fehlerpunkte einzutragen.`,
      { element: "Sonderregel", maxFaults: 10, rule: "Gesamtübung 0 P." },
    ),
    criterion(
      exerciseId,
      "position-unruhe",
      "Bis 3 m verlassen, Sitzen oder Stehen",
      "Verlassen innerhalb von 3 m sowie Sitzen oder Stehen führen zu einer Entwertung von bis zu 50 %.",
      { element: "Sonderregel", maxFaults: 5, rule: "bis −5 P." },
    ),
    criterion(
      exerciseId,
      "entgegenkommen",
      "Entgegenkommen beim Abholen",
      "Kommt der Hund dem Hundeführer beim Abholen entgegen, können bis zu 3 Punkte abgezogen werden.",
      { element: "Sonderregel", maxFaults: 3, rule: "bis −3 P." },
    ),
    criterion(
      exerciseId,
      "sonstige-fehler",
      "Sonstige Unruhe, Hilfen und zu frühes Aufstehen",
      "Weitere Unruhe, unerlaubte Hilfen oder zu frühes Aufstehen werden qualitativ bewertet, soweit keine der konkreten Sonderregeln greift.",
      { rule: "Qualitativ" },
    ),
    generalExecution(exerciseId, 10),
  ];
};

const retrieveCriteria = (
  exerciseId: string,
  maxPoints: 10 | 15,
): JudgingCriterion[] => [
  criterion(exerciseId, "grundstellungen", "Anfangs- und Endgrundstellung", "Korrekte Ausgangs- und Abschlussposition. Der Hund beginnt erst nach dem Hörzeichen und nachdem das Bringholz ruhig liegt.", { element: "Sekundär", rule: "Qualitativ" }),
  criterion(exerciseId, "hin-ruecklauf", "Hin- und Rücklauf", "Direkte, zielstrebige und motivierte Hin- und Rückläufe mit gleichbleibender Arbeitsbereitschaft.", { element: "Primär", rule: "Qualitativ" }),
  criterion(exerciseId, "aufnahme-tragen", "Aufnahme und Tragen", "Sofortige Aufnahme und ruhiges, festes Halten. Fallenlassen, Spielen oder Knautschen sind fehlerhaft.", { element: "Primär", rule: "Qualitativ" }),
  criterion(exerciseId, "praesentation-abgabe", "Vorsitz, Präsentation und Abgabe", "Dichter, gerader Vorsitz oder korrekte direkte Endgrundstellung. Das Holz wird frei und selbstsicher präsentiert, ohne Anstoßen gehalten und bereitwillig abgegeben.", { element: "Primär", rule: "Qualitativ" }),
  criterion(exerciseId, "beginn-ohne-hz", "Selbstständiger Beginn ohne HZ", "Beginnt der Hund selbstständig, sind abhängig vom Zeitpunkt bis zu 2 Punkte abzuziehen.", { element: "Sonderregel", maxFaults: 2, rule: "bis −2 P." }),
  criterion(exerciseId, "nichtabgabe", "Keine Abgabe nach insgesamt drei HZ", "Gibt der Hund das Bringholz nach dem regulären und zwei zusätzlichen Hörzeichen nicht ab, folgt eine Disqualifikation wegen Ungehorsams. Das Punktefeld bildet den vollständigen Übungsabzug ab; die Disqualifikation ist zusätzlich zu berücksichtigen.", { element: "Sonderregel", maxFaults: maxPoints, rule: "Disqualifikation" }),
  criterion(exerciseId, "endgrundstellung-zusatz-hz", "Zusatz-HZ zur Endgrundstellung", "Für den Wechsel vom Vorsitz in die Endgrundstellung: ein Zusatz-HZ −1,5 Punkte, zwei Zusatz-HZ −2,5 Punkte. Erfolgt auch danach keine Grundstellung, ist die Gesamtübung ausdrücklich mangelhaft, jedoch nicht automatisch 0 Punkte.", { element: "Sonderregel", maxFaults: maxPoints, rule: "−1,5 / −2,5 P.; ggf. mangelhaft" }),
  generalExecution(exerciseId, maxPoints),
];

const sendAwayCriteria = (exerciseId: string): JudgingCriterion[] => [
  criterion(exerciseId, "entwicklung", "Teil 1: Grundstellung und Entwicklung", "Anfangsgrundstellung und Entwicklung über 10–15 Schritte. Vorprellen ist fehlerhaft.", { element: "Teilbudget", rule: "Teilbudget 5 P." }),
  criterion(exerciseId, "vorauslaufen", "Teil 1: Vorauslaufen", "Direktes, gerades und schnelles Vorauslaufen über mindestens 30 Schritte.", { element: "Primär", rule: "Teilbudget 5 P." }),
  criterion(exerciseId, "hinlegen-abschluss", "Teil 2: Hinlegen und Endgrundstellung", "Sofortige Annahme des Platz-Hörzeichens, ruhiges Liegen und nach dem Abholen schnelles, gerades Aufsetzen in die Endgrundstellung.", { element: "Primär", rule: "Teilbudget 5 P." }),
  criterion(exerciseId, "distanz-stoppen", "Distanz unter 50 % oder kein Stoppen nach drei HZ", "Bei weniger als 50 % der geforderten Distanz oder wenn der Hund mit insgesamt drei Hörzeichen nicht stoppt, erhält die gesamte Übung 0 Punkte.", { element: "Sonderregel", maxFaults: 10, rule: "Gesamtübung 0 P." }),
  criterion(exerciseId, "hinlegen-zusatz-hz", "Zusatz-HZ zum Hinlegen", "Stoppt der Hund auf das erste HZ: Hinlegen auf erstes Zusatz-HZ −1,5, auf zweites Zusatz-HZ −2,5, danach weiterhin kein Liegen −3,5 Punkte.", { element: "Sonderregel", maxFaults: 3.5, rule: "−1,5 / −2,5 / −3,5 P." }),
  criterion(exerciseId, "stoppen-zusatz-hz", "Zusatz-HZ zum Stoppen", "Stoppt und legt sich der Hund erst auf das erste Zusatz-HZ, werden 2,5 Punkte abgezogen; beim zweiten Zusatz-HZ 3,5 Punkte.", { element: "Sonderregel", maxFaults: 3.5, rule: "−2,5 / −3,5 P." }),
  criterion(exerciseId, "erneutes-aufstehen", "Erneutes Aufstehen nach korrektem Ablegen", "Steht der Hund nach der Anweisung zum Herantreten wieder auf, können bis zu 5 Punkte abgezogen werden. Ein Zusatz-HZ zum Stoppen ist zulässig; die Distanz darf nicht um mehr als 50 % unterschritten werden.", { element: "Sonderregel", maxFaults: 5, rule: "bis −5 P." }),
  generalExecution(exerciseId, 10),
];

const wallRetrieveCriteria = (exerciseId: string): JudgingCriterion[] => [
  criterion(exerciseId, "hinsprung", "Hinsprung über die Schrägwand", "Kraftvoller und entschlossener Klettersprung über die 140-cm-Wand.", { element: "Primär", maxFaults: 5, rule: "Teilbudget 5 P." }),
  criterion(exerciseId, "apportieren", "Apportieren", "Motivierte Hin- und Rückläufe, sofortige Aufnahme, ruhiges Halten sowie korrekte Präsentation und bereitwillige Abgabe.", { element: "Primär", maxFaults: 5, rule: "Teilbudget 5 P." }),
  criterion(exerciseId, "ruecksprung", "Rücksprung mit Bringholz", "Kraftvoller und entschlossener Rücksprung über die Schrägwand mit Bringholz.", { element: "Primär", maxFaults: 5, rule: "Teilbudget 5 P." }),
  criterion(exerciseId, "grundstellungen", "Anfangs- und Endgrundstellung", "Korrekte Grundstellungen ohne zusätzliches Punktebudget außerhalb der insgesamt 15 Punkte.", { element: "Sekundär", rule: "Qualitativ" }),
  criterion(exerciseId, "ein-sprung-fehlt", "Nur ein Sprung und Apportieren ausgeführt", "Fehlt genau ein Sprung, entfallen dessen 5 Punkte. Vor weiteren Entwertungen können höchstens 10 Punkte verbleiben.", { element: "Sonderregel", maxFaults: 5, rule: "fest −5 P." }),
  criterion(exerciseId, "keine-teilbewertung", "Kein Sprung oder Apportieren nicht absolviert", "Mindestens ein Sprung und das Apportieren sind Voraussetzung für eine Teilbewertung. Andernfalls erhält die Übung 0 Punkte.", { element: "Sonderregel", maxFaults: 15, rule: "Gesamtübung 0 P." }),
  criterion(exerciseId, "beginn-ohne-hz", "Selbstständiger Beginn ohne HZ", "Beginnt der Hund selbstständig, können abhängig vom Zeitpunkt bis zu 2 Punkte abgezogen werden.", { element: "Sonderregel", maxFaults: 2, rule: "bis −2 P." }),
  criterion(exerciseId, "nichtabgabe", "Keine Abgabe nach insgesamt drei HZ", "Die Nichtabgabe nach dem regulären und zwei zusätzlichen Hörzeichen führt zur Disqualifikation wegen Ungehorsams. Das Punktefeld bildet den Übungsabzug ab; die Disqualifikation ist zusätzlich zu berücksichtigen.", { element: "Sonderregel", maxFaults: 15, rule: "Disqualifikation" }),
  generalExecution(exerciseId, 15),
];

const exercise = (id: string, label: string, maxPoints: JudgingExercise["maxPoints"], criteria: JudgingCriterion[]): JudgingExercise => ({ id, label, maxPoints, criteria });

const fixedDefinitions: Record<"FCI-IBGH1" | "FCI-IBGH2", JudgingLevelDefinition<IbghLevel>> = {
  "FCI-IBGH1": {
    level: "FCI-IBGH1",
    maxPoints: 100,
    exercises: [
      exercise("ibgh1-leinenfuehrigkeit", "Leinenführigkeit", 30, heelworkCriteria("ibgh1-leinenfuehrigkeit", 30, true)),
      exercise("ibgh1-freifolge", "Freifolge", 30, heelworkCriteria("ibgh1-freifolge", 30, false)),
      exercise("ibgh1-absitzen", "Absitzen aus der Bewegung", 15, positionExerciseCriteria("ibgh1-absitzen", 15, "Sitz", false, 1)),
      exercise("ibgh1-ablegen", "Ablegen aus der Bewegung", 15, positionExerciseCriteria("ibgh1-ablegen", 15, "Platz", true, 1)),
      exercise("ibgh1-ablage", "Ablegen unter Ablenkung", 10, distractionCriteria("ibgh1-ablage", 1)),
    ],
  },
  "FCI-IBGH2": {
    level: "FCI-IBGH2",
    maxPoints: 100,
    exercises: [
      exercise("ibgh2-leinenfuehrigkeit", "Leinenführigkeit", 20, heelworkCriteria("ibgh2-leinenfuehrigkeit", 20, true)),
      exercise("ibgh2-freifolge", "Freifolge", 20, heelworkCriteria("ibgh2-freifolge", 20, false)),
      exercise("ibgh2-absitzen", "Absitzen aus der Bewegung", 15, positionExerciseCriteria("ibgh2-absitzen", 15, "Sitz", false, 2)),
      exercise("ibgh2-ablegen", "Ablegen aus der Bewegung", 15, positionExerciseCriteria("ibgh2-ablegen", 15, "Platz", true, 2)),
      exercise("ibgh2-bringen-ebene", "Bringen auf ebener Erde", 10, retrieveCriteria("ibgh2-bringen-ebene", 10)),
      exercise("ibgh2-voraussenden", "Voraussenden mit Hinlegen", 10, sendAwayCriteria("ibgh2-voraussenden")),
      exercise("ibgh2-ablage", "Ablegen unter Ablenkung", 10, distractionCriteria("ibgh2-ablage", 2)),
    ],
  },
};

const ibgh3Exercises = {
  freifolge: exercise("ibgh3-freifolge", "Freifolge", 20, heelworkCriteria("ibgh3-freifolge", 20, false)),
  absitzen: exercise("ibgh3-absitzen", "Absitzen aus der Bewegung", 10, positionExerciseCriteria("ibgh3-absitzen", 10, "Sitz", false, 3)),
  ablegen: exercise("ibgh3-ablegen", "Ablegen aus der Bewegung", 10, positionExerciseCriteria("ibgh3-ablegen", 10, "Platz", true, 3)),
  steh: exercise("ibgh3-steh", "Steh aus dem Schritt", 10, positionExerciseCriteria("ibgh3-steh", 10, "Steh", false, 3)),
  bringenEbene: exercise("ibgh3-bringen-ebene", "Bringen auf ebener Erde", 15, retrieveCriteria("ibgh3-bringen-ebene", 15)),
  bringenSchraegwand: exercise("ibgh3-bringen-schraegwand", "Bringen über eine Schrägwand (140cm)", 15, wallRetrieveCriteria("ibgh3-bringen-schraegwand")),
  voraussenden: exercise("ibgh3-voraussenden", "Voraussenden mit Hinlegen", 10, sendAwayCriteria("ibgh3-voraussenden")),
  ablage: exercise("ibgh3-ablage", "Ablegen unter Ablenkung", 10, distractionCriteria("ibgh3-ablage", 3)),
};

type Ibgh3ExerciseKey = keyof typeof ibgh3Exercises;

export const IBGH3_VARIANT_ORDERS: Record<Ibgh3Variant, Ibgh3ExerciseKey[]> = {
  1: ["freifolge", "absitzen", "steh", "bringenEbene", "bringenSchraegwand", "ablegen", "voraussenden", "ablage"],
  2: ["freifolge", "steh", "ablegen", "bringenSchraegwand", "absitzen", "bringenEbene", "voraussenden", "ablage"],
  3: ["freifolge", "bringenSchraegwand", "steh", "bringenEbene", "ablegen", "absitzen", "voraussenden", "ablage"],
  4: ["freifolge", "ablegen", "absitzen", "bringenSchraegwand", "bringenEbene", "steh", "voraussenden", "ablage"],
  5: ["freifolge", "bringenEbene", "bringenSchraegwand", "ablegen", "absitzen", "steh", "voraussenden", "ablage"],
};

export function getIbghDefinition(level: IbghLevel, variant: Ibgh3Variant = 1): JudgingLevelDefinition<IbghLevel> {
  if (level !== "FCI-IBGH3") return fixedDefinitions[level];
  return {
    level,
    maxPoints: 100,
    exercises: IBGH3_VARIANT_ORDERS[variant].map((exerciseKey) => ibgh3Exercises[exerciseKey]),
  };
}
