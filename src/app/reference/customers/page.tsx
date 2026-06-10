import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { CustomerReferenceTable } from "@/components/reference/ReferenceTables";
import { listCustomers } from "@/features/reference/data";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "P") {
    redirect("/orders?status=released");
  }

  const rows = await listCustomers();

  return (
    <AppShell currentPath="/reference/customers" profile={profile}>
      <CustomerReferenceTable rows={rows} />
    </AppShell>
  );
}
