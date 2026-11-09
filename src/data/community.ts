import { supabase } from "../lib/supabase";
import type { Club, ClubMembership, ClubPost } from "../domain/community";
import { resultPublication } from "../domain/community";
import type { CompetitionResult } from "../domain/types";

function client() {
  if (!supabase)
    throw new Error("Community benötigt eine Verbindung zur Cloud.");
  return supabase;
}
function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23505")
    throw new Error(
      "Dieser Verein oder dieses geteilte Ergebnis existiert bereits.",
    );
  throw new Error(
    "Community konnte nicht geladen oder gespeichert werden. Bitte Verbindung prüfen und erneut versuchen.",
  );
}
export async function searchClubs(search: string) {
  const term = search.trim().replace(/[\\%_]/g, "\\$&");
  const { data, error } = await client()
    .from("dogsports_clubs")
    .select("*")
    .ilike("name", `%${term}%`)
    .order("name")
    .limit(50);
  check(error);
  return data as Club[];
}
export async function myMemberships(userId: string) {
  const { data, error } = await client()
    .from("dogsports_club_members")
    .select("*")
    .eq("user_id", userId);
  check(error);
  return data as ClubMembership[];
}
export async function myClubs(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client()
    .from("dogsports_clubs")
    .select("*")
    .in("id", ids)
    .order("name");
  check(error);
  return data as Club[];
}
export async function createClub(
  name: string,
  city: string,
  description: string,
) {
  const { data, error } = await client().rpc("dogsports_create_club", {
    club_name: name,
    club_city: city,
    club_description: description,
  });
  check(error);
  return data as string;
}
export async function joinClub(clubId: string, userId: string) {
  const { error } = await client()
    .from("dogsports_club_members")
    .insert({ club_id: clubId, user_id: userId });
  check(error);
}
export async function leaveClub(clubId: string, userId: string) {
  const { error } = await client()
    .from("dogsports_club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId);
  check(error);
}
export async function loadFeed(clubIds: string[], offset = 0) {
  if (!clubIds.length) return [];
  const { data, error } = await client()
    .from("dogsports_club_posts")
    .select("*")
    .in("club_id", clubIds)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  check(error);
  return data as ClubPost[];
}
export async function publishResult(
  clubId: string,
  userId: string,
  result: CompetitionResult,
  caption: string,
) {
  const { error } = await client()
    .from("dogsports_club_posts")
    .insert({
      ...resultPublication(result),
      club_id: clubId,
      user_id: userId,
      caption: caption.trim(),
    });
  check(error);
}
export async function withdrawPost(id: string, userId: string) {
  const { error } = await client()
    .from("dogsports_club_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  check(error);
}
