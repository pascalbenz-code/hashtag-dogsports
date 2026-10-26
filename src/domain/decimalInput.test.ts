import { describe, expect, it } from "vitest";
import { parseGermanDecimalDraft } from "./decimalInput";

describe("German decimal input", () => {
  it("keeps a trailing comma as an editable intermediate value", () => {
    expect(parseGermanDecimalDraft("12,")).toEqual({
      valid: true,
      normalized: "12,",
      value: null,
      committable: false,
    });
  });
  it("parses a completed decimal comma", () => {
    expect(parseGermanDecimalDraft("12,03").value).toBe(12.03);
  });
  it("normalizes a period for German display", () => {
    expect(parseGermanDecimalDraft("9.44").normalized).toBe("9,44");
  });
  it("rejects non-numeric characters", () => {
    expect(parseGermanDecimalDraft("12,a").valid).toBe(false);
  });
  it("allows a negative decimal when explicitly enabled", () => {
    expect(
      parseGermanDecimalDraft("-4,5", {
        allowNegative: true,
        maxFractionDigits: 1,
      }).value,
    ).toBe(-4.5);
    expect(parseGermanDecimalDraft("-4,5").valid).toBe(false);
  });
  it("parses an obedience score with one decimal place", () => {
    const constraints = { max: 60, maxFractionDigits: 1 };
    expect(parseGermanDecimalDraft("59,5", constraints)).toEqual({
      valid: true,
      normalized: "59,5",
      value: 59.5,
      committable: true,
    });
    expect(parseGermanDecimalDraft("59,55", constraints).valid).toBe(false);
    expect(parseGermanDecimalDraft("60,1", constraints).valid).toBe(false);
  });
});
