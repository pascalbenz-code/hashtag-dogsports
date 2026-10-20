import Dexie, { type EntityTable } from 'dexie'
import type { CompetitionResult } from '../domain/types'

export class THSDatabase extends Dexie {
  results!: EntityTable<CompetitionResult, 'id'>
  constructor() {
    super('ths-performance-tracker')
    this.version(1).stores({ results: '++id, date, dog, handler, className, updatedAt' })
  }
}

export const db = new THSDatabase()

export async function saveResult(result: CompetitionResult) {
  const updatedAt = new Date().toISOString()
  if (result.id) return db.results.update(result.id, { ...result, updatedAt })
  return db.results.add({ ...result, createdAt: result.createdAt || updatedAt, updatedAt })
}

export async function exportBackup() {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), results: await db.results.toArray() }, null, 2)
}
