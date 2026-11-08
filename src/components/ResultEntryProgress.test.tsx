import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResultEntryProgress } from "./ResultEntryProgress";

describe("ResultEntryProgress", () => {
  it("renders all three labelled steps as accessible buttons", () => {
    const html = renderToStaticMarkup(
      <ResultEntryProgress step={1} onStepChange={vi.fn()} />,
    );

    expect(html).toContain('aria-label="Fortschritt Ergebniserfassung"');
    expect(html).toContain("Zuordnung");
    expect(html).toContain("Prüfungsdaten");
    expect(html).toContain("Leistungsdaten");
    expect(html.match(/type="button"/g)).toHaveLength(3);
  });

  it("marks only the active step and completed predecessors", () => {
    const html = renderToStaticMarkup(
      <ResultEntryProgress step={2} onStepChange={vi.fn()} />,
    );

    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('class="completed"');
    expect(html).toContain('class="active"');
    expect(html).toContain('class="pending"');
    expect(html).toContain("Schritt 2 von 3: Prüfungsdaten");
  });
});
