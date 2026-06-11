import { beforeEach, describe, expect, test, vi } from "vitest";

import HomePage from "./page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  test("redirects directly to the mock-admin order workspace", async () => {
    await expect(HomePage()).rejects.toThrow("redirect:/orders");
    expect(redirectMock).toHaveBeenCalledWith("/orders");
  });
});
