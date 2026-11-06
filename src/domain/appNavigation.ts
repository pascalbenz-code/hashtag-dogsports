export type SportModule = "ths" | "ibgh";
export type Tab = "dashboard" | "judge" | "results" | "new" | "stats";

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
