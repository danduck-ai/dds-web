import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import LoginPage from "./page";

const { getCurrentProfileMock, redirectMock } = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/components/auth/LoginForm", () => ({
  LoginForm: () => <form aria-label="로그인 폼" />,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    getCurrentProfileMock.mockReset();
    redirectMock.mockClear();
  });

  test("renders the login form for anonymous users", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    render(await LoginPage());

    expect(screen.getByRole("form", { name: "로그인 폼" })).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test("redirects authenticated users to orders", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-1",
      displayName: "김민정",
      email: "admin@dss.local",
      role: "A",
      departmentCode: "office",
    });

    await expect(LoginPage()).rejects.toThrow("redirect:/orders");

    expect(redirectMock).toHaveBeenCalledWith("/orders");
  });
});
