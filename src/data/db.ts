import Dexie,{type EntityTable}from'dexie';import type{CompetitionResult}from'../domain/types'
export class THSDatabase extends Dexie{results!:EntityTable<CompetitionResult,'id'>;constructor(name='dogsport'){super(name);this.version(1).stores({results:'id,date,className,createdAt,updatedAt'})}}
export const db=new THSDatabase()
export async function saveResult(result:CompetitionResult){const now=new Date().toISOString();return db.results.put({...result,id:result.id||crypto.randomUUID(),createdAt:result.createdAt||now,updatedAt:now})}
export async function deleteResult(id:string){return db.results.delete(id)}
