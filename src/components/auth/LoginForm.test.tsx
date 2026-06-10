import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  test("renders email/password fields and development quick-login buttons", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사무직으로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "현장직으로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "임원으로 로그인" })).toBeInTheDocument();
  });
});
