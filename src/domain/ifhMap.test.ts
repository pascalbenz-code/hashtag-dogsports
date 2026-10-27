import { describe, expect, it } from "vitest";
import {
  boundaryAreaSquareMeters,
  generateMapRoute,
  mapRouteToTrack,
  routeLengthMeters,
} from "./ifhMap";
import type { IfhLngLat, IfhMapGeneratorSettings } from "./ifhTypes";

const boundary: IfhLngLat[] = [
  [9.17, 48.77],
  [9.177, 48.77],
  [9.177, 48.776],
  [9.17, 48.776],
];
const settings: IfhMapGeneratorSettings = {
  desiredSteps: 400,
  legCount: 5,
  articleCount: 3,
  acuteAngleCount: 0,
  edgeClearanceMeters: 5,
  seed: 17,
};

describe("IFH map planning", () => {
  it("generates a deterministic route inside a marked training area", () => {
    const first = generateMapRoute(boundary, settings, 0.7);
    const second = generateMapRoute(boundary, settings, 0.7);

    expect(first.coordinates).toEqual(second.coordinates);
    expect(first.coordinates).toHaveLength(6);
    expect(first.lengthMeters).toBeGreaterThan(100);
    expect(boundaryAreaSquareMeters(boundary)).toBeGreaterThan(100_000);
    expect(routeLengthMeters(first.coordinates)).toBeCloseTo(
      first.lengthMeters,
      5,
    );
  });

  it("converts a route into independently assessable track sections", () => {
    const generated = generateMapRoute(boundary, settings, 0.7);
    const track = mapRouteToTrack(
      generated.coordinates,
      0.7,
      3,
      2,
      "foreign",
    );

    expect(track.legs).toHaveLength(5);
    expect(track.angles).toHaveLength(4);
    expect(track.articles).toHaveLength(3);
    expect(track.crossTracks).toHaveLength(2);
    expect(track.legs.every((leg) => leg.evaluation?.rating === "unrated")).toBe(
      true,
    );
    expect(track.articles.at(-1)?.legId).toBe(track.legs.at(-1)?.id);
    expect(track.postLastArticleStraightSteps).toBe(10);
  });

  it("rejects generation without boundary or explicit step length", () => {
    expect(() => generateMapRoute(null, settings, 0.7)).toThrow(
      /Geländegrenze/,
    );
    expect(() => generateMapRoute(boundary, settings, null)).toThrow(
      /Schrittlänge/,
    );
  });

  it("treats unfinished or malformed drawing geometry as zero area", () => {
    expect(boundaryAreaSquareMeters([])).toBe(0);
    expect(boundaryAreaSquareMeters([[9.17, 48.77]])).toBe(0);
    expect(
      boundaryAreaSquareMeters([
        [9.17, 48.77],
        [9.177, 48.77],
        [Number.NaN, 48.776],
      ]),
    ).toBe(0);
  });
});
