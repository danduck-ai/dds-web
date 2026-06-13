import { beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentProfile } from "./session";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("getCurrentProfile", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  test("returns null when no development login cookie exists", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined,
    });

    await expect(getCurrentProfile()).resolves.toBeNull();
  });

  test("returns the active profile selected by the development login cookie", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "10000000-0000-4000-8000-000000000004" }),
    });

    await expect(getCurrentProfile()).resolves.toEqual({
      id: "10000000-0000-4000-8000-000000000004",
      email: "production-r@dss.local",
      displayName: "정하준",
      role: "P",
      departmentCode: "R",
    });
  });
});
