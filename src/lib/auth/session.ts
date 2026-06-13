import { cookies } from "next/headers";

import type { AppRole } from "@/features/orders/types";
import mockData from "@/features/mock-data/dss.json";
import { DEV_PROFILE_COOKIE_NAME } from "./dev-accounts";

export type CurrentProfile = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  departmentCode?: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  department_code?: string | null;
  is_active: boolean;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const cookieStore = await cookies();
  const profileId = cookieStore.get(DEV_PROFILE_COOKIE_NAME)?.value;

  if (!profileId) {
    return null;
  }

  const data = mockData.profiles.find((profile) => profile.id === profileId && profile.is_active) as ProfileRow | undefined;

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    role: data.role,
    departmentCode: data.department_code ?? null,
  };
}
