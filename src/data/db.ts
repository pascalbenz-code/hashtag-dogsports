import Dexie, { type EntityTable } from "dexie";
import { emptyMapPlan } from "../domain/ifh";
import type { IfhSession } from "../domain/ifhTypes";
import type { CompetitionResult } from "../domain/types";

export class THSDatabase extends Dexie {
  results!: EntityTable<CompetitionResult, "id">;
  ifhSessions!: EntityTable<IfhSession, "id">;

  constructor(name = "dogsport") {
    super(name);
    this.version(1).stores({
      results: "id,date,className,createdAt,updatedAt",
    });
    this.version(2).stores({
      results: "id,date,className,createdAt,updatedAt",
      ifhSessions:
        "id,dog,date,status,mode,targetLevel,trackOwnership,createdAt,updatedAt,*focuses",
    });
    this.version(3)
      .stores({
        results: "id,date,className,createdAt,updatedAt",
        ifhSessions:
          "id,dog,date,status,mode,targetLevel,trackOwnership,createdAt,updatedAt,*focuses",
      })
      .upgrade((transaction) =>
        transaction
          .table<IfhSession, string>("ifhSessions")
          .toCollection()
          .modify((session) => {
            session.mapPlan ??= emptyMapPlan();
          }),
      );
  }
}

export const db = new THSDatabase();

export async function saveResult(result: CompetitionResult) {
  const now = new Date().toISOString();
  return db.results.put({
    ...result,
    id: result.id || crypto.randomUUID(),
    createdAt: result.createdAt || now,
    updatedAt: now,
  });
}

export async function deleteResult(id: string) {
  return db.results.delete(id);
}

export async function saveIfhSession(session: IfhSession) {
  const now = new Date().toISOString();
  return db.ifhSessions.put({
    ...session,
    id: session.id || crypto.randomUUID(),
    createdAt: session.createdAt || now,
    updatedAt: now,
  });
}

export async function deleteIfhSession(id: string) {
  return db.ifhSessions.delete(id);
}
