import { useState } from "react";
import { parseGermanDecimalDraft } from "../domain/decimalInput";

export function LocaleNumberInput({
  value,
  onValueChange,
  placeholder,
  max,
  maxFractionDigits,
  ariaLabel,
}: {
  value: number | null;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  max?: number;
  maxFractionDigits?: number;
  ariaLabel?: string;
}) {
  const [rawValue, setRawValue] = useState(
    value === null ? "" : String(value).replace(".", ","),
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      enterKeyHint="next"
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={rawValue}
      onChange={(event) => {
        const parsed = parseGermanDecimalDraft(event.target.value, {
          max,
          maxFractionDigits,
        });
        if (!parsed.valid) return;
        setRawValue(parsed.normalized);
        if (parsed.committable) onValueChange(parsed.value);
      }}
    />
  );
}
