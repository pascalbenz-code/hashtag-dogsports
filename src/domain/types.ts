export type DisciplineKey = 'obedience' | 'hurdles' | 'slalom' | 'obstacle'
export type RunningKey = Exclude<DisciplineKey, 'obedience'>

export interface RunInput { time: number | null; faults: number | null }
export interface CompetitionResult {
  id?: number
  date: string
  event: string
  dog: string
  handler: string
  className: 'VK1' | 'VK2' | 'VK3'
  obedience: number | null
  hurdles: RunInput
  slalom: RunInput
  obstacle: RunInput
  notes: string
  createdAt: string
  updatedAt: string
}

export interface QualificationRule {
  className: CompetitionResult['className']
  minimumTotal: number
  minimumObedience: number
  requireComplete: boolean
}

export interface ScoreBreakdown {
  disciplinePoints: Record<DisciplineKey, number | null>
  total: number | null
  enteredSubtotal: number
  complete: boolean
  qualified: boolean | null
  qualificationReasons: string[]
}
