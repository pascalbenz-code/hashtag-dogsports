import { Card } from "./ui/card";

function ForecastValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="statistics-forecast-value rounded-xl border border-black/8 p-4">
      <span className="label">{label}</span>
      <strong className="block text-xl">{value}</strong>
    </div>
  );
}

export function StatisticsForecastCard({
  forecast,
  dataPoints,
  formatValue,
}: {
  forecast: number | null;
  dataPoints: number;
  formatValue: (value: number | null) => string;
}) {
  return (
    <Card className="statistics-forecast-card">
      <h3>Prognose</h3>
      <div className="statistics-forecast-grid mt-3 grid grid-cols-2 gap-3">
        <ForecastValue label="Nächster Wert*" value={formatValue(forecast)} />
        <ForecastValue label="Datenpunkte" value={String(dataPoints)} />
      </div>
      <p className="mt-3 text-xs text-muted">
        * Statistische Schätzung aus linearer Regression der letzten maximal
        fünf Werte, keine Garantie.
      </p>
    </Card>
  );
}
