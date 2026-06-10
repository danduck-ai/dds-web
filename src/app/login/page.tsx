import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(profile.role === "P" ? "/orders?status=released" : "/orders");
  }

  return (
    <main className="login-page">
      <LoginForm />
    </main>
  );
}
