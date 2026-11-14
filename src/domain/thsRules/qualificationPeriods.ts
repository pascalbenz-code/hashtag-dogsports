import type { QualificationPeriod } from "./types";

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Das Veranstaltungsdatum zählt; beide Grenzen gehören zum Zeitraum. */
export function matchingQualificationPeriods(
  eventDate: string,
  periods: readonly QualificationPeriod[],
): QualificationPeriod[] {
  if (!isCalendarDate(eventDate)) return [];
  return periods.filter(({ startDate, endDate }) =>
    isCalendarDate(startDate) && isCalendarDate(endDate) &&
    eventDate >= startDate && eventDate <= endDate,
  );
}
