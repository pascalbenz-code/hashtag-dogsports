import type { SportModule } from "./appNavigation";
export const DASHBOARD_MODULES: { id: SportModule; label: string }[] = [
  { id: "ths", label: "THS" },
  { id: "ibgh", label: "IBGH" },
];
export const dashboardPreferenceKey = (userId: string) =>
  `dogsports-hidden-modules-v1:${userId}`;
export function readHiddenModules(
  userId: string,
  storage: Pick<Storage, "getItem">,
): SportModule[] {
  try {
    const value: unknown = JSON.parse(
      storage.getItem(dashboardPreferenceKey(userId)) ?? "[]",
    );
    return Array.isArray(value)
      ? DASHBOARD_MODULES.filter((m) => value.includes(m.id)).map((m) => m.id)
      : [];
  } catch {
    return [];
  }
}
