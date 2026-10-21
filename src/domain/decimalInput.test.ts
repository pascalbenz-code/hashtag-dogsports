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
});
