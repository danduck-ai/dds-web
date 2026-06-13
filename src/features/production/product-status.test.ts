import { describe, expect, test } from "vitest";

import type { DailyProductionSeed, DailyProductionSeedItem } from "./types";
import { createDailyProductionRows, createOrderProductionRows, createProductProductionRows } from "./product-status";

function seedItem(patch: Partial<DailyProductionSeedItem> = {}): DailyProductionSeedItem {
  return {
    id: patch.id ?? "daily-item-1",
    productionDate: patch.productionDate ?? "2026-06-12",
    departmentCode: patch.departmentCode ?? "S",
    workStartTime: patch.workStartTime ?? "09:00",
    orderProductId: patch.orderProductId ?? "product-s",
    quantity: patch.quantity ?? 80,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? 40,
    durationSource: patch.durationSource ?? "product_default",
    planningStatus: patch.planningStatus ?? "scheduled",
    sequence: patch.sequence ?? 1,
  };
}

const seed: DailyProductionSeed = {
  candidates: [
    {
      id: "product-s-candidate",
      orderProductId: "product-s",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      orderProductCount: 2,
      orderStatus: "released",
      customerName: "동성전자",
      designNo: "DS-S120",
      productName: "압출 실리콘 가스켓 S",
      specification: "S-120 / 적색",
      departmentCode: "S",
      orderQuantity: 300,
      defaultUnitsPerHour: 120,
      nextShipDate: "2026-06-18",
      shipmentSummary: "06/18 100개 외 1",
    },
    {
      id: "product-r-candidate",
      orderProductId: "product-r",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      orderProductCount: 2,
      orderStatus: "released",
      customerName: "동성전자",
      designNo: "DS-R100",
      productName: "실리콘 패킹 R",
      specification: "R-100 / 흑색",
      departmentCode: "R",
      orderQuantity: 120,
      defaultUnitsPerHour: 100,
      nextShipDate: "2026-06-20",
      shipmentSummary: "06/20 120개",
    },
  ],
  dayPlanItems: [
    seedItem({ id: "planned-yesterday", productionDate: "2026-06-12", quantity: 80 }),
    seedItem({
      id: "planned-today",
      productionDate: "2026-06-13",
      quantity: 40,
      sequence: 2,
    }),
    seedItem({
      id: "future-plan",
      productionDate: "2026-06-15",
      quantity: 100,
      sequence: 1,
    }),
    seedItem({
      id: "r-today-plan",
      orderProductId: "product-r",
      productionDate: "2026-06-13",
      departmentCode: "R",
      quantity: 50,
      sequence: 1,
    }),
  ],
};

describe("product production status helpers", () => {
  test("groups existing production day plans by date and department", () => {
    const rows = createDailyProductionRows({
      ...seed,
      dayPlanItems: [
        ...seed.dayPlanItems,
        seedItem({
          id: "r-today-second",
          orderProductId: "product-r",
          productionDate: "2026-06-13",
          departmentCode: "R",
          quantity: 30,
          sequence: 2,
        }),
        seedItem({
          id: "cancelled-only",
          productionDate: "2026-06-14",
          departmentCode: "P",
          planningStatus: "cancelled",
        }),
      ],
    });

    expect(rows).toEqual([
      {
        id: "day-S-2026-06-15",
        productionDate: "2026-06-15",
        departmentCode: "S",
        plannedProductionCount: 1,
      },
      {
        id: "day-R-2026-06-13",
        productionDate: "2026-06-13",
        departmentCode: "R",
        plannedProductionCount: 2,
      },
      {
        id: "day-S-2026-06-13",
        productionDate: "2026-06-13",
        departmentCode: "S",
        plannedProductionCount: 1,
      },
      {
        id: "day-S-2026-06-12",
        productionDate: "2026-06-12",
        departmentCode: "S",
        plannedProductionCount: 1,
      },
    ]);
  });

  test("summarizes OrderProduct plan quantities without completion fields", () => {
    const rows = createProductProductionRows(seed);
    const productRow = rows.find((row) => row.id === "product-s");

    expect(rows).toHaveLength(2);
    expect(productRow).toMatchObject({
      id: "product-s",
      customerName: "동성전자",
      productName: "압출 실리콘 가스켓 S",
      orderQuantity: 300,
      plannedQuantity: 220,
      remainingPlanQuantity: 80,
    });
    expect(productRow).not.toHaveProperty("todayProducingQuantity");
    expect(productRow).not.toHaveProperty("completedQuantity");
    expect(productRow).not.toHaveProperty("completionRate");
    expect(productRow).not.toHaveProperty("completionLabel");
  });

  test("keeps only non-cancelled production plan items in date order", () => {
    const rows = createProductProductionRows(
      {
        ...seed,
        dayPlanItems: [
          seedItem({ id: "cancelled", productionDate: "2026-06-11", planningStatus: "cancelled" }),
          ...seed.dayPlanItems,
        ],
      },
    );
    const productRow = rows.find((row) => row.id === "product-s");

    expect(productRow?.productionPlans.map((plan) => plan.id)).toEqual([
      "planned-yesterday",
      "planned-today",
      "future-plan",
    ]);
  });

  test("groups product production rows by order for the order view", () => {
    const rows = createOrderProductionRows(seed);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "order-1",
      orderNo: "O-DSE-26061300001",
      requestedDate: "2026-06-13",
      customerName: "동성전자",
      productCount: 2,
    });
    expect(rows[0].products.map((product) => product.productName)).toEqual([
      "실리콘 패킹 R",
      "압출 실리콘 가스켓 S",
    ]);
    expect(rows[0].products[0]).toMatchObject({
      plannedQuantity: 50,
      remainingPlanQuantity: 70,
    });
    expect(rows[0].products[0]).not.toHaveProperty("completionLabel");
  });
});
