/** Structural checks only; sporting rules remain in domain/scoring.ts. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 20_000;
export const MAX_FAULT_DETAILS = 1_000;
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
  Number.isFinite(Date.parse(value));
export const isDate = (value: unknown): value is string => {
  if (value === "") return true; // Incomplete drafts and legacy profiles.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
export const isNullableNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));
export const hasMetadata = (value: { id?: unknown; createdAt?: unknown; updatedAt?: unknown }) =>
  typeof value.id === "string" && value.id.trim().length > 0 &&
  isTimestamp(value.createdAt) && isTimestamp(value.updatedAt);
export function assertUniqueIds(items: { id: string }[]) {
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("Das Backup enthält doppelte IDs innerhalb einer Datensatzart.");
}
