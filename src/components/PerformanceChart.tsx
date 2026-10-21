import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceChartProps {
  data: { date: string; name: string; value: number | null }[];
  mean: number | null;
}

const formatValue = (value: number) =>
  value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PerformanceChart({
  data,
  mean,
}: PerformanceChartProps) {
  return (
    <div className="mt-4 h-60" role="img" aria-label="Leistungsdiagramm">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(_, payload) => payload[0]?.payload?.name ?? ""}
          />
          {mean !== null ? (
            <ReferenceLine y={mean} stroke="#31abe4" strokeDasharray="5 4" />
          ) : null}
          <Area
            dataKey="value"
            stroke="#31abe4"
            strokeWidth={3}
            fill="#31abe422"
            dot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
