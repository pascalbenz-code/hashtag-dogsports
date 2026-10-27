import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  Pause,
  Play,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { saveIfhSession } from "../../data/db";
import {
  calculateFixedDeductions,
  calculateTiming,
  getNotFoundArticleTreatment,
  getMapPlan,
  trackSummary,
} from "../../domain/ifh";
import { validateIfhStructure } from "../../domain/ifhRules";
import type {
  Assessment5,
  IfhAngle,
  IfhArticle,
  IfhCrossTrack,
  IfhLevel,
  IfhLeg,
  IfhRating,
  IfhRuleEventCode,
  IfhSession,
  TrainingFocus,
} from "../../domain/ifhTypes";
import { LocaleNumberInput } from "../LocaleNumberInput";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { TrackBuilder } from "./TrackBuilder";

const FOCUSES: TrainingFocus[] = [
  "Ansatz",
  "Suchintensität",
  "Rechte Winkel",
  "Linke Winkel",
  "Spitze Winkel",
  "Halbkreis",
  "Gegenstände",
  "Wiederansatz",
  "Verleitungen",
  "Geländewechsel",
  "Wegüberquerungen",
  "Liegezeit",
  "Konzentration über die Strecke",
  "Leinenarbeit des Hundeführers",
];
const RULE_EVENT_OPTIONS: Array<{ value: IfhRuleEventCode; label: string }> = [
  {
    value: "extra-search-command-start",
    label: "Zusätzliches Such-HZ am ersten Ansatz",
  },
  { value: "restart-after-recall", label: "Erneuter Ansatz nach Rückruf" },
  { value: "command-before-sign", label: "Such-HZ vor dem Abgangsschild" },
  { value: "missing-search-command", label: "Fehlendes Such-HZ" },
  {
    value: "false-indication-line-end",
    label: "Fehlanzeige – HF bleibt am Leinenende",
  },
  {
    value: "false-indication-handler-approach",
    label: "Fehlanzeige – HF tritt heran",
  },
  { value: "visual-aid-resume", label: "Sichtzeichen zum Wiederaufnehmen" },
  {
    value: "leaving-track-behaviour",
    label: "Faseln, Urinieren oder Stuhlgang",
  },
];
type EditorStep = "base" | "plan" | "actual" | "evaluate";

const localDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 16);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};
const fromLocalDateTime = (value: string) =>
  value ? new Date(value).toISOString() : undefined;
const fmtMinutes = (value: number | null) =>
  value === null
    ? "–"
    : `${Math.floor(value / 60)} h ${Math.round(value % 60)} min`;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function QualitySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Assessment5;
  onChange: (value: Assessment5) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value
              ? (Number(event.target.value) as Assessment5)
              : null,
          )
        }
      >
        <option value="">Nicht bewertet</option>
        <option value="1">1 – deutlich unsicher</option>
        <option value="2">2 – noch instabil</option>
        <option value="3">3 – wechselhaft</option>
        <option value="4">4 – überwiegend sicher</option>
        <option value="5">5 – stabil und selbstständig</option>
      </select>
    </Field>
  );
}

const RATING_LABELS: Record<IfhRating, string> = {
  excellent: "Vorzüglich",
  "very-good": "Sehr gut",
  good: "Gut",
  satisfactory: "Befriedigend",
  insufficient: "Mangelhaft",
  unrated: "Nicht bewertet",
};

function RatingSelect({
  label = "Zusammenfassende Wertung",
  value,
  onChange,
}: {
  label?: string;
  value: IfhRating | undefined;
  onChange: (value: IfhRating) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? "unrated"}
        onChange={(event) => onChange(event.target.value as IfhRating)}
      >
        {(Object.entries(RATING_LABELS) as Array<[IfhRating, string]>).map(
          ([rating, text]) => (
            <option value={rating} key={rating}>
              {text}
            </option>
          ),
        )}
      </select>
    </Field>
  );
}

const emptyLegEvaluation = (): NonNullable<IfhLeg["evaluation"]> => ({
  rating: "unrated",
  intensity: null,
  concentration: null,
  independence: null,
  deepNose: null,
  consistency: null,
  help: "",
  note: "",
});

function TimingEditor({
  session,
  update,
}: {
  session: IfhSession;
  update: (patch: Partial<IfhSession>) => void;
}) {
  const [clock, setClock] = useState(() => new Date().toISOString());
  const timing = session.timing;
  const running = Boolean(timing.actualStartAt && !timing.searchEndedAt);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setClock(new Date().toISOString()),
      15_000,
    );
    return () => window.clearInterval(timer);
  }, [running]);
  const summary = calculateTiming(timing, clock);
  const setTime = (key: keyof IfhSession["timing"], value?: string) =>
    update({ timing: { ...timing, [key]: value } });
  const stamp = (key: keyof IfhSession["timing"]) =>
    setTime(key, new Date().toISOString());
  return (
    <Card className="space-y-3">
      <h3>Zeiten und Timer</h3>
      <p className="text-xs text-muted">
        Liegezeit-Konvention: Legeende bis tatsächlicher Ansatz. Diese
        technische Konvention ist nicht als offizielle Auslegung verifiziert.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            "articlePreparationStartedAt",
            "layingStartedAt",
            "layingEndedAt",
            "plannedStartAt",
            "actualStartAt",
            "searchEndedAt",
          ] as const
        ).map((key) => (
          <Field
            key={key}
            label={
              {
                articlePreparationStartedAt: "Gegenstände vorbereiten",
                layingStartedAt: "Legebeginn",
                layingEndedAt: "Legeende",
                plannedStartAt: "Ansatz geplant",
                actualStartAt: "Ansatz tatsächlich",
                searchEndedAt: "Suchende",
              }[key]
            }
          >
            <input
              type="datetime-local"
              value={localDateTime(timing[key] as string | undefined)}
              onChange={(event) =>
                setTime(key, fromLocalDateTime(event.target.value))
              }
            />
          </Field>
        ))}
      </div>
      <div className="ifh-timer">
        <Clock3 />
        <div>
          <strong>{fmtMinutes(summary.searchMinutes)}</strong>
          <span>Ausarbeitungsdauer · Pausen eingeschlossen</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="ifh-mini">
          <span>Liegezeit</span>
          <strong>{fmtMinutes(summary.agingMinutes)}</strong>
        </div>
        <div className="ifh-mini">
          <span>Pausen</span>
          <strong>{fmtMinutes(summary.pauseMinutes)}</strong>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => stamp("actualStartAt")}>
          <Play />
          Ansatz jetzt
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => stamp("searchEndedAt")}
        >
          <Square />
          Suche beenden
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            update({
              timing: {
                ...timing,
                pauses: [
                  ...timing.pauses,
                  {
                    id: crypto.randomUUID(),
                    startedAt: new Date().toISOString(),
                    reason: "",
                  },
                ],
              },
            })
          }
        >
          <Pause />
          Pause beginnen
        </Button>
      </div>
      {timing.pauses.map((pause) => (
        <div className="ifh-pause" key={pause.id}>
          <input
            aria-label="Pausengrund"
            placeholder="Pausengrund"
            value={pause.reason}
            onChange={(event) =>
              update({
                timing: {
                  ...timing,
                  pauses: timing.pauses.map((item) =>
                    item.id === pause.id
                      ? { ...item, reason: event.target.value }
                      : item,
                  ),
                },
              })
            }
          />
          <span>
            {new Intl.DateTimeFormat("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(pause.startedAt))}
          </span>
          {pause.endedAt ? (
            <span>beendet</span>
          ) : (
            <button
              type="button"
              onClick={() =>
                update({
                  timing: {
                    ...timing,
                    pauses: timing.pauses.map((item) =>
                      item.id === pause.id
                        ? { ...item, endedAt: new Date().toISOString() }
                        : item,
                    ),
                  },
                })
              }
            >
              Pause beenden
            </button>
          )}
        </div>
      ))}
    </Card>
  );
}

function EvaluationEditor({
  session,
  update,
}: {
  session: IfhSession;
  update: (patch: Partial<IfhSession>) => void;
}) {
  const actual = session.actualTrack;
  const updateArticle = (
    id: string,
    patch: Partial<IfhArticle["evaluation"]>,
  ) =>
    update({
      actualTrack: {
        ...actual,
        articles: actual.articles.map((item) =>
          item.id === id
            ? { ...item, evaluation: { ...item.evaluation, ...patch } }
            : item,
        ),
      },
    });
  const updateAngle = (id: string, patch: Partial<IfhAngle["evaluation"]>) =>
    update({
      actualTrack: {
        ...actual,
        angles: actual.angles.map((item) =>
          item.id === id
            ? { ...item, evaluation: { ...item.evaluation, ...patch } }
            : item,
        ),
      },
    });
  const updateLegEvaluation = (
    id: string,
    patch: Partial<NonNullable<IfhLeg["evaluation"]>>,
  ) =>
    update({
      actualTrack: {
        ...actual,
        legs: actual.legs.map((item) =>
          item.id === id
            ? {
                ...item,
                evaluation: {
                  ...emptyLegEvaluation(),
                  ...item.evaluation,
                  ...patch,
                },
              }
            : item,
        ),
      },
    });
  const updateCross = (
    id: string,
    patch: Partial<IfhCrossTrack["evaluation"]>,
  ) =>
    update({
      actualTrack: {
        ...actual,
        crossTracks: actual.crossTracks.map((item) =>
          item.id === id
            ? { ...item, evaluation: { ...item.evaluation, ...patch } }
            : item,
        ),
      },
    });
  const missingAndNotFoundCount = actual.articles.filter(
    (item) =>
      item.evaluation.result === "not-found" &&
      item.evaluation.notFoundByTrackLayer === true,
  ).length;
  return (
    <div className="space-y-4">
      <Card>
        <h3>Schenkel einzeln bewerten</h3>
        <p className="text-xs text-muted">
          Diese Trainingswertung ist keine offizielle FCI-Punkteskala.
        </p>
        {actual.legs.length ? (
          actual.legs.map((leg) => {
            const evaluation = { ...emptyLegEvaluation(), ...leg.evaluation };
            return (
              <details className="ifh-details" key={leg.id}>
                <summary>
                  Schenkel {leg.order} · {leg.lengthSteps ?? "–"} Schritte
                </summary>
                <div className="grid grid-cols-2 gap-2">
                  <RatingSelect
                    value={evaluation.rating}
                    onChange={(rating) =>
                      updateLegEvaluation(leg.id, { rating })
                    }
                  />
                  <QualitySelect
                    label="Suchintensität"
                    value={evaluation.intensity}
                    onChange={(intensity) =>
                      updateLegEvaluation(leg.id, { intensity })
                    }
                  />
                  <QualitySelect
                    label="Konzentration"
                    value={evaluation.concentration}
                    onChange={(concentration) =>
                      updateLegEvaluation(leg.id, { concentration })
                    }
                  />
                  <QualitySelect
                    label="Selbstständigkeit"
                    value={evaluation.independence}
                    onChange={(independence) =>
                      updateLegEvaluation(leg.id, { independence })
                    }
                  />
                  <QualitySelect
                    label="Tiefe Nase"
                    value={evaluation.deepNose}
                    onChange={(deepNose) =>
                      updateLegEvaluation(leg.id, { deepNose })
                    }
                  />
                  <QualitySelect
                    label="Gleichmäßigkeit"
                    value={evaluation.consistency}
                    onChange={(consistency) =>
                      updateLegEvaluation(leg.id, { consistency })
                    }
                  />
                </div>
                <Field label="Hilfen">
                  <textarea
                    value={evaluation.help}
                    onChange={(event) =>
                      updateLegEvaluation(leg.id, { help: event.target.value })
                    }
                  />
                </Field>
                <Field label="Beobachtungsnotiz">
                  <textarea
                    value={evaluation.note}
                    onChange={(event) =>
                      updateLegEvaluation(leg.id, { note: event.target.value })
                    }
                  />
                </Field>
              </details>
            );
          })
        ) : (
          <p className="ifh-empty compact">
            Noch keine tatsächlichen Schenkel erfasst.
          </p>
        )}
      </Card>
      <Card>
        <h3>Gegenstände einzeln bewerten</h3>
        {actual.articles.length ? (
          actual.articles.map((article) => {
            const treatment = getNotFoundArticleTreatment(
              session.targetLevel,
              article,
              missingAndNotFoundCount,
            );
            return (
              <details className="ifh-details" key={article.id}>
              <summary>
                Gegenstand {article.number} ·{" "}
                {article.material || "Material offen"}
              </summary>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Ergebnis">
                  <select
                    value={article.evaluation.result}
                    onChange={(event) =>
                      updateArticle(article.id, {
                        result: event.target
                          .value as IfhArticle["evaluation"]["result"],
                      })
                    }
                  >
                    <option value="unrated">Nicht bewertet</option>
                    <option value="independent">Selbstständig angezeigt</option>
                    <option value="assisted">Mit Hilfe angezeigt</option>
                    <option value="overrun">Überlaufen</option>
                    <option value="not-found">Nicht auffindbar</option>
                  </select>
                </Field>
                <Field label="Anzeigeart">
                  <select
                    value={article.evaluation.indication}
                    onChange={(event) =>
                      updateArticle(article.id, {
                        indication: event.target
                          .value as IfhArticle["evaluation"]["indication"],
                      })
                    }
                  >
                    <option value="unrated">Nicht bewertet</option>
                    <option value="point">Verweisen</option>
                    <option value="pick-up">Aufnehmen</option>
                    <option value="retrieve">Apportieren</option>
                  </select>
                </Field>
                <RatingSelect
                  value={article.evaluation.rating}
                  onChange={(rating) =>
                    updateArticle(article.id, { rating })
                  }
                />
                {article.evaluation.result === "not-found" ? (
                  <Field label="Auch vom Fährtenleger nicht gefunden">
                    <select
                      value={
                        article.evaluation.notFoundByTrackLayer == null
                          ? ""
                          : String(article.evaluation.notFoundByTrackLayer)
                      }
                      onChange={(event) =>
                        updateArticle(article.id, {
                          notFoundByTrackLayer:
                            event.target.value === ""
                              ? null
                              : event.target.value === "true",
                        })
                      }
                    >
                      <option value="">Nicht geklärt</option>
                      <option value="true">Ja</option>
                      <option value="false">Nein</option>
                    </select>
                  </Field>
                ) : null}
                <Field label="Verweisposition">
                  <select
                    value={article.evaluation.pointPosition}
                    onChange={(event) =>
                      updateArticle(article.id, {
                        pointPosition: event.target
                          .value as IfhArticle["evaluation"]["pointPosition"],
                      })
                    }
                  >
                    <option value="unrated">Nicht bewertet</option>
                    <option value="down">Liegen</option>
                    <option value="sit">Sitzen</option>
                    <option value="stand">Stehen</option>
                  </select>
                </Field>
                <Field label="Lage zum Gegenstand">
                  <select
                    value={article.evaluation.relation}
                    onChange={(event) =>
                      updateArticle(article.id, {
                        relation: event.target
                          .value as IfhArticle["evaluation"]["relation"],
                      })
                    }
                  >
                    <option value="unrated">Nicht bewertet</option>
                    <option value="straight">Gerade</option>
                    <option value="up-to-30-degrees">Bis 30° schräg</option>
                    <option value="over-30-degrees">Über 30° schräg</option>
                  </select>
                </Field>
                <Field label="Wiederansatz">
                  <select
                    value={article.evaluation.restart}
                    onChange={(event) =>
                      updateArticle(article.id, {
                        restart: event.target
                          .value as IfhArticle["evaluation"]["restart"],
                      })
                    }
                  >
                    <option value="unrated">Nicht bewertet</option>
                    <option value="direct">Direkt</option>
                    <option value="hesitant">Zögernd</option>
                    <option value="extra-command">Zusatz-HZ</option>
                    <option value="no-restart">Keine Aufnahme</option>
                  </select>
                </Field>
                <QualitySelect
                  label="Selbstsicherheit"
                  value={article.evaluation.confidence}
                  onChange={(value) =>
                    updateArticle(article.id, { confidence: value })
                  }
                />
                <QualitySelect
                  label="Unruhe / Meideverhalten"
                  value={article.evaluation.unrestAvoidance}
                  onChange={(value) =>
                    updateArticle(article.id, { unrestAvoidance: value })
                  }
                />
                <Field label="Position gehalten">
                  <select
                    value={
                      article.evaluation.holdsPosition === null
                        ? ""
                        : String(article.evaluation.holdsPosition)
                    }
                    onChange={(event) =>
                      updateArticle(article.id, {
                        holdsPosition:
                          event.target.value === ""
                            ? null
                            : event.target.value === "true",
                      })
                    }
                  >
                    <option value="">Nicht bewertet</option>
                    <option value="true">Ja</option>
                    <option value="false">Nein</option>
                  </select>
                </Field>
              </div>
              {treatment ? (
                <p className="ifh-rule-note">{treatment.message}</p>
              ) : null}
              <p className="ifh-rule-note">
                Positionswechsel, Zurückschauen bei gehaltener Position und bis
                30° schräges Verweisen sind nicht automatisch fehlerhaft. Stark
                unterstütztes Verweisen ist als „überlaufen“ zu dokumentieren.
              </p>
              <Field label="Art der Hilfe">
                <textarea
                  value={article.evaluation.help}
                  onChange={(event) =>
                    updateArticle(article.id, { help: event.target.value })
                  }
                />
              </Field>
              <Field label="Beobachtungsnotiz">
                <textarea
                  value={article.evaluation.note}
                  onChange={(event) =>
                    updateArticle(article.id, { note: event.target.value })
                  }
                />
              </Field>
              <Field label="Foto- oder Videoverweis">
                <input
                  value={article.evaluation.mediaReference}
                  onChange={(event) =>
                    updateArticle(article.id, {
                      mediaReference: event.target.value,
                    })
                  }
                />
              </Field>
              </details>
            );
          })
        ) : (
          <p className="ifh-empty compact">
            Noch keine tatsächlichen Gegenstände erfasst.
          </p>
        )}
      </Card>
      <Card>
        <h3>Winkel</h3>
        {actual.angles.length ? (
          actual.angles.map((angle, index) => (
            <div className="ifh-eval-row" key={angle.id}>
              <div>
                <strong>
                  Winkel {index + 1} ·{" "}
                  {angle.direction === "left" ? "links" : "rechts"}
                </strong>
                <small>Kontrolle ohne Verlassen der Fährte ist erlaubt.</small>
              </div>
              <select
                value={angle.evaluation.result}
                onChange={(event) =>
                  updateAngle(angle.id, {
                    result: event.target
                      .value as IfhAngle["evaluation"]["result"],
                  })
                }
              >
                <option value="unrated">Nicht bewertet</option>
                <option value="safe">Sicher</option>
                <option value="controlled">Kontrolliert auf Fährte</option>
                <option value="circled">Gekreist</option>
                <option value="lost">Fährte verloren</option>
                <option value="helped">Hilfe benötigt</option>
              </select>
              <select
                value={angle.evaluation.intensityAfter}
                onChange={(event) =>
                  updateAngle(angle.id, {
                    intensityAfter: event.target
                      .value as IfhAngle["evaluation"]["intensityAfter"],
                  })
                }
              >
                <option value="unrated">Intensität offen</option>
                <option value="steady">Gleichbleibend</option>
                <option value="reduced">Abgefallen</option>
              </select>
              <select
                aria-label={`Wertung Winkel ${index + 1}`}
                value={angle.evaluation.rating ?? "unrated"}
                onChange={(event) =>
                  updateAngle(angle.id, {
                    rating: event.target.value as IfhRating,
                  })
                }
              >
                {(Object.entries(RATING_LABELS) as Array<[IfhRating, string]>).map(
                  ([rating, text]) => (
                    <option value={rating} key={rating}>
                      {text}
                    </option>
                  ),
                )}
              </select>
            </div>
          ))
        ) : (
          <p className="ifh-empty compact">
            Noch keine tatsächlichen Winkel erfasst.
          </p>
        )}
      </Card>
      <Card>
        <h3>Verleitungen</h3>
        {actual.crossTracks.length ? (
          actual.crossTracks.map((crossing, index) => (
            <div className="ifh-eval-row" key={crossing.id}>
              <strong>Verleitung {index + 1}</strong>
              <select
                value={crossing.evaluation.result}
                onChange={(event) =>
                  updateCross(crossing.id, {
                    result: event.target
                      .value as IfhCrossTrack["evaluation"]["result"],
                  })
                }
              >
                <option value="unrated">Nicht bewertet</option>
                <option value="no-reaction">Ohne erkennbare Reaktion</option>
                <option value="checked-stayed">
                  Geprüft, auf Fährte geblieben
                </option>
                <option value="switched">Gewechselt</option>
                <option value="followed">Verfolgt</option>
                <option value="helped">Hilfe benötigt</option>
              </select>
              <select
                aria-label={`Wertung Verleitung ${index + 1}`}
                value={crossing.evaluation.rating ?? "unrated"}
                onChange={(event) =>
                  updateCross(crossing.id, {
                    rating: event.target.value as IfhRating,
                  })
                }
              >
                {(Object.entries(RATING_LABELS) as Array<[IfhRating, string]>).map(
                  ([rating, text]) => (
                    <option value={rating} key={rating}>
                      {text}
                    </option>
                  ),
                )}
              </select>
            </div>
          ))
        ) : (
          <p className="ifh-empty compact">
            Noch keine tatsächlichen Verleitungen erfasst.
          </p>
        )}
      </Card>
    </div>
  );
}

export function IfhEditor({
  initial,
  dogs,
  onSaved,
  onCancel,
  onDirtyChange,
}: {
  initial: IfhSession;
  dogs: string[];
  onSaved: (session: IfhSession) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [session, setSession] = useState(() => structuredClone(initial));
  const [step, setStep] = useState<EditorStep>("base");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (patch: Partial<IfhSession>) => {
    setSession((current) => ({ ...current, ...patch }));
    setDirty(true);
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const checks = useMemo(() => validateIfhStructure(session), [session]);
  const deductions = useMemo(
    () => calculateFixedDeductions(session.ruleEvents),
    [session.ruleEvents],
  );
  const planned = trackSummary(session.plannedTrack);
  const save = async (complete: boolean) => {
    if (!session.dog.trim() || !session.title.trim()) {
      setError("Hund und Titel werden zum Speichern benötigt.");
      setStep("base");
      return;
    }
    setSaving(true);
    setError("");
    const next = {
      ...session,
      status: complete ? ("completed" as const) : ("draft" as const),
      outcomeStatus:
        complete && session.outcomeStatus === "incomplete"
          ? ("completed" as const)
          : session.outcomeStatus,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveIfhSession(next);
      setSession(next);
      setDirty(false);
      onDirtyChange(false);
      onSaved(next);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Speichern fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="ifh-editor-head">
        <div>
          <p className="eyebrow text-teal">
            IFH · PLANEN → LEGEN → AUSARBEITEN → AUSWERTEN
          </p>
          <h2>{session.title || "Training planen"}</h2>
        </div>
        <span
          className={`badge ${session.status === "draft" ? "draft" : "complete"}`}
        >
          {session.status === "draft" ? "Entwurf" : "Abgeschlossen"}
        </span>
      </div>
      <div
        className="ifh-step-nav"
        role="tablist"
        aria-label="Bearbeitungsschritte"
      >
        {(["base", "plan", "actual", "evaluate"] as EditorStep[]).map(
          (item, index) => (
            <button
              type="button"
              role="tab"
              aria-label={
                {
                  base: "Grunddaten",
                  plan: "Planen",
                  actual: "Legen und Suchen",
                  evaluate: "Auswerten",
                }[item]
              }
              aria-selected={step === item}
              className={step === item ? "active" : ""}
              onClick={() => setStep(item)}
              key={item}
            >
              {index + 1}
              <span>
                {
                  {
                    base: "Grunddaten",
                    plan: "Planen",
                    actual: "Legen & Suchen",
                    evaluate: "Auswerten",
                  }[item]
                }
              </span>
            </button>
          ),
        )}
      </div>
      {error ? (
        <div className="ifh-error" role="alert">
          <AlertTriangle />
          {error}
        </div>
      ) : null}
      {step === "base" ? (
        <>
          <Card>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Hund">
                <input
                  list="ifh-dogs"
                  value={session.dog}
                  onChange={(event) => update({ dog: event.target.value })}
                />
                <datalist id="ifh-dogs">
                  {dogs.map((dog) => (
                    <option value={dog} key={dog} />
                  ))}
                </datalist>
              </Field>
              <Field label="Datum">
                <input
                  type="date"
                  value={session.date}
                  onChange={(event) => update({ date: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Titel">
              <input
                value={session.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="z. B. Winkelarbeit auf Acker"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Modus">
                <select
                  value={session.mode}
                  onChange={(event) => {
                    const mode = event.target.value as IfhSession["mode"];
                    update({
                      mode,
                      targetLevel:
                        mode === "free"
                          ? null
                          : (session.targetLevel ?? "FCI-IFH1"),
                    });
                  }}
                >
                  <option value="free">Freies Training</option>
                  <option value="target">Training mit Zielstufe</option>
                  <option value="simulation">Prüfungssimulation</option>
                </select>
              </Field>
              {session.mode !== "free" ? (
                <Field label="Zielstufe">
                  <select
                    value={session.targetLevel ?? "FCI-IFH1"}
                    onChange={(event) =>
                      update({ targetLevel: event.target.value as IfhLevel })
                    }
                  >
                    <option>FCI-IFH1</option>
                    <option>FCI-IFH2</option>
                    <option>FCI-IFH3</option>
                  </select>
                </Field>
              ) : (
                <div />
              )}
            </div>
            {session.mode === "simulation" ? (
              <p className="ifh-rule-note">
                Prüfungssimulation – kein offizielles Prüfungsergebnis.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ort / Gelände">
                <input
                  value={session.location}
                  onChange={(event) => update({ location: event.target.value })}
                />
              </Field>
              <Field label="Fährtenleger">
                <input
                  value={session.trackLayer}
                  onChange={(event) =>
                    update({ trackLayer: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Fährtenart">
              <select
                value={session.trackOwnership}
                onChange={(event) =>
                  update({
                    trackOwnership: event.target
                      .value as IfhSession["trackOwnership"],
                  })
                }
              >
                <option value="">Nicht angegeben</option>
                <option value="own">Eigenfährte</option>
                <option value="foreign">Fremdfährte</option>
              </select>
            </Field>
          </Card>
          <Card>
            <h3>Trainingsschwerpunkte</h3>
            <div className="ifh-chip-grid">
              {FOCUSES.map((focus) => (
                <label
                  className={session.focuses.includes(focus) ? "selected" : ""}
                  key={focus}
                >
                  <input
                    type="checkbox"
                    checked={session.focuses.includes(focus)}
                    onChange={() =>
                      update({
                        focuses: session.focuses.includes(focus)
                          ? session.focuses.filter((item) => item !== focus)
                          : [...session.focuses, focus],
                      })
                    }
                  />
                  {focus}
                </label>
              ))}
            </div>
            <Field label="Konkretes Trainingsziel">
              <textarea
                value={session.goal}
                onChange={(event) => update({ goal: event.target.value })}
              />
            </Field>
            <Field label="Notizen">
              <textarea
                value={session.notes}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </Field>
          </Card>
        </>
      ) : null}
      {step === "plan" ? (
        <Card>
          <TrackBuilder
            title="Geplante Fährte"
            track={session.plannedTrack}
            onChange={(plannedTrack) => update({ plannedTrack })}
            mapPlan={getMapPlan(session)}
            targetLevel={session.targetLevel}
            trackOwnership={session.trackOwnership}
            onMapPlanChange={(mapPlan) => update({ mapPlan })}
          />
        </Card>
      ) : null}
      {step === "actual" ? (
        <>
          {!session.actualTrack.legs.length &&
          session.plannedTrack.legs.length ? (
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                update({ actualTrack: structuredClone(session.plannedTrack) })
              }
            >
              <Copy />
              Plan als tatsächlich gelegt übernehmen
            </Button>
          ) : null}
          <Card>
            <TrackBuilder
              title="Tatsächlich gelegte Fährte"
              track={session.actualTrack}
              onChange={(actualTrack) => update({ actualTrack })}
            />
          </Card>
          <TimingEditor session={session} update={update} />
          <Card>
            <h3>Bedingungen</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bodenfeuchte">
                <select
                  value={session.conditions.moisture}
                  onChange={(event) =>
                    update({
                      conditions: {
                        ...session.conditions,
                        moisture: event.target
                          .value as IfhSession["conditions"]["moisture"],
                      },
                    })
                  }
                >
                  <option value="">–</option>
                  <option>trocken</option>
                  <option>feucht</option>
                  <option>nass</option>
                </select>
              </Field>
              <Field label="Temperatur °C">
                <LocaleNumberInput
                  value={session.conditions.temperatureC}
                  onValueChange={(value) =>
                    update({
                      conditions: {
                        ...session.conditions,
                        temperatureC: value,
                      },
                    })
                  }
                  maxFractionDigits={1}
                  allowNegative
                  ariaLabel="Temperatur"
                />
              </Field>
              <Field label="Windstärke">
                <input
                  value={session.conditions.windStrength}
                  onChange={(event) =>
                    update({
                      conditions: {
                        ...session.conditions,
                        windStrength: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Windrichtung">
                <input
                  value={session.conditions.windDirection}
                  onChange={(event) =>
                    update({
                      conditions: {
                        ...session.conditions,
                        windDirection: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <QualitySelect
                label="Motivation vor Start"
                value={session.conditions.dogMotivationBefore}
                onChange={(value) =>
                  update({
                    conditions: {
                      ...session.conditions,
                      dogMotivationBefore: value,
                    },
                  })
                }
              />
              <QualitySelect
                label="Konzentration vor Start"
                value={session.conditions.dogConcentrationBefore}
                onChange={(value) =>
                  update({
                    conditions: {
                      ...session.conditions,
                      dogConcentrationBefore: value,
                    },
                  })
                }
              />
            </div>
            <Field label="Bewuchs, gemäht/bearbeitet, Wetter und Schnee/Regen">
              <textarea
                value={session.conditions.surfaceNotes}
                onChange={(event) =>
                  update({
                    conditions: {
                      ...session.conditions,
                      surfaceNotes: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Wetteränderungen während Liegezeit">
              <input
                value={session.conditions.weatherChanges}
                onChange={(event) =>
                  update({
                    conditions: {
                      ...session.conditions,
                      weatherChanges: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Dung">
                <select
                  value={
                    session.conditions.manure === null
                      ? ""
                      : String(session.conditions.manure)
                  }
                  onChange={(event) =>
                    update({
                      conditions: {
                        ...session.conditions,
                        manure:
                          event.target.value === ""
                            ? null
                            : event.target.value === "true",
                      },
                    })
                  }
                >
                  <option value="">Nicht angegeben</option>
                  <option value="false">Nein</option>
                  <option value="true">Ja</option>
                </select>
              </Field>
              <Field label="Wild / Ablenkungen">
                <input
                  value={session.conditions.wildlifeDistractions}
                  onChange={(event) =>
                    update({
                      conditions: {
                        ...session.conditions,
                        wildlifeDistractions: event.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Besondere Tagesumstände">
              <textarea
                value={session.conditions.dailyCircumstances}
                onChange={(event) =>
                  update({
                    conditions: {
                      ...session.conditions,
                      dailyCircumstances: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Trainingshilfen und Futterverteilung">
              <textarea
                value={session.conditions.aidsAndFood}
                onChange={(event) =>
                  update({
                    conditions: {
                      ...session.conditions,
                      aidsAndFood: event.target.value,
                    },
                  })
                }
              />
            </Field>
          </Card>
        </>
      ) : null}
      {step === "evaluate" ? (
        <>
          <EvaluationEditor session={session} update={update} />
          <Card>
            <h3>
              Suchqualität – Trainingsskala, nicht offizielle FCI-Punkteskala
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "intensity",
                  "confidence",
                  "concentration",
                  "deepNose",
                  "consistency",
                  "independence",
                  "handlerCooperation",
                  "firstThird",
                  "middleThird",
                  "lastThird",
                ] as const
              ).map((key) => (
                <QualitySelect
                  key={key}
                  label={
                    {
                      intensity: "Intensität",
                      confidence: "Selbstvertrauen",
                      concentration: "Konzentration",
                      deepNose: "Tiefe Nase",
                      consistency: "Gleichmäßigkeit",
                      independence: "Selbstständigkeit",
                      handlerCooperation: "Zusammenarbeit HF",
                      firstThird: "Erstes Drittel",
                      middleThird: "Mittleres Drittel",
                      lastThird: "Letztes Drittel",
                    }[key]
                  }
                  value={session.searchQuality[key]}
                  onChange={(value) =>
                    update({
                      searchQuality: { ...session.searchQuality, [key]: value },
                    })
                  }
                />
              ))}
            </div>
            <Field label="Geschwindigkeit – nur Information">
              <input
                value={session.searchQuality.speedInfo}
                onChange={(event) =>
                  update({
                    searchQuality: {
                      ...session.searchQuality,
                      speedInfo: event.target.value,
                    },
                  })
                }
              />
            </Field>
          </Card>
          <Card>
            <h3>Hundeführer</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Abstand zum Hund (m)">
                <LocaleNumberInput
                  value={session.handlerAssessment.distanceMeters}
                  onValueChange={(value) =>
                    update({
                      handlerAssessment: {
                        ...session.handlerAssessment,
                        distanceMeters: value,
                      },
                    })
                  }
                  maxFractionDigits={1}
                  ariaLabel="Abstand zum Hund"
                />
              </Field>
              <Field label="Leinenlänge (m)">
                <LocaleNumberInput
                  value={session.handlerAssessment.lineLengthMeters}
                  onValueChange={(value) =>
                    update({
                      handlerAssessment: {
                        ...session.handlerAssessment,
                        lineLengthMeters: value,
                      },
                    })
                  }
                  maxFractionDigits={1}
                  ariaLabel="Leinenlänge"
                />
              </Field>
            </div>
            <Field label="Leinenführung und Hilfen">
              <textarea
                value={session.handlerAssessment.lineHandling}
                onChange={(event) =>
                  update({
                    handlerAssessment: {
                      ...session.handlerAssessment,
                      lineHandling: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Verhalten an Winkeln, Gegenständen und Wiederansatz">
              <textarea
                value={`${session.handlerAssessment.atAngles}${session.handlerAssessment.atArticles ? ` · ${session.handlerAssessment.atArticles}` : ""}`}
                onChange={(event) =>
                  update({
                    handlerAssessment: {
                      ...session.handlerAssessment,
                      atAngles: event.target.value,
                    },
                  })
                }
              />
            </Field>
          </Card>
          <Card>
            <h3>Feste Regelabzüge</h3>
            <p className="text-xs text-muted">
              Nur dokumentierte, bezifferte Ereignisse. Gleiche Ereignis-IDs
              werden nicht doppelt gezählt.
            </p>
            {session.ruleEvents.map((event) => (
              <div className="ifh-rule-event" key={event.id}>
                <select
                  value={event.code}
                  onChange={(change) =>
                    update({
                      ruleEvents: session.ruleEvents.map((item) =>
                        item.id === event.id
                          ? {
                              ...item,
                              code: change.target.value as IfhRuleEventCode,
                            }
                          : item,
                      ),
                    })
                  }
                >
                  {RULE_EVENT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {event.code === "extra-search-command-start" ? (
                  <select
                    aria-label="Anzahl Zusatz-HZ"
                    value={event.count}
                    onChange={(change) =>
                      update({
                        ruleEvents: session.ruleEvents.map((item) =>
                          item.id === event.id
                            ? { ...item, count: Number(change.target.value) }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="1">1 ×</option>
                    <option value="2">2 ×</option>
                  </select>
                ) : null}
                <input
                  aria-label="Ereignis-ID"
                  placeholder="Ereignis-ID"
                  value={event.sourceEventKey}
                  onChange={(change) =>
                    update({
                      ruleEvents: session.ruleEvents.map((item) =>
                        item.id === event.id
                          ? { ...item, sourceEventKey: change.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  aria-label="Regelereignis löschen"
                  onClick={() =>
                    update({
                      ruleEvents: session.ruleEvents.filter(
                        (item) => item.id !== event.id,
                      ),
                    })
                  }
                >
                  <Trash2 />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                const eventId = crypto.randomUUID();
                update({
                  ruleEvents: [
                    ...session.ruleEvents,
                    {
                      id: eventId,
                      sourceEventKey: eventId,
                      code: "extra-search-command-start",
                      count: 1,
                      note: "",
                    },
                  ],
                });
              }}
            >
              Regelereignis hinzufügen
            </Button>
            <div className="ifh-deduction-total">
              <span>Dokumentierte feste Abzüge</span>
              <strong>
                −{" "}
                {deductions.total.toLocaleString("de-DE", {
                  minimumFractionDigits: 1,
                })}{" "}
                Punkte
              </strong>
            </div>
            {deductions.duplicatesIgnored ? (
              <p className="text-xs text-muted">
                {deductions.duplicatesIgnored} Doppelung(en) anhand der
                Ereignis-ID ignoriert.
              </p>
            ) : null}
            <p className="ifh-rule-note">
              Keine automatische offizielle Gesamtpunktzahl: qualitative
              Bewertung und vollständige Bewertungsgrundlage bleiben
              erforderlich.
            </p>
          </Card>
          {session.targetLevel ? (
            <Card>
              <h3>Aufbauprüfung {session.targetLevel}</h3>
              <p className="text-xs text-muted">
                Hinweise verhindern das Speichern nicht. Die Regeln wurden mit
                der FCI-Prüfungsordnung 2025, Seiten 67–76, abgeglichen.
              </p>
              <div className="space-y-2">
                {checks.map((item) => (
                  <div className={`ifh-check ${item.status}`} key={item.ruleId}>
                    {item.status === "conform" ? <Check /> : <AlertTriangle />}
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          <Card>
            <h3>Abschluss</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ergebnisstatus">
                <select
                  value={session.outcomeStatus}
                  onChange={(event) =>
                    update({
                      outcomeStatus: event.target
                        .value as IfhSession["outcomeStatus"],
                    })
                  }
                >
                  <option value="incomplete">Nicht vollständig bewertet</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="training-ended">
                    Im Training bewusst beendet
                  </option>
                  <option value="po-terminated">Abbruch nach PO</option>
                  <option value="disqualified">Disqualifikation</option>
                </select>
              </Field>
              <Field label="Zielerreichung">
                <select
                  value={session.goalResult}
                  onChange={(event) =>
                    update({
                      goalResult: event.target
                        .value as IfhSession["goalResult"],
                    })
                  }
                >
                  <option value="unrated">Nicht bewertet</option>
                  <option value="achieved">Ziel erreicht</option>
                  <option value="partial">Teilweise erreicht</option>
                  <option value="not-achieved">Nicht erreicht</option>
                </select>
              </Field>
            </div>
            <Field label="Manuelle Prüfungsbewertung (optional)">
              <LocaleNumberInput
                value={session.manualExamScore}
                onValueChange={(value) => update({ manualExamScore: value })}
                max={100}
                maxFractionDigits={1}
                ariaLabel="Manuelle Prüfungsbewertung"
              />
            </Field>
            <label className="ifh-checkbox">
              <input
                type="checkbox"
                checked={session.manualAssessmentComplete}
                onChange={(event) =>
                  update({ manualAssessmentComplete: event.target.checked })
                }
              />
              Vollständige Bewertungsgrundlage manuell bestätigt
            </label>
            <Field label="Was lief gut?">
              <textarea
                value={session.wentWell}
                onChange={(event) => update({ wentWell: event.target.value })}
              />
            </Field>
            <Field label="Was war schwierig?">
              <textarea
                value={session.difficult}
                onChange={(event) => update({ difficult: event.target.value })}
              />
            </Field>
            <Field label="Schwerpunkt nächste Einheit">
              <textarea
                value={session.nextFocus}
                onChange={(event) => update({ nextFocus: event.target.value })}
              />
            </Field>
          </Card>
        </>
      ) : null}
      <div className={`ifh-save-bar ${step === "plan" ? "is-static" : ""}`}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (!dirty || confirm("Ungespeicherte Änderungen verwerfen?")) {
              onDirtyChange(false);
              onCancel();
            }
          }}
        >
          Zurück
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => save(false)}
        >
          <Save />
          Entwurf speichern
        </Button>
        <Button type="button" disabled={saving} onClick={() => save(true)}>
          <Check />
          Abschließen
        </Button>
      </div>
      <p className="text-xs text-muted">
        Plan: {planned.totalSteps ?? "–"} Schritte · {planned.legs} Schenkel ·{" "}
        {planned.angles} Winkel · {planned.articles} Gegenstände
      </p>
    </div>
  );
}
