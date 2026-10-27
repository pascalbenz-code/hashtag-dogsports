import along from "@turf/along";
import area from "@turf/area";
import bearing from "@turf/bearing";
import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import buffer from "@turf/buffer";
import destination from "@turf/destination";
import distance from "@turf/distance";
import { lineString, point, polygon } from "@turf/helpers";
import length from "@turf/length";
import type {
  IfhAngle,
  IfhArticle,
  IfhCrossTrack,
  IfhLeg,
  IfhLngLat,
  IfhMapGeneratorSettings,
  IfhTrack,
} from "./ifhTypes";

export interface IfhGeneratedMapRoute {
  coordinates: IfhLngLat[];
  lengthMeters: number;
  warnings: string[];
}

const closeRing = (coordinates: IfhLngLat[]) => {
  const ring = coordinates.map((coordinate) => [...coordinate] as IfhLngLat);
  const first = ring[0];
  const last = ring.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([...first]);
  }
  return ring;
};

const seededRandom = (initialSeed: number) => {
  let seed = Math.trunc(initialSeed) || 1;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

const normalizeHeading = (value: number) => ((value + 540) % 360) - 180;

export const routeLengthMeters = (coordinates: IfhLngLat[] | null) =>
  coordinates && coordinates.length > 1
    ? length(lineString(coordinates), { units: "kilometers" }) * 1000
    : 0;

export const boundaryAreaSquareMeters = (coordinates: IfhLngLat[] | null) => {
  if (!coordinates || coordinates.length < 3) return 0;
  try {
    const squareMeters = area(polygon([closeRing(coordinates)]));
    return Number.isFinite(squareMeters) ? squareMeters : 0;
  } catch {
    return 0;
  }
};

const samplePointInPolygon = (
  bounds: [number, number, number, number],
  allowedPolygon: ReturnType<typeof polygon>,
  random: () => number,
) => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const coordinate: IfhLngLat = [
      bounds[0] + random() * (bounds[2] - bounds[0]),
      bounds[1] + random() * (bounds[3] - bounds[1]),
    ];
    if (booleanPointInPolygon(point(coordinate), allowedPolygon)) {
      return coordinate;
    }
  }
  return null;
};

const segmentIsInside = (
  start: IfhLngLat,
  end: IfhLngLat,
  allowedPolygon: ReturnType<typeof polygon>,
) => {
  const segment = lineString([start, end]);
  const segmentLength = length(segment, { units: "kilometers" });
  const samples = Math.max(8, Math.ceil(segmentLength * 20));
  for (let index = 0; index <= samples; index += 1) {
    const coordinate = along(segment, (segmentLength * index) / samples, {
      units: "kilometers",
    }).geometry.coordinates as IfhLngLat;
    if (!booleanPointInPolygon(point(coordinate), allowedPolygon, {
      ignoreBoundary: false,
    })) {
      return false;
    }
  }
  return true;
};

const orientation = (a: IfhLngLat, b: IfhLngLat, c: IfhLngLat) =>
  (b[1] - a[1]) * (c[0] - b[0]) -
  (b[0] - a[0]) * (c[1] - b[1]);

const crossesExistingRoute = (
  route: IfhLngLat[],
  start: IfhLngLat,
  end: IfhLngLat,
) => {
  for (let index = 0; index < route.length - 2; index += 1) {
    const a = route[index];
    const b = route[index + 1];
    const first = orientation(a, b, start);
    const second = orientation(a, b, end);
    const third = orientation(start, end, a);
    const fourth = orientation(start, end, b);
    if (first * second < 0 && third * fourth < 0) return true;
  }
  return false;
};

const acuteVertexIndexes = (legCount: number, acuteCount: number) => {
  if (acuteCount <= 0) return new Set<number>();
  if (acuteCount === 1) return new Set([legCount - 1]);
  return new Set([Math.max(1, Math.floor(legCount / 3)), legCount - 2]);
};

export function generateMapRoute(
  boundary: IfhLngLat[] | null,
  settings: IfhMapGeneratorSettings,
  stepLengthMeters: number | null,
): IfhGeneratedMapRoute {
  if (!boundary || boundary.length < 3) {
    throw new Error("Markiere zuerst eine geschlossene Geländegrenze.");
  }
  if (!stepLengthMeters || stepLengthMeters <= 0) {
    throw new Error(
      "Hinterlege zuerst eine geschätzte Schrittlänge größer als 0 Meter.",
    );
  }
  if (settings.legCount < 2) {
    throw new Error("Für eine Fährte werden mindestens zwei Schenkel benötigt.");
  }

  const outerPolygon = polygon([closeRing(boundary)]);
  if (area(outerPolygon) < 250) {
    throw new Error("Die markierte Fläche ist für eine Planung zu klein.");
  }
  const inset = buffer(outerPolygon, -settings.edgeClearanceMeters, {
    units: "meters",
  });
  const warnings: string[] = [];
  const allowedPolygon =
    inset?.geometry.type === "Polygon"
      ? (inset as ReturnType<typeof polygon>)
      : outerPolygon;
  if (allowedPolygon === outerPolygon && settings.edgeClearanceMeters > 0) {
    warnings.push(
      "Der gewünschte Randabstand ließ sich geometrisch nicht anwenden; die Geländegrenze wurde direkt verwendet.",
    );
  }

  const bounds = bbox(allowedPolygon) as [number, number, number, number];
  const random = seededRandom(settings.seed);
  const targetMeters = settings.desiredSteps * stepLengthMeters;
  const acuteIndexes = acuteVertexIndexes(
    settings.legCount,
    settings.acuteAngleCount,
  );
  let best: IfhLngLat[] | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const scale of [1, 0.88, 0.76, 0.64, 0.52, 0.4]) {
    const segmentTarget = (targetMeters / settings.legCount) * scale;
    for (let routeAttempt = 0; routeAttempt < 160; routeAttempt += 1) {
      const start = samplePointInPolygon(bounds, allowedPolygon, random);
      if (!start) continue;
      const route: IfhLngLat[] = [start];
      let heading = random() * 360 - 180;

      for (let legIndex = 0; legIndex < settings.legCount; legIndex += 1) {
        let next: IfhLngLat | null = null;
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (legIndex > 0) {
            const insideAngle = acuteIndexes.has(legIndex)
              ? 30 + random() * 30
              : 82 + random() * 16;
            const turn = 180 - insideAngle;
            heading = normalizeHeading(
              heading + (random() > 0.5 ? turn : -turn),
            );
          } else {
            heading = normalizeHeading(heading + (random() - 0.5) * 40);
          }
          const segmentMeters = segmentTarget * (0.82 + random() * 0.36);
          const candidate = destination(
            point(route.at(-1)!),
            segmentMeters / 1000,
            heading,
            { units: "kilometers" },
          ).geometry.coordinates as IfhLngLat;
          if (
            booleanPointInPolygon(point(candidate), allowedPolygon) &&
            segmentIsInside(route.at(-1)!, candidate, allowedPolygon) &&
            !crossesExistingRoute(route, route.at(-1)!, candidate)
          ) {
            next = candidate;
            break;
          }
        }
        if (!next) break;
        route.push(next);
        heading = bearing(point(route.at(-2)!), point(next));
      }

      if (route.length !== settings.legCount + 1) continue;
      const meters = routeLengthMeters(route);
      const delta = Math.abs(targetMeters - meters);
      if (delta < bestDelta) {
        best = route;
        bestDelta = delta;
      }
      if (delta / targetMeters <= 0.08) break;
    }
    if (best && bestDelta / targetMeters <= 0.12) break;
  }

  if (!best) {
    throw new Error(
      "In dieser Fläche konnte keine passende Fährte erzeugt werden. Vergrößere die Fläche, reduziere Strecke oder Schenkelzahl oder verringere den Randabstand.",
    );
  }
  const actualMeters = routeLengthMeters(best);
  const difference = Math.abs(actualMeters - targetMeters) / targetMeters;
  if (difference > 0.12) {
    warnings.push(
      `Die erzeugte Länge weicht um ${Math.round(difference * 100)} % vom Ziel ab. Bitte manuell anpassen.`,
    );
  }
  warnings.push(
    "Die Kartenlinie ist ein Planungsvorschlag. Gelände, Betretbarkeit und tatsächliche Legbarkeit müssen vor Ort geprüft werden.",
  );
  return { coordinates: best, lengthMeters: actualMeters, warnings };
}

const emptyLegEvaluation = (): NonNullable<IfhLeg["evaluation"]> => ({
  rating: "unrated",
  intensity: null,
  concentration: null,
  independence: null,
  deepNose: null,
  consistency: null,
  help: "",
  note: "",
});

const emptyArticleEvaluation = (): IfhArticle["evaluation"] => ({
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
  rating: "unrated",
});

const insideAngle = (
  previous: IfhLngLat,
  vertex: IfhLngLat,
  next: IfhLngLat,
) => {
  const incoming = bearing(point(vertex), point(previous));
  const outgoing = bearing(point(vertex), point(next));
  const delta = Math.abs(normalizeHeading(outgoing - incoming));
  return Math.round(delta);
};

const directionAtVertex = (
  previous: IfhLngLat,
  vertex: IfhLngLat,
  next: IfhLngLat,
) =>
  orientation(previous, vertex, next) > 0
    ? ("right" as const)
    : ("left" as const);

export function mapRouteToTrack(
  coordinates: IfhLngLat[],
  stepLengthMeters: number,
  articleCount: number,
  crossTrackCount: number,
  ownership: "own" | "foreign" | "",
): IfhTrack {
  if (coordinates.length < 3 || stepLengthMeters <= 0) {
    throw new Error("Die Kartenlinie oder Schrittlänge ist unvollständig.");
  }
  const legs: IfhLeg[] = coordinates.slice(1).map((coordinate, index) => {
    const meters = distance(point(coordinates[index]), point(coordinate), {
      units: "kilometers",
    }) * 1000;
    return {
      id: crypto.randomUUID(),
      order: index + 1,
      lengthSteps: Math.round(meters / stepLengthMeters),
      lengthMeters: Math.round(meters * 10) / 10,
      ground: "Wiese",
      vegetation: "",
      direction: `${Math.round(bearing(point(coordinates[index]), point(coordinate)))}°`,
      shape: "straight",
      semicircleRadiusMeters: null,
      semicircleDirection: null,
      notes: "Aus Kartenplanung übernommen",
      evaluation: emptyLegEvaluation(),
    };
  });
  const angles: IfhAngle[] = coordinates.slice(1, -1).map((vertex, index) => {
    const degrees = insideAngle(coordinates[index], vertex, coordinates[index + 2]);
    return {
      id: crypto.randomUUID(),
      legId: legs[index].id,
      positionSteps: legs[index].lengthSteps,
      direction: directionAtVertex(
        coordinates[index],
        vertex,
        coordinates[index + 2],
      ),
      degrees,
      type: degrees < 70 ? "acute" : "right",
      evaluation: {
        result: "unrated",
        intensityAfter: "unrated",
        note: "",
        rating: "unrated",
      },
    };
  });
  const totalSteps = legs.reduce(
    (sum, leg) => sum + (leg.lengthSteps ?? 0),
    0,
  );
  const locate = (globalSteps: number) => {
    let remaining = globalSteps;
    for (const leg of legs) {
      const legSteps = leg.lengthSteps ?? 0;
      if (remaining <= legSteps) {
        return { leg, positionSteps: Math.max(0, Math.round(remaining)) };
      }
      remaining -= legSteps;
    }
    return { leg: legs.at(-1)!, positionSteps: legs.at(-1)!.lengthSteps ?? 0 };
  };
  const articles: IfhArticle[] = Array.from(
    { length: Math.max(0, articleCount) },
    (_, index) => {
      const target =
        index === articleCount - 1
          ? totalSteps
          : Math.max(100, (totalSteps * (index + 1)) / articleCount);
      const placement = locate(target);
      return {
        id: crypto.randomUUID(),
        number: index + 1,
        material: "",
        ownership,
        legId: placement.leg.id,
        positionSteps: placement.positionSteps,
        dimensionsCm: { length: null, width: null, height: null },
        evaluation: emptyArticleEvaluation(),
      };
    },
  );
  const availableMiddleLegs = legs.slice(1, -1);
  const crossTracks: IfhCrossTrack[] = Array.from(
    { length: Math.min(crossTrackCount, availableMiddleLegs.length) },
    (_, index) => {
      const leg =
        availableMiddleLegs[
          Math.floor(((index + 1) * availableMiddleLegs.length) / (crossTrackCount + 1))
        ];
      return {
        id: crypto.randomUUID(),
        legId: leg.id,
        positionSteps: Math.round((leg.lengthSteps ?? 0) / 2),
        crossingAngle: 90,
        layer: "",
        evaluation: { result: "unrated", note: "", rating: "unrated" },
      };
    },
  );
  return {
    legs,
    angles,
    articles,
    crossTracks,
    events: [],
    postLastArticleStraightSteps: 10,
    estimatedStepLengthMeters: stepLengthMeters,
  };
}
