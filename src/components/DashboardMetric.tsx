import { Card } from "./ui/card";

export function DashboardMetric({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Card
      className="dashboard-metric flex items-baseline justify-center gap-2 whitespace-nowrap px-2 text-center"
      aria-label={`${value} ${label}`}
    >
      <strong
        className={`dashboard-metric-value ${accent ? "text-teal" : ""}`}
      >
        {value}
      </strong>
      <span className="dashboard-metric-label text-xs font-bold">{label}</span>
    </Card>
  );
}
