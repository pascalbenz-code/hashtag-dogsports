import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
let club: string;
beforeAll(async () => {
  await pg.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values('${alice}'),('${bob}'),('${outsider}');`);
  await pg.exec(
    readFileSync(
      "supabase/migrations/20261109202434_community_clubs.sql",
      "utf8",
    ),
  );
  await pg.exec(
    `set role authenticated; set request.jwt.claim.sub='${alice}';`,
  );
  const result = await pg.query<{ id: string }>(
    "select public.dogsports_create_club('Testverein','Teststadt','Beschreibung') as id",
  );
  club = result.rows[0].id;
  await pg.exec(`reset role; insert into public.dogsports_club_members(club_id,user_id) values('${club}','${bob}');
    insert into public.dogsports_club_posts(club_id,user_id,result_id,author_name,dog_name,event_name,result_date,discipline,total,source_updated_at)
    values('${club}','${alice}','r','Alice','Dog','Prüfung','2026-11-09','FCI-VK3',278.52,now());`);
}, 30000);
afterAll(() => pg.close());
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await pg.exec(
    `begin; set local role authenticated; set local request.jwt.claim.sub='${id}';`,
  );
  try {
    return await fn();
  } finally {
    await pg.exec("rollback");
  }
}
it("creates club and membership atomically, rejects duplicate club identity", async () => {
  await asUser(alice, async () => {
    expect(
      (await pg.query("select * from public.dogsports_club_members")).rows,
    ).toHaveLength(1);
    await expect(
      pg.query(
        "select public.dogsports_create_club(' testverein ','TESTSTADT','')",
      ),
    ).rejects.toThrow(/unique/);
  });
});
it("allows discovery but hides feed and membership identities from nonmembers", async () => {
  await asUser(outsider, async () => {
    expect(
      (await pg.query("select * from public.dogsports_clubs")).rows,
    ).toHaveLength(1);
    expect(
      (await pg.query("select * from public.dogsports_club_members")).rows,
    ).toHaveLength(0);
    expect(
      (await pg.query("select * from public.dogsports_club_posts")).rows,
    ).toHaveLength(0);
    await pg.exec(
      `insert into public.dogsports_club_members(club_id,user_id) values('${club}','${outsider}')`,
    );
    expect(
      (await pg.query("select * from public.dogsports_club_posts")).rows,
    ).toHaveLength(1);
  });
});
it("denies forged memberships and clubs created for another user", async () => {
  for (const sql of [
    `insert into public.dogsports_club_members(club_id,user_id) values('${club}','${outsider}')`,
    `insert into public.dogsports_clubs(name,created_by) values('Forged','${bob}')`,
  ])
    await asUser(alice, async () => {
      await expect(pg.exec(sql)).rejects.toThrow(/row-level security/);
    });
});
it("members see shared posts but cannot change or remove another member’s post", async () => {
  await asUser(bob, async () => {
    expect(
      (await pg.query("select * from public.dogsports_club_posts")).rows,
    ).toHaveLength(1);
    expect(
      (await pg.query("delete from public.dogsports_club_posts returning id"))
        .rows,
    ).toHaveLength(0);
    await expect(
      pg.exec("update public.dogsports_club_posts set total=100"),
    ).rejects.toThrow(/permission denied/);
  });
});
it("nonmembers cannot publish, even with their own identity", async () => {
  await asUser(outsider, async () => {
    await expect(
      pg.exec(`insert into public.dogsports_club_posts(club_id,user_id,result_id,author_name,dog_name,event_name,result_date,discipline,total,source_updated_at)
      values('${club}','${outsider}','r','Name','Dog','Event','2026-11-09','FCI-VK1',200,now())`),
    ).rejects.toThrow(/row-level security/);
  });
});
it("leaving removes own posts without touching private records or other members", async () => {
  await asUser(alice, async () => {
    await pg.exec(
      `delete from public.dogsports_club_members where club_id='${club}'`,
    );
    expect(
      (await pg.query("select * from public.dogsports_club_posts")).rows,
    ).toHaveLength(0);
    await pg.exec("reset role");
    expect(
      (await pg.query("select * from public.dogsports_club_posts")).rows,
    ).toHaveLength(0);
    expect(
      (await pg.query("select * from public.dogsports_club_members")).rows,
    ).toHaveLength(1);
  });
});
it("anonymous users cannot access community tables or create clubs", async () => {
  for (const sql of [
    "select * from public.dogsports_clubs",
    "select public.dogsports_create_club('Hidden','','')",
  ]) {
    await pg.exec("begin; set local role anon;");
    try {
      await expect(pg.exec(sql)).rejects.toThrow(/permission denied/);
    } finally {
      await pg.exec("rollback");
    }
  }
});
