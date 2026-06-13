import type { AppRole, DepartmentCode } from "@/features/orders/types";

export const DEV_PROFILE_COOKIE_NAME = "dss_dev_profile_id";

export const DEV_LOGIN_KEYS = ["A", "P_R", "P_S", "P_P", "E"] as const;

export type DevLoginRole = (typeof DEV_LOGIN_KEYS)[number];

export type DevLoginCredentials = {
  email: string;
  password: string;
};

type DevLoginAccount = {
  role: AppRole;
  departmentCode?: DepartmentCode;
  profileId: string;
  credentials: DevLoginCredentials;
};

const devLoginAccounts: Record<DevLoginRole, DevLoginAccount> = {
  A: {
    role: "A",
    profileId: "10000000-0000-4000-8000-000000000001",
    credentials: {
      email: "admin@dss.local",
      password: "dss-admin-1234",
    },
  },
  P_R: {
    role: "P",
    departmentCode: "R",
    profileId: "10000000-0000-4000-8000-000000000004",
    credentials: {
      email: "production-r@dss.local",
      password: "dss-production-r-1234",
    },
  },
  P_S: {
    role: "P",
    departmentCode: "S",
    profileId: "10000000-0000-4000-8000-000000000002",
    credentials: {
      email: "production@dss.local",
      password: "dss-production-1234",
    },
  },
  P_P: {
    role: "P",
    departmentCode: "P",
    profileId: "10000000-0000-4000-8000-000000000005",
    credentials: {
      email: "production-p@dss.local",
      password: "dss-production-p-1234",
    },
  },
  E: {
    role: "E",
    profileId: "10000000-0000-4000-8000-000000000003",
    credentials: {
      email: "executive@dss.local",
      password: "dss-executive-1234",
    },
  },
};

export function isDevLoginRole(value: unknown): value is DevLoginRole {
  return typeof value === "string" && DEV_LOGIN_KEYS.includes(value as DevLoginRole);
}

export function getDevLoginCredentials(role: unknown): DevLoginCredentials {
  if (!isDevLoginRole(role)) {
    throw new Error(`Unsupported dev login role: ${String(role)}`);
  }

  return { ...devLoginAccounts[role].credentials };
}

export function getDevLoginProfileId(role: unknown): string {
  if (!isDevLoginRole(role)) {
    throw new Error(`Unsupported dev login role: ${String(role)}`);
  }

  return devLoginAccounts[role].profileId;
}

export function getDevLoginProfileIdByCredentials(email: string, password: string): string | null {
  const normalizedEmail = email.trim().toLowerCase();
  const matchingAccount = DEV_LOGIN_KEYS.map((role) => devLoginAccounts[role]).find(
    (account) => account.credentials.email.toLowerCase() === normalizedEmail && account.credentials.password === password,
  );

  return matchingAccount?.profileId ?? null;
}
