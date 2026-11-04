import { describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import { mergeImport, parseBackup, serializeBackup, toCsv } from "./backup";

const withHurdleDetails = makeResult({
  className: "FCI-VK1",
  hurdles: {
    time: 12.03,
    faults: 2,
    faultDetails: [
      {
        id: "bar-2",
        position: "hurdle-2",
        code: "bar-dropped",
        points: 2,
      },
    ],
  },
});

describe("backup", () => {
  it("round-trips valid JSON including hurdle details", () => {
    const restored = parseBackup(serializeBackup([withHurdleDetails])).results[0];
    expect(restored.id).toBe("1");
    expect(restored.hurdles.faultDetails).toEqual(
      withHurdleDetails.hurdles.faultDetails,
    );
  });

  it("keeps old imports without hurdle details compatible", () => {
    const restored = parseBackup(serializeBackup([makeResult()])).results[0];
    expect(restored.hurdles.faults).toBe(0);
  });

  it("rejects invalid result and hurdle-detail schemas", () => {
    expect(() => parseBackup('{"app":"wrong","results":[]}')).toThrow();
    const invalid = JSON.parse(serializeBackup([withHurdleDetails]));
    invalid.results[0].hurdles.faultDetails[0].points = 10;
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
      "ungültige Hürden-Detailangaben",
    );
  });

  it("skips or replaces duplicates explicitly", () => {
    const old = makeResult();
    const fresh = makeResult({ event: "Neu" });
    expect(mergeImport([old], [fresh]).results[0].event).toBe("HSV Test");
    expect(mergeImport([old], [fresh], true).results[0].event).toBe("Neu");
  });

  it("writes semicolon CSV with decimal commas, BOM and hurdle details", () => {
    const csv = toCsv([withHurdleDetails]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("12,03");
    expect(csv).toContain("Hürde 2: Stange abgeworfen (−2 FP)");
    expect(csv).toContain(";");
  });
});
