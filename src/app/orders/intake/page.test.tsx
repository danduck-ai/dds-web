import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import OrderIntakePage from "./page";

const { getCurrentProfileMock, listOrderFormLookupsMock, listOrdersMock, redirectMock } = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  listOrderFormLookupsMock: vi.fn(),
  listOrdersMock: vi.fn(),
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

vi.mock("@/features/orders/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/orders/data")>()),
  listOrders: listOrdersMock,
}));

vi.mock("@/features/reference/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/reference/data")>()),
  listOrderFormLookups: listOrderFormLookupsMock,
}));

vi.mock("@/components/app-shell/AppShell", () => ({
  AppShell: ({ children, currentPath }: { children: React.ReactNode; currentPath: string }) => (
    <div data-current-path={currentPath}>{children}</div>
  ),
}));

vi.mock("@/components/orders/OrderWorkspace", () => ({
  OrderWorkspace: ({ role }: { role: string }) => (
    <div>
      <span>주문 접수 워크스페이스</span>
      <span>role:{role}</span>
    </div>
  ),
}));

describe("OrderIntakePage", () => {
  beforeEach(() => {
    getCurrentProfileMock.mockReset();
    listOrderFormLookupsMock.mockReset();
    listOrdersMock.mockReset();
    redirectMock.mockClear();
  });

  test("redirects anonymous users to login", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    await expect(OrderIntakePage()).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  test("redirects production users away from order intake", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-p",
      displayName: "박현우",
      email: "production@dss.local",
      role: "P",
      departmentCode: "S",
    });

    await expect(OrderIntakePage()).rejects.toThrow("redirect:/orders");

    expect(redirectMock).toHaveBeenCalledWith("/orders");
  });

  test("allows executive users to access order intake", async () => {
    getCurrentProfileMock.mockResolvedValue({
      id: "profile-e",
      displayName: "이서연",
      email: "executive@dss.local",
      role: "E",
      departmentCode: "executive",
    });
    listOrdersMock.mockResolvedValue([]);
    listOrderFormLookupsMock.mockResolvedValue({ contactOptions: [], designOptions: [] });

    render(await OrderIntakePage());

    expect(screen.getByText("주문 접수 워크스페이스")).toBeInTheDocument();
    expect(screen.getByText("role:E")).toBeInTheDocument();
    expect(listOrdersMock).toHaveBeenCalledWith("active");
    expect(listOrderFormLookupsMock).toHaveBeenCalled();
  });
});
