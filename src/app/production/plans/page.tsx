import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { ProductionPlanningWorkspace } from "@/components/production/ProductionPlanningWorkspace";
import { listOrderStatusRows } from "@/features/orders/data";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProductionPlansPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const orders = await listOrderStatusRows();

  return (
    <AppShell currentPath="/production/plans" profile={profile}>
      <ProductionPlanningWorkspace
        currentDate={new Date().toISOString().slice(0, 10)}
        initialOrders={orders}
        profile={profile}
      />
    </AppShell>
  );
}
