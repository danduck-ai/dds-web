import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { ShipmentManagementWorkspace } from "@/components/shipments/ShipmentManagementWorkspace";
import { listProductionManagementSeed } from "@/features/production/product-management";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const seed = await listProductionManagementSeed();

  return (
    <AppShell currentPath="/shipments" profile={profile}>
      <ShipmentManagementWorkspace currentDate={new Date().toISOString().slice(0, 10)} initialSeed={seed} role={profile.role} />
    </AppShell>
  );
}
