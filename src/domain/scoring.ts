import type { CompetitionResult, QualificationRule, RunningKey, ScoreBreakdown } from './types'

export const QUALIFICATION_RULES: Record<CompetitionResult['className'], QualificationRule> = {
  VK1: { className: 'VK1', minimumTotal: 220, minimumObedience: 42, requireComplete: true },
  VK2: { className: 'VK2', minimumTotal: 240, minimumObedience: 42, requireComplete: true },
  VK3: { className: 'VK3', minimumTotal: 250, minimumObedience: 42, requireComplete: true },
}

export const BASE_POINTS: Record<RunningKey, number> = { hurdles: 80, slalom: 100, obstacle: 100 }

export function runningPoints(kind: RunningKey, time: number | null, faults: number | null): number | null {
  if (time === null || faults === null || !Number.isFinite(time) || !Number.isFinite(faults)) return null
  return Math.max(0, Math.round((BASE_POINTS[kind] - time - faults) * 100) / 100)
}

export function calculateScore(result: CompetitionResult, rules = QUALIFICATION_RULES): ScoreBreakdown {
  const disciplinePoints = {
    obedience: result.obedience,
    hurdles: runningPoints('hurdles', result.hurdles.time, result.hurdles.faults),
    slalom: runningPoints('slalom', result.slalom.time, result.slalom.faults),
    obstacle: runningPoints('obstacle', result.obstacle.time, result.obstacle.faults),
  }
  const values = Object.values(disciplinePoints)
  const complete = values.every((value) => value !== null)
  const enteredSubtotal = Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) * 100) / 100
  const rule = rules[result.className]
  const qualificationReasons: string[] = []
  if (!complete && rule.requireComplete) qualificationReasons.push('Ergebnis ist noch unvollständig')
  if (result.obedience !== null && result.obedience < rule.minimumObedience) qualificationReasons.push(`Unterordnung unter ${rule.minimumObedience} Punkten`)
  if (complete && enteredSubtotal < rule.minimumTotal) qualificationReasons.push(`Gesamtpunktzahl unter ${rule.minimumTotal}`)
  return {
    disciplinePoints, enteredSubtotal, complete,
    total: complete ? enteredSubtotal : null,
    qualified: complete ? qualificationReasons.length === 0 : null,
    qualificationReasons,
  }
}
