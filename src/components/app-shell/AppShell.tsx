"use client";

import { SideNavItems, SideNavLink } from "@carbon/react";
import type { ReactNode } from "react";

import type { AppRole } from "@/features/orders/types";
import { signOut } from "@/lib/auth/actions";

export type ShellProfile = {
  displayName: string;
  email: string;
  role: AppRole;
};

const roleLabels: Record<AppRole, string> = {
  A: "사무직",
  P: "현장직",
  E: "임원",
};

const menuByRole: Record<AppRole, Array<{ href: string; label: string }>> = {
  A: [
    { href: "/orders", label: "주문 현황" },
    { href: "/reference/designs", label: "설계 관리" },
    { href: "/reference/customers", label: "고객 관리" },
  ],
  P: [{ href: "/orders?status=released", label: "주문 현황" }],
  E: [
    { href: "/orders", label: "주문 현황" },
    { href: "/reference/designs", label: "설계 관리" },
    { href: "/reference/customers", label: "고객 관리" },
  ],
};

function pathnameOf(value: string) {
  return value.split("?")[0];
}

export function AppShell({
  profile,
  children,
  currentPath,
}: {
  profile: ShellProfile;
  children: ReactNode;
  currentPath?: string;
}) {
  const currentPathname = currentPath ? pathnameOf(currentPath) : "";

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar" aria-label="주요 메뉴">
        <div className="app-shell__brand">
          <strong>DSS</strong>
          <span>동성실리콘</span>
        </div>
        <nav className="app-shell__nav" aria-label="업무 메뉴">
          <SideNavItems className="app-shell__nav-items" isSideNavExpanded>
            {menuByRole[profile.role].map((item) => {
              const isActive = currentPathname === pathnameOf(item.href);

              return (
                <SideNavLink
                  aria-current={isActive ? "page" : undefined}
                  className="app-shell__nav-link"
                  href={item.href}
                  isActive={isActive}
                  key={item.href}
                >
                  {item.label}
                </SideNavLink>
              );
            })}
          </SideNavItems>
        </nav>
        <div className="app-shell__profile">
          <strong>{profile.displayName}</strong>
          <span>{roleLabels[profile.role]}</span>
          <span>{profile.email}</span>
          <form action={signOut}>
            <button className="app-shell__logout" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
