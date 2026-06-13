import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { InventoryManagementWorkspace } from "@/components/inventory/InventoryManagementWorkspace";
import { listProductionManagementSeed } from "@/features/production/product-management";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function InventoryManagementPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const seed = await listProductionManagementSeed();

  return (
    <AppShell currentPath="/inventory" profile={profile}>
      <InventoryManagementWorkspace initialSeed={seed} />
    </AppShell>
  );
}
