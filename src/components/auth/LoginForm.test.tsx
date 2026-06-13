import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { LoginForm } from "./LoginForm";

vi.mock("@/lib/auth/actions", () => ({
  signInWithDevRole: vi.fn(),
  signInWithPassword: vi.fn(),
}));

describe("LoginForm", () => {
  test("renders email/password fields and development quick-login buttons by role and production department", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사무직으로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R 부서 현장직으로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "S 부서 현장직으로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P 부서 현장직으로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "임원으로 로그인" })).toBeInTheDocument();
  });
});
