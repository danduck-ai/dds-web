"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEV_PROFILE_COOKIE_NAME,
  getDevLoginProfileId,
  getDevLoginProfileIdByCredentials,
  isDevLoginRole,
} from "./dev-accounts";

export type AuthActionState = {
  ok: boolean;
  message?: string;
};

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

async function setCurrentProfile(profileId: string) {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    name: DEV_PROFILE_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    value: profileId,
  });
}

export async function signInWithPassword(formData: FormData): Promise<void> {
  const profileId = getDevLoginProfileIdByCredentials(formValue(formData, "email"), formValue(formData, "password"));

  if (!profileId) {
    redirect("/login?error=invalid");
  }

  await setCurrentProfile(profileId);
  redirect("/orders");
}

export async function signInWithDevRole(formData: FormData): Promise<void> {
  const role = formData.get("role");

  if (!isDevLoginRole(role)) {
    redirect("/login?error=invalid");
  }

  await setCurrentProfile(getDevLoginProfileId(role));
  redirect("/orders");
}

export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete(DEV_PROFILE_COOKIE_NAME);
  redirect("/login");
}
