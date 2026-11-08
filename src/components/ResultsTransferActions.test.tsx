import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResultsTransferActions } from "./ResultsTransferActions";

describe("ResultsTransferActions", () => {
  it("renders a compact accessible JSON, CSV and import action group", () => {
    const html = renderToStaticMarkup(
      <ResultsTransferActions
        onJsonExport={vi.fn()}
        onCsvExport={vi.fn()}
        onImport={vi.fn()}
      />,
    );

    expect(html).toContain("Datenverwaltung");
    expect(html).toContain(
      'aria-label="Ergebnisse importieren und exportieren"',
    );
    expect(html).toContain('aria-label="JSON-Backup herunterladen"');
    expect(html).toContain('aria-label="CSV-Export herunterladen"');
    expect(html).toContain('aria-label="JSON-Backup importieren"');
    expect(html).toContain('accept="application/json,.json"');
    expect(html.indexOf(">JSON</button>")).toBeLessThan(
      html.indexOf(">CSV</button>"),
    );
    expect(html.indexOf(">CSV</button>")).toBeLessThan(
      html.indexOf(">Import</button>"),
    );
  });
});
