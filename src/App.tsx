import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  Home,
  Medal,
  MapPinned,
  Plus,
  Scale,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import type { IfhView } from "./components/ifh/IfhModule";
import { db, deleteResult, saveResult } from "./data/db";
import {
  mergeImport,
  parseBackup,
  serializeBackup,
  toCsv,
} from "./data/backup";
import { calculateScore } from "./domain/scoring";
import { bestIds, filterAndSort, type ResultFilters } from "./domain/results";
import { calculateStatistics, type Direction } from "./domain/statistics";
import type {
  CompetitionResult,
  CompetitionType,
  Qualification,
} from "./domain/types";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { LocaleNumberInput } from "./components/LocaleNumberInput";

const PerformanceChart = lazy(() => import("./components/PerformanceChart"));
const JudgeForm = lazy(() =>
  import("./components/JudgeForm").then(({ JudgeForm }) => ({
    default: JudgeForm,
  })),
);
const IbghJudgeForm = lazy(() =>
  import("./components/IbghJudgeForm").then(({ IbghJudgeForm }) => ({
    default: IbghJudgeForm,
  })),
);
const IfhModule = lazy(() =>
  import("./components/ifh/IfhModule").then(({ IfhModule }) => ({
    default: IfhModule,
  })),
);
type SportModule = "ths" | "ibgh" | "ifh";
type Tab = "dashboard" | "judge" | "results" | "new" | "stats";
const tabTitles: Record<Tab, string> = {
  dashboard: "Dashboard",
  judge: "Digitaler Leistungsrichter",
  results: "Ergebnisse",
  new: "Neuer Eintrag",
  stats: "Statistik",
};
const now = () => new Date().toISOString();
const blank = (): CompetitionResult => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().slice(0, 10),
  competitionType: "Vereinsprüfung",
  event: "",
  dog: "",
  handler: "",
  className: "FCI-VK1",
  obedience: null,
  hurdles: { time: null, faults: null },
  slalom: { time: null, faults: null },
  obstacle: { time: null, faults: null },
  notes: "",
  createdAt: now(),
  updatedAt: now(),
});
const newForm = () => {
  try {
    const saved = localStorage.getItem("dogsport-form-draft");
    return saved
      ? { ...blank(), ...(JSON.parse(saved) as CompetitionResult) }
      : blank();
  } catch {
    return blank();
  }
};
const fmt = (v: number | null, digits = 2) =>
  v === null
    ? "–"
    : v.toLocaleString("de-DE", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
const dFmt = (d: string) =>
  new Intl.DateTimeFormat("de-DE").format(new Date(`${d}T12:00:00`));
const download = (body: string, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([body], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
export default function App() {
  const results = useLiveQuery(() => db.results.toArray(), []) ?? [];
  const [sportModule, setSportModule] = useState<SportModule | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [ifhView, setIfhView] = useState<IfhView>("overview");
  const [ifhPlanRevision, setIfhPlanRevision] = useState(0);
  const [ifhDirty, setIfhDirty] = useState(false);
  const [editing, setEditing] = useState<CompetitionResult | null>(null);
  const open = (r?: CompetitionResult) => {
    setEditing(structuredClone(r ?? newForm()));
    setTab("new");
  };
  const navigate = (next: Tab) => {
    setEditing(null);
    setTab(next);
  };
  const openModule = (nextModule: SportModule) => {
    setSportModule(nextModule);
    if (nextModule === "ifh") setIfhView("overview");
    navigate("dashboard");
  };
  const goHome = () => {
    if (
      sportModule === "ifh" &&
      ifhDirty &&
      !confirm("Ungespeicherte IFH-Änderungen verwerfen?")
    )
      return;
    setIfhDirty(false);
    setSportModule(null);
    navigate("dashboard");
  };
  const navigateIfh = (next: IfhView, newPlan = false) => {
    if (
      ifhView === "plan" &&
      ifhDirty &&
      !confirm("Ungespeicherte IFH-Änderungen verwerfen?")
    )
      return;
    setIfhDirty(false);
    if (newPlan) setIfhPlanRevision((current) => current + 1);
    setIfhView(next);
  };
  return (
    <div className={`min-h-dvh ${sportModule ? "pb-28" : "pb-8"}`}>
      <header className="app-header">
        <button type="button" onClick={goHome} aria-label="Zur Startseite">
          <span className="brand">#Dogsports</span>
          <span className="crumb">
            {sportModule
              ? `Modul ${sportModule.toUpperCase()} · ${
                  sportModule === "ifh"
                    ? {
                        overview: "Übersicht",
                        plan: "Training planen",
                        sessions: "Trainingseinheiten",
                        progress: "Fortschritt",
                        rules: "Regelwerk",
                      }[ifhView]
                    : tabTitles[tab]
                }`
              : "Startseite · Modulauswahl"}
          </span>
        </button>
        {sportModule ? (
          <span className="module-chip">{sportModule.toUpperCase()}</span>
        ) : (
          <ShieldCheck aria-hidden="true" />
        )}
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        {!sportModule ? <StartPage openModule={openModule} /> : null}
        {sportModule === "ths" && tab === "dashboard" ? (
          <Dashboard results={results} open={open} />
        ) : null}
        {sportModule === "ths" && tab === "results" ? (
          <Results results={results} open={open} />
        ) : null}
        {sportModule === "ths" && tab === "new" ? (
          <Editor
            key={editing?.id ?? "new"}
            initial={editing ?? newForm()}
            close={() => navigate("results")}
          />
        ) : null}
        {sportModule === "ths" && tab === "stats" ? (
          <Statistics results={results} />
        ) : null}
        {sportModule === "ths" && tab === "judge" ? (
          <Suspense fallback={<Hint text="Leistungsrichter wird geladen …" />}>
            <JudgeForm />
          </Suspense>
        ) : null}
        {sportModule === "ibgh" && tab === "dashboard" ? (
          <IbghDashboard />
        ) : null}
        {sportModule === "ibgh" && tab === "judge" ? (
          <Suspense fallback={<Hint text="Leistungsrichter wird geladen …" />}>
            <IbghJudgeForm />
          </Suspense>
        ) : null}
        {sportModule === "ibgh" && tab === "results" ? (
          <ModulePlaceholder module="IBGH" title="Ergebnisse" />
        ) : null}
        {sportModule === "ibgh" && tab === "new" ? (
          <ModulePlaceholder module="IBGH" title="Neuer Eintrag" />
        ) : null}
        {sportModule === "ibgh" && tab === "stats" ? (
          <ModulePlaceholder module="IBGH" title="Statistik" />
        ) : null}
        {sportModule === "ifh" ? (
          <Suspense fallback={<Hint text="IFH-Modul wird geladen …" />}>
            <IfhModule
              key={`ifh-${ifhPlanRevision}`}
              view={ifhView}
              dogs={[
                ...new Set(
                  results.map((result) => result.dog.trim()).filter(Boolean),
                ),
              ].sort((a, b) => a.localeCompare(b, "de"))}
              onNavigate={setIfhView}
              onDirtyChange={setIfhDirty}
            />
          </Suspense>
        ) : null}
      </main>
      {sportModule && sportModule !== "ifh" ? (
        <nav
          className="bottom-nav"
          aria-label={`Navigation ${sportModule.toUpperCase()}`}
        >
          <Nav
            active={tab === "dashboard"}
            icon={<Home />}
            label="Dashboard"
            onClick={() => navigate("dashboard")}
          />
          <Nav
            active={tab === "judge"}
            icon={<Scale />}
            label="Leistungsrichter"
            onClick={() => navigate("judge")}
          />
          <Nav
            active={tab === "results"}
            icon={<ClipboardList />}
            label="Ergebnisse"
            onClick={() => navigate("results")}
          />
          <Nav
            active={tab === "new"}
            icon={<Plus />}
            label="Neuer Eintrag"
            onClick={() => (sportModule === "ths" ? open() : navigate("new"))}
          />
          <Nav
            active={tab === "stats"}
            icon={<BarChart3 />}
            label="Statistik"
            onClick={() => navigate("stats")}
          />
        </nav>
      ) : null}
      {sportModule === "ifh" ? (
        <nav className="bottom-nav" aria-label="Navigation IFH">
          <Nav
            active={ifhView === "overview"}
            icon={<Home />}
            label="Übersicht"
            onClick={() => navigateIfh("overview")}
          />
          <Nav
            active={ifhView === "plan"}
            icon={<Plus />}
            label="Planen"
            onClick={() => navigateIfh("plan", true)}
          />
          <Nav
            active={ifhView === "sessions"}
            icon={<ClipboardList />}
            label="Einheiten"
            onClick={() => navigateIfh("sessions")}
          />
          <Nav
            active={ifhView === "progress"}
            icon={<BarChart3 />}
            label="Fortschritt"
            onClick={() => navigateIfh("progress")}
          />
          <Nav
            active={ifhView === "rules"}
            icon={<BookOpen />}
            label="Regelwerk"
            onClick={() => navigateIfh("rules")}
          />
        </nav>
      ) : null}
    </div>
  );
}

function StartPage({
  openModule,
}: {
  openModule: (sportModule: SportModule) => void;
}) {
  return (
    <>
      <section className="hero-card" aria-label="#Dogsports">
        <img
          className="hero-banner"
          src="/dogsports-banner.webp"
          alt="#Dogsports mit schwarzem Sporthund"
        />
      </section>
      <div>
        <p className="eyebrow text-teal">SPORTBEREICH AUSWÄHLEN</p>
        <h1 className="text-2xl font-black">
          Welches Modul möchtest du öffnen?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Alle Funktionen und Daten bleiben eindeutig ihrem Sportbereich
          zugeordnet.
        </p>
      </div>
      <div className="module-selection">
        <ModuleChoice
          title="THS"
          description="Turnierhundsport mit Performance Tracker und VDH-VK Leistungsrichter."
          details="Performance Tracker aktiv · Leistungsrichter aktiv"
          icon={<ShieldCheck aria-hidden="true" />}
          onClick={() => openModule("ths")}
        />
        <ModuleChoice
          title="IBGH"
          description="Begleithundesport mit dem Digitalen Leistungsrichter FCI-IBGH."
          details="Leistungsrichter aktiv · weitere Bereiche vorbereitet"
          icon={<Medal aria-hidden="true" />}
          onClick={() => openModule("ibgh")}
        />
        <ModuleChoice
          title="IFH"
          description="Fährtentraining planen, dokumentieren, auswerten und simulieren."
          details="Planung · Einheiten · Fortschritt · Regelwerk"
          icon={<MapPinned aria-hidden="true" />}
          onClick={() => openModule("ifh")}
        />
      </div>
    </>
  );
}

function ModuleChoice({
  title,
  description,
  details,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  details: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="module-choice" onClick={onClick}>
      <span className="module-choice-icon">{icon}</span>
      <span className="module-choice-copy min-w-0 flex-1">
        <strong>{title}</strong>
        <span>{description}</span>
        <small>{details}</small>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function IbghDashboard() {
  return (
    <>
      <Card className="module-dashboard-hero">
        <span className="module-choice-icon">
          <Medal aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow text-teal">MODUL IBGH</p>
          <h2>Dashboard IBGH</h2>
          <p className="mt-2 text-sm text-muted">
            Der Digitale Leistungsrichter ist einsatzbereit. Weitere
            IBGH-Bereiche werden schrittweise ergänzt.
          </p>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <PreparedArea title="Ergebnisse" />
        <PreparedArea title="Neuer Eintrag" />
        <PreparedArea title="Statistik" />
      </div>
    </>
  );
}

function PreparedArea({ title }: { title: string }) {
  return (
    <Card>
      <span className="badge draft">In Vorbereitung</span>
      <h3 className="mt-3">{title}</h3>
      <p className="mt-2 text-sm text-muted">
        Die Navigation ist vorbereitet; fachliche Funktionen folgen später.
      </p>
    </Card>
  );
}

function ModulePlaceholder({
  module,
  title,
}: {
  module: "IBGH";
  title: string;
}) {
  return (
    <Card className="module-placeholder">
      <span className="module-choice-icon">
        <ClipboardList aria-hidden="true" />
      </span>
      <p className="eyebrow text-teal">MODUL {module}</p>
      <h2>{title}</h2>
      <span className="badge draft">In Vorbereitung</span>
      <p className="text-sm text-muted">
        Dieser Bereich ist strukturell angelegt, enthält aber noch keine
        fachlichen Funktionen oder Datenspeicherung.
      </p>
    </Card>
  );
}

function Dashboard({
  results,
  open,
}: {
  results: CompetitionResult[];
  open: (r?: CompetitionResult) => void;
}) {
  const complete = results.filter((r) => calculateScore(r).complete),
    drafts = results.length - complete.length,
    bests = bestIds(results),
    latest = complete.sort((a, b) => b.date.localeCompare(a.date))[0],
    q = complete.reduce(
      (n, r) => n + calculateScore(r).qualifications.length,
      0,
    ),
    series = complete
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: dFmt(r.date),
        value: calculateScore(r).total,
        name: r.event,
      }));
  const metric = (
    ids: Set<string>,
    get: (r: CompetitionResult) => number | null,
  ) => {
    const id = [...ids][0],
      r = results.find((x) => x.id === id);
    return r ? fmt(get(r)) : "–";
  };
  return (
    <>
      <section className="hero-card" aria-label="#Dogsports">
        <img
          className="hero-banner"
          src="/dogsports-banner.webp"
          alt="#Dogsports mit schwarzem Sporthund"
        />
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric value={String(results.length)} label="Turniere" />
        <Metric value={String(complete.length)} label="Vollständig" />
        <Metric value={String(drafts)} label="Entwürfe" />
        <Metric value={String(q)} label="Qualifikationen" accent />
      </div>
      <section>
        <Title text="Persönliche Bestleistungen" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Mini
            label="Gesamt"
            value={metric(bests.total, (r) => calculateScore(r).total)}
          />
          <Mini
            label="Unterordnung"
            value={metric(bests.obedience, (r) => r.obedience)}
          />
          <Mini
            label="Hürden"
            value={metric(bests.hurdles, (r) => r.hurdles.time)}
            unit="s"
          />
          <Mini
            label="Slalom"
            value={metric(bests.slalom, (r) => r.slalom.time)}
            unit="s"
          />
          <Mini
            label="Hindernis"
            value={metric(bests.obstacle, (r) => r.obstacle.time)}
            unit="s"
          />
        </div>
      </section>
      <Card>
        <Title text="Gesamtpunkte-Entwicklung" />
        {series.length ? (
          <Chart
            data={series}
            mean={
              series.reduce((s, x) => s + (x.value ?? 0), 0) / series.length
            }
          />
        ) : (
          <Hint text="Nach dem ersten vollständigen Ergebnis erscheint hier dein Verlauf." />
        )}
      </Card>
      {latest && (
        <>
          <Title text="Letztes vollständiges Ergebnis" />
          <ResultCard
            result={latest}
            onClick={() => open(latest)}
            best={bests.total.has(latest.id)}
          />
        </>
      )}
    </>
  );
}
function Results({
  results,
  open,
}: {
  results: CompetitionResult[];
  open: (r: CompetitionResult) => void;
}) {
  const [f, setF] = useState<ResultFilters>({
      query: "",
      className: "all",
      qualification: "all",
      includeDrafts: true,
      sort: "date-desc",
    }),
    file = useRef<HTMLInputElement>(null),
    shown = useMemo(() => filterAndSort([...results], f), [results, f]),
    bests = useMemo(() => bestIds(results), [results]);
  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.files?.[0];
    if (!input) return;
    try {
      const incoming = parseBackup(await input.text()),
        dupes = incoming.results.filter((r) =>
          results.some((x) => x.id === r.id),
        ).length,
        replace = dupes
          ? confirm(
              `${dupes} ID-Konflikt(e) gefunden. Bestehende Datensätze ersetzen?\nAbbrechen = Konflikte überspringen.`,
            )
          : false,
        merged = mergeImport(results, incoming.results, replace);
      await db.transaction("rw", db.results, async () => {
        await db.results.clear();
        await db.results.bulkPut(merged.results);
      });
      alert(
        `Import abgeschlossen: ${merged.added} neu, ${merged.replaced} ersetzt, ${merged.skipped} übersprungen.`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import fehlgeschlagen.");
    } finally {
      e.target.value = "";
    }
  };
  return (
    <>
      <Title text="Ergebnisse" />
      <Card className="space-y-3">
        <input
          className="control"
          placeholder="Turnier oder Verein suchen"
          value={f.query}
          onChange={(e) => setF({ ...f, query: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select
            className="control"
            value={f.className}
            onChange={(e) =>
              setF({
                ...f,
                className: e.target.value as ResultFilters["className"],
              })
            }
          >
            <option value="all">Alle Stufen</option>
            <option>FCI-VK1</option>
            <option>FCI-VK2</option>
            <option>FCI-VK3</option>
          </select>
          <select
            className="control"
            value={f.qualification}
            onChange={(e) =>
              setF({
                ...f,
                qualification: e.target.value as ResultFilters["qualification"],
              })
            }
          >
            <option value="all">Alle Qualis</option>
            <option value="promotion-vk2">Aufstieg-VK2</option>
            <option value="promotion-vk3">Aufstieg-VK3</option>
            <option value="swhv">swhv</option>
            <option value="dhv">dhv</option>
            <option value="vdh">VDH</option>
          </select>
          <select
            className="control"
            value={f.sort}
            onChange={(e) =>
              setF({ ...f, sort: e.target.value as ResultFilters["sort"] })
            }
          >
            <option value="date-desc">Datum ↓</option>
            <option value="date-asc">Datum ↑</option>
            <option value="score-desc">Punkte ↓</option>
            <option value="score-asc">Punkte ↑</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm">
            <input
              type="checkbox"
              checked={f.includeDrafts}
              onChange={(e) => setF({ ...f, includeDrafts: e.target.checked })}
            />
            Entwürfe
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              download(
                serializeBackup(results),
                `dogsports-backup-${new Date().toISOString().slice(0, 10)}.json`,
                "application/json",
              )
            }
          >
            <Download />
            JSON
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              download(
                toCsv(results),
                `dogsports-export-${new Date().toISOString().slice(0, 10)}.csv`,
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download />
            CSV
          </Button>
          <Button variant="ghost" onClick={() => file.current?.click()}>
            <Upload />
            Import
          </Button>
          <input
            ref={file}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={importFile}
          />
        </div>
      </Card>
      <p className="text-sm text-muted">{shown.length} Datensätze</p>
      <div className="space-y-3 md:hidden">
        {shown.map((r) => (
          <ResultCard
            key={r.id}
            result={r}
            onClick={() => open(r)}
            best={bests.total.has(r.id)}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border bg-white md:block">
        <table>
          <thead>
            <tr>
              {[
                "Datum",
                "Turnier / Verein",
                "Stufe",
                "UO",
                "Hürden",
                "F.",
                "Slalom",
                "F.",
                "Hindernis",
                "F.",
                "Gesamt",
                "Qualifikationen",
                "Status",
              ].map((x, i) => (
                <th key={i}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const s = calculateScore(r);
              return (
                <tr key={r.id} onClick={() => open(r)}>
                  <td>{dFmt(r.date)}</td>
                  <td>{r.event}</td>
                  <td>{r.className}</td>
                  <td className={bests.obedience.has(r.id) ? "best" : ""}>
                    {fmt(r.obedience)}
                  </td>
                  <td className={bests.hurdles.has(r.id) ? "best" : ""}>
                    {fmt(r.hurdles.time)}
                  </td>
                  <td>{fmt(r.hurdles.faults)}</td>
                  <td className={bests.slalom.has(r.id) ? "best" : ""}>
                    {fmt(r.slalom.time)}
                  </td>
                  <td>{fmt(r.slalom.faults)}</td>
                  <td className={bests.obstacle.has(r.id) ? "best" : ""}>
                    {fmt(r.obstacle.time)}
                  </td>
                  <td>{fmt(r.obstacle.faults)}</td>
                  <td className={bests.total.has(r.id) ? "best" : ""}>
                    {fmt(s.total)}
                  </td>
                  <td>
                    <Qualis list={s.qualifications} />
                  </td>
                  <td>{s.complete ? "Vollständig" : "Entwurf"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!shown.length && <Hint text="Keine passenden Ergebnisse gefunden." />}
    </>
  );
}
function Editor({
  initial,
  close,
}: {
  initial: CompetitionResult;
  close: () => void;
}) {
  const [form, setForm] = useState(initial),
    score = calculateScore(form),
    n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", "."))),
    setRun = (
      key: "hurdles" | "slalom" | "obstacle",
      part: "time" | "faults",
      v: string,
    ) => setForm({ ...form, [key]: { ...form[key], [part]: n(v) } });
  const persisted = useLiveQuery(() => db.results.get(form.id), [form.id]);
  useEffect(() => {
    const timer = setTimeout(
      () => localStorage.setItem("dogsport-form-draft", JSON.stringify(form)),
      400,
    );
    return () => clearTimeout(timer);
  }, [form]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveResult(form);
    localStorage.removeItem("dogsport-form-draft");
    setForm(blank());
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-teal">THS · PERFORMANCE TRACKER</p>
          <h2>Ergebnis erfassen</h2>
        </div>
        <Button>Speichern</Button>
      </div>
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Datum">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Prüfungsstufe">
            <select
              value={form.className}
              onChange={(e) =>
                setForm({
                  ...form,
                  className: e.target.value as CompetitionResult["className"],
                })
              }
            >
              <option>FCI-VK1</option>
              <option>FCI-VK2</option>
              <option>FCI-VK3</option>
            </select>
          </Field>
        </div>
        <Field label="Turnierart">
          <select
            value={form.competitionType ?? "Vereinsprüfung"}
            onChange={(e) =>
              setForm({
                ...form,
                competitionType: e.target.value as CompetitionType,
              })
            }
          >
            <option>Vereinsprüfung</option>
            <option>Kreismeisterschaft</option>
            <option>Verbandsmeisterschaft</option>
            <option>dhv Deutsche Meisterschaft</option>
            <option>VDH Deutsche Meisterschaft</option>
          </select>
        </Field>
        <Field label="Turnier / Verein">
          <input
            value={form.event}
            onChange={(e) => setForm({ ...form, event: e.target.value })}
          />
        </Field>
      </Card>
      <Card>
        <h3>Leistungsdaten</h3>
        <Field label="Unterordnung · 0 bis 60 Punkte">
          <LocaleNumberInput
            key={`${form.id}-obedience`}
            value={form.obedience}
            placeholder="0,0"
            max={60}
            maxFractionDigits={1}
            onValueChange={(value) => setForm({ ...form, obedience: value })}
          />
        </Field>
        {(
          [
            ["hurdles", "Hürdenlauf"],
            ["slalom", "Slalomlauf"],
            ["obstacle", "Hindernislauf"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mt-5">
            <h3>{label}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zeit · Sekunden">
                <LocaleNumberInput
                  key={`${form.id}-${key}-time`}
                  value={form[key].time}
                  placeholder="0,00"
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      [key]: { ...form[key], time: value },
                    })
                  }
                />
              </Field>
              <Field label="Fehlerpunkte">
                <input
                  inputMode="decimal"
                  value={form[key].faults ?? ""}
                  onChange={(e) => setRun(key, "faults", e.target.value)}
                />
              </Field>
            </div>
          </div>
        ))}
      </Card>
      <Card className="score">
        <span>
          {score.complete ? "Gesamtpunkte" : "Noch nicht berechenbar"}
        </span>
        {score.complete && <strong>{fmt(score.total)}</strong>}
        <Status score={score} />
        <Qualis list={score.qualifications} />
        {!score.complete && (
          <ul className="errors">
            {score.errors.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <Field label="Notizen">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </Card>
      <div className="flex gap-2">
        <Button className="flex-1">Speichern</Button>
        {persisted ? (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (confirm("Datensatz wirklich löschen?")) {
                await deleteResult(form.id);
                close();
              }
            }}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>
      <p className="text-center text-xs text-muted">
        Änderungen werden zusätzlich lokal als Formularentwurf
        zwischengespeichert.
      </p>
    </form>
  );
}
const METRICS = {
  total: {
    label: "Gesamtpunkte",
    direction: "higher" as Direction,
    get: (r: CompetitionResult) => calculateScore(r).total,
  },
  obedience: {
    label: "Unterordnung",
    direction: "higher" as Direction,
    get: (r: CompetitionResult) => r.obedience,
    limits: { min: 0, max: 60 },
  },
  hurdles: {
    label: "Hürdenlaufzeit",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.hurdles.time,
    limits: { min: 0 },
  },
  hurdleFaults: {
    label: "Hürdenfehler",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.hurdles.faults,
    limits: { min: 0 },
  },
  slalom: {
    label: "Slalomlaufzeit",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.slalom.time,
    limits: { min: 0 },
  },
  slalomFaults: {
    label: "Slalomfehler",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.slalom.faults,
    limits: { min: 0 },
  },
  obstacle: {
    label: "Hindernislaufzeit",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.obstacle.time,
    limits: { min: 0 },
  },
  obstacleFaults: {
    label: "Hindernisfehler",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.obstacle.faults,
    limits: { min: 0 },
  },
};
type MetricKey = keyof typeof METRICS;
function Statistics({ results }: { results: CompetitionResult[] }) {
  const [metric, setMetric] = useState<MetricKey>("total"),
    [stage, setStage] = useState<"all" | CompetitionResult["className"]>(
      "FCI-VK3",
    ),
    [period, setPeriod] = useState("all"),
    [today] = useState(() => Date.now()),
    definition = METRICS[metric],
    cutoff =
      period === "all"
        ? null
        : new Date(today - Number(period) * 24 * 3600 * 1000),
    filtered = results
      .filter((r) => calculateScore(r).complete)
      .filter((r) => stage === "all" || r.className === stage)
      .filter((r) => !cutoff || new Date(r.date) >= cutoff)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      ),
    values = filtered
      .map(definition.get)
      .filter((v): v is number => v !== null),
    stats = calculateStatistics(
      values,
      definition.direction,
      "limits" in definition ? definition.limits : undefined,
    ),
    data = filtered.map((r) => ({
      date: dFmt(r.date),
      name: r.event,
      value: definition.get(r),
    }));
  if (stats.forecast !== null)
    data.push({
      date: "Prognose",
      name: "Statistische Schätzung",
      value: stats.forecast,
    });
  return (
    <>
      <Title text="Statistik THS" />
      <Card className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <select
          className="control"
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
        >
          {Object.entries(METRICS).map(([k, v]) => (
            <option value={k} key={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          className="control"
          value={stage}
          onChange={(e) => setStage(e.target.value as typeof stage)}
        >
          <option value="all">Alle Stufen*</option>
          <option>FCI-VK1</option>
          <option>FCI-VK2</option>
          <option>FCI-VK3</option>
        </select>
        <select
          className="control col-span-2 md:col-span-1"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">Gesamter Zeitraum</option>
          <option value="90">Letzte 3 Monate</option>
          <option value="180">Letzte 6 Monate</option>
          <option value="365">Letztes Jahr</option>
        </select>
      </Card>
      {stage === "all" && metric === "total" && (
        <Hint text="Stufenübergreifende Gesamtpunkte nutzen unterschiedliche Grundwerte." />
      )}
      <Card>
        <h3>{definition.label}</h3>
        {data.length ? (
          <Chart data={data} mean={stats.mean} />
        ) : (
          <Hint text="Für diese Auswahl liegen keine vollständigen Ergebnisse vor." />
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Minimum" value={fmt(stats.min)} />
        <Mini label="Maximum" value={fmt(stats.max)} />
        <Mini label="Mittelwert" value={fmt(stats.mean)} />
        <Mini label="Standardabweichung" value={fmt(stats.standardDeviation)} />
      </div>
      <Card>
        <h3>Trend & Prognose</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Mini
            label="Steigung (letzte 3)"
            value={
              stats.slope === null ? "Nicht genügend Daten" : fmt(stats.slope)
            }
          />
          <Mini
            label="Sportlicher Trend"
            value={
              {
                improving: "Verbesserung",
                worsening: "Verschlechterung",
                unchanged: "Unverändert",
                insufficient: "Nicht genügend Daten",
              }[stats.trend]
            }
          />
          <Mini label="Nächster Wert*" value={fmt(stats.forecast)} />
          <Mini label="Datenpunkte" value={String(values.length)} />
        </div>
        <p className="mt-3 text-xs text-muted">
          * Statistische Schätzung aus linearer Regression der letzten maximal
          fünf Werte, keine Garantie.
        </p>
      </Card>
    </>
  );
}
function Chart({
  data,
  mean,
}: {
  data: { date: string; name: string; value: number | null }[];
  mean: number | null;
}) {
  return (
    <Suspense
      fallback={
        <div className="mt-4 h-60 animate-pulse rounded-xl bg-slate-100" />
      }
    >
      <PerformanceChart data={data} mean={mean} />
    </Suspense>
  );
}
function ResultCard({
  result,
  onClick,
  best = false,
}: {
  result: CompetitionResult;
  onClick: () => void;
  best?: boolean;
}) {
  const s = calculateScore(result);
  return (
    <button className="w-full text-left" onClick={onClick}>
      <Card className="flex items-center gap-4">
        <div className="result-score">
          {s.total === null ? "–" : fmt(s.total)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate">
              {result.event || "Unbenannter Entwurf"}
            </h3>
            {best && <Medal className="size-4 text-amber-500" />}
          </div>
          <p className="text-sm text-muted">
            {dFmt(result.date)} · {result.className}
          </p>
          <div className="mt-2">
            <Qualis list={s.qualifications} />
          </div>
        </div>
        <Status score={s} />
      </Card>
    </button>
  );
}
function Status({ score }: { score: ReturnType<typeof calculateScore> }) {
  return (
    <span className={`badge ${score.complete ? "complete" : "draft"}`}>
      {score.complete ? "Vollständig" : "Entwurf"}
    </span>
  );
}
function Qualis({ list }: { list: Qualification[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((q) => (
        <span className={`badge q-${q.color}`} key={q.key}>
          {q.label}
        </span>
      ))}
    </div>
  );
}
function Nav({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
function Metric({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Card className="text-center">
      <strong className={accent ? "text-teal" : ""}>{value}</strong>
      <span>{label}</span>
    </Card>
  );
}
function Mini({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card className="p-4">
      <p className="label">{label}</p>
      <strong className="text-xl">
        {value}
        {unit && <small> {unit}</small>}
      </strong>
    </Card>
  );
}
function Title({ text }: { text: string }) {
  return <h2>{text}</h2>;
}
function Hint({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-4 text-sm text-muted">{text}</div>
  );
}
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
