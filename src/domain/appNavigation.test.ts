import { describe, expect, it } from "vitest";
import {
  getBackNavigation,
  getNextSwipeTab,
  getTabTransitionDirection,
  type SportModule,
  type Tab,
} from "./appNavigation";

describe("app back navigation", () => {
  it("does not show a back action on the start page", () => {
    expect(
      getBackNavigation({
        sportModule: null,
        tab: "dashboard",
        showProfiles: false,
      }),
    ).toBeNull();
  });

  it.each(["ths", "ibgh"] satisfies SportModule[])(
    "returns from the %s dashboard to the module selection",
    (sportModule) => {
      expect(
        getBackNavigation({
          sportModule,
          tab: "dashboard",
          showProfiles: false,
        }),
      ).toEqual({ target: "home", label: "Zurück zur Modulauswahl" });
    },
  );

  it.each([
    "judge",
    "results",
    "new",
    "stats",
  ] satisfies Tab[])("returns from %s to the current module dashboard", (tab) => {
    expect(
      getBackNavigation({ sportModule: "ths", tab, showProfiles: false }),
    ).toEqual({
      target: "dashboard",
      label: "Zurück zum THS-Dashboard",
    });
  });

  it("closes global profiles back to the previous view", () => {
    expect(
      getBackNavigation({
        sportModule: "ibgh",
        tab: "judge",
        showProfiles: true,
      }),
    ).toEqual({
      target: "close-profiles",
      label: "Zurück zur vorherigen Ansicht",
    });
  });

  it("orders top-level transitions without enabling app swipes in the editor", () => {
    expect(getTabTransitionDirection("dashboard", "results")).toBe("forward");
    expect(getTabTransitionDirection("stats", "judge")).toBe("backward");
    expect(getNextSwipeTab("dashboard")).toBe("judge");
    expect(getNextSwipeTab("results")).toBe("new");
    expect(getNextSwipeTab("new")).toBe("stats");
    expect(getNextSwipeTab("stats")).toBeNull();
  });
});
