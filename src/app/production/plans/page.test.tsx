import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProductionPlansPage from "./page";

const { getCurrentProfileMock, listOrderStatusRowsMock, redirectMock } = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  listOrderStatusRowsMock: vi.fn(),
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

vi.mock("@/features/orders/data", () => ({
  listOrderStatusRows: listOrderStatusRowsMock,
}));

vi.mock("@/components/app-shell/AppShell", () => ({
  AppShell: ({ children, currentPath }: { children: React.ReactNode; currentPath: string }) => (
    <div data-current-path={currentPath}>{children}</div>
  ),
}));

vi.mock("@/components/production/ProductionPlanningWorkspace", () => ({
  ProductionPlanningWorkspace: ({
    currentDate,
    profile,
  }: {
    currentDate: string;
    profile: { departmentCode?: string | null };
  }) => (
    <div>
      <span>생산계획 워크스페이스</span>
      <span>{currentDate}</span>
      <span>{profile.departmentCode}</span>
    </div>
  ),
}));

describe("ProductionPlansPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCurrentProfileMock.mockReset();
    listOrderStatusRowsMock.mockReset();
  });

  test("redirects anonymous users to login", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    await expect(ProductionPlansPage()).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  test("renders production planning workspace with profile department", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-1",
      displayName: "박현우",
      email: "production@dss.local",
      role: "P",
      departmentCode: "S",
    });
    listOrderStatusRowsMock.mockResolvedValue([]);

    render(await ProductionPlansPage());

    expect(screen.getByText("생산계획 워크스페이스")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(listOrderStatusRowsMock).toHaveBeenCalled();
  });
});
