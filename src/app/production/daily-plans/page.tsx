import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { DailyProductionPlanWorkspace } from "@/components/production/DailyProductionPlanWorkspace";
import { listDailyProductionSeed } from "@/features/production/daily-seed";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DailyProductionPlansPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const seed = await listDailyProductionSeed();

  return (
    <AppShell currentPath="/production/daily-plans" profile={profile}>
      <DailyProductionPlanWorkspace
        currentDate={new Date().toISOString().slice(0, 10)}
        initialSeed={seed}
        profile={profile}
      />
    </AppShell>
  );
}
