import type {
  DepartmentCode,
  OrderListRow,
  OrderProductRecord,
  ProductionPlanRecord,
  ShipmentPlanRecord,
} from "@/features/orders/types";
import type {
  CardFilterOptions,
  ConfirmationOptions,
  ConfirmationResult,
  DeferCardResult,
  ProductionPlanAssignment,
  ProductionPlanCard,
} from "./types";

type SchedulableProductionPlan = ProductionPlanRecord & {
  availableFromDate?: string | null;
  productionDate?: string | null;
  sequence?: number;
};

export function getInitialDepartment(profileDepartment: string | null | undefined): DepartmentCode {
  if (profileDepartment === "S" || profileDepartment === "P") {
    return profileDepartment;
  }

  return "R";
}

export function createHalfHourOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const totalMinutes = index * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  });
}

function planAvailableOn(plan: SchedulableProductionPlan, productionDate: string) {
  if (plan.productionDate) {
    return plan.productionDate === productionDate;
  }

  return !plan.availableFromDate || plan.availableFromDate <= productionDate;
}

function remainingForShipment(shipmentPlan: ShipmentPlanRecord, currentPlan: ProductionPlanRecord) {
  const plannedQuantity = shipmentPlan.productionPlans.reduce((sum, plan) => {
    if (plan.id === currentPlan.id) {
      return sum;
    }

    return sum + (plan.quantity ?? 0);
  }, 0);

  return Math.max(0, shipmentPlan.quantity - plannedQuantity);
}

function makeCard(
  order: OrderListRow,
  product: OrderProductRecord,
  shipmentPlan: ShipmentPlanRecord,
  productionPlan: SchedulableProductionPlan,
): ProductionPlanCard {
  return {
    id: productionPlan.id,
    productionPlanId: productionPlan.id,
    shipmentPlanId: shipmentPlan.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    designNo: product.designNo,
    productName: product.productName,
    specification: product.specification,
    departmentCode: product.departmentCode,
    plannedShipDate: shipmentPlan.plannedShipDate,
    shipmentQuantity: shipmentPlan.quantity,
    remainingQuantity: remainingForShipment(shipmentPlan, productionPlan),
    defaultUnitsPerHour: product.defaultUnitsPerHour,
    quantity: productionPlan.quantity,
    estimatedDurationMinutes: productionPlan.estimatedDurationMinutes,
    workStatus: productionPlan.workStatus,
    availableFromDate: productionPlan.availableFromDate,
    productionDate: productionPlan.productionDate,
    sequence: productionPlan.sequence,
  };
}

export function createProductionPlanningCards(orders: OrderListRow[], options: CardFilterOptions) {
  const cards = orders.flatMap((order) => {
    if (order.status !== "released") {
      return [];
    }

    return order.products.flatMap((product) => {
      if (product.departmentCode !== options.departmentCode) {
        return [];
      }

      return product.shipmentPlans.flatMap((shipmentPlan) =>
        shipmentPlan.productionPlans
          .filter((plan): plan is SchedulableProductionPlan => planAvailableOn(plan, options.productionDate))
          .map((plan) => makeCard(order, product, shipmentPlan, plan)),
      );
    });
  });

  return cards.sort((left, right) => {
    const leftAssigned = left.productionDate === options.productionDate;
    const rightAssigned = right.productionDate === options.productionDate;

    if (leftAssigned !== rightAssigned) {
      return leftAssigned ? -1 : 1;
    }

    if (leftAssigned && rightAssigned) {
      return (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER);
    }

    return (
      left.plannedShipDate.localeCompare(right.plannedShipDate) ||
      left.orderNo.localeCompare(right.orderNo) ||
      left.productName.localeCompare(right.productName)
    );
  });
}

function calculateDuration(quantity: number, defaultUnitsPerHour: number) {
  return Math.ceil((quantity / defaultUnitsPerHour) * 60);
}

export function updateCardQuantity(cards: ProductionPlanCard[], cardId: string, quantity: number) {
  const targetCard = cards.find((card) => card.id === cardId);
  const targetProductionPlanId = targetCard?.productionPlanId ?? cardId;

  return cards.flatMap((card) => {
    if (card.id !== cardId) {
      if (card.sourceProductionPlanId === targetProductionPlanId) {
        return [];
      }

      return [card];
    }

    const boundedQuantity = Math.max(0, Math.min(quantity, card.remainingQuantity));
    const nextCard: ProductionPlanCard = {
      ...card,
      quantity: boundedQuantity,
      estimatedDurationMinutes: calculateDuration(boundedQuantity, card.defaultUnitsPerHour),
    };
    const remainderQuantity = card.remainingQuantity - boundedQuantity;

    if (remainderQuantity <= 0) {
      return [nextCard];
    }

    const remainderCard: ProductionPlanCard = {
      ...card,
      id: `${card.id}-remainder-${remainderQuantity}`,
      productionPlanId: `${card.productionPlanId}-remainder-${remainderQuantity}`,
      quantity: null,
      estimatedDurationMinutes: null,
      remainingQuantity: remainderQuantity,
      sourceProductionPlanId: card.productionPlanId,
    };

    return [nextCard, remainderCard];
  });
}

export function partitionPlanningCards(cards: ProductionPlanCard[], selectedProductionDate: string) {
  const scheduledCards = cards
    .filter((card) => card.productionDate === selectedProductionDate)
    .sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER));

  const scheduledIds = new Set(scheduledCards.map((card) => card.id));

  return {
    availableCards: cards.filter((card) => !scheduledIds.has(card.id)),
    scheduledCards,
  };
}

export function moveCardsToSchedule({
  availableCards,
  scheduledCards,
  productionDate,
  quantitiesByCardId,
}: {
  availableCards: ProductionPlanCard[];
  scheduledCards: ProductionPlanCard[];
  productionDate: string;
  quantitiesByCardId: Map<string, number>;
}) {
  const selectedIds = new Set(quantitiesByCardId.keys());
  const nextAvailableCards: ProductionPlanCard[] = [];
  const cardsToSchedule: ProductionPlanCard[] = [];

  for (const card of availableCards) {
    if (!selectedIds.has(card.id)) {
      nextAvailableCards.push(card);
      continue;
    }

    const boundedQuantity = Math.max(0, Math.min(quantitiesByCardId.get(card.id) ?? 0, card.remainingQuantity));

    if (boundedQuantity <= 0) {
      nextAvailableCards.push(card);
      continue;
    }

    const scheduledCard: ProductionPlanCard = {
      ...card,
      quantity: boundedQuantity,
      estimatedDurationMinutes: calculateDuration(boundedQuantity, card.defaultUnitsPerHour),
      productionDate,
      sequence: scheduledCards.length + cardsToSchedule.length + 1,
    };
    const remainderQuantity = card.remainingQuantity - boundedQuantity;

    cardsToSchedule.push(scheduledCard);

    if (remainderQuantity > 0) {
      nextAvailableCards.push({
        ...card,
        id: `${card.id}-remainder-${remainderQuantity}`,
        productionPlanId: `${card.productionPlanId}-remainder-${remainderQuantity}`,
        quantity: null,
        estimatedDurationMinutes: null,
        remainingQuantity: remainderQuantity,
        productionDate: null,
        sequence: undefined,
        sourceProductionPlanId: card.productionPlanId,
      });
    }
  }

  return {
    availableCards: nextAvailableCards,
    scheduledCards: [...scheduledCards, ...cardsToSchedule],
  };
}

export function moveCardsToAvailable({
  availableCards,
  scheduledCards,
  cardIds,
}: {
  availableCards: ProductionPlanCard[];
  scheduledCards: ProductionPlanCard[];
  cardIds: string[];
}) {
  const selectedIds = new Set(cardIds);
  const selectedCards = scheduledCards.filter((card) => selectedIds.has(card.id));
  const selectedProductionPlanIds = new Set(selectedCards.map((card) => card.productionPlanId));
  const returnedCards = selectedCards
    .map(
      (card): ProductionPlanCard => ({
        ...card,
        quantity: null,
        estimatedDurationMinutes: null,
        productionDate: null,
        sequence: undefined,
      }),
    );

  return {
    availableCards: [
      ...availableCards.filter((card) => !selectedProductionPlanIds.has(card.sourceProductionPlanId ?? "")),
      ...returnedCards,
    ],
    scheduledCards: scheduledCards.filter((card) => !selectedIds.has(card.id)),
  };
}

export function updateScheduledCardQuantity({
  availableCards,
  scheduledCards,
  cardId,
  quantity,
}: {
  availableCards: ProductionPlanCard[];
  scheduledCards: ProductionPlanCard[];
  cardId: string;
  quantity: number;
}) {
  const targetCard = scheduledCards.find((card) => card.id === cardId);

  if (!targetCard) {
    return { availableCards, scheduledCards };
  }

  const boundedQuantity = Math.max(0, Math.min(quantity, targetCard.remainingQuantity));
  const remainderQuantity = targetCard.remainingQuantity - boundedQuantity;
  const nextRemainder =
    remainderQuantity > 0
      ? ({
          ...targetCard,
          id: `${targetCard.id}-remainder-${remainderQuantity}`,
          productionPlanId: `${targetCard.productionPlanId}-remainder-${remainderQuantity}`,
          quantity: null,
          estimatedDurationMinutes: null,
          remainingQuantity: remainderQuantity,
          productionDate: null,
          sequence: undefined,
          sourceProductionPlanId: targetCard.productionPlanId,
        } satisfies ProductionPlanCard)
      : null;

  let insertedRemainder = false;
  const nextAvailableCards = availableCards.flatMap((card) => {
    if (card.sourceProductionPlanId !== targetCard.productionPlanId) {
      return [card];
    }

    if (nextRemainder && !insertedRemainder) {
      insertedRemainder = true;
      return [nextRemainder];
    }

    return [];
  });

  if (nextRemainder && !insertedRemainder) {
    nextAvailableCards.push(nextRemainder);
  }

  return {
    availableCards: nextAvailableCards,
    scheduledCards: scheduledCards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            quantity: boundedQuantity,
            estimatedDurationMinutes: calculateDuration(boundedQuantity, card.defaultUnitsPerHour),
          }
        : card,
    ),
  };
}

export function calculateTimelineRowSpan(estimatedDurationMinutes: number | null | undefined) {
  return Math.max(1, Math.ceil((estimatedDurationMinutes ?? 0) / 30));
}

function addOneDay(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
}

export function deferCardToNextDay(
  cards: ProductionPlanCard[],
  cardId: string,
  selectedProductionDate: string,
): DeferCardResult {
  const card = cards.find((current) => current.id === cardId) ?? null;

  return {
    visibleCards: cards.filter((current) => current.id !== cardId),
    deferredCard: card
      ? {
          ...card,
          availableFromDate: addOneDay(selectedProductionDate),
          productionDate: null,
          sequence: undefined,
        }
      : null,
  };
}

export function reorderCards(cards: ProductionPlanCard[], activeId: string, overId: string) {
  const activeIndex = cards.findIndex((card) => card.id === activeId);
  const overIndex = cards.findIndex((card) => card.id === overId);

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return cards;
  }

  const nextCards = [...cards];
  const [activeCard] = nextCards.splice(activeIndex, 1);
  nextCards.splice(overIndex, 0, activeCard);

  return nextCards;
}

function addMinutes(timeValue: string, minutesToAdd: number) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const nextHours = Math.floor(totalMinutes / 60) % 24;
  const nextMinutes = totalMinutes % 60;

  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

export function buildTimelineWindow(workStartTime: string) {
  return {
    startTime: workStartTime,
    endTime: addMinutes(workStartTime, 9 * 60),
    totalMinutes: 9 * 60,
    rowCount: 18,
  };
}

export function buildConfirmationPlan(
  cards: ProductionPlanCard[],
  options: ConfirmationOptions,
): ConfirmationResult {
  if (cards.some((card) => !card.quantity || card.quantity <= 0)) {
    return {
      ok: false,
      error: "수량이 입력되지 않은 생산계획이 있습니다.",
      assignments: [],
    };
  }

  let cursor = options.workStartTime;
  const assignments: ProductionPlanAssignment[] = cards.map((card, index) => {
    const estimatedDurationMinutes =
      card.estimatedDurationMinutes ?? calculateDuration(card.quantity ?? 0, card.defaultUnitsPerHour);
    const startTime = cursor;
    const endTime = addMinutes(startTime, estimatedDurationMinutes);
    cursor = endTime;

    return {
      productionPlanId: card.productionPlanId,
      productionDate: options.productionDate,
      departmentCode: options.departmentCode,
      sequence: index + 1,
      startTime,
      endTime,
      quantity: card.quantity ?? 0,
      estimatedDurationMinutes,
    };
  });

  return {
    ok: true,
    assignments,
  };
}
