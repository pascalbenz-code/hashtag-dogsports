import { cn } from "../../lib/utils";

export type NumberValueVariant = "hero" | "score" | "compact";
export type MeasurementKind = "faults" | "points" | "deduction";

export function NumberValue({
  value,
  variant = "compact",
  prefix = "",
  suffix = "",
  minimumFractionDigits = 0,
  maximumFractionDigits = 1,
  as: Component = "span",
  className,
}: {
  value: number;
  variant?: NumberValueVariant;
  prefix?: string;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  as?: "span" | "strong";
  className?: string;
}) {
  const formatted = value.toLocaleString("de-DE", {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return (
    <Component
      className={cn(
        "numeric-value",
        `numeric-value--${variant}`,
        className,
      )}
      data-numeric-variant={variant}
    >
      {prefix}
      {formatted}
      {suffix ? (
        <>
          {" "}
          <span className="numeric-unit">{suffix.trim()}</span>
        </>
      ) : null}
    </Component>
  );
}

export function MeasurementValue({
  value,
  kind,
  variant = "compact",
  as = "span",
  className,
  maximumFractionDigits = 1,
}: {
  value: number;
  kind: MeasurementKind;
  variant?: NumberValueVariant;
  as?: "span" | "strong";
  className?: string;
  maximumFractionDigits?: number;
}) {
  const isDeduction = kind === "deduction";
  return (
    <NumberValue
      as={as}
      value={isDeduction ? Math.abs(value) : value}
      variant={variant}
      prefix={isDeduction && value !== 0 ? "−" : ""}
      suffix={kind === "faults" ? " FP" : " Punkte"}
      minimumFractionDigits={0}
      maximumFractionDigits={maximumFractionDigits}
      className={className}
    />
  );
}
