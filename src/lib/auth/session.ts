import type { AppRole } from "@/features/orders/types";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    role: data.role,
  };
}
