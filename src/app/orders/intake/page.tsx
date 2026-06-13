import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { OrderWorkspace } from "@/components/orders/OrderWorkspace";
import { listOrders } from "@/features/orders/data";
import { listOrderFormLookups } from "@/features/reference/data";
import { hasFullAccess } from "@/lib/auth/permissions";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OrderIntakePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!hasFullAccess(profile.role)) {
    redirect("/orders");
  }

  const [orders, lookups] = await Promise.all([listOrders("active"), listOrderFormLookups()]);

  return (
    <AppShell currentPath="/orders/intake" profile={profile}>
      <OrderWorkspace
        initialOrders={orders}
        initialStatus="active"
        mode="intake"
        role={profile.role}
        receiverLabel={`${profile.displayName} / ${profile.email}`}
        contactOptions={lookups.contactOptions}
        designOptions={lookups.designOptions}
      />
    </AppShell>
  );
}
