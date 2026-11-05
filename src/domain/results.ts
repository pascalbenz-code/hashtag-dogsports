import { isTimeResult } from "./disciplines";
import { calculateScore } from "./scoring";
import type { CompetitionResult, QualificationKey } from "./types";

export type SortKey = "date-desc" | "date-asc" | "score-desc" | "score-asc";
export interface ResultFilters {
  query: string;
  className: "all" | CompetitionResult["className"];
  qualification: "all" | QualificationKey;
  includeDrafts: boolean;
  sort: SortKey;
}

const comparableScore = (result: CompetitionResult) => {
  const total = calculateScore(result).total;
  if (total === null) return -Infinity;
  return isTimeResult(result.className) ? -total : total;
};

export function filterAndSort(results: CompetitionResult[], filters: ResultFilters) {
  const query = filters.query.trim().toLocaleLowerCase("de");
  return results
    .filter((result) => filters.includeDrafts || calculateScore(result).complete)
    .filter((result) => filters.className === "all" || result.className === filters.className)
    .filter((result) => [result.event, result.handler, result.dog].some((value) => value.toLocaleLowerCase("de").includes(query)))
    .filter((result) => filters.qualification === "all" || calculateScore(result).qualifications.some((qualification) => qualification.key === filters.qualification))
    .sort((a, b) => {
      if (filters.sort === "score-desc") return comparableScore(b) - comparableScore(a);
      if (filters.sort === "score-asc") return comparableScore(a) - comparableScore(b);
      const tie = a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
      return filters.sort === "date-asc"
        ? a.date.localeCompare(b.date) || tie
        : b.date.localeCompare(a.date) || -tie;
    });
}

export function bestIds(results: CompetitionResult[]) {
  const complete = results.filter((result) => calculateScore(result).complete);
  const pickPerClass = (
    getter: (result: CompetitionResult) => number | null,
    mode: "min" | "max" | ((result: CompetitionResult) => "min" | "max"),
  ) => {
    const ids = new Set<string>();
    for (const className of new Set(complete.map((result) => result.className))) {
      const candidates = complete.filter((result) => result.className === className);
      const values = candidates.map(getter).filter((value): value is number => value !== null);
      if (!values.length) continue;
      const direction = typeof mode === "function" ? mode(candidates[0]) : mode;
      const best = direction === "max" ? Math.max(...values) : Math.min(...values);
      candidates.filter((result) => getter(result) === best).forEach((result) => ids.add(result.id));
    }
    return ids;
  };
  return {
    obedience: pickPerClass((result) => result.obedience, "max"),
    hurdles: pickPerClass((result) => result.hurdles.time, "min"),
    slalom: pickPerClass((result) => result.slalom.time, "min"),
    obstacle: pickPerClass((result) => result.obstacle.time, "min"),
    total: pickPerClass(
      (result) => calculateScore(result).total,
      (result) => (isTimeResult(result.className) ? "min" : "max"),
    ),
  };
}
