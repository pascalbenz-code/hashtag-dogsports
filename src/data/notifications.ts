import { supabase } from "../lib/supabase";
export interface CommunityNotification {
  id: string;
  club_id: string;
  kind: "post_created" | "member_joined";
  created_at: string;
  dogsports_clubs: { name: string };
}
export async function loadNotifications(userId: string) {
  if (!supabase) throw new Error("Cloud nicht verbunden.");
  const read = await supabase
    .from("dogsports_notification_reads")
    .select("read_through")
    .eq("user_id", userId)
    .maybeSingle();
  if (read.error)
    throw new Error("Benachrichtigungen konnten nicht geladen werden.");
  const cursor = read.data?.read_through ?? "1970-01-01T00:00:00Z";
  const [recent, unread] = await Promise.all([
    supabase
      .from("dogsports_community_events")
      .select("id,club_id,kind,created_at,dogsports_clubs(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("dogsports_community_events")
      .select("id", { count: "exact", head: true })
      .gt("created_at", cursor),
  ]);
  if (recent.error || unread.error)
    throw new Error("Benachrichtigungen konnten nicht geladen werden.");
  return {
    events: recent.data as unknown as CommunityNotification[],
    unread: unread.count ?? 0,
    cursor,
  };
}
export async function markNotificationsRead(userId: string, through: string) {
  if (!supabase) throw new Error("Cloud nicht verbunden.");
  const { error } = await supabase
    .from("dogsports_notification_reads")
    .upsert({ user_id: userId, read_through: through });
  if (error) throw new Error("Lesestatus konnte nicht gespeichert werden.");
}
