export type SportModule = "ths" | "ibgh";
export type Tab = "dashboard" | "judge" | "results" | "new" | "stats";

const TAB_ORDER: readonly Tab[] = [
  "dashboard",
  "judge",
  "results",
  "new",
  "stats",
];
const SWIPE_TAB_ORDER: readonly Tab[] = [
  "dashboard",
  "judge",
  "results",
  "new",
  "stats",
];

export function getTabTransitionDirection(current: Tab, next: Tab) {
  const currentIndex = TAB_ORDER.indexOf(current);
  const nextIndex = TAB_ORDER.indexOf(next);
  if (currentIndex === nextIndex) return "lateral" as const;
  return nextIndex > currentIndex ? ("forward" as const) : ("backward" as const);
}

export function getNextSwipeTab(tab: Tab): Tab | null {
  const index = SWIPE_TAB_ORDER.indexOf(tab);
  return index >= 0 && index < SWIPE_TAB_ORDER.length - 1
    ? SWIPE_TAB_ORDER[index + 1]
    : null;
}

export type BackTarget = "close-profiles" | "home" | "dashboard";

export interface BackNavigation {
  target: BackTarget;
  label: string;
}

export function getBackNavigation({
  sportModule,
  tab,
  showProfiles,
}: {
  sportModule: SportModule | null;
  tab: Tab;
  showProfiles: boolean;
}): BackNavigation | null {
  if (showProfiles)
    return {
      target: "close-profiles",
      label: "Zurück zur vorherigen Ansicht",
    };
  if (!sportModule) return null;
  if (tab === "dashboard")
    return { target: "home", label: "Zurück zur Modulauswahl" };
  return {
    target: "dashboard",
    label: `Zurück zum ${sportModule.toUpperCase()}-Dashboard`,
  };
}
