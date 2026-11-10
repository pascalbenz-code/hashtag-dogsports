import { expect, it } from "vitest";
import {
  readHiddenModules,
  dashboardPreferenceKey,
} from "./dashboardPreferences";
it("defaults to every module for absent or malformed preferences", () => {
  for (const value of [null, "null", "{}", "not-json"])
    expect(readHiddenModules("user", { getItem: () => value })).toEqual([]);
});
it("stores account-scoped exclusions and ignores unknown modules", () => {
  expect(
    readHiddenModules("a", {
      getItem: (key) =>
        key === dashboardPreferenceKey("a") ? '["ibgh","future"]' : null,
    }),
  ).toEqual(["ibgh"]);
  expect(dashboardPreferenceKey("a")).not.toBe(dashboardPreferenceKey("b"));
  expect(
    readHiddenModules("a", {
      getItem: () => {
        throw Error("blocked");
      },
    }),
  ).toEqual([]);
});
