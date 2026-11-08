/// <reference types="node" />
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Isolated PostgreSQL-compatible engine; never connects to the hosted project.
const pg = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  await pg.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    insert into auth.users values ('${alice}'), ('${bob}');`);
  await pg.exec(readFileSync("supabase/migrations/20261106120000_create_dogsports_records.sql", "utf8"));
  await pg.exec(`insert into public.dogsports_records(user_id,entity_type,record_id,payload,client_updated_at)
    values ('${alice}','results','a','{"id":"a"}',now()),
           ('${bob}','results','b','{"id":"b"}',now());`);
}, 30_000);
afterAll(async () => { await pg.close(); });
async function asUser<T>(id: string, action: () => Promise<T>) {
  await pg.exec(`begin; set local role authenticated; set local request.jwt.claim.sub = '${id}';`);
  try { return await action(); } finally { await pg.exec("rollback"); }
}
describe("database ownership policies", () => {
  it("denies anonymous table access", async () => {
    await pg.exec("begin; set local role anon;");
    try { await expect(pg.query("select * from public.dogsports_records")).rejects.toThrow(/permission denied/); }
    finally { await pg.exec("rollback"); }
  });
  it("shows only the current user's rows", async () => {
    await asUser(alice, async () => {
      expect((await pg.query("select record_id from public.dogsports_records")).rows).toEqual([{ record_id: "a" }]);
    });
  });
  it("prevents foreign insert and owner reassignment", async () => {
    await asUser(alice, async () => {
      await expect(pg.query(`insert into public.dogsports_records(user_id,entity_type,record_id,payload,client_updated_at)
        values ('${bob}','results','c','{}',now())`)).rejects.toThrow(/row-level security/);
    });
    await asUser(alice, async () => {
      await expect(pg.query(`update public.dogsports_records set user_id='${bob}' where record_id='a'`)).rejects.toThrow(/row-level security/);
    });
  });
  it("prevents foreign updates/deletes and allows own updates", async () => {
    await asUser(alice, async () => {
      expect((await pg.query("update public.dogsports_records set payload='{}' where record_id='b' returning record_id")).rows).toEqual([]);
      expect((await pg.query("delete from public.dogsports_records where record_id='b' returning record_id")).rows).toEqual([]);
      expect((await pg.query("update public.dogsports_records set payload='{}' where record_id='a' returning record_id")).rows).toEqual([{ record_id: "a" }]);
    });
  });
  it("reproduces inherited excess grants and verifies the proposed revocation locally", async () => {
    const sql = "select has_table_privilege('authenticated','public.dogsports_records','TRUNCATE') as allowed";
    expect((await pg.query(sql)).rows).toEqual([{ allowed: true }]);
    await pg.exec("begin; revoke truncate, references, trigger on public.dogsports_records from authenticated;");
    try {
      expect((await pg.query(sql)).rows).toEqual([{ allowed: false }]);
      expect((await pg.query("select has_table_privilege('authenticated','public.dogsports_records','UPDATE') as allowed")).rows).toEqual([{ allowed: true }]);
    } finally { await pg.exec("rollback"); }
  });
});
