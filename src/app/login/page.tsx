import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect("/orders");
  }

  return (
    <main className="dss-login-page">
      <LoginForm />
    </main>
  );
}
