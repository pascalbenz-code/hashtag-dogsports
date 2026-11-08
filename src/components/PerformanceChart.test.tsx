import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PerformanceChart from "./PerformanceChart";
import { PERFORMANCE_CHART_THEME } from "./performanceChartTheme";

describe("PerformanceChart", () => {
  it("uses only central theme variables for chart colors", () => {
    expect(Object.values(PERFORMANCE_CHART_THEME)).toEqual([
      "var(--primary-bright)",
      "var(--primary-soft)",
      "var(--border-soft)",
      "var(--text)",
      "var(--text-muted)",
      "var(--surface-elevated)",
      "var(--shadow-card)",
    ]);
    expect(
      Object.values(PERFORMANCE_CHART_THEME).every((value) =>
        value.startsWith("var(--"),
      ),
    ).toBe(true);
  });

  it("keeps the accessible chart container and data API unchanged", () => {
    const html = renderToStaticMarkup(
      <PerformanceChart
        data={[{ date: "07.11.2026", name: "Testturnier", value: 265.5 }]}
        mean={265.5}
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Leistungsdiagramm"');
  });
});
