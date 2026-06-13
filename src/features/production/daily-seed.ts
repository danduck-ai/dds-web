import { listOrderStatusRows } from "@/features/orders/data";
import type { DailyProductionSeedItem } from "./types";
import { buildDailyProductionSeed } from "./daily-planning";

const dailyProductionPlanSeedItems: DailyProductionSeedItem[] = [
  {
    id: "daily-item-r-20260613-1",
    productionDate: "2026-06-13",
    departmentCode: "R",
    workStartTime: "09:00",
    orderProductId: "41000000-0000-4000-8000-000000000004",
    quantity: 160,
    completedQuantity: 0,
    estimatedDurationMinutes: 80,
    durationSource: "product_default",
    workStatus: "planned",
    sequence: 1,
  },
  {
    id: "daily-item-r-20260613-2",
    productionDate: "2026-06-13",
    departmentCode: "R",
    workStartTime: "09:00",
    orderProductId: "41000000-0000-4000-8000-000000000007",
    quantity: 110,
    completedQuantity: 0,
    estimatedDurationMinutes: 60,
    durationSource: "manual_override",
    workStatus: "planned",
    sequence: 2,
  },
  {
    id: "daily-item-p-20260613-1",
    productionDate: "2026-06-13",
    departmentCode: "P",
    workStartTime: "09:00",
    orderProductId: "41000000-0000-4000-8000-000000000005",
    quantity: 240,
    completedQuantity: 80,
    estimatedDurationMinutes: 206,
    durationSource: "product_default",
    workStatus: "producing",
    sequence: 1,
  },
  {
    id: "daily-item-s-20260613-1",
    productionDate: "2026-06-13",
    departmentCode: "S",
    workStartTime: "09:00",
    orderProductId: "41000000-0000-4000-8000-000000000006",
    quantity: 130,
    completedQuantity: 0,
    estimatedDurationMinutes: 120,
    durationSource: "product_default",
    workStatus: "planned",
    sequence: 1,
  },
];

export async function listDailyProductionSeed() {
  const orders = await listOrderStatusRows();

  return buildDailyProductionSeed(orders, dailyProductionPlanSeedItems);
}
