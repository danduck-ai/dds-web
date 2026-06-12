import { describe, expect, test } from "vitest";

import type { OrderListRow, ProductionPlanRecord } from "@/features/orders/types";
import {
  buildConfirmationPlan,
  buildTimelineWindow,
  calculateTimelineRowSpan,
  createHalfHourOptions,
  createProductionPlanningCards,
  deferCardToNextDay,
  getInitialDepartment,
  moveCardsToAvailable,
  moveCardsToSchedule,
  partitionPlanningCards,
  reorderCards,
  updateScheduledCardQuantity,
  updateCardQuantity,
} from "./planning";
import type { ProductionPlanCard } from "./types";

function productionPlan(
  patch: Partial<ProductionPlanRecord & { availableFromDate: string | null; productionDate: string | null }> = {},
): ProductionPlanRecord & { availableFromDate?: string | null; productionDate?: string | null } {
  return {
    id: patch.id ?? "plan-r-draft",
    shipmentPlanId: patch.shipmentPlanId ?? "shipment-r",
    quantity: patch.quantity ?? null,
    completedQuantity: patch.completedQuantity ?? 0,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? null,
    durationSource: patch.durationSource ?? null,
    workStatus: patch.workStatus ?? "unscheduled",
    availableFromDate: patch.availableFromDate,
    productionDate: patch.productionDate,
  };
}

function orderFixture(): OrderListRow {
  return {
    id: "order-released",
    orderNo: "O-DSE-26061200001",
    status: "released",
    statusLabel: "생산팀 전달",
    requestedDate: "2026-06-12",
    channel: "이메일",
    customerName: "동성전자",
    contactName: "김영수",
    products: [
      {
        id: "product-r",
        designId: "design-r",
        designNo: "DS-R100",
        productName: "실리콘 패킹 R",
        specification: "R-100",
        departmentCode: "R",
        defaultUnitsPerHour: 120,
        quantity: 300,
        shipmentPlans: [
          {
            id: "shipment-r",
            plannedShipDate: "2026-06-18",
            quantity: 300,
            status: "ready",
            productionPlans: [
              productionPlan({
                id: "plan-r-existing",
                shipmentPlanId: "shipment-r",
                quantity: 100,
                estimatedDurationMinutes: 50,
                workStatus: "scheduled",
                productionDate: "2026-06-12",
              }),
              productionPlan({ id: "plan-r-draft", shipmentPlanId: "shipment-r" }),
            ],
          },
        ],
      },
      {
        id: "product-p",
        designId: "design-p",
        designNo: "DS-P300",
        productName: "실리콘 몰드 P",
        specification: "P-300",
        departmentCode: "P",
        defaultUnitsPerHour: 60,
        quantity: 120,
        shipmentPlans: [
          {
            id: "shipment-p",
            plannedShipDate: "2026-06-20",
            quantity: 120,
            status: "ready",
            productionPlans: [productionPlan({ id: "plan-p-draft", shipmentPlanId: "shipment-p" })],
          },
        ],
      },
    ],
    productSummary: "DS-R100 실리콘 패킹 R 외 1",
    totalQuantity: 420,
    shipmentLabel: "출하계획 2건",
    createdAt: "2026-06-12T00:00:00.000Z",
    completedAt: null,
    searchText: "o-dse-26061200001 동성전자 실리콘",
  };
}

function cardFixture(patch: Partial<ProductionPlanCard> = {}): ProductionPlanCard {
  return {
    id: patch.id ?? "card-1",
    productionPlanId: patch.productionPlanId ?? "plan-1",
    shipmentPlanId: patch.shipmentPlanId ?? "shipment-1",
    orderNo: patch.orderNo ?? "O-DSE-26061200001",
    customerName: patch.customerName ?? "동성전자",
    designNo: patch.designNo ?? "DS-R100",
    productName: patch.productName ?? "실리콘 패킹 R",
    specification: patch.specification ?? "R-100",
    departmentCode: patch.departmentCode ?? "R",
    plannedShipDate: patch.plannedShipDate ?? "2026-06-18",
    shipmentQuantity: patch.shipmentQuantity ?? 300,
    remainingQuantity: patch.remainingQuantity ?? 300,
    defaultUnitsPerHour: patch.defaultUnitsPerHour ?? 120,
    quantity: patch.quantity ?? null,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? null,
    workStatus: patch.workStatus ?? "unscheduled",
    availableFromDate: patch.availableFromDate,
    productionDate: patch.productionDate,
    sequence: patch.sequence,
    sourceProductionPlanId: patch.sourceProductionPlanId,
  };
}

describe("production planning helpers", () => {
  test("defaults the selected department from the profile and falls back to R", () => {
    expect(getInitialDepartment("S")).toBe("S");
    expect(getInitialDepartment("P")).toBe("P");
    expect(getInitialDepartment("quality")).toBe("R");
    expect(getInitialDepartment(null)).toBe("R");
  });

  test("builds 30-minute production start time options including the 09:00 default", () => {
    const options = createHalfHourOptions();

    expect(options).toHaveLength(48);
    expect(options).toContain("09:00");
    expect(options.slice(17, 20)).toEqual(["08:30", "09:00", "09:30"]);
  });

  test("creates cards for selected-department plans available on the selected production date", () => {
    const cards = createProductionPlanningCards([orderFixture()], {
      departmentCode: "R",
      productionDate: "2026-06-12",
    });

    expect(cards.map((card) => card.productionPlanId)).toEqual(["plan-r-existing", "plan-r-draft"]);
    expect(cards[0]).toMatchObject({
      productionPlanId: "plan-r-existing",
      productionDate: "2026-06-12",
      quantity: 100,
      remainingQuantity: 300,
    });
    expect(cards[1]).toMatchObject({
      productionPlanId: "plan-r-draft",
      quantity: null,
      remainingQuantity: 200,
    });
  });

  test("partitions initial cards into available and scheduled panels", () => {
    const result = partitionPlanningCards(
      [
        cardFixture({ id: "scheduled-1", productionPlanId: "scheduled-1", productionDate: "2026-06-12", quantity: 80 }),
        cardFixture({ id: "available-1", productionPlanId: "available-1", quantity: null }),
        cardFixture({ id: "scheduled-2", productionPlanId: "scheduled-2", productionDate: "2026-06-12", sequence: 1 }),
        cardFixture({ id: "future-1", productionPlanId: "future-1", productionDate: "2026-06-13", quantity: 50 }),
      ],
      "2026-06-12",
    );

    expect(result.scheduledCards.map((card) => card.id)).toEqual(["scheduled-2", "scheduled-1"]);
    expect(result.availableCards.map((card) => card.id)).toEqual(["available-1", "future-1"]);
  });

  test("excludes date-less cards that were deferred beyond the selected production date", () => {
    const deferredOrder = orderFixture();
    deferredOrder.products[0].shipmentPlans[0].productionPlans = [
      productionPlan({
        id: "plan-r-deferred",
        shipmentPlanId: "shipment-r",
        availableFromDate: "2026-06-13",
      }),
    ];

    expect(
      createProductionPlanningCards([deferredOrder], {
        departmentCode: "R",
        productionDate: "2026-06-12",
      }),
    ).toHaveLength(0);
    expect(
      createProductionPlanningCards([deferredOrder], {
        departmentCode: "R",
        productionDate: "2026-06-13",
      }),
    ).toHaveLength(1);
  });

  test("updates quantity, computes duration, and creates a remainder card for partial quantities", () => {
    const cards = updateCardQuantity([cardFixture()], "card-1", 180);

    expect(cards[0]).toMatchObject({
      id: "card-1",
      quantity: 180,
      estimatedDurationMinutes: 90,
    });
    expect(cards[1]).toMatchObject({
      quantity: null,
      remainingQuantity: 120,
      sourceProductionPlanId: "plan-1",
    });
  });

  test("replaces the previous remainder card when quantity changes again", () => {
    const first = updateCardQuantity([cardFixture()], "card-1", 180);
    const second = updateCardQuantity(first, "card-1", 150);

    expect(second).toHaveLength(2);
    expect(second[0]).toMatchObject({ quantity: 150, estimatedDurationMinutes: 75 });
    expect(second[1]).toMatchObject({ quantity: null, remainingQuantity: 150, sourceProductionPlanId: "plan-1" });
  });

  test("moves multiple available cards to scheduled cards with quantities and draft remainders", () => {
    const result = moveCardsToSchedule({
      availableCards: [
        cardFixture({ id: "card-1", productionPlanId: "plan-1", remainingQuantity: 300 }),
        cardFixture({ id: "card-2", productionPlanId: "plan-2", remainingQuantity: 120, defaultUnitsPerHour: 60 }),
        cardFixture({ id: "card-3", productionPlanId: "plan-3", remainingQuantity: 90 }),
      ],
      scheduledCards: [cardFixture({ id: "scheduled", productionPlanId: "scheduled", quantity: 30 })],
      productionDate: "2026-06-12",
      quantitiesByCardId: new Map([
        ["card-1", 180],
        ["card-2", 120],
      ]),
    });

    expect(result.scheduledCards.map((card) => card.id)).toEqual(["scheduled", "card-1", "card-2"]);
    expect(result.scheduledCards[1]).toMatchObject({
      quantity: 180,
      estimatedDurationMinutes: 90,
      productionDate: "2026-06-12",
    });
    expect(result.scheduledCards[2]).toMatchObject({
      quantity: 120,
      estimatedDurationMinutes: 120,
      productionDate: "2026-06-12",
    });
    expect(result.availableCards.map((card) => card.id)).toEqual(["card-1-remainder-120", "card-3"]);
    expect(result.availableCards[0]).toMatchObject({
      quantity: null,
      remainingQuantity: 120,
      sourceProductionPlanId: "plan-1",
    });
  });

  test("moves multiple scheduled cards back to available with quantities reset", () => {
    const result = moveCardsToAvailable({
      availableCards: [cardFixture({ id: "available", productionPlanId: "available" })],
      scheduledCards: [
        cardFixture({ id: "scheduled-1", productionPlanId: "scheduled-1", quantity: 90, productionDate: "2026-06-12" }),
        cardFixture({ id: "scheduled-2", productionPlanId: "scheduled-2", quantity: 60, productionDate: "2026-06-12" }),
        cardFixture({ id: "scheduled-3", productionPlanId: "scheduled-3", quantity: 30, productionDate: "2026-06-12" }),
      ],
      cardIds: ["scheduled-1", "scheduled-3"],
    });

    expect(result.scheduledCards.map((card) => card.id)).toEqual(["scheduled-2"]);
    expect(result.availableCards.map((card) => card.id)).toEqual(["available", "scheduled-1", "scheduled-3"]);
    expect(result.availableCards[1]).toMatchObject({
      quantity: null,
      estimatedDurationMinutes: null,
      productionDate: null,
      sequence: undefined,
    });
  });

  test("removes a partial remainder when moving a scheduled card back to available", () => {
    const result = moveCardsToAvailable({
      availableCards: [
        cardFixture({
          id: "card-1-remainder-120",
          productionPlanId: "plan-1-remainder-120",
          remainingQuantity: 120,
          sourceProductionPlanId: "plan-1",
        }),
      ],
      scheduledCards: [
        cardFixture({
          id: "card-1",
          productionPlanId: "plan-1",
          quantity: 180,
          estimatedDurationMinutes: 90,
          productionDate: "2026-06-12",
          remainingQuantity: 300,
        }),
      ],
      cardIds: ["card-1"],
    });

    expect(result.availableCards.map((card) => card.id)).toEqual(["card-1"]);
    expect(result.availableCards[0]).toMatchObject({
      quantity: null,
      estimatedDurationMinutes: null,
      remainingQuantity: 300,
      productionDate: null,
    });
  });

  test("updates a scheduled card quantity and reconciles its available remainder", () => {
    const scheduled = moveCardsToSchedule({
      availableCards: [cardFixture({ id: "card-1", productionPlanId: "plan-1", remainingQuantity: 300 })],
      scheduledCards: [],
      productionDate: "2026-06-12",
      quantitiesByCardId: new Map([["card-1", 180]]),
    });

    const edited = updateScheduledCardQuantity({
      availableCards: scheduled.availableCards,
      scheduledCards: scheduled.scheduledCards,
      cardId: "card-1",
      quantity: 300,
    });

    expect(edited.scheduledCards[0]).toMatchObject({
      id: "card-1",
      quantity: 300,
      estimatedDurationMinutes: 150,
    });
    expect(edited.availableCards).toEqual([]);
  });

  test("calculates timeline row spans using one Carbon row as 30 minutes", () => {
    expect(calculateTimelineRowSpan(null)).toBe(1);
    expect(calculateTimelineRowSpan(10)).toBe(1);
    expect(calculateTimelineRowSpan(30)).toBe(1);
    expect(calculateTimelineRowSpan(31)).toBe(2);
    expect(calculateTimelineRowSpan(90)).toBe(3);
  });

  test("builds a 9-hour timeline window from the selected production start time", () => {
    expect(buildTimelineWindow("08:30")).toEqual({
      startTime: "08:30",
      endTime: "17:30",
      totalMinutes: 540,
      rowCount: 18,
    });
  });

  test("defers a card to the next day and removes it from the visible board", () => {
    const result = deferCardToNextDay([cardFixture()], "card-1", "2026-06-12");

    expect(result.visibleCards).toHaveLength(0);
    expect(result.deferredCard).toMatchObject({
      id: "card-1",
      availableFromDate: "2026-06-13",
    });
  });

  test("reorders cards by active and over ids", () => {
    const cards = [
      cardFixture({ id: "card-1", productionPlanId: "plan-1" }),
      cardFixture({ id: "card-2", productionPlanId: "plan-2" }),
      cardFixture({ id: "card-3", productionPlanId: "plan-3" }),
    ];

    expect(reorderCards(cards, "card-3", "card-1").map((card) => card.id)).toEqual(["card-3", "card-1", "card-2"]);
  });

  test("rejects confirmation while visible cards have missing quantities", () => {
    const result = buildConfirmationPlan([cardFixture()], {
      productionDate: "2026-06-12",
      departmentCode: "R",
      workStartTime: "09:00",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("수량이 입력되지 않은 생산계획이 있습니다.");
  });

  test("builds sequential assignment times from the selected production start time", () => {
    const result = buildConfirmationPlan(
      [
        cardFixture({ id: "card-1", productionPlanId: "plan-1", quantity: 180, estimatedDurationMinutes: 90 }),
        cardFixture({ id: "card-2", productionPlanId: "plan-2", quantity: 60, estimatedDurationMinutes: 30 }),
      ],
      {
        productionDate: "2026-06-12",
        departmentCode: "R",
        workStartTime: "09:00",
      },
    );

    expect(result.ok).toBe(true);
    expect(result.assignments).toEqual([
      expect.objectContaining({ productionPlanId: "plan-1", sequence: 1, startTime: "09:00", endTime: "10:30" }),
      expect.objectContaining({ productionPlanId: "plan-2", sequence: 2, startTime: "10:30", endTime: "11:00" }),
    ]);
  });
});
