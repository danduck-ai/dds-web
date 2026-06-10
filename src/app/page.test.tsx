import { beforeEach, describe, expect, test, vi } from "vitest";

import HomePage from "./page";

const { redirectMock, getCurrentProfileMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  getCurrentProfileMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCurrentProfileMock.mockReset();
  });

  test("redirects anonymous users to login", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    await expect(HomePage()).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  test("redirects production users to the released order tab", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-1",
      email: "production@dss.local",
      displayName: "박현우",
      role: "P",
    });

    await expect(HomePage()).rejects.toThrow("redirect:/orders?status=released");
    expect(redirectMock).toHaveBeenCalledWith("/orders?status=released");
  });
});
