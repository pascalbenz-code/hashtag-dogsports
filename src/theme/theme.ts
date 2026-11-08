export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const THEME_STORAGE_KEY = "dogsports-theme";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f6f9fb",
  dark: "#0b0c0d",
};

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

export const resolveTheme = (
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme =>
  preference === "system"
    ? systemPrefersDark
      ? "dark"
      : "light"
    : preference;
