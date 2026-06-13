import { listOrderStatusRows } from "@/features/orders/data";
import type { DailyProductionSeedItem } from "./types";
import { buildDailyProductionSeed } from "./daily-planning";
import mockData from "@/features/mock-data/dss.json";

type ProductionDayPlanSeedRow = {
  id: string;
  production_date: string;
  department_code: "R" | "S" | "P";
  work_start_time: string;
};

type ProductionDayPlanItemSeedRow = {
  id: string;
  production_day_plan_id: string;
  order_product_id: string;
  quantity: number;
  estimated_duration_minutes: number;
  duration_source: DailyProductionSeedItem["durationSource"];
  planning_status: DailyProductionSeedItem["planningStatus"];
  sequence: number;
};

type DailyMockData = {
  production_day_plans: ProductionDayPlanSeedRow[];
  production_day_plan_items: ProductionDayPlanItemSeedRow[];
};

const dailyMockData = mockData as DailyMockData;

function listDailyProductionPlanItems(): DailyProductionSeedItem[] {
  const dayPlanById = new Map(dailyMockData.production_day_plans.map((plan) => [plan.id, plan]));

  return dailyMockData.production_day_plan_items
    .flatMap((item) => {
      const dayPlan = dayPlanById.get(item.production_day_plan_id);

      if (!dayPlan) {
        return [];
      }

      return [
        {
          id: item.id,
          productionDate: dayPlan.production_date,
          departmentCode: dayPlan.department_code,
          workStartTime: dayPlan.work_start_time,
          orderProductId: item.order_product_id,
          quantity: item.quantity,
          estimatedDurationMinutes: item.estimated_duration_minutes,
          durationSource: item.duration_source,
          planningStatus: item.planning_status,
          sequence: item.sequence,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.productionDate.localeCompare(right.productionDate) ||
        left.departmentCode.localeCompare(right.departmentCode) ||
        left.sequence - right.sequence ||
        left.id.localeCompare(right.id),
    );
}

export async function listDailyProductionSeed() {
  const orders = await listOrderStatusRows();

  return buildDailyProductionSeed(orders, listDailyProductionPlanItems());
}
