import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  LocateFixed,
  Map as MapIcon,
  Pencil,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import {
  boundaryAreaSquareMeters,
  generateMapRoute,
  mapRouteToTrack,
  routeLengthMeters,
} from "../../domain/ifhMap";
import { ifhProfile } from "../../domain/ifhRules";
import type {
  IfhLevel,
  IfhLngLat,
  IfhMapPlan,
  IfhTrack,
} from "../../domain/ifhTypes";
import { LocaleNumberInput } from "../LocaleNumberInput";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() ?? "";
const DEFAULT_CENTER: IfhLngLat = [9.1829, 48.7758];

// A separate same-origin worker is reliable in Vite production builds and
// avoids blob-worker restrictions in browsers and strict content policies.
maplibregl.setWorkerUrl(mapLibreWorkerUrl);

const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap-Mitwirkende",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const mapStyle = (style: IfhMapPlan["mapStyle"]) =>
  MAPTILER_KEY
    ? `https://api.maptiler.com/maps/${style === "satellite" ? "hybrid" : "streets-v2"}/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`
    : osmStyle;

const closeRing = (coordinates: IfhLngLat[]) => {
  const ring = coordinates.map((coordinate) => [...coordinate] as IfhLngLat);
  const first = ring[0];
  const last = ring.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([...first]);
  }
  return ring;
};

const featureForBoundary = (
  boundary: IfhLngLat[],
): GeoJSONStoreFeatures => ({
  id: "ifh-boundary",
  type: "Feature",
  properties: { mode: "polygon" },
  geometry: { type: "Polygon", coordinates: [closeRing(boundary)] },
});

const featureForRoute = (route: IfhLngLat[]): GeoJSONStoreFeatures => ({
  id: "ifh-route",
  type: "Feature",
  properties: { mode: "linestring" },
  geometry: { type: "LineString", coordinates: route },
});

const currentRoute = (plan: IfhMapPlan) =>
  plan.editedRoute ?? plan.generatedRoute;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function IfhMapPlanner({
  plan,
  track,
  targetLevel,
  trackOwnership,
  onPlanChange,
  onTrackChange,
}: {
  plan: IfhMapPlan;
  track: IfhTrack;
  targetLevel: IfhLevel | null;
  trackOwnership: "own" | "foreign" | "";
  onPlanChange: (plan: IfhMapPlan) => void;
  onTrackChange: (track: IfhTrack) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const planRef = useRef(plan);
  const onPlanChangeRef = useRef(onPlanChange);
  const lastEmittedGeometry = useRef("");
  const syncingGeometry = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [drawMode, setDrawMode] = useState<
    "select" | "polygon" | "linestring"
  >("select");
  const [locationState, setLocationState] = useState<
    "idle" | "locating" | "located" | "denied" | "unavailable"
  >("idle");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const selectedMapStyle = plan.mapStyle;

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    onPlanChangeRef.current = onPlanChange;
  }, [onPlanChange]);

  const geometrySignature = useMemo(
    () => JSON.stringify([plan.boundary, currentRoute(plan)]),
    [plan],
  );

  const readGeometry = (draw: TerraDraw) => {
    if (syncingGeometry.current) return;
    const features = draw.getSnapshot();
    const boundaryFeature = [...features]
      .reverse()
      .find((feature) => feature.geometry.type === "Polygon");
    const routeFeature = [...features]
      .reverse()
      .find((feature) => feature.geometry.type === "LineString");
    const previous = planRef.current;
    const boundaryRing =
      boundaryFeature?.geometry.type === "Polygon"
        ? (boundaryFeature.geometry.coordinates[0] as IfhLngLat[])
        : null;
    const boundary = boundaryRing
      ? boundaryRing.length >= 4
        ? closeRing(boundaryRing).slice(0, -1)
        : previous.boundary
      : null;
    const routeCoordinates =
      routeFeature?.geometry.type === "LineString"
        ? (routeFeature.geometry.coordinates as IfhLngLat[])
        : null;
    const route = routeCoordinates
      ? routeCoordinates.length >= 2
        ? routeCoordinates
        : currentRoute(previous)
      : null;
    const signature = JSON.stringify([boundary, route]);
    lastEmittedGeometry.current = signature;
    onPlanChangeRef.current({
      ...previous,
      boundary,
      generatedRoute: route ? previous.generatedRoute : null,
      editedRoute: route,
      routeSource: route ? "manual" : null,
      generationWarnings:
        route && previous.generatedRoute
          ? [
              ...previous.generationWarnings.filter(
                (warning) => !warning.startsWith("Kartenlinie manuell"),
              ),
              "Kartenlinie manuell bearbeitet; Aufbauprüfung erneut kontrollieren.",
            ]
          : previous.generationWarnings,
      updatedAt: new Date().toISOString(),
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(selectedMapStyle),
      center: planRef.current.center ?? DEFAULT_CENTER,
      zoom: planRef.current.zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    mapRef.current = map;
    const onLoad = () => {
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode({ showCoordinatePoints: true }),
          new TerraDrawLineStringMode({
            showCoordinatePoints: true,
            finishOnNthCoordinate:
              planRef.current.generatorSettings.legCount + 1,
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  coordinates: {
                    draggable: true,
                    deletable: true,
                    midpoints: true,
                  },
                },
              },
              linestring: {
                feature: {
                  draggable: true,
                  coordinates: {
                    draggable: true,
                    deletable: true,
                    midpoints: true,
                  },
                },
              },
            },
          }),
        ],
      });
      draw.start();
      const features: GeoJSONStoreFeatures[] = [];
      if (planRef.current.boundary) {
        features.push(featureForBoundary(planRef.current.boundary));
      }
      const route = currentRoute(planRef.current);
      if (route) features.push(featureForRoute(route));
      if (features.length) draw.addFeatures(features);
      draw.setMode("select");
      const handleFinish = () => {
        const snapshot = draw.getSnapshot();
        const polygons = snapshot.filter(
          (feature) => feature.geometry.type === "Polygon",
        );
        const lines = snapshot.filter(
          (feature) => feature.geometry.type === "LineString",
        );
        if (polygons.length > 1) {
          draw.removeFeatures(
            polygons
              .slice(0, -1)
              .map((feature) => feature.id)
              .filter((id): id is string | number => id !== undefined),
          );
        }
        if (lines.length > 1) {
          draw.removeFeatures(
            lines
              .slice(0, -1)
              .map((feature) => feature.id)
              .filter((id): id is string | number => id !== undefined),
          );
        }
        draw.setMode("select");
        setDrawMode("select");
        readGeometry(draw);
      };
      const handleChange = () => readGeometry(draw);
      draw.on("finish", handleFinish);
      draw.on("change", handleChange);
      drawRef.current = draw;
      setMapReady(true);
    };
    map.on("load", onLoad);
    const persistViewport = () => {
      const center = map.getCenter();
      const previous = planRef.current;
      onPlanChangeRef.current({
        ...previous,
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        updatedAt: new Date().toISOString(),
      });
    };
    map.on("moveend", persistViewport);
    return () => {
      setMapReady(false);
      drawRef.current?.stop();
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [selectedMapStyle]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !mapReady || geometrySignature === lastEmittedGeometry.current)
      return;
    syncingGeometry.current = true;
    try {
      draw.clear();
      const features: GeoJSONStoreFeatures[] = [];
      if (plan.boundary) features.push(featureForBoundary(plan.boundary));
      const route = currentRoute(plan);
      if (route) features.push(featureForRoute(route));
      if (features.length) draw.addFeatures(features);
      lastEmittedGeometry.current = geometrySignature;
    } finally {
      syncingGeometry.current = false;
    }
  }, [geometrySignature, mapReady, plan]);

  const setMode = (mode: "select" | "polygon" | "linestring") => {
    if (mode === "linestring") {
      drawRef.current?.updateModeOptions<typeof TerraDrawLineStringMode>(
        "linestring",
        {
          finishOnNthCoordinate:
            planRef.current.generatorSettings.legCount + 1,
        },
      );
    }
    drawRef.current?.setMode(mode);
    setDrawMode(mode);
    setMessage(
      mode === "polygon"
        ? "Setze mindestens drei Außenpunkte und tippe zum Abschluss auf den ersten Punkt."
        : mode === "linestring"
          ? `Setze ${planRef.current.generatorSettings.legCount + 1} Fährtenpunkte für ${planRef.current.generatorSettings.legCount} Schenkel.`
          : "Tippe eine Fläche oder Linie an und verschiebe ihre Punkte.",
    );
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center: IfhLngLat = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        mapRef.current?.flyTo({ center, zoom: 17 });
        setLocationAccuracy(position.coords.accuracy);
        setLocationState("located");
        onPlanChange({
          ...planRef.current,
          center,
          zoom: 17,
          updatedAt: new Date().toISOString(),
        });
      },
      (error) => {
        setLocationState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  };

  const applyProfile = () => {
    if (!targetLevel) return;
    const profile = ifhProfile(targetLevel);
    onPlanChange({
      ...plan,
      generatorSettings: {
        ...plan.generatorSettings,
        desiredSteps: profile.steps,
        legCount: profile.legs,
        articleCount: profile.articles,
        acuteAngleCount:
          targetLevel === "FCI-IFH1" ? 0 : targetLevel === "FCI-IFH2" ? 1 : 2,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const generate = () => {
    try {
      if (track.legs.length && !confirm("Vorhandenen geplanten Aufbau durch die Kartengenerierung ersetzen?")) {
        return;
      }
      const generated = generateMapRoute(
        plan.boundary,
        plan.generatorSettings,
        track.estimatedStepLengthMeters,
      );
      const nextPlan: IfhMapPlan = {
        ...plan,
        generatedRoute: generated.coordinates,
        editedRoute: null,
        routeSource: "generated",
        generationWarnings: [
          ...generated.warnings,
          ...(targetLevel === "FCI-IFH3"
            ? ["Der vorgeschriebene Halbkreis der FCI-IFH3 muss in der Kartenlinie manuell ausgeformt und geprüft werden."]
            : []),
        ],
        generatorVersion: "IFH-GEO-1",
        updatedAt: new Date().toISOString(),
      };
      const nextTrack = mapRouteToTrack(
        generated.coordinates,
        track.estimatedStepLengthMeters!,
        plan.generatorSettings.articleCount,
        targetLevel && targetLevel !== "FCI-IFH1" ? 2 : 0,
        trackOwnership,
      );
      onPlanChange(nextPlan);
      onTrackChange(nextTrack);
      setMessage("Fährtenvorschlag erzeugt. Wähle „Bearbeiten“, um Punkte zu verschieben.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Generierung fehlgeschlagen.");
    }
  };

  const importEditedRoute = () => {
    const route = currentRoute(plan);
    if (!route || !track.estimatedStepLengthMeters) {
      setMessage("Kartenlinie oder geschätzte Schrittlänge fehlt.");
      return;
    }
    if (track.legs.length && !confirm("Schenkel, Winkel und Gegenstände aus der Kartenlinie neu aufbauen?")) {
      return;
    }
    onTrackChange(
      mapRouteToTrack(
        route,
        track.estimatedStepLengthMeters,
        plan.generatorSettings.articleCount,
        targetLevel && targetLevel !== "FCI-IFH1" ? 2 : 0,
        trackOwnership,
      ),
    );
    setMessage("Kartenlinie in den geplanten Fährtenaufbau übernommen.");
  };

  const clearGeometry = (kind: "boundary" | "route") => {
    const next = {
      ...plan,
      boundary: kind === "boundary" ? null : plan.boundary,
      generatedRoute: kind === "route" ? null : plan.generatedRoute,
      editedRoute: kind === "route" ? null : plan.editedRoute,
      routeSource: kind === "route" ? null : plan.routeSource,
      generationWarnings: kind === "route" ? [] : plan.generationWarnings,
      updatedAt: new Date().toISOString(),
    };
    onPlanChange(next);
  };

  const updateSetting = (
    key: keyof IfhMapPlan["generatorSettings"],
    value: number | null,
  ) => {
    if (value === null) return;
    onPlanChange({
      ...plan,
      generatorSettings: { ...plan.generatorSettings, [key]: value },
      updatedAt: new Date().toISOString(),
    });
  };

  const route = currentRoute(plan);
  return (
    <Card className="ifh-map-card space-y-3">
      <div className="ifh-section-heading">
        <div>
          <p className="eyebrow text-teal">KARTENPLANUNG</p>
          <h3>Fährtengelände und Kartenlinie</h3>
        </div>
        <span className="badge q-gray">schematische Planung</span>
      </div>
      {!MAPTILER_KEY ? (
        <p className="ifh-warning compact">
          MapTiler-Key lokal nicht verfügbar. Die Straßenkarte nutzt vorläufig OpenStreetMap; Luftbild ist erst in der konfigurierten Vercel-Umgebung verfügbar.
        </p>
      ) : null}
      <div className="ifh-map-toolbar" aria-label="Kartenwerkzeuge">
        <Button type="button" variant="ghost" onClick={locate} disabled={locationState === "locating"}>
          <LocateFixed />
          {locationState === "locating" ? "Orte …" : "Standort"}
        </Button>
        <Button type="button" variant={drawMode === "polygon" ? "default" : "ghost"} onClick={() => setMode("polygon")} disabled={!mapReady}>
          <Crosshair /> Fläche
        </Button>
        <Button type="button" variant={drawMode === "linestring" ? "default" : "ghost"} onClick={() => setMode("linestring")} disabled={!mapReady || !plan.boundary}>
          <Route /> Linie
        </Button>
        <Button type="button" variant={drawMode === "select" ? "default" : "ghost"} onClick={() => setMode("select")} disabled={!mapReady}>
          <Pencil /> Bearbeiten
        </Button>
      </div>
      {MAPTILER_KEY ? (
        <div className="ifh-map-style" role="group" aria-label="Kartenstil">
          <button type="button" className={plan.mapStyle === "streets" ? "active" : ""} onClick={() => onPlanChange({ ...plan, mapStyle: "streets" })}>
            Straßenkarte
          </button>
          <button type="button" className={plan.mapStyle === "satellite" ? "active" : ""} onClick={() => onPlanChange({ ...plan, mapStyle: "satellite" })}>
            Luftbild
          </button>
        </div>
      ) : null}
      <div ref={containerRef} className="ifh-map" aria-label="Interaktive Karte des Fährtengeländes" />
      <p className="text-xs text-muted" aria-live="polite">
        {message || "Markiere zuerst die äußere Geländegrenze. Die Karte ersetzt keine Prüfung der Begehbarkeit vor Ort."}
      </p>
      {locationState === "denied" ? (
        <p className="ifh-error compact">Standortzugriff wurde abgelehnt. Erlaube ihn in den Safari- beziehungsweise App-Einstellungen oder wähle den Kartenausschnitt manuell.</p>
      ) : null}
      {locationState === "located" && locationAccuracy !== null ? (
        <p className="text-xs text-muted">Standortgenauigkeit ungefähr {Math.round(locationAccuracy)} m. Dies ist die Position des iPhones, nicht der Suchweg des Hundes.</p>
      ) : null}
      <div className="ifh-map-facts">
        <div><span>Fläche</span><strong>{boundaryAreaSquareMeters(plan.boundary).toLocaleString("de-DE", { maximumFractionDigits: 0 })} m²</strong></div>
        <div><span>Kartenstrecke</span><strong>{routeLengthMeters(route).toLocaleString("de-DE", { maximumFractionDigits: 0 })} m</strong></div>
        <div><span>Quelle</span><strong>{plan.routeSource === "generated" ? "generiert" : plan.routeSource === "manual" ? "manuell" : "–"}</strong></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => clearGeometry("boundary")} disabled={!plan.boundary}><Trash2 /> Fläche löschen</Button>
        <Button type="button" variant="ghost" onClick={() => clearGeometry("route")} disabled={!route}><Trash2 /> Linie löschen</Button>
      </div>
      <details className="ifh-details" open>
        <summary>Automatische Fährte erzeugen</summary>
        <div className="space-y-3">
          {targetLevel ? (
            <Button type="button" variant="ghost" className="w-full" onClick={applyProfile}>
              <MapIcon /> Werte von {targetLevel} übernehmen
            </Button>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Zielstrecke (Schritte)"><LocaleNumberInput value={plan.generatorSettings.desiredSteps} onValueChange={(value) => updateSetting("desiredSteps", value)} maxFractionDigits={0} ariaLabel="Zielstrecke Schritte" /></Field>
            <Field label="Schenkel"><LocaleNumberInput value={plan.generatorSettings.legCount} onValueChange={(value) => updateSetting("legCount", value)} maxFractionDigits={0} ariaLabel="Schenkelanzahl" /></Field>
            <Field label="Gegenstände"><LocaleNumberInput value={plan.generatorSettings.articleCount} onValueChange={(value) => updateSetting("articleCount", value)} maxFractionDigits={0} ariaLabel="Gegenstandsanzahl" /></Field>
            <Field label="Spitze Winkel"><LocaleNumberInput value={plan.generatorSettings.acuteAngleCount} onValueChange={(value) => updateSetting("acuteAngleCount", value)} maxFractionDigits={0} ariaLabel="Spitze Winkel" /></Field>
            <Field label="Randabstand (m)"><LocaleNumberInput value={plan.generatorSettings.edgeClearanceMeters} onValueChange={(value) => updateSetting("edgeClearanceMeters", value)} maxFractionDigits={1} ariaLabel="Randabstand" /></Field>
            <Field label="Variante / Seed"><LocaleNumberInput value={plan.generatorSettings.seed} onValueChange={(value) => updateSetting("seed", value)} maxFractionDigits={0} ariaLabel="Generator Seed" /></Field>
          </div>
          <p className="text-xs text-muted">Die Zielmeter ergeben sich ausschließlich aus Zielschritten × der oben im Fährtenaufbau angegebenen geschätzten Schrittlänge.</p>
          <Button type="button" className="w-full" onClick={generate} disabled={!plan.boundary}>
            <Sparkles /> Fährtenvorschlag erzeugen
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={importEditedRoute} disabled={!route}>
            <Route /> Kartenlinie in Fährtenaufbau übernehmen
          </Button>
          {plan.generationWarnings.map((warning) => <p className="ifh-rule-note" key={warning}>{warning}</p>)}
        </div>
      </details>
    </Card>
  );
}
