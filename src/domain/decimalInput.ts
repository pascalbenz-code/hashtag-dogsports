export interface DecimalDraft {
  valid: boolean;
  normalized: string;
  value: number | null;
  committable: boolean;
}

interface DecimalConstraints {
  max?: number;
  maxFractionDigits?: number;
  allowNegative?: boolean;
}

export function parseGermanDecimalDraft(
  input: string,
  constraints: DecimalConstraints = {},
): DecimalDraft {
  const normalized = input.replace(".", ",");
  const pattern = constraints.allowNegative
    ? /^-?\d*(?:,\d*)?$/
    : /^\d*(?:,\d*)?$/;
  if (!pattern.test(normalized)) {
    return { valid: false, normalized, value: null, committable: false };
  }
  const fraction = normalized.split(",")[1];
  if (
    constraints.maxFractionDigits !== undefined &&
    fraction !== undefined &&
    fraction.length > constraints.maxFractionDigits
  ) {
    return { valid: false, normalized, value: null, committable: false };
  }
  if (normalized === "") {
    return { valid: true, normalized, value: null, committable: true };
  }
  if (normalized === "-" || normalized.endsWith(",")) {
    return { valid: true, normalized, value: null, committable: false };
  }
  const value = Number(normalized.replace(",", "."));
  if (constraints.max !== undefined && value > constraints.max) {
    return { valid: false, normalized, value: null, committable: false };
  }
  return {
    valid: true,
    normalized,
    value,
    committable: true,
  };
}
