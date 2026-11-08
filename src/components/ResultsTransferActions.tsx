import { useId, useRef, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function ResultsTransferActions({
  onJsonExport,
  onCsvExport,
  onImport,
}: {
  onJsonExport: () => void;
  onCsvExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
}) {
  const titleId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <Card
      className="results-transfer-actions space-y-3 border-dashed p-4 shadow-none"
      aria-labelledby={titleId}
    >
      <div className="results-transfer-copy">
        <h3 id={titleId}>Datenverwaltung</h3>
        <p className="mt-1 text-xs text-muted">
          Sicherung, Tabellenexport und Wiederherstellung
        </p>
      </div>
      <div
        className="results-transfer-buttons grid grid-cols-3 gap-2"
        role="group"
        aria-label="Ergebnisse importieren und exportieren"
      >
        <Button
          type="button"
          variant="ghost"
          className="results-transfer-button px-2 text-xs"
          aria-label="JSON-Backup herunterladen"
          onClick={onJsonExport}
        >
          <Download aria-hidden="true" />
          JSON
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="results-transfer-button px-2 text-xs"
          aria-label="CSV-Export herunterladen"
          onClick={onCsvExport}
        >
          <Download aria-hidden="true" />
          CSV
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="results-transfer-button px-2 text-xs"
          aria-label="JSON-Backup importieren"
          onClick={() => fileInput.current?.click()}
        >
          <Upload aria-hidden="true" />
          Import
        </Button>
      </div>
      <input
        ref={fileInput}
        className="hidden"
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        onChange={onImport}
      />
    </Card>
  );
}
