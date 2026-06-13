import { describe, expect, test } from "vitest";

import type { OrderListRow } from "@/features/orders/types";
import {
  buildDailyConfirmationPlan,
  buildDailyProductionSeed,
  createDailyProductionPlanningCards,
  moveDailyCardsToSchedule,
  partitionDailyPlanningCards,
} from "./daily-planning";
import type { DailyProductionCard, DailyProductionSeedItem } from "./types";

function releasedOrder(): OrderListRow {
  return {
    id: "order-released",
    orderNo: "O-DSE-26061300001",
    status: "released",
    statusLabel: "생산팀 전달",
    requestedDate: "2026-06-13",
    channel: "이메일",
    customerName: "동성전자",
    contactName: "김영수",
    products: [
      {
        id: "product-s",
        designId: "design-s",
        designNo: "DS-S120",
        productName: "압출 실리콘 가스켓 S",
        specification: "S-120 / 적색",
        departmentCode: "S",
        defaultUnitsPerHour: 120,
        quantity: 300,
        shipmentPlans: [
          {
            id: "shipment-s-1",
            plannedShipDate: "2026-06-18",
            quantity: 100,
            status: "ready",
          },
          {
            id: "shipment-s-2",
            plannedShipDate: "2026-06-25",
            quantity: 200,
            status: "ready",
          },
        ],
      },
      {
        id: "product-r",
        designId: "design-r",
        designNo: "DS-R100",
        productName: "실리콘 패킹 R",
        specification: "R-100",
        departmentCode: "R",
        defaultUnitsPerHour: 100,
        quantity: 100,
        shipmentPlans: [
          {
            id: "shipment-r",
            plannedShipDate: "2026-06-20",
            quantity: 100,
            status: "ready",
          },
        ],
      },
    ],
    productSummary: "DS-S120 압출 실리콘 가스켓 S 외 1",
    totalQuantity: 400,
    shipmentLabel: "출하계획 3건",
    createdAt: "2026-06-13T00:00:00.000Z",
    completedAt: null,
    searchText: "o-dse-26061300001 동성전자",
  };
}

function seedItem(patch: Partial<DailyProductionSeedItem> = {}): DailyProductionSeedItem {
  return {
    id: patch.id ?? "daily-item-1",
    productionDate: patch.productionDate ?? "2026-06-13",
    departmentCode: patch.departmentCode ?? "S",
    workStartTime: patch.workStartTime ?? "09:00",
    orderProductId: patch.orderProductId ?? "product-s",
    quantity: patch.quantity ?? 80,
    completedQuantity: patch.completedQuantity ?? 0,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? 40,
    durationSource: patch.durationSource ?? "product_default",
    workStatus: patch.workStatus ?? "planned",
    sequence: patch.sequence ?? 1,
  };
}

function cardFixture(patch: Partial<DailyProductionCard> = {}): DailyProductionCard {
  return {
    id: patch.id ?? "product-s-available",
    orderProductId: patch.orderProductId ?? "product-s",
    orderNo: patch.orderNo ?? "O-DSE-26061300001",
    customerName: patch.customerName ?? "동성전자",
    designNo: patch.designNo ?? "DS-S120",
    productName: patch.productName ?? "압출 실리콘 가스켓 S",
    specification: patch.specification ?? "S-120 / 적색",
    departmentCode: patch.departmentCode ?? "S",
    orderQuantity: patch.orderQuantity ?? 300,
    plannedQuantity: patch.plannedQuantity ?? 0,
    remainingQuantity: patch.remainingQuantity ?? 300,
    defaultUnitsPerHour: patch.defaultUnitsPerHour ?? 120,
    nextShipDate: patch.nextShipDate ?? "2026-06-18",
    shipmentSummary: patch.shipmentSummary ?? "06/18 100개 외 1",
    quantity: patch.quantity ?? null,
    completedQuantity: patch.completedQuantity ?? 0,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? null,
    durationSource: patch.durationSource ?? null,
    workStatus: patch.workStatus ?? "planned",
    productionDate: patch.productionDate,
    sequence: patch.sequence,
    sourceOrderProductId: patch.sourceOrderProductId,
  };
}

describe("daily production planning helpers", () => {
  test("builds OrderProduct-based cards and excludes old shipment production-plan fields", () => {
    const seed = buildDailyProductionSeed([releasedOrder()], [seedItem()]);
    const cards = createDailyProductionPlanningCards(seed, {
      departmentCode: "S",
      productionDate: "2026-06-13",
    });

    expect(cards.map((card) => card.orderProductId)).toEqual(["product-s", "product-s"]);
    expect(cards[0]).toMatchObject({
      id: "daily-item-1",
      quantity: 80,
      remainingQuantity: 300,
      productionDate: "2026-06-13",
      sequence: 1,
    });
    expect(cards[1]).toMatchObject({
      id: "product-s-available",
      quantity: null,
      plannedQuantity: 80,
      remainingQuantity: 220,
      nextShipDate: "2026-06-18",
      shipmentSummary: "06/18 100개 외 1",
    });
    expect("shipmentPlanId" in cards[0]).toBe(false);
    expect("productionPlanId" in cards[0]).toBe(false);
  });

  test("partitions scheduled daily items from available OrderProduct candidates", () => {
    const result = partitionDailyPlanningCards(
      [
        cardFixture({ id: "available", quantity: null }),
        cardFixture({ id: "scheduled-2", quantity: 60, productionDate: "2026-06-13", sequence: 2 }),
        cardFixture({ id: "scheduled-1", quantity: 90, productionDate: "2026-06-13", sequence: 1 }),
      ],
      "2026-06-13",
    );

    expect(result.availableCards.map((card) => card.id)).toEqual(["available"]);
    expect(result.scheduledCards.map((card) => card.id)).toEqual(["scheduled-1", "scheduled-2"]);
  });

  test("moves OrderProduct candidates to the selected day and keeps the unscheduled remainder available", () => {
    const result = moveDailyCardsToSchedule({
      availableCards: [cardFixture({ remainingQuantity: 300 })],
      scheduledCards: [],
      productionDate: "2026-06-13",
      quantitiesByCardId: new Map([["product-s-available", 180]]),
    });

    expect(result.scheduledCards[0]).toMatchObject({
      orderProductId: "product-s",
      quantity: 180,
      estimatedDurationMinutes: 90,
      productionDate: "2026-06-13",
      sequence: 1,
    });
    expect(result.availableCards[0]).toMatchObject({
      quantity: null,
      remainingQuantity: 120,
      sourceOrderProductId: "product-s",
    });
  });

  test("confirms daily plan items keyed by orderProductId and continuous time", () => {
    const result = buildDailyConfirmationPlan(
      [
        cardFixture({ id: "card-1", quantity: 180, estimatedDurationMinutes: 90 }),
        cardFixture({ id: "card-2", orderProductId: "product-r", quantity: 60, estimatedDurationMinutes: 30 }),
      ],
      {
        productionDate: "2026-06-13",
        departmentCode: "S",
        workStartTime: "09:00",
      },
    );

    expect(result).toMatchObject({
      ok: true,
      dayPlan: {
        productionDate: "2026-06-13",
        departmentCode: "S",
        workStartTime: "09:00",
        items: [
          { orderProductId: "product-s", sequence: 1, startTime: "09:00", endTime: "10:30" },
          { orderProductId: "product-r", sequence: 2, startTime: "10:30", endTime: "11:00" },
        ],
      },
    });
  });
});
