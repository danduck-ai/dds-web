import type { AppRole } from "@/features/orders/types";
import mockData from "@/features/mock-data/dss.json";

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
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const data = mockData.profiles.find((profile) => profile.role === "A" && profile.is_active) as
    | ProfileRow
    | undefined;

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
