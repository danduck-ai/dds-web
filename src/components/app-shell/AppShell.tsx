"use client";

import {
  Button,
  Content,
  Header,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  Stack,
} from "@carbon/react";
import { Calendar, DocumentAdd, ListChecked, Logout, Product, UserMultiple } from "@carbon/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { DssThemeCycleButton, DssThemeProvider, getShellTheme, useDssTheme } from "@/components/theme/DssThemeProvider";
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

type MenuItem = {
  href: string;
  label: string;
  icon: typeof ListChecked;
};

const menuByRole: Record<AppRole, MenuItem[]> = {
  A: [
    { href: "/orders/intake", label: "주문 접수", icon: DocumentAdd },
    { href: "/orders", label: "주문 현황", icon: ListChecked },
    { href: "/production/daily-plans", label: "일간 생산 계획표 작성", icon: Calendar },
    { href: "/reference/designs", label: "설계 관리", icon: Product },
    { href: "/reference/customers", label: "고객 관리", icon: UserMultiple },
  ],
  P: [
    { href: "/orders", label: "주문 현황", icon: ListChecked },
    { href: "/production/daily-plans", label: "일간 생산 계획표 작성", icon: Calendar },
  ],
  E: [
    { href: "/orders", label: "주문 현황", icon: ListChecked },
    { href: "/production/daily-plans", label: "일간 생산 계획표 작성", icon: Calendar },
    { href: "/reference/designs", label: "설계 관리", icon: Product },
    { href: "/reference/customers", label: "고객 관리", icon: UserMultiple },
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
  return (
    <DssThemeProvider>
      <AppShellFrame currentPath={currentPath} profile={profile}>
        {children}
      </AppShellFrame>
    </DssThemeProvider>
  );
}

function AppShellFrame({
  profile,
  children,
  currentPath,
}: {
  profile: ShellProfile;
  children: ReactNode;
  currentPath?: string;
}) {
  const currentPathname = currentPath ? pathnameOf(currentPath) : "";
  const homeHref = menuByRole[profile.role][0]?.href ?? "/orders";
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true);
  const [isLargeViewport, setIsLargeViewport] = useState(true);
  const isSideNavRail = !isSideNavExpanded && isLargeViewport;
  const { resolvedTheme } = useDssTheme();
  const shellTheme = getShellTheme(resolvedTheme);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1056px)");
    const syncSideNav = () => {
      setIsLargeViewport(query.matches);
      setIsSideNavExpanded(query.matches);
    };

    syncSideNav();
    query.addEventListener("change", syncSideNav);
    return () => query.removeEventListener("change", syncSideNav);
  }, []);

  return (
    <>
      <Header aria-label="동성실리콘 주문관리">
        <HeaderMenuButton
          aria-controls="dss-side-nav"
          aria-expanded={isSideNavExpanded}
          aria-label={isSideNavExpanded ? "메뉴 닫기" : "메뉴 열기"}
          isActive={isSideNavExpanded}
          isCollapsible
          onClick={() => setIsSideNavExpanded((current) => !current)}
        />
        <HeaderName href={homeHref} prefix="DSS">
          동성실리콘
        </HeaderName>
        <div className="dss-header-actions">
          <DssThemeCycleButton />
        </div>
      </Header>

      <SideNav
        aria-label="업무 메뉴"
        className={`cds--${shellTheme}`}
        data-dss-shell-theme={shellTheme}
        expanded={isSideNavExpanded}
        id="dss-side-nav"
        isFixedNav
        isPersistent
        isRail={isSideNavRail}
      >
        <SideNavItems isSideNavExpanded={isSideNavExpanded}>
          {menuByRole[profile.role].map((item) => {
            const isActive = currentPathname === pathnameOf(item.href);

            return (
              <SideNavLink
                aria-current={isActive ? "page" : undefined}
                href={item.href}
                isActive={isActive}
                isSideNavExpanded={isSideNavExpanded}
                key={item.href}
                renderIcon={item.icon}
              >
                {item.label}
              </SideNavLink>
            );
          })}
        </SideNavItems>

        <div aria-label="사용자 정보" className="dss-shell-profile">
          <Stack gap={2}>
            <strong>{profile.displayName}</strong>
            <span>{roleLabels[profile.role]}</span>
            <span>{profile.email}</span>
            <form action={signOut}>
              <Button kind="ghost" renderIcon={Logout} size="sm" type="submit">
                로그아웃
              </Button>
            </form>
          </Stack>
        </div>
      </SideNav>

      <Content
        className="dss-shell-content"
        data-side-nav-expanded={isSideNavExpanded}
        data-side-nav-rail={isSideNavRail}
        tagName="div"
      >
        {children}
      </Content>
    </>
  );
}
