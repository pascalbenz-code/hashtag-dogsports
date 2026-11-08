import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeSelector } from "../components/ThemeSettings";
import { isThemePreference, resolveTheme } from "./theme";
import { ThemeProvider } from "./ThemeProvider";

describe("ThemeProvider", () => {
  it("resolves system, light and dark preferences deterministically", () => {
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("accepts only supported persisted values", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("renders all accessible choices and marks the preference", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider initialPreference="dark">
        <ThemeSelector />
      </ThemeProvider>,
    );

    expect(html).toContain("System");
    expect(html).toContain("Hell");
    expect(html).toContain("Dunkel");
    expect(html).toContain('class="theme-option active" aria-pressed="true"');
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
  });
});
