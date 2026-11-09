import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronRight,
  ClipboardList,
  Cloud,
  Eraser,
  Home,
  Medal,
  Plus,
  Save,
  Scale,
  Settings,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  db,
  deleteResult,
  importBackup,
  saveResult,
} from "./data/db";
import {
  readBackupFile,
  serializeBackup,
  toCsv,
} from "./data/backup";
import { calculateScore, getAgeGroup } from "./domain/scoring";
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
import { HurdleFaultDetails } from "./components/HurdleFaultDetails";
import { SlalomFaultDetails } from "./components/SlalomFaultDetails";
import { ObstacleFaultDetails } from "./components/ObstacleFaultDetails";
import { ProfilesManager } from "./components/ProfilesManager";
import { CloudSyncPanel } from "./components/CloudSyncPanel";
import { AuthGate } from "./components/AuthGate";
import { DashboardMetric } from "./components/DashboardMetric";
import { ResultsTransferActions } from "./components/ResultsTransferActions";
import { StatisticsForecastCard } from "./components/StatisticsForecastCard";
import { ResultEntryProgress } from "./components/ResultEntryProgress";
import { ThemeSettings } from "./components/ThemeSettings";
import { useFeedback } from "./components/feedbackContext";
import {
  useCloudSync,
  type CloudSyncController,
} from "./hooks/useCloudSync";
import { useStepSwipe } from "./hooks/useStepSwipe";
import { useSwipeNavigation } from "./hooks/useSwipeNavigation";
import type { DogProfile, HandlerProfile } from "./domain/profiles";
import {
  formatHurdleFaultDetail,
  hurdleFaultsTotal,
  isValidHurdleFaultDetail,
} from "./domain/hurdleFaults";
import {
  formatSlalomFaultDetail,
  slalomFaultsTotal,
} from "./domain/slalomFaults";
import {
  formatObstacleFaultDetail,
  obstacleFaultsTotal,
} from "./domain/obstacleFaults";
import {
  CLASS_LABELS,
  COMPETITION_CLASSES,
  hurdleReferenceClass,
  isTimeResult,
  isVierkampf,
  normalizedCrossCountryTime,
} from "./domain/disciplines";
import {
  getBackNavigation,
  getNextSwipeTab,
  getTabTransitionDirection,
  type SportModule,
  type Tab,
} from "./domain/appNavigation";
import {
  clearResultFormStep,
  loadNewResultForm,
  loadResultFormStep,
  resetResultForm,
  RESULT_FORM_DRAFT_KEY,
  saveResultFormStep,
  type ResultFormStep,
} from "./domain/resultForm";
import { detectResultAchievements } from "./domain/resultAchievements";
import {
  runViewTransition,
  type ViewTransitionDirection,
} from "./lib/viewTransition";

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
const tabTitles: Record<Tab, string> = {
  dashboard: "Dashboard",
  judge: "Digitaler Leistungsrichter",
  results: "Ergebnisse",
  new: "Neuer Eintrag",
  stats: "Statistik",
};
type AppPanel = "profiles" | "cloud" | "settings" | null;
interface AppHistoryState {
  dogsportsNavigation: true;
  index: number;
  sportModule: SportModule | null;
  tab: Tab;
  panel: AppPanel;
  editingId: string | null;
}
const isAppHistoryState = (value: unknown): value is AppHistoryState =>
  Boolean(
    value &&
      typeof value === "object" &&
      (value as Partial<AppHistoryState>).dogsportsNavigation === true &&
      typeof (value as Partial<AppHistoryState>).index === "number",
  );
const EMPTY_RESULTS: CompetitionResult[] = [];
const EMPTY_HANDLERS: HandlerProfile[] = [];
const EMPTY_DOGS: DogProfile[] = [];
const fmt = (v: number | null, digits = 2) =>
  v === null
    ? "–"
    : v.toLocaleString("de-DE", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
const dFmt = (d: string) =>
  d && Number.isFinite(Date.parse(`${d}T12:00:00`))
    ? new Intl.DateTimeFormat("de-DE").format(new Date(`${d}T12:00:00`)) : "–";
const download = (body: string, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([body], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
export default function App() {
  const cloud = useCloudSync();
  const accessGranted =
    cloud.user && cloud.accessStatus === "ready" && !cloud.recoveryMode;

  if (!accessGranted) return <AuthGate cloud={cloud} />;

  return <AuthenticatedApp cloud={cloud} />;
}

function AuthenticatedApp({ cloud }: { cloud: CloudSyncController }) {
  const results = useLiveQuery(() => db.results.toArray(), []) ?? EMPTY_RESULTS;
  const handlers =
    useLiveQuery(() => db.handlers.orderBy("name").toArray(), []) ??
    EMPTY_HANDLERS;
  const dogs =
    useLiveQuery(() => db.dogs.orderBy("callName").toArray(), []) ?? EMPTY_DOGS;
  const [sportModule, setSportModule] = useState<SportModule | null>(null);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showCloud, setShowCloud] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [editing, setEditing] = useState<CompetitionResult | null>(null);
  const [transitionDirection, setTransitionDirection] =
    useState<ViewTransitionDirection>("lateral");
  const historyIndex = useRef(0);
  const historyReady = useRef(false);
  const panel: AppPanel = showProfiles
    ? "profiles"
    : showCloud
      ? "cloud"
      : showSettings
        ? "settings"
        : null;

  const resolveEditor = useCallback(
    (editingId: string | null) => {
      if (!editingId) return null;
      const localDraft = loadNewResultForm();
      if (localDraft.id === editingId) return localDraft;
      const persisted = results.find((result) => result.id === editingId);
      return persisted ? structuredClone(persisted) : localDraft;
    },
    [results],
  );
  const applyView = useCallback(
    (
      view: Omit<AppHistoryState, "dogsportsNavigation" | "index">,
      direction: ViewTransitionDirection,
    ) => {
      runViewTransition(direction, () => {
        setTransitionDirection(direction);
        setSportModule(view.sportModule);
        setTab(view.tab);
        setShowProfiles(view.panel === "profiles");
        setShowCloud(view.panel === "cloud");
        setShowSettings(view.panel === "settings");
        setEditing((current) =>
          view.tab === "new"
            ? current?.id === view.editingId
              ? current
              : resolveEditor(view.editingId)
            : null,
        );
      });
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [resolveEditor],
  );
  const changeView = (
    view: Omit<AppHistoryState, "dogsportsNavigation" | "index">,
    direction: ViewTransitionDirection,
    mode: "push" | "replace" = "push",
  ) => {
    const index =
      mode === "push" ? historyIndex.current + 1 : historyIndex.current;
    const state: AppHistoryState = {
      ...view,
      dogsportsNavigation: true,
      index,
    };
    historyIndex.current = index;
    window.history[mode === "push" ? "pushState" : "replaceState"](
      state,
      "",
    );
    applyView(view, direction);
  };
  const navigate = (
    next: Tab,
    direction = getTabTransitionDirection(tab, next),
    mode: "push" | "replace" = "push",
  ) => {
    if (next === tab && panel === null && mode === "push") return;
    changeView(
      {
        sportModule,
        tab: next,
        panel: null,
        editingId: null,
      },
      direction,
      mode,
    );
  };
  const open = (result?: CompetitionResult) => {
    const next = structuredClone(result ?? loadNewResultForm());
    changeView(
      {
        sportModule: sportModule ?? "ths",
        tab: "new",
        panel: null,
        editingId: next.id,
      },
      "forward",
    );
  };
  const openModule = (nextModule: SportModule) => {
    changeView(
      {
        sportModule: nextModule,
        tab: "dashboard",
        panel: null,
        editingId: null,
      },
      "forward",
    );
  };
  const goHome = () => {
    if (!sportModule && panel === null) return;
    changeView(
      {
        sportModule: null,
        tab: "dashboard",
        panel: null,
        editingId: null,
      },
      "backward",
    );
  };

  useEffect(() => {
    const initialState: AppHistoryState = {
      dogsportsNavigation: true,
      index: 0,
      sportModule: null,
      tab: "dashboard",
      panel: null,
      editingId: null,
    };
    window.history.replaceState(initialState, "");
    historyIndex.current = 0;
    historyReady.current = true;
  }, []);
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!historyReady.current || !isAppHistoryState(event.state)) return;
      const direction =
        event.state.index < historyIndex.current ? "backward" : "forward";
      historyIndex.current = event.state.index;
      applyView(event.state, direction);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyView]);

  const togglePanel = (nextPanel: Exclude<AppPanel, null>) => {
    if (panel === nextPanel && historyIndex.current > 0) {
      window.history.back();
      return;
    }
    changeView(
      {
        sportModule,
        tab,
        panel: nextPanel,
        editingId: editing?.id ?? null,
      },
      "forward",
    );
  };
  const backNavigation = showSettings
    ? { target: "close-settings" as const, label: "Einstellungen schließen" }
    : showCloud
    ? { target: "close-cloud" as const, label: "Cloud-Sicherung schließen" }
    : getBackNavigation({ sportModule, tab, showProfiles });
  const goBack = () => {
    if (!backNavigation) return;
    if (backNavigation.target === "close-settings") {
      togglePanel("settings");
      return;
    }
    if (backNavigation.target === "close-cloud") {
      togglePanel("cloud");
      return;
    }
    if (backNavigation.target === "close-profiles") {
      togglePanel("profiles");
      return;
    }
    if (backNavigation.target === "home") {
      goHome();
      return;
    }
    navigate("dashboard");
  };
  const contentVisible = !showProfiles && !showCloud && !showSettings;
  const nextSwipeTab = sportModule ? getNextSwipeTab(tab) : null;
  const viewKey = `${panel ?? sportModule ?? "home"}-${tab}-${editing?.id ?? "none"}`;
  const swipeHandlers = useSwipeNavigation({
    disabled: !contentVisible || !sportModule || tab === "new",
    viewKey,
    onSwipeLeft: nextSwipeTab
      ? () => navigate(nextSwipeTab, "forward")
      : undefined,
    onSwipeRight: () => {
      if (historyIndex.current > 0) window.history.back();
    },
  });
  return (
    <div className={`min-h-dvh ${sportModule ? "pb-28" : "pb-8"}`}>
      <header className="app-header">
        {backNavigation ? (
          <button
            type="button"
            className="header-back-button"
            aria-label={backNavigation.label}
            title={backNavigation.label}
            onClick={goBack}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="header-brand-button"
          onClick={goHome}
          aria-label="Zur Startseite"
        >
          <span className="brand">#Dogsports</span>
          <span className="crumb">
            {showCloud
              ? "Cloud-Sicherung · alle Module"
              : showSettings
              ? "Einstellungen · alle Module"
              : showProfiles
              ? "Globale Profile · alle Module"
              : sportModule
              ? `Modul ${sportModule.toUpperCase()} · ${tabTitles[tab]}`
              : "Startseite · Modulauswahl"}
          </span>
        </button>
        <div className="header-actions">
          <button
            type="button"
            className={`header-cloud-button ${showCloud ? "active" : ""} ${cloud.status}`}
            onClick={() => togglePanel("cloud")}
            aria-label={
              cloud.user
                ? `Cloud-Sicherung öffnen, ${cloud.pendingCount} Änderung(en) warten`
                : "Cloud-Sicherung öffnen"
            }
            title="Cloud-Sicherung"
          >
            <Cloud aria-hidden="true" />
            <span className="cloud-indicator" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`header-profile-button ${showProfiles ? "active" : ""}`}
            onClick={() => togglePanel("profiles")}
            aria-label="Hundeführer und Hunde verwalten"
          >
            <UsersRound aria-hidden="true" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            className={`header-settings-button ${showSettings ? "active" : ""}`}
            onClick={() => togglePanel("settings")}
            aria-label="Darstellung einstellen"
            title="Einstellungen"
          >
            <Settings aria-hidden="true" />
            <span>Einstellungen</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="app-swipe-surface" {...swipeHandlers}>
          <div
            className={`app-view app-view--${transitionDirection}`}
            key={viewKey}
          >
        {showCloud ? <CloudSyncPanel cloud={cloud} /> : null}
        {showProfiles ? <ProfilesManager handlers={handlers} dogs={dogs} /> : null}
        {showSettings ? <ThemeSettings /> : null}
        {contentVisible && !sportModule ? <StartPage openModule={openModule} /> : null}
        {contentVisible && sportModule === "ths" && tab === "dashboard" ? (
          <Dashboard results={results} open={open} />
        ) : null}
        {contentVisible && sportModule === "ths" && tab === "results" ? (
          <Results results={results} handlers={handlers} dogs={dogs} open={open} />
        ) : null}
        {contentVisible && sportModule === "ths" && tab === "new" ? (
          <Editor
            key={editing?.id ?? "new"}
            initial={editing ?? loadNewResultForm()}
            close={() => navigate("results", "backward", "replace")}
            onChange={setEditing}
            handlers={handlers}
            dogs={dogs}
            results={results}
            manageProfiles={() => togglePanel("profiles")}
          />
        ) : null}
        {contentVisible && sportModule === "ths" && tab === "stats" ? (
          <Statistics results={results} />
        ) : null}
        {contentVisible && sportModule === "ths" && tab === "judge" ? (
          <Suspense fallback={<Hint text="Leistungsrichter wird geladen …" />}>
            <JudgeForm />
          </Suspense>
        ) : null}
        {contentVisible && sportModule === "ibgh" && tab === "dashboard" ? (
          <IbghDashboard />
        ) : null}
        {contentVisible && sportModule === "ibgh" && tab === "judge" ? (
          <Suspense fallback={<Hint text="Leistungsrichter wird geladen …" />}>
            <IbghJudgeForm />
          </Suspense>
        ) : null}
        {contentVisible && sportModule === "ibgh" && tab === "results" ? (
          <ModulePlaceholder module="IBGH" title="Ergebnisse" />
        ) : null}
        {contentVisible && sportModule === "ibgh" && tab === "new" ? (
          <ModulePlaceholder module="IBGH" title="Neuer Eintrag" />
        ) : null}
        {contentVisible && sportModule === "ibgh" && tab === "stats" ? (
          <ModulePlaceholder module="IBGH" title="Statistik" />
        ) : null}
          </div>
        </div>
      </main>
      {sportModule && contentVisible ? (
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
    </div>
  );
}

function StartPage({
  openModule,
}: {
  openModule: (sportModule: SportModule) => void;
}) {
  return (
    <div className="start-page">
      <section className="hero-card home-hero" aria-label="#Dogsports">
        <img
          className="hero-banner"
          src="/dogsports-banner.webp"
          alt="#Dogsports mit schwarzem Sporthund"
        />
        <p className="home-claim">Track your progress, unlock your success!</p>
      </section>
      <div className="home-intro">
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
      </div>
    </div>
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
    latest = [...complete].sort((a, b) => b.date.localeCompare(a.date))[0],
    comparable = latest
      ? complete.filter((result) => result.className === latest.className)
      : [],
    bests = bestIds(comparable),
    q = complete.reduce(
      (n, r) => n + calculateScore(r).qualifications.length,
      0,
    ),
    series = comparable
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
      <section className="hero-card dashboard-hero" aria-label="#Dogsports">
        <img
          className="hero-banner"
          src="/dogsports-banner.webp"
          alt="#Dogsports mit schwarzem Sporthund"
        />
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardMetric value={String(results.length)} label="Turniere" />
        <DashboardMetric value={String(complete.length)} label="Vollständig" />
        <DashboardMetric value={String(drafts)} label="Entwürfe" />
        <DashboardMetric value={String(q)} label="Qualifikationen" accent />
      </div>
      <section>
        <Title
          text={`Bestleistungen${latest ? ` · ${CLASS_LABELS[latest.className]}` : ""}`}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Mini
            label="Gesamt"
            value={metric(bests.total, (r) => calculateScore(r).total)}
            unit={latest && isTimeResult(latest.className) ? "s" : undefined}
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
        <Title
          text={`${latest && isTimeResult(latest.className) ? "Gesamtzeit" : "Gesamtpunkte"}-Entwicklung${latest ? ` · ${CLASS_LABELS[latest.className]}` : ""}`}
        />
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
  handlers,
  dogs,
  open,
}: {
  results: CompetitionResult[];
  handlers: HandlerProfile[];
  dogs: DogProfile[];
  open: (r: CompetitionResult) => void;
}) {
  const [f, setF] = useState<ResultFilters>({
      query: "",
      className: "all",
      qualification: "all",
      includeDrafts: true,
      sort: "date-desc",
    }),
    shown = useMemo(() => filterAndSort([...results], f), [results, f]),
    bests = useMemo(() => bestIds(results), [results]);
  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.files?.[0];
    if (!input) return;
    try {
      const incoming = await readBackupFile(input);
      const countConflicts = (existing: { id: string }[], imported: { id: string }[]) => {
        const ids = new Set(existing.map((item) => item.id));
        return imported.filter((item) => ids.has(item.id)).length;
      };
      const dupes = countConflicts(results, incoming.results) +
          countConflicts(handlers, incoming.handlers) + countConflicts(dogs, incoming.dogs),
        replace = dupes
          ? confirm(
              `${dupes} ID-Konflikt(e) gefunden. Bestehende Datensätze ersetzen?\nAbbrechen = Konflikte überspringen.`,
            )
          : false;
      const summary = await importBackup(incoming, replace);
      alert(
        `Import abgeschlossen: ${summary.added} neu, ${summary.replaced} ersetzt, ${summary.skipped} übersprungen.`,
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
          placeholder="Turnier, Hundeführer oder Hund suchen"
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
            <option value="all">Alle Disziplinen</option>
            {COMPETITION_CLASSES.map((value) => (
              <option value={value} key={value}>{CLASS_LABELS[value]}</option>
            ))}
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
            <option value="score-desc">Bestes Ergebnis zuerst</option>
            <option value="score-asc">Schwächstes Ergebnis zuerst</option>
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
                "Hundeführer / Hund",
                "Turnier / Verein",
                "Stufe",
                "Zusatzdaten",
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
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => open(r)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      open(r);
                    }
                  }}
                  aria-label={`${r.event || "Unbenannter Entwurf"} bearbeiten`}
                >
                  <td>{dFmt(r.date)}</td>
                  <td>{r.handler} / {r.dog}</td>
                  <td>{r.event}</td>
                  <td>{CLASS_LABELS[r.className]}</td>
                  <td>{additionalResultSummary(r)}</td>
                  <td className={bests.obedience.has(r.id) ? "best" : ""}>
                    {fmt(r.obedience)}
                  </td>
                  <td className={bests.hurdles.has(r.id) ? "best" : ""}>
                    {fmt(r.hurdles.time)}
                  </td>
                  <td
                    title={(r.hurdles.faultDetails ?? [])
                      .map(formatHurdleFaultDetail)
                      .join("\n")}
                  >
                    {fmt(r.hurdles.faults)}
                    {r.hurdles.faultDetails?.length
                      ? ` · ${r.hurdles.faultDetails.length} Details`
                      : ""}
                  </td>
                  <td className={bests.slalom.has(r.id) ? "best" : ""}>
                    {fmt(r.slalom.time)}
                  </td>
                  <td
                    title={(r.slalom.faultDetails ?? [])
                      .map(formatSlalomFaultDetail)
                      .join("\n")}
                  >
                    {fmt(r.slalom.faults)}
                    {r.slalom.faultDetails?.length
                      ? ` · ${r.slalom.faultDetails.length} Details`
                      : ""}
                  </td>
                  <td className={bests.obstacle.has(r.id) ? "best" : ""}>
                    {fmt(r.obstacle.time)}
                  </td>
                  <td
                    title={(r.obstacle.faultDetails ?? [])
                      .map(formatObstacleFaultDetail)
                      .join("\n")}
                  >
                    {fmt(r.obstacle.faults)}
                    {r.obstacle.faultDetails?.length
                      ? ` · ${r.obstacle.faultDetails.length} Details`
                      : ""}
                  </td>
                  <td className={bests.total.has(r.id) ? "best" : ""}>
                    {fmt(s.total)}{isTimeResult(r.className) ? " s" : ""}
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
      <ResultsTransferActions
        onJsonExport={() =>
          download(
            serializeBackup(results, handlers, dogs),
            `dogsports-backup-${new Date().toISOString().slice(0, 10)}.json`,
            "application/json",
          )
        }
        onCsvExport={() =>
          download(
            toCsv(results),
            `dogsports-export-${new Date().toISOString().slice(0, 10)}.csv`,
            "text/csv;charset=utf-8",
          )
        }
        onImport={importFile}
      />
    </>
  );
}
function additionalResultSummary(result: CompetitionResult) {
  if (result.className === "VDH-HL")
    return `L2 ${fmt(result.obstacle2?.time ?? null)} s / ${fmt(result.obstacle2?.faults ?? null)} FP · ${result.obstacleLeash === "on" ? "L1 Leine" : "L1 frei"} · ${result.obstacle2Leash === "on" ? "L2 Leine" : "L2 frei"}`;
  if (result.className === "VDH-DK") {
    const bonus = [result.hurdlesLeash, result.slalomLeash, result.obstacleLeash]
      .filter((mode) => mode === "off").length * 5;
    return `Leinenbonus +${bonus}`;
  }
  if (result.className === "VDH-S-VK")
    return `1000 m: ${fmt(result.crossCountry?.timeSeconds ?? null)} s / ${fmt(result.crossCountry?.distanceMeters ?? null, 1)} m · Wert ${fmt(normalizedCrossCountryTime(result))}${result.crossCountry?.falseStart ? " · Frühstart" : ""}`;
  return "–";
}
function Editor({
  initial,
  close,
  onChange,
  handlers,
  dogs,
  results,
  manageProfiles,
}: {
  initial: CompetitionResult;
  close: () => void;
  onChange: (result: CompetitionResult) => void;
  handlers: HandlerProfile[];
  dogs: DogProfile[];
  results: CompetitionResult[];
  manageProfiles: () => void;
}) {
  const [form, setFormState] = useState(() => {
      const profile = handlers.find((item) => item.id === initial.handlerId);
      return profile
        ? {
            ...initial,
            handlerBirthDate: initial.handlerBirthDate || profile.birthDate,
            handlerGender: initial.handlerGender || profile.gender,
          }
        : initial;
    }),
    [step, setStepState] = useState<ResultFormStep>(() =>
      loadResultFormStep(initial.id),
    ),
    [stepDirection, setStepDirection] = useState<"forward" | "backward">(
      "forward",
    ),
    [isSaving, setIsSaving] = useState(false),
    score = calculateScore(form);
  const { notify } = useFeedback();
  const persisted = useLiveQuery(() => db.results.get(form.id), [form.id]);
  const formRef = useRef(form);
  const stepRef = useRef(step);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const setForm: ResultSetter = setFormState;
  const persistLocalDraft = (value: CompetitionResult) => {
    try {
      localStorage.setItem(RESULT_FORM_DRAFT_KEY, JSON.stringify(value));
    } catch {
      // IndexedDB remains available for explicitly saved drafts. A blocked
      // localStorage must not make the editor unusable.
    }
  };
  const changeStep = (next: ResultFormStep) => {
    setStepDirection(next > stepRef.current ? "forward" : "backward");
    stepRef.current = next;
    setStepState(next);
    saveResultFormStep(formRef.current.id, next);
    window.requestAnimationFrame(() => stepHeading.current?.focus());
  };
  const swipeHandlers = useStepSwipe({
    step,
    onStepChange: changeStep,
    disabled: isSaving,
  });

  useEffect(() => {
    const timer = setTimeout(
      () => persistLocalDraft(form),
      400,
    );
    return () => clearTimeout(timer);
  }, [form]);
  useEffect(() => {
    formRef.current = form;
    onChange(form);
  }, [form, onChange]);
  useEffect(() => {
    stepRef.current = step;
    saveResultFormStep(form.id, step);
  }, [form.id, step]);
  useEffect(
    () => () => {
      persistLocalDraft(formRef.current);
      saveResultFormStep(formRef.current.id, stepRef.current);
    },
    [],
  );

  const startWithEmptyForm = () => {
    clearResultFormStep(formRef.current.id);
    const next = resetResultForm();
    formRef.current = next;
    stepRef.current = 1;
    setStepDirection("backward");
    setFormState(next);
    setStepState(1);
    onChange(next);
    saveResultFormStep(next.id, 1);
  };
  const clearCurrentInputs = () => {
    if (
      !confirm(
        "Aktuelle Eingaben wirklich löschen? Bereits gespeicherte Ergebnisse bleiben unverändert.",
      )
    )
      return;
    startWithEmptyForm();
    notify({
      kind: "cleared",
      title: "Eingaben gelöscht",
      message: "Gespeicherte Ergebnisse wurden nicht verändert.",
    });
  };
  const saveDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveResult(formRef.current);
      persistLocalDraft(formRef.current);
      saveResultFormStep(formRef.current.id, stepRef.current);
      notify({
        kind: "saved",
        title: "Entwurf gespeichert",
        message: `Du kannst bei Schritt ${stepRef.current} weiterarbeiten.`,
      });
    } catch (error) {
      notify({
        kind: "error",
        title: "Entwurf nicht gespeichert",
        message: error instanceof Error ? error.message : "Bitte versuche es erneut.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!score.complete) {
      notify({
        kind: "error",
        title: "Ergebnis noch unvollständig",
        message: "Ergänze die markierten Angaben oder speichere den Zwischenstand als Entwurf.",
      });
      return;
    }
    setIsSaving(true);
    const achievements = detectResultAchievements(results, formRef.current);
    try {
      await saveResult(formRef.current);
      notify({
        kind: "saved",
        title: "Ergebnis gespeichert",
        message: "Der Datensatz wurde sicher übernommen.",
      });
      if (achievements.firstResult)
        notify({
          kind: "first",
          title: "Dein erstes Ergebnis!",
          message: "Ein starker Start für deine #Dogsports-Historie.",
        });
      if (achievements.personalBest)
        notify({
          kind: "record",
          title: "Neue persönliche Bestleistung",
          message: `Bestwert in ${CLASS_LABELS[formRef.current.className]} erreicht.`,
        });
      if (achievements.newQualifications.length)
        notify({
          kind: "qualifications",
          title: "Neue Qualifikation erreicht",
          message: "Die neu erfüllten Kriterien wurden deinem Ergebnis zugeordnet.",
          qualifications: achievements.newQualifications,
        });
      startWithEmptyForm();
    } catch (error) {
      notify({
        kind: "error",
        title: "Ergebnis nicht gespeichert",
        message: error instanceof Error ? error.message : "Bitte versuche es erneut.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="result-entry-header">
        <div>
          <p className="eyebrow text-teal">THS · PERFORMANCE TRACKER</p>
          <h2>Ergebnis erfassen</h2>
        </div>
        <div className="result-entry-header-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCurrentInputs}
            disabled={isSaving}
          >
            <Eraser aria-hidden="true" />
            Eingaben löschen
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void saveDraft()}
            disabled={isSaving}
          >
            <Save aria-hidden="true" />
            Entwurf speichern
          </Button>
        </div>
      </div>
      <ResultEntryProgress step={step} onStepChange={changeStep} />
      <section
        className={`result-entry-step step-${stepDirection}`}
        aria-labelledby={`result-step-${step}`}
        key={step}
        {...swipeHandlers}
      >
        <h3
          id={`result-step-${step}`}
          className="sr-only"
          tabIndex={-1}
          ref={stepHeading}
        >
          Schritt {step}: {step === 1 ? "Zuordnung" : step === 2 ? "Prüfungsdaten" : "Leistungsdaten"}
        </h3>
        {step === 1 ? (
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3>Zuordnung</h3>
              <Button type="button" variant="ghost" size="sm" onClick={manageProfiles}>
                <UsersRound /> Profile verwalten
              </Button>
            </div>
            {!handlers.length || !dogs.length ? (
              <Hint text="Lege zuerst mindestens einen Hundeführer und einen Hund in den globalen Profilen an." />
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hundeführer">
                <select
                  required
                  value={form.handlerId ?? ""}
                  onChange={(e) => {
                    const selected = handlers.find((item) => item.id === e.target.value);
                    setForm({
                      ...form,
                      handlerId: selected?.id ?? "",
                      handler: selected?.name ?? "",
                      handlerBirthDate: selected?.birthDate ?? "",
                      handlerGender: selected?.gender ?? "",
                    });
                  }}
                >
                  <option value="">Bitte auswählen</option>
                  {handlers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="Hund">
                <select
                  required
                  value={form.dogId ?? ""}
                  onChange={(e) => {
                    const selected = dogs.find((item) => item.id === e.target.value);
                    setForm({ ...form, dogId: selected?.id ?? "", dog: selected?.callName ?? "" });
                  }}
                >
                  <option value="">Bitte auswählen</option>
                  {dogs.map((item) => <option key={item.id} value={item.id}>{item.callName}</option>)}
                </select>
              </Field>
            </div>
          </Card>
        ) : null}
        {step === 2 ? (
          <Card>
            <h3 className="mb-4">Prüfungsdaten</h3>
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
                  onChange={(e) => {
                    const className = e.target.value as CompetitionResult["className"];
                    const previousDetails = form.hurdles.faultDetails ?? [];
                    const faultDetails = previousDetails.filter((detail) =>
                      isValidHurdleFaultDetail(detail, hurdleReferenceClass(className)),
                    );
                    setForm({
                      ...form,
                      className,
                      hurdles: {
                        ...form.hurdles,
                        faults:
                          previousDetails.length === 0
                            ? form.hurdles.faults
                            : faultDetails.length
                              ? hurdleFaultsTotal(faultDetails)
                              : null,
                        faultDetails,
                      },
                    });
                  }}
                >
                  {COMPETITION_CLASSES.map((value) => (
                    <option value={value} key={value}>{CLASS_LABELS[value]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Turnierart">
              <select
                value={form.competitionType ?? "Vereinsprüfung"}
                onChange={(e) =>
                  setForm({ ...form, competitionType: e.target.value as CompetitionType })
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
              <input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
            </Field>
          </Card>
        ) : null}
        {step === 3 ? (
          <div className="space-y-5">
            <PerformanceFields form={form} setForm={setForm} />
            <Card className="score">
              <span>
                {score.complete
                  ? isTimeResult(form.className)
                    ? "Gesamtzeit inklusive Fehlern"
                    : "Gesamtpunkte"
                  : "Noch nicht berechenbar"}
              </span>
              {score.complete && (
                <strong>{fmt(score.total)}{isTimeResult(form.className) ? " s" : ""}</strong>
              )}
              <Status score={score} />
              <Qualis list={score.qualifications} />
              {!score.complete && (
                <ul className="errors">
                  {score.errors.map((x) => <li key={x}>{x}</li>)}
                </ul>
              )}
            </Card>
            <Card>
              <Field label="Notizen">
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </Card>
          </div>
        ) : null}
      </section>
      <div className="result-entry-navigation">
        {step > 1 ? (
          <Button type="button" variant="ghost" onClick={() => changeStep((step - 1) as ResultFormStep)} disabled={isSaving}>
            <ArrowLeft aria-hidden="true" /> Zurück
          </Button>
        ) : <span />}
        {step < 3 ? (
          <Button type="button" onClick={() => changeStep((step + 1) as ResultFormStep)} disabled={isSaving}>
            Weiter <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSaving || !score.complete}>
            <Save aria-hidden="true" /> {isSaving ? "Wird gespeichert …" : "Ergebnis speichern"}
          </Button>
        )}
        {persisted ? (
          <Button
            type="button"
            variant="danger"
            size="icon"
            aria-label="Datensatz löschen"
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
        Änderungen und der aktuelle Schritt werden zusätzlich lokal zwischengespeichert.
        Mit „Entwurf speichern“ sicherst du den Zwischenstand dauerhaft.
      </p>
    </form>
  );
}

type ResultSetter = React.Dispatch<React.SetStateAction<CompetitionResult>>;
const parseNumber = (value: string) =>
  value.trim() === "" ? null : Number(value.replace(",", "."));

function PerformanceFields({
  form,
  setForm,
}: {
  form: CompetitionResult;
  setForm: ResultSetter;
}) {
  const normalized = normalizedCrossCountryTime(form);
  if (form.className === "VDH-HL") {
    return (
      <Card>
        <h3>Hindernislauf · zwei Läufe</h3>
        <p className="mt-2 text-sm text-muted">
          Beide Laufzeiten, Fehlerpunkte und gegebenenfalls fünf Strafsekunden
          für „mit Leine“ werden addiert. Eine kleinere Gesamtzeit ist besser.
        </p>
        <ObstacleRunFields runNumber={1} form={form} setForm={setForm} />
        <ObstacleRunFields runNumber={2} form={form} setForm={setForm} />
      </Card>
    );
  }
  return (
    <Card>
      <h3>Leistungsdaten</h3>
      {isVierkampf(form.className) ? (
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
      ) : null}
      {form.className === "VDH-S-VK" ? (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <h3>1000-m-Lauf</h3>
          <p className="mt-2 text-sm text-muted">
            Altersklasse: <strong>{formatAgeGroup(getAgeGroup(form.handlerBirthDate ?? "", form.date))}</strong>
            {form.handlerGender ? ` · ${form.handlerGender === "male" ? "männlich" : "weiblich"}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Gemessene Zeit · Sekunden">
              <LocaleNumberInput
                value={form.crossCountry?.timeSeconds ?? null}
                placeholder="652,00"
                onValueChange={(timeSeconds) =>
                  setForm({
                    ...form,
                    crossCountry: {
                      ...(form.crossCountry ?? { distanceMeters: 1000, falseStart: false }),
                      timeSeconds,
                    },
                  })
                }
              />
            </Field>
            <Field label="Tatsächliche Strecke · Meter">
              <LocaleNumberInput
                value={form.crossCountry?.distanceMeters ?? null}
                placeholder="1000"
                maxFractionDigits={1}
                onValueChange={(distanceMeters) =>
                  setForm({
                    ...form,
                    crossCountry: {
                      ...(form.crossCountry ?? { timeSeconds: null, falseStart: false }),
                      distanceMeters,
                    },
                  })
                }
              />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.crossCountry?.falseStart ?? false}
              onChange={(event) =>
                setForm({
                  ...form,
                  crossCountry: {
                    ...(form.crossCountry ?? { timeSeconds: null, distanceMeters: 1000 }),
                    falseStart: event.target.checked,
                  },
                })
              }
            />
            Frühstart · −10 Punkte
          </label>
          <p className="mt-3 text-sm text-muted">
            Rechnerischer 1000-m-Wert: <strong>{fmt(normalized)} Punkte</strong>
          </p>
        </div>
      ) : null}
      {form.className === "VDH-DK" ? (
        <p className="mt-3 text-sm text-muted">
          Ohne Leine werden je Laufdisziplin fünf Bonuspunkte vergeben.
        </p>
      ) : null}
      {(["hurdles", "slalom", "obstacle"] as const).map((key) => (
        <StandardRunFields key={key} runKey={key} form={form} setForm={setForm} />
      ))}
    </Card>
  );
}

function formatAgeGroup(group: ReturnType<typeof getAgeGroup>) {
  return group
    ? { youngest: "Jüngstenklasse · bis AK14", youth: "Jugendklasse · AK15", active: "Aktivenklasse · AK19/AK35", senior: "Seniorenklasse · ab AK50" }[group]
    : "Hundeführerprofil auswählen";
}

function StandardRunFields({
  runKey,
  form,
  setForm,
}: {
  runKey: "hurdles" | "slalom" | "obstacle";
  form: CompetitionResult;
  setForm: ResultSetter;
}) {
  const labels = { hurdles: "Hürdenlauf", slalom: "Slalomlauf", obstacle: "Hindernislauf" } as const;
  const run = form[runKey];
  const details = run.faultDetails ?? [];
  const leashKey = `${runKey}Leash` as "hurdlesLeash" | "slalomLeash" | "obstacleLeash";
  const update = (part: "time" | "faults", value: number | null) =>
    setForm({ ...form, [runKey]: { ...run, [part]: value } });
  return (
    <div className="mt-5">
      <h3>{labels[runKey]}</h3>
      {form.className === "VDH-DK" ? (
        <Field label="Leinenstatus">
          <select
            value={form[leashKey] ?? "on"}
            onChange={(event) => setForm({ ...form, [leashKey]: event.target.value })}
          >
            <option value="on">Mit Leine · kein Bonus</option>
            <option value="off">Ohne Leine · +5 Punkte</option>
          </select>
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zeit · Sekunden">
          <LocaleNumberInput value={run.time} placeholder="0,00" onValueChange={(value) => update("time", value)} />
        </Field>
        <Field label="Fehlerpunkte">
          <input
            inputMode="decimal"
            value={run.faults ?? ""}
            readOnly={details.length > 0}
            onChange={(event) => update("faults", parseNumber(event.target.value))}
          />
        </Field>
      </div>
      {details.length ? <p className="mt-2 text-xs text-muted">Die Fehlerpunkte werden aus den Detailangaben berechnet.</p> : null}
      {runKey === "hurdles" ? (
        <HurdleFaultDetails
          key={hurdleReferenceClass(form.className)}
          className={hurdleReferenceClass(form.className)}
          details={form.hurdles.faultDetails ?? []}
          onChange={(faultDetails) => setForm({ ...form, hurdles: { ...form.hurdles, faults: faultDetails.length ? hurdleFaultsTotal(faultDetails) : null, faultDetails } })}
        />
      ) : runKey === "slalom" ? (
        <SlalomFaultDetails
          className={form.className}
          details={form.slalom.faultDetails ?? []}
          onChange={(faultDetails) => setForm({ ...form, slalom: { ...form.slalom, faults: faultDetails.length ? slalomFaultsTotal(faultDetails) : null, faultDetails } })}
        />
      ) : (
        <ObstacleFaultDetails
          details={form.obstacle.faultDetails ?? []}
          onChange={(faultDetails) => setForm({ ...form, obstacle: { ...form.obstacle, faults: faultDetails.length ? obstacleFaultsTotal(faultDetails) : null, faultDetails } })}
        />
      )}
    </div>
  );
}

function ObstacleRunFields({
  runNumber,
  form,
  setForm,
}: {
  runNumber: 1 | 2;
  form: CompetitionResult;
  setForm: ResultSetter;
}) {
  const runKey = runNumber === 1 ? "obstacle" : "obstacle2";
  const leashKey = runNumber === 1 ? "obstacleLeash" : "obstacle2Leash";
  const run = form[runKey] ?? { time: null, faults: null, faultDetails: [] };
  const details = run.faultDetails ?? [];
  return (
    <div className="mt-5 border-t pt-4">
      <h3>Lauf {runNumber}</h3>
      <Field label="Leinenstatus">
        <select value={form[leashKey] ?? "on"} onChange={(event) => setForm({ ...form, [leashKey]: event.target.value })}>
          <option value="off">Ohne Leine · keine Strafsekunden</option>
          <option value="on">Mit Leine · +5 Strafsekunden</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zeit · Sekunden">
          <LocaleNumberInput value={run.time} placeholder="0,00" onValueChange={(time) => setForm({ ...form, [runKey]: { ...run, time } })} />
        </Field>
        <Field label="Fehlerpunkte">
          <input inputMode="decimal" value={run.faults ?? ""} readOnly={details.length > 0} onChange={(event) => setForm({ ...form, [runKey]: { ...run, faults: parseNumber(event.target.value) } })} />
        </Field>
      </div>
      {details.length ? <p className="mt-2 text-xs text-muted">Die Fehlerpunkte werden aus den Detailangaben berechnet.</p> : null}
      <ObstacleFaultDetails
        details={details}
        onChange={(faultDetails) => setForm({ ...form, [runKey]: { ...run, faults: faultDetails.length ? obstacleFaultsTotal(faultDetails) : null, faultDetails } })}
      />
    </div>
  );
}
const METRICS = {
  total: {
    label: "Gesamtergebnis",
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
  obstacle2: {
    label: "Hindernislauf 2 · Laufzeit",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.obstacle2?.time ?? null,
    limits: { min: 0 },
  },
  obstacle2Faults: {
    label: "Hindernislauf 2 · Fehler",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.obstacle2?.faults ?? null,
    limits: { min: 0 },
  },
  crossCountryRaw: {
    label: "1000-m-Lauf · gemessene Sekunden",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => r.crossCountry?.timeSeconds ?? null,
    limits: { min: 0 },
  },
  crossCountryNormalized: {
    label: "1000-m-Lauf · rechnerischer Wert",
    direction: "lower" as Direction,
    get: (r: CompetitionResult) => normalizedCrossCountryTime(r),
    limits: { min: 0 },
  },
  crossCountryDistance: {
    label: "1000-m-Lauf · Streckenlänge",
    direction: "higher" as Direction,
    get: (r: CompetitionResult) => r.crossCountry?.distanceMeters ?? null,
    limits: { min: 0 },
  },
};
type MetricKey = keyof typeof METRICS;
const metricKeysForClass = (className: CompetitionResult["className"]): MetricKey[] => {
  if (className === "VDH-HL")
    return ["total", "obstacle", "obstacleFaults", "obstacle2", "obstacle2Faults"];
  if (className === "VDH-S-VK")
    return ["total", "crossCountryRaw", "crossCountryNormalized", "crossCountryDistance", "hurdles", "hurdleFaults", "slalom", "slalomFaults", "obstacle", "obstacleFaults"];
  if (className === "VDH-DK")
    return ["total", "hurdles", "hurdleFaults", "slalom", "slalomFaults", "obstacle", "obstacleFaults"];
  return ["total", "obedience", "hurdles", "hurdleFaults", "slalom", "slalomFaults", "obstacle", "obstacleFaults"];
};
function Statistics({ results }: { results: CompetitionResult[] }) {
  const [metric, setMetric] = useState<MetricKey>("total"),
    [stage, setStage] = useState<CompetitionResult["className"]>("FCI-VK3"),
    [period, setPeriod] = useState("all"),
    [today] = useState(() => Date.now()),
    definition = METRICS[metric],
    direction = metric === "total" && isTimeResult(stage)
      ? "lower" as Direction
      : definition.direction,
    metricLabel = metric === "total"
      ? isTimeResult(stage) ? "Gesamtzeit inklusive Fehlern" : "Gesamtpunkte"
      : definition.label,
    cutoff =
      period === "all"
        ? null
        : new Date(today - Number(period) * 24 * 3600 * 1000),
    filtered = results
      .filter((r) => calculateScore(r).complete)
      .filter((r) => r.className === stage)
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
      direction,
      "limits" in definition ? definition.limits : undefined,
    ),
    data = filtered
      .map((r) => ({
        date: dFmt(r.date),
        name: r.event,
        value: definition.get(r),
      }))
      .filter((item) => item.value !== null);
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
          {metricKeysForClass(stage).map((key) => (
            <option value={key} key={key}>
              {METRICS[key].label}
            </option>
          ))}
        </select>
        <select
          className="control"
          value={stage}
          onChange={(e) => {
            setStage(e.target.value as typeof stage);
            setMetric("total");
          }}
        >
          {COMPETITION_CLASSES.map((value) => (
            <option value={value} key={value}>{CLASS_LABELS[value]}</option>
          ))}
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
      <Hint text="Statistiken vergleichen ausschließlich Ergebnisse derselben Disziplin. Dadurch werden Punktewertungen und HL-Gesamtzeiten nicht vermischt." />
      <Card>
        <h3>{metricLabel}</h3>
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
      <StatisticsForecastCard
        forecast={stats.forecast}
        dataPoints={values.length}
        formatValue={(value) => fmt(value)}
      />
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
    <button type="button" className="w-full text-left" data-swipe-card onClick={onClick}>
      <Card className="flex items-center gap-4">
        <div className="result-score">
          {s.total === null
            ? "–"
            : `${fmt(s.total)}${isTimeResult(result.className) ? " s" : ""}`}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate">
              {result.event || "Unbenannter Entwurf"}
            </h3>
            {best && <Medal className="size-4 text-amber-500" />}
          </div>
          <p className="text-sm text-muted">
            {dFmt(result.date)} · {CLASS_LABELS[result.className]}
          </p>
          <p className="mt-1 text-xs text-muted">
            {result.handler || "Kein Hundeführer"} · {result.dog || "Kein Hund"}
          </p>
          {result.hurdles.faultDetails?.length ? (
            <p className="mt-1 text-xs text-muted">
              Hürden: {result.hurdles.faultDetails.length} Detailangaben · {" "}
              {hurdleFaultsTotal(result.hurdles.faultDetails)} FP
            </p>
          ) : null}
          {result.slalom.faultDetails?.length ? (
            <p className="mt-1 text-xs text-muted">
              Slalom: {result.slalom.faultDetails.length} Detailangaben ·{" "}
              {slalomFaultsTotal(result.slalom.faultDetails)} FP
            </p>
          ) : null}
          {result.obstacle.faultDetails?.length ? (
            <p className="mt-1 text-xs text-muted">
              Hindernis: {result.obstacle.faultDetails.length} Detailangaben ·{" "}
              {obstacleFaultsTotal(result.obstacle.faultDetails)} FP
            </p>
          ) : null}
          {result.className === "VDH-HL" && result.obstacle2 ? (
            <p className="mt-1 text-xs text-muted">
              Lauf 2: {fmt(result.obstacle2.time)} s · {fmt(result.obstacle2.faults)} FP
            </p>
          ) : null}
          {result.className === "VDH-S-VK" ? (
            <p className="mt-1 text-xs text-muted">
              1000-m-Wert: {fmt(normalizedCrossCountryTime(result))}
            </p>
          ) : null}
          {result.className === "VDH-DK" ? (
            <p className="mt-1 text-xs text-muted">
              Leinenbonus: +{[result.hurdlesLeash, result.slalomLeash, result.obstacleLeash].filter((mode) => mode === "off").length * 5} Punkte
            </p>
          ) : null}
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
    <button
      type="button"
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        if (!active) onClick();
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
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
