import type { CompetitionResult } from "./types";
import { calculateScore } from "./scoring";

export interface Club {
  id: string;
  public_id: string;
  name: string;
  city: string;
  description: string;
  created_by: string;
  created_at: string;
}
export interface ClubMembership {
  club_id: string;
  user_id: string;
  joined_at: string;
}
export interface ClubPost {
  id: string;
  club_id: string;
  user_id: string;
  result_id: string;
  author_name: string;
  dog_name: string;
  event_name: string;
  result_date: string;
  discipline: CompetitionResult["className"];
  total: number;
  source_updated_at: string;
  caption: string;
  created_at: string;
}
/** Explicit allowlist: never publish birth dates, membership numbers, LU data or private notes. */
export function resultPublication(result: CompetitionResult) {
  const score = calculateScore(result);
  if (!score.complete || score.total === null)
    throw new Error("Nur vollständige Ergebnisse können geteilt werden.");
  return {
    result_id: result.id,
    author_name: result.handler,
    dog_name: result.dog,
    event_name: result.event,
    result_date: result.date,
    discipline: result.className,
    total: score.total,
    source_updated_at: result.updatedAt,
  };
}
