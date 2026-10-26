import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ClipboardList,
  Copy,
  Lightbulb,
  Plus,
  Route,
  Trash2,
} from "lucide-react";
import { db, deleteIfhSession, saveIfhSession } from "../../data/db";
import {
  calculateIfhProgress,
  calculateTiming,
  createIfhSession,
  duplicateIfhSession,
  generateIfhSuggestions,
  trackSummary,
} from "../../domain/ifh";
import { IFH_RULES } from "../../domain/ifhRules";
import type {
  IfhLevel,
  IfhMode,
  IfhSession,
  TrainingFocus,
} from "../../domain/ifhTypes";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { IfhEditor } from "./IfhEditor";

export type IfhView = "overview" | "plan" | "sessions" | "progress" | "rules";
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const percent = (success: number, total: number) =>
  total ? `${Math.round((success / total) * 100)} %` : "–";

function Ratio({
  label,
  success,
  total,
}: {
  label: string;
  success: number;
  total: number;
}) {
  return (
    <Card className="ifh-ratio">
      <span>{label}</span>
      <strong>
        {success} von {total}
      </strong>
      <small>{percent(success, total)}</small>
    </Card>
  );
}

export function IfhModule({
  view,
  dogs,
  onNavigate,
  onDirtyChange,
}: {
  view: IfhView;
  dogs: string[];
  onNavigate: (view: IfhView) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const sessions = useLiveQuery(() => db.ifhSessions.toArray(), []) ?? [];
  const knownDogs = [
    ...new Set([
      ...dogs,
      ...sessions.map((session) => session.dog).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b, "de"));
  const [editor, setEditor] = useState<IfhSession | null>(() =>
    view === "plan" ? createIfhSession() : null,
  );
  const open = (session?: IfhSession) => {
    setEditor(structuredClone(session ?? createIfhSession()));
    onNavigate("plan");
  };
  if (view === "plan" && editor) {
    return (
      <IfhEditor
        key={editor.id}
        initial={editor}
        dogs={knownDogs}
        onDirtyChange={onDirtyChange}
        onCancel={() => {
          setEditor(null);
          onNavigate("sessions");
        }}
        onSaved={() => {
          setEditor(null);
          onNavigate("sessions");
        }}
      />
    );
  }
  if (view === "overview")
    return (
      <IfhOverview sessions={sessions} open={open} onNavigate={onNavigate} />
    );
  if (view === "sessions")
    return <IfhSessions sessions={sessions} open={open} />;
  if (view === "progress")
    return <IfhProgress sessions={sessions} dogs={knownDogs} open={open} />;
  return <IfhRulebook />;
}

function IfhOverview({
  sessions,
  open,
  onNavigate,
}: {
  sessions: IfhSession[];
  open: (session?: IfhSession) => void;
  onNavigate: (view: IfhView) => void;
}) {
  const completed = sessions.filter(
    (session) => session.status === "completed",
  );
  const drafts = sessions.filter((session) => session.status === "draft");
  const latest = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <div className="space-y-4">
      <Card className="module-dashboard-hero">
        <span className="module-choice-icon">
          <Route />
        </span>
        <div>
          <p className="eyebrow text-teal">MODUL IFH</p>
          <h2>Fährtentraining</h2>
          <p className="mt-2 text-sm text-muted">
            Planen → Legen → Ausarbeiten → Auswerten
          </p>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        <Card className="ifh-mini">
          <span>Einheiten</span>
          <strong>{sessions.length}</strong>
        </Card>
        <Card className="ifh-mini">
          <span>Abgeschlossen</span>
          <strong>{completed.length}</strong>
        </Card>
        <Card className="ifh-mini">
          <span>Entwürfe</span>
          <strong>{drafts.length}</strong>
        </Card>
      </div>
      <Button className="w-full py-7" onClick={() => open()}>
        <Plus />
        Training planen
      </Button>
      {latest ? (
        <Card className="ifh-session-card">
          <div>
            <span
              className={`badge ${latest.status === "draft" ? "draft" : "complete"}`}
            >
              {latest.status === "draft" ? "Entwurf" : "Abgeschlossen"}
            </span>
            <h3>{latest.title}</h3>
            <p>
              {latest.dog} ·{" "}
              {dateFormat.format(new Date(`${latest.date}T12:00:00`))}
            </p>
          </div>
          <Button variant="ghost" onClick={() => open(latest)}>
            Öffnen
          </Button>
        </Card>
      ) : (
        <div className="ifh-empty">
          <Route />
          <strong>Noch kein Fährtentraining</strong>
          <span>
            Plane deine erste Einheit und speichere sie jederzeit als Entwurf.
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => onNavigate("sessions")}>
          <ClipboardList />
          Alle Einheiten
        </Button>
        <Button variant="ghost" onClick={() => onNavigate("progress")}>
          <Lightbulb />
          Fortschritt
        </Button>
      </div>
    </div>
  );
}

function IfhSessions({
  sessions,
  open,
}: {
  sessions: IfhSession[];
  open: (session: IfhSession) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "completed">("all");
  const shown = useMemo(
    () =>
      [...sessions]
        .filter(
          (session) =>
            (status === "all" || session.status === status) &&
            `${session.title} ${session.dog} ${session.location}`
              .toLocaleLowerCase("de-DE")
              .includes(query.toLocaleLowerCase("de-DE")),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, query, status],
  );
  const duplicate = async (session: IfhSession) => {
    const copy = duplicateIfhSession(session);
    await saveIfhSession(copy);
    open(copy);
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow text-teal">IFH</p>
        <h2>Trainingseinheiten</h2>
      </div>
      <Card>
        <input
          className="control"
          placeholder="Titel, Hund oder Gelände suchen"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["all", "draft", "completed"] as const).map((item) => (
            <button
              type="button"
              className={`ifh-filter ${status === item ? "active" : ""}`}
              onClick={() => setStatus(item)}
              key={item}
            >
              {item === "all"
                ? "Alle"
                : item === "draft"
                  ? "Entwürfe"
                  : "Abgeschlossen"}
            </button>
          ))}
        </div>
      </Card>
      {shown.map((session) => {
        const summary = trackSummary(
          session.actualTrack.legs.length
            ? session.actualTrack
            : session.plannedTrack,
        );
        return (
          <Card className="ifh-session-card" key={session.id}>
            <button
              type="button"
              className="ifh-session-main"
              onClick={() => open(session)}
            >
              <span
                className={`badge ${session.status === "draft" ? "draft" : "complete"}`}
              >
                {session.status === "draft" ? "Entwurf" : "Abgeschlossen"}
              </span>
              <h3>{session.title}</h3>
              <p>
                {session.dog} ·{" "}
                {dateFormat.format(new Date(`${session.date}T12:00:00`))}
              </p>
              <small>
                {session.mode === "free"
                  ? "Freies Training"
                  : session.mode === "target"
                    ? `Ziel ${session.targetLevel}`
                    : `Simulation ${session.targetLevel}`}{" "}
                · {summary.totalSteps ?? "–"} Schritte
              </small>
            </button>
            <div className="ifh-card-actions">
              <button
                type="button"
                aria-label="Plan duplizieren"
                onClick={() => duplicate(session)}
              >
                <Copy />
              </button>
              <button
                type="button"
                aria-label="Einheit löschen"
                onClick={async () => {
                  if (confirm("Trainingseinheit wirklich löschen?"))
                    await deleteIfhSession(session.id);
                }}
              >
                <Trash2 />
              </button>
            </div>
          </Card>
        );
      })}
      {!shown.length ? (
        <div className="ifh-empty">
          <ClipboardList />
          <strong>Keine Einheiten gefunden</strong>
          <span>Entwürfe und abgeschlossene Einheiten erscheinen hier.</span>
        </div>
      ) : null}
    </div>
  );
}

function IfhProgress({
  sessions,
  dogs,
  open,
}: {
  sessions: IfhSession[];
  dogs: string[];
  open: (session: IfhSession) => void;
}) {
  const [dog, setDog] = useState("all");
  const [mode, setMode] = useState<"all" | IfhMode>("all");
  const [level, setLevel] = useState<"all" | IfhLevel>("all");
  const [ownership, setOwnership] = useState<"all" | "own" | "foreign">("all");
  const [focus, setFocus] = useState<"all" | TrainingFocus>("all");
  const [ground, setGround] = useState("all");
  const [minAging, setMinAging] = useState("");
  const [minSteps, setMinSteps] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        const track = session.actualTrack.legs.length
          ? session.actualTrack
          : session.plannedTrack;
        const aging = calculateTiming(session.timing).agingMinutes;
        const steps = trackSummary(track).totalSteps;
        return (
          (dog === "all" || session.dog === dog) &&
          (mode === "all" || session.mode === mode) &&
          (level === "all" || session.targetLevel === level) &&
          (ownership === "all" || session.trackOwnership === ownership) &&
          (focus === "all" || session.focuses.includes(focus)) &&
          (ground === "all" ||
            track.legs.some((leg) => leg.ground === ground)) &&
          (!minAging || (aging !== null && aging >= Number(minAging))) &&
          (!minSteps || (steps !== null && steps >= Number(minSteps))) &&
          (!from || session.date >= from) &&
          (!to || session.date <= to)
        );
      }),
    [
      sessions,
      dog,
      mode,
      level,
      ownership,
      focus,
      ground,
      minAging,
      minSteps,
      from,
      to,
    ],
  );
  const stats = calculateIfhProgress(filtered);
  const [rejected, setRejected] = useState<string[]>([]);
  const suggestions = generateIfhSuggestions(filtered).filter(
    (suggestion) => !rejected.includes(suggestion.id),
  );
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow text-teal">IFH</p>
        <h2>Fortschritt</h2>
        <p className="mt-2 text-sm text-muted">
          Trends beschreiben Beobachtungen und keine Ursache-Wirkungs-Beziehung.
        </p>
      </div>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="control"
            value={dog}
            onChange={(event) => setDog(event.target.value)}
          >
            <option value="all">Alle Hunde</option>
            {dogs.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="control"
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="all">Alle Modi</option>
            <option value="free">Freies Training</option>
            <option value="target">Zielstufe</option>
            <option value="simulation">Simulation</option>
          </select>
          <select
            className="control"
            value={level}
            onChange={(event) => setLevel(event.target.value as typeof level)}
          >
            <option value="all">Alle Stufen</option>
            <option>FCI-IFH1</option>
            <option>FCI-IFH2</option>
            <option>FCI-IFH3</option>
          </select>
          <select
            className="control"
            value={ownership}
            onChange={(event) =>
              setOwnership(event.target.value as typeof ownership)
            }
          >
            <option value="all">Eigen- und Fremdfährte</option>
            <option value="own">Eigenfährte</option>
            <option value="foreign">Fremdfährte</option>
          </select>
          <input
            className="control"
            type="date"
            aria-label="Zeitraum von"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <input
            className="control"
            type="date"
            aria-label="Zeitraum bis"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            className="control"
            value={focus}
            onChange={(event) => setFocus(event.target.value as typeof focus)}
          >
            <option value="all">Alle Schwerpunkte</option>
            {[...new Set(sessions.flatMap((session) => session.focuses))].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          <select
            className="control"
            value={ground}
            onChange={(event) => setGround(event.target.value)}
          >
            <option value="all">Alle Untergründe</option>
            <option>Wiese</option>
            <option>Acker</option>
            <option>Waldboden</option>
            <option>gemischt</option>
            <option>sonstiges</option>
          </select>
          <input
            className="control"
            inputMode="numeric"
            placeholder="Liegezeit ab Minuten"
            value={minAging}
            onChange={(event) =>
              setMinAging(event.target.value.replace(/\D/g, ""))
            }
          />
          <input
            className="control"
            inputMode="numeric"
            placeholder="Strecke ab Schritten"
            value={minSteps}
            onChange={(event) =>
              setMinSteps(event.target.value.replace(/\D/g, ""))
            }
          />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Ratio label="Gegenstände selbstständig" {...stats.articles} />
        <Ratio label="Winkel sicher/kontrolliert" {...stats.angles} />
        <Ratio label="Verleitungen bewältigt" {...stats.crossTracks} />
        <Ratio label="Direkte Wiederansätze" {...stats.restarts} />
        <Ratio label="Ziele erreicht" {...stats.goals} />
        <Card className="ifh-ratio">
          <span>Suchqualität Ø</span>
          <strong>
            {stats.qualityAverage?.toLocaleString("de-DE", {
              maximumFractionDigits: 1,
            }) ?? "–"}
          </strong>
          <small>Trainingsskala 1–5</small>
        </Card>
      </div>
      <p className="text-xs text-muted">
        {stats.completed} abgeschlossene Einheiten · {stats.articlesNotFound}{" "}
        nicht auffindbare Gegenstände separat · Entwürfe und „nicht bewertet“
        ausgeschlossen.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h3>Trainingsbedingungen</h3>
          <p className="mt-2 text-sm">
            Ø Strecke:{" "}
            {stats.averageSteps?.toLocaleString("de-DE", {
              maximumFractionDigits: 0,
            }) ?? "–"}{" "}
            Schritte
          </p>
          <p className="mt-1 text-sm">
            Ø Liegezeit:{" "}
            {stats.averageAgingMinutes?.toLocaleString("de-DE", {
              maximumFractionDigits: 0,
            }) ?? "–"}{" "}
            Minuten
          </p>
          <div className="ifh-distribution">
            {Object.entries(stats.groundCounts).map(([name, count]) => (
              <span key={name}>
                {name}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Hilfen</h3>
          <div className="ifh-distribution">
            <span>
              Gegenstände<strong>{stats.helpCounts.articles}</strong>
            </span>
            <span>
              Winkel<strong>{stats.helpCounts.angles}</strong>
            </span>
            <span>
              Verleitungen<strong>{stats.helpCounts.crossTracks}</strong>
            </span>
            <span>
              Regelereignisse<strong>{stats.helpCounts.ruleEvents}</strong>
            </span>
          </div>
        </Card>
        <Card>
          <h3>Gegenstände nach Material</h3>
          <div className="ifh-distribution">
            {Object.entries(stats.materialCounts).map(([name, count]) => (
              <span key={name}>
                {name}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Winkel nach Richtung und Typ</h3>
          <div className="ifh-distribution">
            {Object.entries(stats.angleCounts).map(([name, count]) => (
              <span key={name}>
                {name}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
        </Card>
      </div>
      <section>
        <h3>Vorschläge für das nächste Training</h3>
        <div className="mt-3 space-y-3">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <span className="badge q-blue">Trainingsvorschlag</span>
              <h3 className="mt-2">{suggestion.title}</h3>
              <p className="mt-2 text-sm">{suggestion.observation}</p>
              <p className="mt-2 text-xs text-muted">
                Basis: {suggestion.sampleSize} auswertbare Ereignisse ·{" "}
                {suggestion.comparableConditions}
              </p>
              <p className="mt-2 text-xs text-muted">
                Keine Prüfungsregel, Diagnose oder Erfolgsgarantie.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const next = createIfhSession();
                    next.dog = dog === "all" ? "" : dog;
                    next.focuses =
                      suggestion.focus.includes("Winkel") ||
                      suggestion.focus.includes("Wiederansatz") ||
                      suggestion.focus.includes("Konzentration")
                        ? [suggestion.focus as TrainingFocus]
                        : [];
                    next.goal = suggestion.title;
                    open(next);
                  }}
                >
                  Als Ziel übernehmen
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setRejected((current) => [...current, suggestion.id])
                  }
                >
                  Verwerfen
                </Button>
              </div>
            </Card>
          ))}
          {!suggestions.length ? (
            <div className="ifh-empty compact">
              Noch kein belastbares Muster oder keine auffällige Beobachtung.
              Mindestens drei Einheiten und fünf bewertete Ereignisse sind für
              Muster erforderlich.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function IfhRulebook() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow text-teal">IFH</p>
        <h2>Regelwerk</h2>
      </div>
      <div className="ifh-warning">
        <Lightbulb />
        <div>
          <strong>Mit der Originalquelle abgeglichen</strong>
          <span>
            Die Regeln wurden anhand der FCI-Prüfungsordnung 2025, Seiten
            67–76, einschließlich Tabellen und Abbildungen visuell geprüft.
            Qualitative Vorgaben werden nicht in erfundene feste Abzüge
            umgewandelt.
          </span>
        </div>
      </div>
      {IFH_RULES.map((rule) => (
        <Card key={rule.id}>
          <div className="flex items-start justify-between gap-2">
            <span className="badge q-gray">
              {rule.type === "requirement"
                ? "Vorgabe"
                : rule.type === "fixed-deduction"
                  ? "Fester Abzug"
                  : rule.type === "qualitative"
                    ? "Qualitativ"
                    : "Statusregel"}
            </span>
            <code>{rule.id}</code>
          </div>
          <h3 className="mt-3">{rule.levels.join(" · ")}</h3>
          <p className="mt-2 text-sm">{rule.description}</p>
          <p className="mt-3 text-xs text-muted">
            {rule.source}, S. {rule.pages} · Version {rule.version} ·
            {rule.verification === "verified"
              ? " Originalquelle geprüft"
              : " Originalquelle noch zu prüfen"}
          </p>
        </Card>
      ))}
    </div>
  );
}
