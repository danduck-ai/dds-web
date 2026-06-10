import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  test("shows order, design, and customer navigation for administrative users", () => {
    render(
      <AppShell profile={{ displayName: "김민정", email: "admin@dss.local", role: "A" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "주문 현황" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "설계 관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "고객 관리" })).toBeInTheDocument();
    expect(screen.getByText("김민정")).toBeInTheDocument();
    expect(screen.getByText("사무직")).toBeInTheDocument();
  });

  test("shows only order navigation for production users", () => {
    render(
      <AppShell profile={{ displayName: "박현우", email: "production@dss.local", role: "P" }}>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "주문 현황" })).toBeInTheDocument();
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
});
