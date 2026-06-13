import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ShipmentsPage from "./page";

const { getCurrentProfileMock, listProductionManagementSeedMock, redirectMock } = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  listProductionManagementSeedMock: vi.fn(),
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

vi.mock("@/features/production/product-management", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/production/product-management")>()),
  listProductionManagementSeed: listProductionManagementSeedMock,
}));

vi.mock("@/components/app-shell/AppShell", () => ({
  AppShell: ({ children, currentPath }: { children: React.ReactNode; currentPath: string }) => (
    <div data-current-path={currentPath}>{children}</div>
  ),
}));

vi.mock("@/components/shipments/ShipmentManagementWorkspace", () => ({
  ShipmentManagementWorkspace: ({
    currentDate,
    initialSeed,
    role,
  }: {
    currentDate: string;
    initialSeed: { orderProducts: unknown[]; receipts: unknown[] };
    role: string;
  }) => (
    <div>
      <span>출하 관리 워크스페이스</span>
      <span>{currentDate}</span>
      <span>role:{role}</span>
      <span>products:{initialSeed.orderProducts.length}</span>
      <span>receipts:{initialSeed.receipts.length}</span>
    </div>
  ),
}));

describe("ShipmentsPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCurrentProfileMock.mockReset();
    listProductionManagementSeedMock.mockReset();
  });

  test("redirects anonymous users to login", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    await expect(ShipmentsPage()).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  test("renders shipment management workspace inside the shipment route", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-1",
      displayName: "박현우",
      email: "production@dss.local",
      role: "P",
      departmentCode: "S",
    });
    listProductionManagementSeedMock.mockResolvedValue({ orderProducts: [{ id: "product-s" }], receipts: [{}] });

    render(await ShipmentsPage());

    expect(screen.getByText("출하 관리 워크스페이스")).toBeInTheDocument();
    expect(screen.getByText("role:P")).toBeInTheDocument();
    expect(screen.getByText("products:1")).toBeInTheDocument();
    expect(screen.getByText("receipts:1")).toBeInTheDocument();
    expect(listProductionManagementSeedMock).toHaveBeenCalled();
  });
});
