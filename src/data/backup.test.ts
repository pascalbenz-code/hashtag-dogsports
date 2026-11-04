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
  slalom: {
    time: 14.2,
    faults: 4,
    faultDetails: [
      {
        id: "gate-2",
        position: "gate-2",
        code: "gate-omitted",
        points: 4,
      },
    ],
  },
});

describe("backup", () => {
  const handler = {
    id: "handler-1", name: "Alex", birthDate: "1990-01-02", gender: "male" as const,
    club: "HSV", membershipNumber: "42", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  };
  const dog = {
    id: "dog-1", callName: "Fiete", kennelName: "", breed: "Border Collie",
    birthDate: "2021-01-02", gender: "male" as const, performanceRecordId: "LU-1",
    chipNumber: "123", studbookNumber: "ZB-1", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  };

  it("round-trips valid JSON including hurdle details", () => {
    const restored = parseBackup(serializeBackup([withHurdleDetails])).results[0];
    expect(restored.id).toBe("1");
    expect(restored.hurdles.faultDetails).toEqual(
      withHurdleDetails.hurdles.faultDetails,
    );
    expect(restored.slalom.faultDetails).toEqual(
      withHurdleDetails.slalom.faultDetails,
    );
  });

  it("keeps old imports without hurdle details compatible", () => {
    const restored = parseBackup(serializeBackup([makeResult()])).results[0];
    expect(restored.hurdles.faults).toBe(0);
  });

  it("round-trips global handler and dog profiles", () => {
    const restored = parseBackup(serializeBackup([makeResult()], [handler], [dog]));
    expect(restored.version).toBe(2);
    expect(restored.handlers).toEqual([handler]);
    expect(restored.dogs).toEqual([dog]);
  });

  it("migrates a version-1 backup into shared profiles", () => {
    const old = makeResult({ handlerId: undefined, dogId: undefined });
    const restored = parseBackup(JSON.stringify({ app: "#Dogsports", version: 1, results: [old] }));
    expect(restored.handlers[0].name).toBe(old.handler);
    expect(restored.dogs[0].callName).toBe(old.dog);
    expect(restored.results[0].handlerId).toBe(restored.handlers[0].id);
  });

  it("rejects invalid result and hurdle-detail schemas", () => {
    expect(() => parseBackup('{"app":"wrong","results":[]}')).toThrow();
    const invalid = JSON.parse(serializeBackup([withHurdleDetails]));
    invalid.results[0].hurdles.faultDetails[0].points = 10;
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
      "ungültige Hürden-Detailangaben",
    );
  });

  it("rejects invalid slalom detail schemas", () => {
    const invalid = JSON.parse(serializeBackup([withHurdleDetails]));
    invalid.results[0].slalom.faultDetails[0].points = 8;
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
      "ungültige Slalom-Detailangaben",
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
    expect(csv).toContain("Slalomtor 2: Streckentor nicht durchlaufen (−4 FP)");
    expect(csv).toContain("Alex");
    expect(csv).toContain("Fiete");
    expect(csv).toContain(";");
  });
});
