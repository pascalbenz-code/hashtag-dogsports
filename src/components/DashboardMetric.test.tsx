import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardMetric } from "./DashboardMetric";

describe("DashboardMetric", () => {
  it("keeps value and label in one accessible, spaced metric", () => {
    const html = renderToStaticMarkup(
      <DashboardMetric value="12" label="Turniere" accent />,
    );

    expect(html).toContain('aria-label="12 Turniere"');
    expect(html).toContain("dashboard-metric");
    expect(html).toContain("gap-2");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("dashboard-metric-value text-teal");
    expect(html.indexOf(">12</strong>")).toBeLessThan(
      html.indexOf(">Turniere</span>"),
    );
  });
});
