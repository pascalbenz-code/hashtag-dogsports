import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StatisticsForecastCard } from "./StatisticsForecastCard";

describe("StatisticsForecastCard", () => {
  it("shows only forecast and data points in the requested order", () => {
    const formatValue = vi.fn((value: number | null) =>
      value === null ? "–" : value.toLocaleString("de-DE"),
    );
    const html = renderToStaticMarkup(
      <StatisticsForecastCard
        forecast={12.5}
        dataPoints={4}
        formatValue={formatValue}
      />,
    );

    expect(formatValue).toHaveBeenCalledWith(12.5);
    expect(html).toContain("Prognose");
    expect(html).toContain("12,5");
    expect(html.indexOf("Nächster Wert*")).toBeLessThan(
      html.indexOf("Datenpunkte"),
    );
    expect(html).not.toContain("Steigung");
    expect(html).not.toContain("Sportlicher Trend");
  });
});
