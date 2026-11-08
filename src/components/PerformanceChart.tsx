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
import { PERFORMANCE_CHART_THEME } from "./performanceChartTheme";

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
          <CartesianGrid
            vertical={false}
            stroke={PERFORMANCE_CHART_THEME.grid}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            axisLine={{ stroke: PERFORMANCE_CHART_THEME.grid }}
            tickLine={{ stroke: PERFORMANCE_CHART_THEME.grid }}
            tick={{ fill: PERFORMANCE_CHART_THEME.mutedText }}
          />
          <YAxis
            domain={["auto", "auto"]}
            axisLine={{ stroke: PERFORMANCE_CHART_THEME.grid }}
            tickLine={{ stroke: PERFORMANCE_CHART_THEME.grid }}
            tick={{ fill: PERFORMANCE_CHART_THEME.mutedText }}
          />
          <Tooltip
            formatter={(value) => formatValue(Number(value))}
            labelFormatter={(_, payload) => payload[0]?.payload?.name ?? ""}
            contentStyle={{
              border: `1px solid ${PERFORMANCE_CHART_THEME.grid}`,
              borderRadius: "12px",
              background: PERFORMANCE_CHART_THEME.surface,
              boxShadow: PERFORMANCE_CHART_THEME.shadow,
              color: PERFORMANCE_CHART_THEME.text,
            }}
            labelStyle={{ color: PERFORMANCE_CHART_THEME.text }}
            itemStyle={{ color: PERFORMANCE_CHART_THEME.accent }}
            cursor={{ stroke: PERFORMANCE_CHART_THEME.accent, strokeOpacity: 0.35 }}
          />
          {mean !== null ? (
            <ReferenceLine
              y={mean}
              stroke={PERFORMANCE_CHART_THEME.accent}
              strokeDasharray="5 4"
            />
          ) : null}
          <Area
            dataKey="value"
            stroke={PERFORMANCE_CHART_THEME.accent}
            strokeWidth={3}
            fill={PERFORMANCE_CHART_THEME.accentFill}
            fillOpacity={0.65}
            dot={{
              r: 4,
              fill: PERFORMANCE_CHART_THEME.surface,
              stroke: PERFORMANCE_CHART_THEME.accent,
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: PERFORMANCE_CHART_THEME.accent,
              stroke: PERFORMANCE_CHART_THEME.surface,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
