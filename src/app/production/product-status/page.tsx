import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { ProductProductionStatusWorkspace } from "@/components/production/ProductProductionStatusWorkspace";
import { listDailyProductionSeed } from "@/features/production/daily-seed";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProductProductionStatusPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const seed = await listDailyProductionSeed();

  return (
    <AppShell currentPath="/production/product-status" profile={profile}>
      <ProductProductionStatusWorkspace
        currentDate={new Date().toISOString().slice(0, 10)}
        initialSeed={seed}
        profile={profile}
      />
    </AppShell>
  );
}
