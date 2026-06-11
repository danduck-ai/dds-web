"use server";

import { redirect } from "next/navigation";

export type AuthActionState = {
  ok: boolean;
  message?: string;
};

export async function signInWithPassword(): Promise<void> {
  redirect("/orders");
}

export async function signInWithDevRole(): Promise<void> {
  redirect("/orders");
}

export async function signOut() {
  redirect("/orders");
}
