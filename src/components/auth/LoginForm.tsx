"use client";

import { Button, Form, PasswordInput, Stack, TextInput, Tile } from "@carbon/react";

import { signInWithDevRole, signInWithPassword } from "@/lib/auth/actions";

const quickLoginButtons = [
  { role: "A", label: "사무직으로 로그인" },
  { role: "P_R", label: "R 부서 현장직으로 로그인" },
  { role: "P_S", label: "S 부서 현장직으로 로그인" },
  { role: "P_P", label: "P 부서 현장직으로 로그인" },
  { role: "E", label: "임원으로 로그인" },
];

export function LoginForm() {
  return (
    <Tile className="dss-login-card">
      <Stack gap={6}>
        <header>
          <p>DSS</p>
          <h1>동성실리콘 주문관리</h1>
          <span>로컬 POC 환경</span>
        </header>

        <Form action={signInWithPassword}>
          <Stack gap={5}>
            <TextInput autoComplete="email" id="login-email" labelText="이메일" name="email" type="email" />
            <PasswordInput
              autoComplete="current-password"
              id="login-password"
              labelText="비밀번호"
              name="password"
            />
            <Button type="submit">로그인</Button>
          </Stack>
        </Form>

        <div aria-label="개발용 빠른 로그인" className="dss-login-quick">
          {quickLoginButtons.map((button) => (
            <Form action={signInWithDevRole} key={button.role}>
              <input name="role" type="hidden" value={button.role} />
              <Button kind="secondary" size="sm" type="submit">
                {button.label}
              </Button>
            </Form>
          ))}
        </div>
      </Stack>
    </Tile>
  );
}
