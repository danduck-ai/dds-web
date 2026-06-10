import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  redirect(profile.role === "P" ? "/orders?status=released" : "/orders");
}
