import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
let club: string;
beforeAll(async () => {
  await pg.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users(id) values('${alice}'),('${bob}');`);
  for (const file of [
    "20261106120000_create_dogsports_records.sql",
    "20261109202434_community_clubs.sql",
  ])
    await pg.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await pg.exec(
    `insert into public.dogsports_records(user_id,entity_type,record_id,payload,client_updated_at) values('${alice}','dogs','dog-original','{"name":"unchanged"}',now());`,
  );
  club = (
    await pg.query<{ id: string }>(
      `insert into public.dogsports_clubs(name,created_by) values('Existing Club','${alice}') returning id`,
    )
  ).rows[0].id;
  await pg.exec(
    readFileSync(
      "supabase/migrations/20261110053503_public_identifiers.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(() => pg.close());
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await pg.exec(
    `begin;set local role authenticated;set local request.jwt.claim.sub='${id}';`,
  );
  try {
    return await fn();
  } finally {
    await pg.exec("rollback");
  }
}
it("backfills existing entities without changing payloads or technical keys", async () => {
  expect(
    (
      await pg.query(
        "select public_id from public.dogsports_user_ids order by public_id",
      )
    ).rows,
  ).toEqual([{ public_id: "#A000001" }, { public_id: "#A000002" }]);
  expect(
    (await pg.query("select public_id from public.dogsports_dog_ids")).rows,
  ).toEqual([{ public_id: "+A000001" }]);
  expect(
    (await pg.query("select public_id from public.dogsports_clubs")).rows,
  ).toEqual([{ public_id: "*A000001" }]);
  expect(
    (await pg.query("select record_id,payload from public.dogsports_records"))
      .rows,
  ).toEqual([{ record_id: "dog-original", payload: { name: "unchanged" } }]);
});
it("uses six digits with letter rollover and continues after Z", async () => {
  const cases = [
    [1, "#A000001"],
    [999999, "#A999999"],
    [1000000, "#B000001"],
    [25999974, "#Z999999"],
    [25999975, "#AA000001"],
  ];
  for (const [n, value] of cases)
    expect(
      (await pg.query(`select dogsports_private.format_code(${n},'#') as code`))
        .rows,
    ).toEqual([{ code: value }]);
});
it("automatically allocates new users and clubs, rejects client-supplied club codes", async () => {
  await pg.exec("begin");
  try {
    await pg.exec(
      "insert into auth.users(id) values('33333333-3333-4333-8333-333333333333')",
    );
    expect(
      (
        await pg.query(
          "select public_id from public.dogsports_user_ids where user_id='33333333-3333-4333-8333-333333333333'",
        )
      ).rows,
    ).toHaveLength(1);
    const row = (
      await pg.query<{ public_id: string }>(
        `insert into public.dogsports_clubs(name,created_by,public_id) values('New Club','${alice}','*Z999999') returning public_id`,
      )
    ).rows[0];
    expect(row.public_id).toMatch(/^\*A\d{6}$/);
    expect(row.public_id).not.toBe("*A000001");
  } finally {
    await pg.exec("rollback");
  }
});
it("keeps dog codes stable across editing, deletion and restore; other owners get distinct codes", async () => {
  await asUser(alice, async () => {
    await pg.exec(
      "update public.dogsports_records set payload='{}' where record_id='dog-original'",
    );
    await pg.exec(
      "update public.dogsports_records set payload=null,deleted_at=now() where record_id='dog-original'",
    );
    await pg.exec(
      "update public.dogsports_records set payload='{}',deleted_at=null where record_id='dog-original'",
    );
    expect(
      (await pg.query("select public_id from public.dogsports_dog_ids")).rows,
    ).toEqual([{ public_id: "+A000001" }]);
  });
  await asUser(bob, async () => {
    await pg.exec(
      `insert into public.dogsports_records(user_id,entity_type,record_id,payload,client_updated_at) values('${bob}','dogs','dog-original','{}',now())`,
    );
    expect(
      (
        await pg.query<{ public_id: string }>(
          "select public_id from public.dogsports_dog_ids",
        )
      ).rows[0].public_id,
    ).not.toBe("+A000001");
  });
});
it("limits user and dog lookups to their owner and denies edits or sequence access", async () => {
  await asUser(bob, async () => {
    expect(
      (await pg.query("select * from public.dogsports_dog_ids")).rows,
    ).toHaveLength(0);
    expect(
      (await pg.query("select * from public.dogsports_user_ids")).rows,
    ).toHaveLength(1);
  });
  for (const sql of [
    "update public.dogsports_user_ids set public_id='#B000001'",
    "delete from public.dogsports_dog_ids",
    "select nextval('dogsports_private.dog_code_seq')",
  ])
    await asUser(alice, async () => {
      await expect(pg.exec(sql)).rejects.toThrow(/permission denied/);
    });
  await pg.exec("begin;set local role anon;");
  try {
    await expect(
      pg.query("select * from public.dogsports_user_ids"),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await pg.exec("rollback");
  }
});
it("prevents changing an assigned club code", async () => {
  await pg.exec("begin");
  try {
    await expect(
      pg.exec(
        `update public.dogsports_clubs set public_id='*Z999999' where id='${club}'`,
      ),
    ).rejects.toThrow(/immutable/);
  } finally {
    await pg.exec("rollback");
  }
});
