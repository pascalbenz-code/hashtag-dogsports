import { isTimeResult } from "./disciplines";
import { bestIds } from "./results";
import { calculateScore } from "./scoring";
import type {
  CompetitionResult,
  Qualification,
  QualificationKey,
} from "./types";

const CELEBRATED_QUALIFICATIONS = new Set<QualificationKey>([
  "swhv",
  "dhv",
  "vdh",
]);

export interface ResultAchievements {
  firstResult: boolean;
  personalBest: boolean;
  newQualifications: Qualification[];
}

const completedTotal = (result: CompetitionResult) => {
  const score = calculateScore(result);
  return score.complete ? score.total : null;
};

function isStrictlyBetterThanPreviousBest(
  previousResults: readonly CompetitionResult[],
  candidate: CompetitionResult,
) {
  const candidateTotal = completedTotal(candidate);
  if (candidateTotal === null) return false;

  const comparable = previousResults.filter(
    (result) =>
      result.className === candidate.className &&
      completedTotal(result) !== null,
  );
  if (!comparable.length) return false;

  const previousBestIds = bestIds([...comparable]).total;
  const previousBestTotals = comparable
    .filter((result) => previousBestIds.has(result.id))
    .map(completedTotal)
    .filter((value): value is number => value !== null);
  if (!previousBestTotals.length) return false;

  const previousBest = previousBestTotals[0];
  return isTimeResult(candidate.className)
    ? candidateTotal < previousBest
    : candidateTotal > previousBest;
}

export function detectResultAchievements(
  previousResults: readonly CompetitionResult[],
  candidate: CompetitionResult,
): ResultAchievements {
  const previousVersion = previousResults.find(
    (result) => result.id === candidate.id,
  );
  const previousQualificationKeys = new Set(
    previousVersion
      ? calculateScore(previousVersion).qualifications.map(
          (qualification) => qualification.key,
        )
      : [],
  );
  const newQualifications = calculateScore(candidate).qualifications.filter(
    (qualification) =>
      CELEBRATED_QUALIFICATIONS.has(qualification.key) &&
      !previousQualificationKeys.has(qualification.key),
  );

  return {
    firstResult:
      completedTotal(candidate) !== null &&
      !previousResults.some(
        (result) =>
          result.id !== candidate.id && completedTotal(result) !== null,
      ) &&
      (previousVersion ? completedTotal(previousVersion) === null : true),
    personalBest: isStrictlyBetterThanPreviousBest(
      previousResults,
      candidate,
    ),
    newQualifications,
  };
}
