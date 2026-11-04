import { describe, expect, it } from "vitest";
import {
  calculateAge,
  validateDogProfile,
  validateHandlerProfile,
  type DogProfile,
  type HandlerProfile,
} from "./profiles";

const metadata = {
  id: "profile-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("global profiles", () => {
  it("calculates age before, on and after the birthday", () => {
    expect(calculateAge("2000-11-05", new Date(2026, 10, 4))).toBe(25);
    expect(calculateAge("2000-11-04", new Date(2026, 10, 4))).toBe(26);
    expect(calculateAge("2000-11-03", new Date(2026, 10, 4))).toBe(26);
  });

  it("rejects invalid and future dates", () => {
    expect(calculateAge("2025-02-30", new Date(2026, 10, 4))).toBeNull();
    expect(calculateAge("2027-01-01", new Date(2026, 10, 4))).toBeNull();
  });

  it("requires personal handler data but keeps club data optional", () => {
    const handler: HandlerProfile = {
      ...metadata,
      name: "Alex Muster",
      birthDate: "1990-05-10",
      gender: "male",
      club: "",
      membershipNumber: "",
    };
    expect(validateHandlerProfile(handler)).toEqual([]);
    expect(validateHandlerProfile({ ...handler, name: "" })).toContain(
      "Name fehlt",
    );
  });

  it("requires the requested dog master data but keeps LU data optional", () => {
    const dog: DogProfile = {
      ...metadata,
      callName: "Fiete",
      kennelName: "",
      breed: "Border Collie",
      birthDate: "2021-03-12",
      gender: "male",
      performanceRecordId: "",
      chipNumber: "",
      studbookNumber: "",
    };
    expect(validateDogProfile(dog)).toEqual([]);
    expect(validateDogProfile({ ...dog, breed: "" })).toContain("Rasse fehlt");
  });
});
