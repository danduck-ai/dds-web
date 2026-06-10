import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { DesignReferenceTable } from "@/components/reference/ReferenceTables";
import { listDesigns } from "@/features/reference/data";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DesignsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "P") {
    redirect("/orders?status=released");
  }

  const rows = await listDesigns();

  return (
    <AppShell currentPath="/reference/designs" profile={profile}>
      <DesignReferenceTable rows={rows} />
    </AppShell>
  );
}
