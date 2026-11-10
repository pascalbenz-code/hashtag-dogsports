import { supabase } from "../lib/supabase";
export interface DogIdentifier {
  record_id: string;
  public_id: string;
}
export async function loadOwnIdentifiers(userId: string) {
  if (!supabase) throw new Error("Cloud nicht verbunden.");
  const [user, dogs] = await Promise.all([
    supabase
      .from("dogsports_user_ids")
      .select("public_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("dogsports_dog_ids")
      .select("record_id,public_id")
      .eq("user_id", userId),
  ]);
  if (user.error || dogs.error)
    throw new Error(
      "Kennungen konnten nicht geladen werden. Bitte Cloud-Verbindung prüfen.",
    );
  return {
    userId: user.data?.public_id as string | undefined,
    dogs: dogs.data as DogIdentifier[],
  };
}
