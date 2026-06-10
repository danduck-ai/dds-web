import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { OrderWorkspace } from "@/components/orders/OrderWorkspace";
import { cancelOrders, createOrder, releaseOrders, updateOrder } from "@/features/orders/actions";
import { listOrders } from "@/features/orders/data";
import type { OrderStatus } from "@/features/orders/types";
import { listOrderFormLookups } from "@/features/reference/data";
import { getCurrentProfile } from "@/lib/auth/session";

const statuses: OrderStatus[] = ["active", "released", "completed", "cancelled"];

function normalizeStatus(value: string | undefined, fallback: OrderStatus): OrderStatus {
  return statuses.includes(value as OrderStatus) ? (value as OrderStatus) : fallback;
}

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const params = searchParams ? await searchParams : {};
  const initialStatus = normalizeStatus(params.status, profile.role === "P" ? "released" : "active");
  const [ordersByStatus, lookups] = await Promise.all([
    Promise.all(statuses.map((status) => listOrders(status))),
    listOrderFormLookups(),
  ]);

  return (
    <AppShell profile={profile}>
      <OrderWorkspace
        initialOrders={ordersByStatus.flat()}
        initialStatus={initialStatus}
        role={profile.role}
        contactOptions={lookups.contactOptions}
        designOptions={lookups.designOptions}
        onCreateOrder={createOrder}
        onUpdateOrder={updateOrder}
        onReleaseOrders={releaseOrders}
        onCancelOrders={cancelOrders}
      />
    </AppShell>
  );
}
