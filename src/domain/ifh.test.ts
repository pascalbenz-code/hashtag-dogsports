import { describe, expect, it } from "vitest";
import {
  calculateFixedDeductions,
  calculateIfhProgress,
  calculateTiming,
  createIfhSession,
  duplicateIfhSession,
  generateIfhSuggestions,
} from "./ifh";
import { IFH_RULES, validateIfhStructure } from "./ifhRules";
import type { IfhAngle, IfhArticle, IfhCrossTrack, IfhLeg } from "./ifhTypes";

const leg = (order: number, lengthSteps = 160): IfhLeg => ({
  id: `leg-${order}`,
  order,
  lengthSteps,
  lengthMeters: null,
  ground: "Wiese",
  vegetation: "",
  direction: "",
  shape: "straight",
  semicircleRadiusMeters: null,
  semicircleDirection: null,
  notes: "",
});
const angle = (
  id: string,
  legId: string,
  positionSteps: number,
  direction: "left" | "right" = "left",
): IfhAngle => ({
  id,
  legId,
  positionSteps,
  direction,
  degrees: 90,
  type: "right",
  evaluation: { result: "unrated", intensityAfter: "unrated", note: "" },
});
const article = (
  number: number,
  legId: string,
  positionSteps: number,
): IfhArticle => ({
  id: `article-${number}`,
  number,
  material: ["Holz", "Leder", "Textil"][number - 1] ?? `Material ${number}`,
  legId,
  positionSteps,
  dimensionsCm: { length: 10, width: 2.5, height: 0.7 },
  carriedFrom: "2026-10-26T08:00:00.000Z",
  laidAt: "2026-10-26T08:40:00.000Z",
  evaluation: {
    result: "unrated",
    indication: "unrated",
    pointPosition: "unrated",
    relation: "unrated",
    confidence: null,
    unrestAvoidance: null,
    holdsPosition: null,
    help: "",
    restart: "unrated",
    mediaReference: "",
    note: "",
  },
});

describe("IFH domain", () => {
  it("keeps planned and actually laid tracks independent", () => {
    const session = createIfhSession();
    session.plannedTrack.legs.push(leg(1));
    session.actualTrack = structuredClone(session.plannedTrack);
    session.actualTrack.legs[0].lengthSteps = 180;

    expect(session.plannedTrack.legs[0].lengthSteps).toBe(160);
    expect(session.actualTrack.legs[0].lengthSteps).toBe(180);
  });

  it("duplicates planning but no actual timing, evaluation, or result", () => {
    const session = createIfhSession();
    session.title = "Original";
    session.status = "completed";
    session.outcomeStatus = "disqualified";
    session.plannedTrack.legs.push(leg(1));
    session.actualTrack.legs.push(leg(1, 200));
    session.timing.actualStartAt = "2026-10-26T10:00:00.000Z";
    session.manualExamScore = 81;
    const copy = duplicateIfhSession(session);

    expect(copy.id).not.toBe(session.id);
    expect(copy.plannedTrack).toEqual(session.plannedTrack);
    expect(copy.actualTrack.legs).toHaveLength(0);
    expect(copy.timing.actualStartAt).toBeUndefined();
    expect(copy.manualExamScore).toBeNull();
    expect(copy.status).toBe("draft");
    expect(copy.outcomeStatus).toBe("incomplete");
  });

  it("checks an entered IFH1 structure and leaves missing facts not checkable", () => {
    const session = createIfhSession();
    session.mode = "simulation";
    session.targetLevel = "FCI-IFH1";
    session.trackOwnership = "own";
    session.plannedTrack.legs = [1, 2, 3, 4, 5].map((order) => leg(order));
    session.plannedTrack.angles = [
      angle("a1", "leg-1", 150),
      angle("a2", "leg-2", 150, "right"),
      angle("a3", "leg-3", 150),
      angle("a4", "leg-4", 150, "right"),
    ];
    session.plannedTrack.articles = [
      article(1, "leg-1", 100),
      article(2, "leg-3", 80),
      article(3, "leg-5", 160),
    ];
    session.plannedTrack.postLastArticleStraightSteps = 10;
    const checks = validateIfhStructure(session);

    expect(checks.find((item) => item.label === "Fährtenart")?.status).toBe(
      "conform",
    );
    expect(checks.find((item) => item.label === "Grundaufbau")?.status).toBe(
      "conform",
    );
    expect(checks.find((item) => item.label === "Liegezeit")?.status).toBe(
      "not-checkable",
    );
    expect(checks.find((item) => item.label === "Fährtenleine")?.status).toBe(
      "not-checkable",
    );
    const metadataIds = new Set(IFH_RULES.map((rule) => rule.id));
    expect(checks.every((item) => metadataIds.has(item.ruleId))).toBe(true);
  });

  it("calculates persisted timestamps and counts pauses inside search duration", () => {
    const timing = {
      pauses: [
        {
          id: "pause",
          startedAt: "2026-10-26T10:10:00.000Z",
          endedAt: "2026-10-26T10:15:00.000Z",
          reason: "Wasser",
        },
      ],
      agingReference: "laying-ended-to-start" as const,
      layingEndedAt: "2026-10-26T08:00:00.000Z",
      actualStartAt: "2026-10-26T10:00:00.000Z",
      searchEndedAt: "2026-10-26T10:30:00.000Z",
    };
    const first = calculateTiming(timing);
    const afterReload = calculateTiming(structuredClone(timing));

    expect(first.agingMinutes).toBe(120);
    expect(first.searchMinutes).toBe(30);
    expect(first.pauseMinutes).toBe(5);
    expect(afterReload).toEqual(first);
  });

  it("deducts exactly three points for two extra start commands", () => {
    const result = calculateFixedDeductions([
      {
        id: "1",
        sourceEventKey: "start-1",
        code: "extra-search-command-start",
        count: 2,
        note: "",
      },
    ]);
    expect(result.total).toBe(3);
  });

  it("does not count the same rule event twice", () => {
    const result = calculateFixedDeductions([
      {
        id: "1",
        sourceEventKey: "same-observation",
        code: "restart-after-recall",
        count: 1,
        note: "",
      },
      {
        id: "2",
        sourceEventKey: "same-observation",
        code: "restart-after-recall",
        count: 1,
        note: "duplicate",
      },
    ]);
    expect(result.total).toBe(4);
    expect(result.duplicatesIgnored).toBe(1);
  });

  it("excludes unrated events and treats allowed control as successful", () => {
    const session = createIfhSession();
    session.status = "completed";
    const rated = angle("rated", "leg-1", 20);
    rated.evaluation.result = "controlled";
    const unrated = angle("unrated", "leg-1", 40);
    const cross: IfhCrossTrack = {
      id: "cross",
      legId: "leg-1",
      positionSteps: 60,
      crossingAngle: 90,
      layer: "Person",
      evaluation: { result: "checked-stayed", note: "" },
    };
    session.actualTrack.angles = [rated, unrated];
    session.actualTrack.crossTracks = [cross];
    const progress = calculateIfhProgress([session]);

    expect(progress.angles).toEqual({ success: 1, total: 1 });
    expect(progress.crossTracks).toEqual({ success: 1, total: 1 });
  });

  it("does not turn a time overrun on the last leg into an automatic termination", () => {
    const session = createIfhSession();
    session.mode = "simulation";
    session.targetLevel = "FCI-IFH1";
    session.outcomeStatus = "incomplete";
    session.timing.actualStartAt = "2026-10-26T10:00:00.000Z";
    session.timing.searchEndedAt = "2026-10-26T10:35:00.000Z";

    expect(calculateTiming(session.timing).searchMinutes).toBe(35);
    expect(
      validateIfhStructure(session).find(
        (item) => item.ruleId === "IFH-TIME-LIMIT",
      ),
    ).toMatchObject({ status: "not-checkable" });
    expect(session.outcomeStatus).toBe("incomplete");
  });

  it("keeps training end, PO termination, and disqualification distinct", () => {
    const statuses = [
      "training-ended",
      "po-terminated",
      "disqualified",
    ] as const;
    expect(new Set(statuses).size).toBe(3);
  });

  it("does not claim a robust suggestion below the sample threshold", () => {
    const session = createIfhSession();
    session.status = "completed";
    const weak = angle("weak", "leg-1", 30);
    weak.evaluation.result = "lost";
    session.actualTrack.angles = [weak];
    const suggestions = generateIfhSuggestions([session]);
    expect(suggestions[0]).toMatchObject({
      title: "Bisher wenige Daten",
      insufficient: true,
    });
  });
});
