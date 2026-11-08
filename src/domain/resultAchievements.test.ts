import { describe, expect, it } from "vitest";
import { makeResult } from "../test/factory";
import { detectResultAchievements } from "./resultAchievements";

describe("result achievements", () => {
  it("marks the first persisted result without inventing a personal best", () => {
    const result = detectResultAchievements([], makeResult());
    expect(result.firstResult).toBe(true);
    expect(result.personalBest).toBe(false);
  });

  it("still marks the first completed result after its draft was saved", () => {
    const candidate = makeResult({ id: "first" });
    const savedDraft = makeResult({
      id: "first",
      event: "",
      obedience: null,
    });

    expect(detectResultAchievements([savedDraft], candidate).firstResult).toBe(
      true,
    );
  });

  it("only recognizes a strictly higher point result as a personal best", () => {
    const previous = makeResult({
      id: "previous",
      obedience: 50,
      competitionType: "dhv Deutsche Meisterschaft",
    });
    const improved = makeResult({
      id: "improved",
      obedience: 51,
      competitionType: "dhv Deutsche Meisterschaft",
    });
    const tied = makeResult({
      id: "tied",
      obedience: 50,
      competitionType: "dhv Deutsche Meisterschaft",
    });

    expect(detectResultAchievements([previous], improved).personalBest).toBe(
      true,
    );
    expect(detectResultAchievements([previous], tied).personalBest).toBe(
      false,
    );
  });

  it("recognizes an improved edit of the current personal best", () => {
    const previousVersion = makeResult({
      id: "same-result",
      obedience: 50,
      competitionType: "dhv Deutsche Meisterschaft",
    });
    const editedVersion = {
      ...previousVersion,
      obedience: 52,
    };

    expect(
      detectResultAchievements([previousVersion], editedVersion).personalBest,
    ).toBe(true);
  });

  it("uses a lower total as the personal best for VDH-HL", () => {
    const previous = makeResult({
      id: "slow",
      className: "VDH-HL",
      obstacle: { time: 25, faults: 0 },
      obstacle2: { time: 26, faults: 0 },
      obstacleLeash: "off",
      obstacle2Leash: "off",
    });
    const faster = makeResult({
      id: "fast",
      className: "VDH-HL",
      obstacle: { time: 20, faults: 0 },
      obstacle2: { time: 21, faults: 0 },
      obstacleLeash: "off",
      obstacle2Leash: "off",
    });

    expect(detectResultAchievements([previous], faster).personalBest).toBe(
      true,
    );
  });

  it("excludes drafts from personal bests and qualifications", () => {
    const previous = makeResult({ id: "previous" });
    const draft = makeResult({
      id: "draft",
      event: "",
      obedience: null,
      hurdles: { time: null, faults: null },
      slalom: { time: null, faults: null },
      obstacle: { time: null, faults: null },
    });
    const result = detectResultAchievements([previous], draft);

    expect(result.personalBest).toBe(false);
    expect(result.newQualifications).toEqual([]);
  });

  it("groups newly reached sporting qualifications and ignores unchanged ones", () => {
    const previousVersion = makeResult({
      id: "result",
      competitionType: "Vereinsprüfung",
      obedience: 48,
    });
    const candidate = {
      ...previousVersion,
      competitionType: "Verbandsmeisterschaft" as const,
      obedience: 55,
    };

    expect(
      detectResultAchievements([previousVersion], candidate).newQualifications.map(
        (qualification) => qualification.key,
      ),
    ).toEqual(["dhv", "vdh"]);
    expect(
      detectResultAchievements([candidate], candidate).newQualifications,
    ).toEqual([]);
  });

  it("does not treat promotion badges as qualification celebrations", () => {
    const candidate = makeResult({
      id: "vk1",
      className: "FCI-VK1",
      obedience: 48,
      hurdles: { time: 16, faults: 0 },
      slalom: { time: 16, faults: 0 },
      obstacle: { time: 16, faults: 0 },
    });

    expect(
      detectResultAchievements([], candidate).newQualifications,
    ).toEqual([]);
  });
});
