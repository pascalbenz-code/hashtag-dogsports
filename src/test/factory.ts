import type { CompetitionResult } from "../domain/types";
export const makeResult = (
  o: Partial<CompetitionResult> = {},
): CompetitionResult => ({
  id: "1",
  date: "2026-05-10",
  competitionType: "Vereinsprüfung",
  event: "HSV Test",
  dog: "Fiete",
  handler: "Alex",
  className: "FCI-VK3",
  obedience: 55,
  hurdles: { time: 12.03, faults: 0 },
  slalom: { time: 14.01, faults: 4 },
  obstacle: { time: 9.44, faults: 2 },
  notes: "",
  createdAt: "2026-05-10T10:00:00Z",
  updatedAt: "2026-05-10T10:00:00Z",
  ...o,
});
