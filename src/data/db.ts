import Dexie, { type EntityTable } from "dexie";
import {
  validateDogProfile,
  validateHandlerProfile,
  type DogProfile,
  type HandlerProfile,
} from "../domain/profiles";
import type { CompetitionResult } from "../domain/types";

export class THSDatabase extends Dexie {
  results!: EntityTable<CompetitionResult, "id">;
  handlers!: EntityTable<HandlerProfile, "id">;
  dogs!: EntityTable<DogProfile, "id">;

  constructor(name = "dogsport") {
    super(name);
    this.version(4).stores({
      results: "id,date,className,createdAt,updatedAt",
      ifhSessions: null,
    });
    this.version(5)
      .stores({
        results:
          "id,date,className,handlerId,dogId,createdAt,updatedAt",
        handlers: "id,name,birthDate,updatedAt",
        dogs: "id,callName,birthDate,updatedAt",
      })
      .upgrade(async (transaction) => {
        const results = await transaction
          .table<CompetitionResult, string>("results")
          .toArray();
        const now = new Date().toISOString();
        const handlers = new Map<string, HandlerProfile>();
        const dogs = new Map<string, DogProfile>();

        for (const result of results) {
          const handlerName = result.handler.trim();
          if (!result.handlerId && handlerName) {
            const key = handlerName.toLocaleLowerCase("de-DE");
            let profile = handlers.get(key);
            if (!profile) {
              profile = {
                id: crypto.randomUUID(),
                name: handlerName,
                birthDate: "",
                gender: "",
                club: "",
                membershipNumber: "",
                createdAt: now,
                updatedAt: now,
              };
              handlers.set(key, profile);
            }
            result.handlerId = profile.id;
          }

          const dogName = result.dog.trim();
          if (!result.dogId && dogName) {
            const key = dogName.toLocaleLowerCase("de-DE");
            let profile = dogs.get(key);
            if (!profile) {
              profile = {
                id: crypto.randomUUID(),
                callName: dogName,
                kennelName: "",
                breed: "",
                birthDate: "",
                gender: "",
                performanceRecordId: "",
                chipNumber: "",
                studbookNumber: "",
                createdAt: now,
                updatedAt: now,
              };
              dogs.set(key, profile);
            }
            result.dogId = profile.id;
          }
        }

        if (handlers.size)
          await transaction.table("handlers").bulkPut([...handlers.values()]);
        if (dogs.size)
          await transaction.table("dogs").bulkPut([...dogs.values()]);
        if (results.length)
          await transaction.table("results").bulkPut(results);
      });
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

export async function saveHandlerProfile(
  profile: HandlerProfile,
  database: THSDatabase = db,
) {
  const errors = validateHandlerProfile(profile);
  if (errors.length) throw new Error(errors.join(". "));
  const now = new Date().toISOString();
  const next = {
    ...profile,
    id: profile.id || crypto.randomUUID(),
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
  await database.transaction(
    "rw",
    database.handlers,
    database.results,
    async () => {
      await database.handlers.put(next);
      await database.results
        .where("handlerId")
        .equals(next.id)
        .modify({
          handler: next.name,
          handlerBirthDate: next.birthDate,
          handlerGender: next.gender,
          updatedAt: now,
        });
    },
  );
  return next.id;
}

export async function saveDogProfile(
  profile: DogProfile,
  database: THSDatabase = db,
) {
  const errors = validateDogProfile(profile);
  if (errors.length) throw new Error(errors.join(". "));
  const now = new Date().toISOString();
  const next = {
    ...profile,
    id: profile.id || crypto.randomUUID(),
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
  await database.transaction(
    "rw",
    database.dogs,
    database.results,
    async () => {
      await database.dogs.put(next);
      await database.results
        .where("dogId")
        .equals(next.id)
        .modify({ dog: next.callName, updatedAt: now });
    },
  );
  return next.id;
}

export async function deleteHandlerProfile(
  id: string,
  database: THSDatabase = db,
) {
  if (await database.results.where("handlerId").equals(id).count())
    throw new Error(
      "Der Hundeführer wird bereits in Ergebnissen verwendet und kann nicht gelöscht werden.",
    );
  return database.handlers.delete(id);
}

export async function deleteDogProfile(
  id: string,
  database: THSDatabase = db,
) {
  if (await database.results.where("dogId").equals(id).count())
    throw new Error(
      "Der Hund wird bereits in Ergebnissen verwendet und kann nicht gelöscht werden.",
    );
  return database.dogs.delete(id);
}
