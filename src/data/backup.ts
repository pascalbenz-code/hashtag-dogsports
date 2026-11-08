import { MAX_BACKUP_BYTES, MAX_BACKUP_RECORDS, MAX_FAULT_DETAILS, isRecord, isTimestamp, isDate, isNullableNumber, hasMetadata, assertUniqueIds } from "./validation";
import type { CompetitionResult } from "../domain/types";
import { calculateScore, validateResult } from "../domain/scoring";
import {
  isDogProfile,
  isHandlerProfile,
  type DogProfile,
  type HandlerProfile,
} from "../domain/profiles";
import {
  formatHurdleFaultDetail,
  isValidHurdleFaultDetail,
} from "../domain/hurdleFaults";
import {
  areValidSlalomFaultDetails,
  formatSlalomFaultDetail,
} from "../domain/slalomFaults";
import {
  areValidObstacleFaultDetails,
  formatObstacleFaultDetail,
} from "../domain/obstacleFaults";
import {
  CLASS_LABELS,
  COMPETITION_CLASSES,
  hurdleReferenceClass,
  normalizedCrossCountryTime,
} from "../domain/disciplines";
export interface Backup {
  app: "#Dogsports";
  version: 3;
  exportedAt: string;
  results: CompetitionResult[];
  handlers: HandlerProfile[];
  dogs: DogProfile[];
}
export const createBackup = (
  results: CompetitionResult[],
  handlers: HandlerProfile[] = [],
  dogs: DogProfile[] = [],
): Backup => ({
  app: "#Dogsports",
  version: 3,
  exportedAt: new Date().toISOString(),
  results,
  handlers,
  dogs,
});
export const serializeBackup = (
  results: CompetitionResult[],
  handlers: HandlerProfile[] = [],
  dogs: DogProfile[] = [],
) => JSON.stringify(createBackup(results, handlers, dogs), null, 2);
const isRun = (x: unknown): boolean =>
  isRecord(x) && isNullableNumber(x.time) && isNullableNumber(x.faults) &&
  (x.faultDetails === undefined || (Array.isArray(x.faultDetails) && x.faultDetails.length <= MAX_FAULT_DETAILS));
const optionalString = (x: unknown) => x === undefined || typeof x === "string";
const optionalLeash = (x: unknown) => x === undefined || x === "on" || x === "off";

export async function readBackupFile(file: Pick<File, "size" | "text">): Promise<Backup> {
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error("Das Backup ist zu groß (maximal 20 MiB). Bitte in kleinere Backups aufteilen.");
  return parseBackup(await file.text());
}
export function parseBackup(text: string): Backup {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error("Das Backup ist zu groß (maximal 20 MiB).");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Die Datei enthält kein gültiges JSON.");
  }
  if (
    !data ||
    typeof data !== "object" ||
    !("app" in data) ||
    !["#Dogsports", "#Dogsport"].includes(
      String((data as { app: unknown }).app),
    ) ||
    !Array.isArray((data as Backup).results)
  )
    throw new Error("Die Datei ist kein gültiges #Dogsports-Backup.");
  const raw = data as Partial<Backup> & { results: CompetitionResult[] };
  if ((raw.handlers !== undefined && !Array.isArray(raw.handlers)) ||
      (raw.dogs !== undefined && !Array.isArray(raw.dogs)))
    throw new Error("Die Profillisten haben ein ungültiges Schema.");
  const handlers = Array.isArray(raw.handlers) ? raw.handlers : [];
  const dogs = Array.isArray(raw.dogs) ? raw.dogs : [];
  if (raw.results.length + handlers.length + dogs.length > MAX_BACKUP_RECORDS)
    throw new Error("Das Backup enthält zu viele Datensätze (maximal 20.000).");
  if (!handlers.every((p) => isHandlerProfile(p) && hasMetadata(p) && isDate(p.birthDate)) ||
      !dogs.every((p) => isDogProfile(p) && hasMetadata(p) && isDate(p.birthDate)))
    throw new Error("Mindestens ein Profil hat ein ungültiges Schema.");
  assertUniqueIds(handlers);
  assertUniqueIds(dogs);
  const now = new Date().toISOString();
  // Preserve the first matching legacy profile while avoiding quadratic scans.
  const handlerNames = new Map([...handlers].reverse().map((p) => [p.name.toLocaleLowerCase("de-DE"), p]));
  const dogNames = new Map([...dogs].reverse().map((p) => [p.callName.toLocaleLowerCase("de-DE"), p]));
  const handlerIds = new Map(handlers.map((p) => [p.id, p]));
  for (const r of raw.results) {
    if (
      !r ||
      typeof r !== "object" ||
      !hasMetadata(r) ||
      !isDate(r.date) ||
      typeof r.handler !== "string" || typeof r.dog !== "string" || typeof r.notes !== "string" ||
      !optionalString(r.handlerId) || !optionalString(r.dogId) ||
      (r.handlerBirthDate !== undefined && !isDate(r.handlerBirthDate)) ||
      ![undefined, "", "male", "female"].includes(r.handlerGender) ||
      ![undefined, "Vereinsprüfung", "Kreismeisterschaft", "Verbandsmeisterschaft", "dhv Deutsche Meisterschaft", "VDH Deutsche Meisterschaft"].includes(r.competitionType) ||
      !isNullableNumber(r.obedience) ||
      ![r.hurdlesLeash, r.slalomLeash, r.obstacleLeash, r.obstacle2Leash].every(optionalLeash) ||
      (r.obstacle2 !== undefined && !isRun(r.obstacle2)) ||
      (r.crossCountry !== undefined && (!isRecord(r.crossCountry) ||
        !isNullableNumber(r.crossCountry.timeSeconds) || !isNullableNumber(r.crossCountry.distanceMeters) ||
        typeof r.crossCountry.falseStart !== "boolean")) ||
      typeof r.event !== "string" ||
      !COMPETITION_CLASSES.includes(r.className) ||
      !isRun(r.hurdles) ||
      !isRun(r.slalom) ||
      !isRun(r.obstacle)
    )
      throw new Error("Mindestens ein Datensatz hat ein ungültiges Schema.");
    if (
      r.hurdles.faultDetails !== undefined &&
      (!Array.isArray(r.hurdles.faultDetails) ||
        !r.hurdles.faultDetails.every((detail) =>
          isValidHurdleFaultDetail(detail, hurdleReferenceClass(r.className)),
        ))
    )
      throw new Error(
        "Mindestens ein Datensatz enthält ungültige Hürden-Detailangaben.",
      );
    if (
      r.slalom.faultDetails !== undefined &&
      (!Array.isArray(r.slalom.faultDetails) ||
        !areValidSlalomFaultDetails(r.slalom.faultDetails))
    )
      throw new Error(
        "Mindestens ein Datensatz enthält ungültige Slalom-Detailangaben.",
      );
    if (
      r.obstacle.faultDetails !== undefined &&
      (!Array.isArray(r.obstacle.faultDetails) ||
        !areValidObstacleFaultDetails(r.obstacle.faultDetails))
    )
      throw new Error(
        "Mindestens ein Datensatz enthält ungültige Hindernislauf-Detailangaben.",
      );
    if (
      r.obstacle2?.faultDetails !== undefined &&
      (!Array.isArray(r.obstacle2.faultDetails) ||
        !areValidObstacleFaultDetails(r.obstacle2.faultDetails))
    )
      throw new Error(
        "Mindestens ein Datensatz enthält ungültige Details für Hindernislauf 2.",
      );
    r.competitionType ??= "Vereinsprüfung";
    if (!r.handlerId && r.handler.trim()) {
      const name = r.handler.trim().toLocaleLowerCase("de-DE");
      let profile = handlerNames.get(name);
      if (!profile) {
        profile = { id: crypto.randomUUID(), name: r.handler.trim(), birthDate: "", gender: "", club: "", membershipNumber: "", createdAt: now, updatedAt: now };
        handlers.push(profile);
        handlerNames.set(name, profile);
        handlerIds.set(profile.id, profile);
      }
      r.handlerId = profile.id;
    }
    const handlerProfile = handlerIds.get(r.handlerId ?? "");
    if (handlerProfile) {
      r.handlerBirthDate ||= handlerProfile.birthDate;
      r.handlerGender ||= handlerProfile.gender;
    }
    if (!r.dogId && r.dog.trim()) {
      const name = r.dog.trim().toLocaleLowerCase("de-DE");
      let profile = dogNames.get(name);
      if (!profile) {
        profile = { id: crypto.randomUUID(), callName: r.dog.trim(), kennelName: "", breed: "", birthDate: "", gender: "", performanceRecordId: "", chipNumber: "", studbookNumber: "", createdAt: now, updatedAt: now };
        dogs.push(profile);
        dogNames.set(name, profile);
      }
      r.dogId = profile.id;
    }
  }
  assertUniqueIds(raw.results);
  return { app: "#Dogsports", version: 3, exportedAt: isTimestamp(raw.exportedAt) ? raw.exportedAt : now, results: raw.results, handlers, dogs };
}
export function toCsv(results: CompetitionResult[]) {
  const headers = [
    "ID",
    "Datum",
    "Hundeführer",
    "Hund",
    "Turnierart",
    "Turnier / Verein",
    "Prüfungsstufe",
    "Unterordnung",
    "Hürdenzeit",
    "Hürdenfehler",
    "Hürdenfehler Details",
    "Slalomzeit",
    "Slalomfehler",
    "Slalomfehler Details",
    "Hinderniszeit",
    "Hindernisfehler",
    "Hindernisfehler Details",
    "Hürden Leinenstatus",
    "Slalom Leinenstatus",
    "Hindernis Leinenstatus",
    "Hindernislauf 2 Zeit",
    "Hindernislauf 2 Fehler",
    "Hindernislauf 2 Details",
    "Hindernislauf 2 Leinenstatus",
    "1000m gemessene Sekunden",
    "1000m tatsächliche Meter",
    "1000m rechnerischer Wert",
    "1000m Frühstart",
    "Gesamtergebnis",
    "Status",
    "Erstellt",
    "Geändert",
  ];
  const cell = (v: unknown) => {
    const text = String(v ?? "");
    // CSV quoting alone does not stop spreadsheet formula evaluation.
    // Control prefixes are intentional: spreadsheets treat them as formula whitespace.
    // eslint-disable-next-line no-control-regex
    const safe = /^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)
      ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const num = (v: number | null) =>
    v === null
      ? ""
      : v.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return (
    "\uFEFF" +
    [
      headers.map(cell).join(";"),
      ...results.map((r) =>
        [
          r.id,
          r.date,
          r.handler,
          r.dog,
          r.competitionType,
          r.event,
          CLASS_LABELS[r.className],
          num(r.obedience),
          num(r.hurdles.time),
          num(r.hurdles.faults),
          (r.hurdles.faultDetails ?? [])
            .map(formatHurdleFaultDetail)
            .join(" | "),
          num(r.slalom.time),
          num(r.slalom.faults),
          (r.slalom.faultDetails ?? [])
            .map(formatSlalomFaultDetail)
            .join(" | "),
          num(r.obstacle.time),
          num(r.obstacle.faults),
          (r.obstacle.faultDetails ?? [])
            .map(formatObstacleFaultDetail)
            .join(" | "),
          r.hurdlesLeash,
          r.slalomLeash,
          r.obstacleLeash,
          num(r.obstacle2?.time ?? null),
          num(r.obstacle2?.faults ?? null),
          (r.obstacle2?.faultDetails ?? [])
            .map(formatObstacleFaultDetail)
            .join(" | "),
          r.obstacle2Leash,
          num(r.crossCountry?.timeSeconds ?? null),
          num(r.crossCountry?.distanceMeters ?? null),
          num(normalizedCrossCountryTime(r)),
          r.crossCountry?.falseStart ? "Ja" : "Nein",
          num(calculateScore(r).total),
          validateResult(r).length ? "Entwurf" : "Vollständig",
          r.createdAt,
          r.updatedAt,
        ]
          .map(cell)
          .join(";"),
      ),
    ].join("\r\n")
  );
}
export function mergeImport<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  replace = false,
) {
  const map = new Map(existing.map((r) => [r.id, r]));
  let added = 0,
    replaced = 0,
    skipped = 0;
  for (const r of incoming) {
    if (map.has(r.id)) {
      if (replace) {
        map.set(r.id, r);
        replaced++;
      } else skipped++;
    } else {
      map.set(r.id, r);
      added++;
    }
  }
  return { results: [...map.values()], added, replaced, skipped };
}
