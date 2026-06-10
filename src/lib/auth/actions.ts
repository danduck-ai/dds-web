"use server";

import { redirect } from "next/navigation";

import { getDevLoginCredentials } from "./dev-accounts";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  ok: boolean;
  message?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "이메일과 비밀번호를 입력하세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: "로그인 정보가 올바르지 않습니다." };
  }

  redirect("/");
}

export async function signInWithDevRole(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let credentials;

  try {
    credentials = getDevLoginCredentials(getString(formData, "role"));
  } catch {
    return { ok: false, message: "지원하지 않는 개발용 로그인 역할입니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return { ok: false, message: "개발용 계정으로 로그인할 수 없습니다. seed를 먼저 실행하세요." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
