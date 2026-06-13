import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  DEV_LOGIN_KEYS,
  getDevLoginCredentials,
  getDevLoginProfileId,
  isDevLoginRole,
} from "./dev-accounts";
import { signInWithDevRole, signInWithPassword, signOut } from "./actions";

const { cookieStore, cookiesMock, redirectMock } = vi.hoisted(() => ({
  cookieStore: {
    delete: vi.fn(),
    set: vi.fn(),
  },
  cookiesMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

function formData(values: Record<string, string>) {
  const data = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    data.set(key, value);
  });

  return data;
}

describe("development quick login accounts", () => {
  beforeEach(() => {
    cookieStore.delete.mockClear();
    cookieStore.set.mockClear();
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue(cookieStore);
    redirectMock.mockClear();
  });

  test("defines one seed account per supported role", () => {
    expect(DEV_LOGIN_KEYS).toEqual(["A", "P_R", "P_S", "P_P", "E"]);

    expect(getDevLoginCredentials("A")).toEqual({
      email: "admin@dss.local",
      password: "dss-admin-1234",
    });
    expect(getDevLoginCredentials("P_R")).toEqual({
      email: "production-r@dss.local",
      password: "dss-production-r-1234",
    });
    expect(getDevLoginCredentials("P_S")).toEqual({
      email: "production@dss.local",
      password: "dss-production-1234",
    });
    expect(getDevLoginCredentials("P_P")).toEqual({
      email: "production-p@dss.local",
      password: "dss-production-p-1234",
    });
    expect(getDevLoginCredentials("E")).toEqual({
      email: "executive@dss.local",
      password: "dss-executive-1234",
    });
  });

  test("rejects invalid quick-login role values", () => {
    expect(isDevLoginRole("A")).toBe(true);
    expect(isDevLoginRole("P_R")).toBe(true);
    expect(isDevLoginRole("admin")).toBe(false);
    expect(() => getDevLoginCredentials("admin")).toThrow("Unsupported dev login role");
  });

  test("sets the selected development profile cookie from quick login", async () => {
    await expect(signInWithDevRole(formData({ role: "P_R" }))).rejects.toThrow("redirect:/orders");

    expect(cookieStore.set).toHaveBeenCalledWith({
      httpOnly: true,
      name: "dss_dev_profile_id",
      path: "/",
      sameSite: "lax",
      value: getDevLoginProfileId("P_R"),
    });
    expect(redirectMock).toHaveBeenCalledWith("/orders");
  });

  test("sets the matching development profile cookie from email and password login", async () => {
    await expect(
      signInWithPassword(
        formData({
          email: "production-p@dss.local",
          password: "dss-production-p-1234",
        }),
      ),
    ).rejects.toThrow("redirect:/orders");

    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "dss_dev_profile_id",
        value: getDevLoginProfileId("P_P"),
      }),
    );
  });

  test("rejects unknown password credentials without setting a profile cookie", async () => {
    await expect(
      signInWithPassword(
        formData({
          email: "production-p@dss.local",
          password: "wrong-password",
        }),
      ),
    ).rejects.toThrow("redirect:/login?error=invalid");

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  test("clears the development profile cookie on sign out", async () => {
    await expect(signOut()).rejects.toThrow("redirect:/login");

    expect(cookieStore.delete).toHaveBeenCalledWith("dss_dev_profile_id");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
