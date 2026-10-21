export interface DecimalDraft {
  valid: boolean;
  normalized: string;
  value: number | null;
  committable: boolean;
}

export function parseGermanDecimalDraft(input: string): DecimalDraft {
  const normalized = input.replace(".", ",");
  if (!/^\d*(?:,\d*)?$/.test(normalized)) {
    return { valid: false, normalized, value: null, committable: false };
  }
  if (normalized === "") {
    return { valid: true, normalized, value: null, committable: true };
  }
  if (normalized.endsWith(",")) {
    return { valid: true, normalized, value: null, committable: false };
  }
  return {
    valid: true,
    normalized,
    value: Number(normalized.replace(",", ".")),
    committable: true,
  };
}
