import { describe, expect, test } from "vitest";

import {
  DEV_LOGIN_ROLES,
  getDevLoginCredentials,
  isDevLoginRole,
} from "./dev-accounts";

describe("development quick login accounts", () => {
  test("defines one seed account per supported role", () => {
    expect(DEV_LOGIN_ROLES).toEqual(["A", "P", "E"]);

    expect(getDevLoginCredentials("A")).toEqual({
      email: "admin@dss.local",
      password: "dss-admin-1234",
    });
    expect(getDevLoginCredentials("P")).toEqual({
      email: "production@dss.local",
      password: "dss-production-1234",
    });
    expect(getDevLoginCredentials("E")).toEqual({
      email: "executive@dss.local",
      password: "dss-executive-1234",
    });
  });

  test("rejects invalid quick-login role values", () => {
    expect(isDevLoginRole("A")).toBe(true);
    expect(isDevLoginRole("admin")).toBe(false);
    expect(() => getDevLoginCredentials("admin")).toThrow("Unsupported dev login role");
  });
});
