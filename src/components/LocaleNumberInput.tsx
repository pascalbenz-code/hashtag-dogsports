import { useState } from "react";
import { parseGermanDecimalDraft } from "../domain/decimalInput";

export function LocaleNumberInput({
  id,
  value,
  onValueChange,
  placeholder,
  max,
  maxFractionDigits,
  allowNegative,
  ariaLabel,
}: {
  id?: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  max?: number;
  maxFractionDigits?: number;
  allowNegative?: boolean;
  ariaLabel?: string;
}) {
  const [rawValue, setRawValue] = useState(
    value === null ? "" : String(value).replace(".", ","),
  );

  return (
    <input
      id={id}
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
          allowNegative,
        });
        if (!parsed.valid) return;
        setRawValue(parsed.normalized);
        if (parsed.committable) onValueChange(parsed.value);
      }}
    />
  );
}
