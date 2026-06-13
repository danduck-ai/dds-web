import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProductProductionStatusPage from "./page";

const { getCurrentProfileMock, listDailyProductionSeedMock, redirectMock } = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  listDailyProductionSeedMock: vi.fn(),
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

vi.mock("@/features/production/daily-seed", () => ({
  listDailyProductionSeed: listDailyProductionSeedMock,
}));

vi.mock("@/components/app-shell/AppShell", () => ({
  AppShell: ({ children, currentPath }: { children: React.ReactNode; currentPath: string }) => (
    <div data-current-path={currentPath}>{children}</div>
  ),
}));

vi.mock("@/components/production/ProductProductionStatusWorkspace", () => ({
  ProductProductionStatusWorkspace: ({
    currentDate,
    initialSeed,
    profile,
  }: {
    currentDate: string;
    initialSeed: { candidates: unknown[]; dayPlanItems: unknown[] };
    profile: { departmentCode?: string | null };
  }) => (
    <div>
      <span>제품별 생산 계획 워크스페이스</span>
      <span>{currentDate}</span>
      <span>{initialSeed.candidates.length}</span>
      <span>{profile.departmentCode}</span>
    </div>
  ),
}));

describe("ProductProductionStatusPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCurrentProfileMock.mockReset();
    listDailyProductionSeedMock.mockReset();
  });

  test("redirects anonymous users to login", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    await expect(ProductProductionStatusPage()).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  test("renders product production planning workspace with seeded frontend data", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-1",
      displayName: "박현우",
      email: "production@dss.local",
      role: "P",
      departmentCode: "S",
    });
    listDailyProductionSeedMock.mockResolvedValue({ candidates: [{}], dayPlanItems: [] });

    render(await ProductProductionStatusPage());

    expect(screen.getByText("제품별 생산 계획 워크스페이스")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(listDailyProductionSeedMock).toHaveBeenCalled();
  });
});
