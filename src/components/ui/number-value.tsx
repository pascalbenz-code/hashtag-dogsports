import { cn } from "../../lib/utils";

export type NumberValueVariant = "hero" | "score" | "compact";

export function NumberValue({
  value,
  variant = "compact",
  prefix = "",
  suffix = "",
  minimumFractionDigits = 1,
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
      {suffix}
    </Component>
  );
}
