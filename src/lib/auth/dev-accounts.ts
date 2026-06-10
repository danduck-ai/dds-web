import type { AppRole } from "@/features/orders/types";

export const DEV_LOGIN_ROLES = ["A", "P", "E"] as const;

export type DevLoginRole = (typeof DEV_LOGIN_ROLES)[number];

export type DevLoginCredentials = {
  email: string;
  password: string;
};

const devLoginCredentials: Record<DevLoginRole, DevLoginCredentials> = {
  A: {
    email: "admin@dss.local",
    password: "dss-admin-1234",
  },
  P: {
    email: "production@dss.local",
    password: "dss-production-1234",
  },
  E: {
    email: "executive@dss.local",
    password: "dss-executive-1234",
  },
};

export function isDevLoginRole(value: unknown): value is DevLoginRole {
  return typeof value === "string" && DEV_LOGIN_ROLES.includes(value as AppRole);
}

export function getDevLoginCredentials(role: unknown): DevLoginCredentials {
  if (!isDevLoginRole(role)) {
    throw new Error(`Unsupported dev login role: ${String(role)}`);
  }

  return devLoginCredentials[role];
}
