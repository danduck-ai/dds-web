import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("shows production planning, production result, shipment, and inventory navigation for administrative users", () => {
    render(
      <AppShell profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "주문 접수" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "주문 현황" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생산 계획" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생산 결과" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "출하 관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "재고 관리" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "생산 제품 관리" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "생산 현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "일간 생산 계획표 작성" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "설계 관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "고객 관리" })).toBeInTheDocument();
    expect(screen.getByText("김민정")).toBeInTheDocument();
    expect(screen.getByText("사무직")).toBeInTheDocument();
  });

  test("shows order, production planning, production result, shipment, and inventory navigation for production users", () => {
    render(
      <AppShell profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "주문 현황" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생산 계획" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생산 결과" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "출하 관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "재고 관리" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "생산 제품 관리" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "생산 현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "일간 생산 계획표 작성" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "주문 접수" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "설계 관리" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "고객 관리" })).not.toBeInTheDocument();
    expect(screen.getByText("현장직")).toBeInTheDocument();
  });

  test("marks the current navigation item as selected", () => {
    render(
      <AppShell
        currentPath="/reference/designs"
        profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}
      >
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "설계 관리" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "설계 관리" })).toHaveClass("cds--side-nav__link--current");
    expect(screen.getByRole("link", { name: "주문 접수" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "주문 현황" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "생산 결과" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "출하 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "재고 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "일간 생산 계획표 작성" })).not.toBeInTheDocument();
  });

  test("marks order intake separately from order status", () => {
    render(
      <AppShell
        currentPath="/orders/intake"
        profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}
      >
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "주문 접수" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "주문 현황" })).not.toHaveAttribute("aria-current");
  });

  test("matches order navigation even when the menu href has a query string", () => {
    render(
      <AppShell
        currentPath="/orders"
        profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}
      >
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "주문 현황" })).toHaveAttribute("aria-current", "page");
  });

  test("marks product production planning navigation separately", () => {
    render(
      <AppShell
        currentPath="/production/product-status"
        profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}
      >
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "생산 계획" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "생산 결과" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "재고 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "생산 현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "일간 생산 계획표 작성" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "주문 현황" })).not.toHaveAttribute("aria-current");
  });

  test("marks production result navigation separately", () => {
    render(
      <AppShell
        currentPath="/production/product-management"
        profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}
      >
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "생산 결과" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "생산 계획" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "출하 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "재고 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "주문 현황" })).not.toHaveAttribute("aria-current");
  });

  test("marks inventory management navigation separately", () => {
    render(
      <AppShell currentPath="/inventory" profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "재고 관리" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "생산 결과" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "출하 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "생산 계획" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "주문 현황" })).not.toHaveAttribute("aria-current");
  });

  test("marks shipment management navigation separately", () => {
    render(
      <AppShell currentPath="/shipments" profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "출하 관리" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "생산 결과" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "재고 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "생산 계획" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "주문 현황" })).not.toHaveAttribute("aria-current");
  });

  test("collapses and expands the Carbon side navigation from the header menu button", async () => {
    const user = userEvent.setup();
    render(
      <AppShell profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}>
        <div>content</div>
      </AppShell>,
    );

    const closeButton = screen.getByRole("button", { name: "메뉴 닫기" });
    const sideNav = screen.getByRole("navigation", { name: "업무 메뉴" });
    const content = screen.getByText("content").closest(".dss-shell-content");

    expect(closeButton).toHaveAttribute("aria-expanded", "true");
    expect(sideNav).toHaveClass("cds--side-nav--expanded");
    expect(content).toHaveAttribute("data-side-nav-expanded", "true");

    await user.click(closeButton);

    const openButton = screen.getByRole("button", { name: "메뉴 열기" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(sideNav).not.toHaveClass("cds--side-nav--expanded");
    expect(sideNav).toHaveClass("cds--side-nav--rail");
    expect(content).toHaveAttribute("data-side-nav-expanded", "false");

    await user.click(openButton);

    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toHaveAttribute("aria-expanded", "true");
    expect(sideNav).toHaveClass("cds--side-nav--expanded");
    expect(content).toHaveAttribute("data-side-nav-expanded", "true");
  });

  test("cycles and persists browser-local Carbon themes from a fixed header button", async () => {
    const user = userEvent.setup();
    render(
      <AppShell profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}>
        <div>content</div>
      </AppShell>,
    );

    const header = screen.getByRole("banner");
    const sideNav = screen.getByRole("navigation", { name: "업무 메뉴" });
    const themeButton = within(header).getByRole("button", { name: /화면 테마: Gray 10/ });
    const themeRoot = screen.getByTestId("dss-theme-root");

    expect(screen.queryByRole("combobox", { name: /화면 테마/ })).not.toBeInTheDocument();
    expect(within(sideNav).queryByRole("button", { name: /화면 테마/ })).not.toBeInTheDocument();
    expect(themeButton).toHaveClass("dss-theme-cycle-button");
    expect(themeButton).toHaveAttribute("data-dss-theme", "g10");
    expect(themeButton).toHaveAttribute("data-dss-theme-icon", "sun");
    expect(themeRoot).toHaveClass("cds--g10");
    expect(themeRoot).toHaveAttribute("data-dss-theme-preference", "system");
    expect(themeRoot).toHaveAttribute("data-dss-resolved-theme", "g10");

    await user.click(themeButton);

    expect(within(header).getByRole("button", { name: /화면 테마: Gray 90/ })).toHaveAttribute(
      "data-dss-theme-icon",
      "moon",
    );
    expect(window.localStorage.getItem("dss-theme-preference")).toBe("g90");
    expect(themeRoot).toHaveClass("cds--g90");
    expect(themeRoot).toHaveAttribute("data-dss-theme-preference", "g90");
    expect(themeRoot).toHaveAttribute("data-dss-resolved-theme", "g90");

    await user.click(within(header).getByRole("button", { name: /화면 테마: Gray 90/ }));

    expect(within(header).getByRole("button", { name: /화면 테마: Gray 100/ })).toHaveAttribute(
      "data-dss-theme",
      "g100",
    );
    expect(window.localStorage.getItem("dss-theme-preference")).toBe("g100");

    await user.click(within(header).getByRole("button", { name: /화면 테마: Gray 100/ }));

    expect(within(header).getByRole("button", { name: /화면 테마: White/ })).toHaveAttribute(
      "data-dss-theme-icon",
      "sun",
    );
    expect(window.localStorage.getItem("dss-theme-preference")).toBe("white");
  });

  test("loads a saved Carbon theme preference from localStorage", () => {
    window.localStorage.setItem("dss-theme-preference", "g100");

    render(
      <AppShell profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("button", { name: /화면 테마: Gray 100/ })).toHaveAttribute(
      "data-dss-theme-icon",
      "moon",
    );
    expect(screen.getByTestId("dss-theme-root")).toHaveClass("cds--g100");
  });
});
