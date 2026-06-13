import type { DepartmentCode, OrderListRow, OrderProductRecord } from "@/features/orders/types";
import type {
  DailyConfirmationOptions,
  DailyConfirmationResult,
  DailyPlanningCardFilterOptions,
  DailyProductionCandidate,
  DailyProductionCard,
  DailyProductionSeed,
  DailyProductionSeedItem,
} from "./types";

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

function formatShortDate(value: string) {
  return value.slice(5).replace("-", "/");
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function buildShipmentSummary(product: OrderProductRecord) {
  const sortedPlans = [...product.shipmentPlans].sort((left, right) =>
    left.plannedShipDate.localeCompare(right.plannedShipDate),
  );
  const firstPlan = sortedPlans[0];

  if (!firstPlan) {
    return "-";
  }

  const firstLabel = `${formatShortDate(firstPlan.plannedShipDate)} ${formatNumber(firstPlan.quantity)}개`;
  return sortedPlans.length > 1 ? `${firstLabel} 외 ${sortedPlans.length - 1}` : firstLabel;
}

function getNextShipDate(product: OrderProductRecord) {
  return (
    [...product.shipmentPlans]
      .sort((left, right) => left.plannedShipDate.localeCompare(right.plannedShipDate))
      .at(0)?.plannedShipDate ?? "-"
  );
}

function makeCandidate(order: OrderListRow, product: OrderProductRecord): DailyProductionCandidate {
  return {
    id: `${product.id}-candidate`,
    orderProductId: product.id,
    orderId: order.id,
    orderNo: order.orderNo,
    orderRequestedDate: order.requestedDate,
    orderProductCount: order.products.length,
    orderStatus: order.status,
    customerName: order.customerName,
    designNo: product.designNo,
    productName: product.productName,
    specification: product.specification,
    departmentCode: product.departmentCode,
    orderQuantity: product.quantity,
    defaultUnitsPerHour: product.defaultUnitsPerHour,
    nextShipDate: getNextShipDate(product),
    shipmentSummary: buildShipmentSummary(product),
  };
}

export function buildDailyProductionSeed(
  orders: OrderListRow[],
  dayPlanItems: DailyProductionSeedItem[],
): DailyProductionSeed {
  return {
    candidates: orders.flatMap((order) => order.products.map((product) => makeCandidate(order, product))),
    dayPlanItems,
  };
}

export function calculateDailyDuration(quantity: number, defaultUnitsPerHour: number) {
  return Math.ceil((quantity / defaultUnitsPerHour) * 60);
}

function plannedQuantityFor(seed: DailyProductionSeed, orderProductId: string, excludedItemId?: string) {
  return seed.dayPlanItems.reduce((sum, item) => {
    if (item.orderProductId !== orderProductId || item.workStatus === "cancelled" || item.id === excludedItemId) {
      return sum;
    }

    return sum + item.quantity;
  }, 0);
}

function makeScheduledCard(
  candidate: DailyProductionCandidate,
  item: DailyProductionSeedItem,
  seed: DailyProductionSeed,
): DailyProductionCard {
  const otherPlannedQuantity = plannedQuantityFor(seed, item.orderProductId, item.id);

  return {
    id: item.id,
    orderProductId: candidate.orderProductId,
    orderNo: candidate.orderNo,
    customerName: candidate.customerName,
    designNo: candidate.designNo,
    productName: candidate.productName,
    specification: candidate.specification,
    departmentCode: candidate.departmentCode,
    orderQuantity: candidate.orderQuantity,
    plannedQuantity: otherPlannedQuantity,
    remainingQuantity: Math.max(0, candidate.orderQuantity - otherPlannedQuantity),
    defaultUnitsPerHour: candidate.defaultUnitsPerHour,
    nextShipDate: candidate.nextShipDate,
    shipmentSummary: candidate.shipmentSummary,
    quantity: item.quantity,
    completedQuantity: item.completedQuantity,
    estimatedDurationMinutes: item.estimatedDurationMinutes,
    durationSource: item.durationSource,
    workStatus: item.workStatus,
    productionDate: item.productionDate,
    sequence: item.sequence,
  };
}

function makeAvailableCard(candidate: DailyProductionCandidate, remainingQuantity: number): DailyProductionCard {
  return {
    id: `${candidate.orderProductId}-available`,
    orderProductId: candidate.orderProductId,
    orderNo: candidate.orderNo,
    customerName: candidate.customerName,
    designNo: candidate.designNo,
    productName: candidate.productName,
    specification: candidate.specification,
    departmentCode: candidate.departmentCode,
    orderQuantity: candidate.orderQuantity,
    plannedQuantity: candidate.orderQuantity - remainingQuantity,
    remainingQuantity,
    defaultUnitsPerHour: candidate.defaultUnitsPerHour,
    nextShipDate: candidate.nextShipDate,
    shipmentSummary: candidate.shipmentSummary,
    quantity: null,
    completedQuantity: 0,
    estimatedDurationMinutes: null,
    durationSource: null,
    workStatus: "planned",
    productionDate: null,
  };
}

export function createDailyProductionPlanningCards(
  seed: DailyProductionSeed,
  options: DailyPlanningCardFilterOptions,
) {
  const candidateByProductId = new Map(seed.candidates.map((candidate) => [candidate.orderProductId, candidate]));
  const scheduledCards = seed.dayPlanItems
    .filter((item) => item.productionDate === options.productionDate && item.departmentCode === options.departmentCode)
    .flatMap((item) => {
      const candidate = candidateByProductId.get(item.orderProductId);
      return candidate ? [makeScheduledCard(candidate, item, seed)] : [];
    });
  const availableCards = seed.candidates
    .filter((candidate) => candidate.orderStatus === "released" && candidate.departmentCode === options.departmentCode)
    .flatMap((candidate) => {
      const remainingQuantity = Math.max(0, candidate.orderQuantity - plannedQuantityFor(seed, candidate.orderProductId));
      return remainingQuantity > 0 ? [makeAvailableCard(candidate, remainingQuantity)] : [];
    });

  return [...scheduledCards, ...availableCards].sort((left, right) => {
    const leftAssigned = left.productionDate === options.productionDate;
    const rightAssigned = right.productionDate === options.productionDate;

    if (leftAssigned !== rightAssigned) {
      return leftAssigned ? -1 : 1;
    }

    if (leftAssigned && rightAssigned) {
      return (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER);
    }

    return (
      left.nextShipDate.localeCompare(right.nextShipDate) ||
      left.orderNo.localeCompare(right.orderNo) ||
      left.productName.localeCompare(right.productName)
    );
  });
}

export function partitionDailyPlanningCards(cards: DailyProductionCard[], selectedProductionDate: string) {
  const scheduledCards = cards
    .filter((card) => card.productionDate === selectedProductionDate)
    .sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER));
  const scheduledIds = new Set(scheduledCards.map((card) => card.id));

  return {
    availableCards: cards.filter((card) => !scheduledIds.has(card.id)),
    scheduledCards,
  };
}

export function moveDailyCardsToSchedule({
  availableCards,
  scheduledCards,
  productionDate,
  quantitiesByCardId,
}: {
  availableCards: DailyProductionCard[];
  scheduledCards: DailyProductionCard[];
  productionDate: string;
  quantitiesByCardId: Map<string, number>;
}) {
  const selectedIds = new Set(quantitiesByCardId.keys());
  const nextAvailableCards: DailyProductionCard[] = [];
  const cardsToSchedule: DailyProductionCard[] = [];

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

    const scheduledCard: DailyProductionCard = {
      ...card,
      id: `${card.orderProductId}-daily-${productionDate}-${scheduledCards.length + cardsToSchedule.length + 1}`,
      quantity: boundedQuantity,
      estimatedDurationMinutes: calculateDailyDuration(boundedQuantity, card.defaultUnitsPerHour),
      durationSource: "product_default",
      productionDate,
      sequence: scheduledCards.length + cardsToSchedule.length + 1,
    };
    const remainderQuantity = card.remainingQuantity - boundedQuantity;

    cardsToSchedule.push(scheduledCard);

    if (remainderQuantity > 0) {
      nextAvailableCards.push({
        ...card,
        id: `${card.orderProductId}-available-${remainderQuantity}`,
        quantity: null,
        estimatedDurationMinutes: null,
        durationSource: null,
        plannedQuantity: card.orderQuantity - remainderQuantity,
        remainingQuantity: remainderQuantity,
        productionDate: null,
        sequence: undefined,
        sourceOrderProductId: card.orderProductId,
      });
    }
  }

  return {
    availableCards: nextAvailableCards,
    scheduledCards: [...scheduledCards, ...cardsToSchedule],
  };
}

export function moveDailyCardsToAvailable({
  availableCards,
  scheduledCards,
  cardIds,
}: {
  availableCards: DailyProductionCard[];
  scheduledCards: DailyProductionCard[];
  cardIds: string[];
}) {
  const selectedIds = new Set(cardIds);
  const returnedCards = scheduledCards
    .filter((card) => selectedIds.has(card.id))
    .map(
      (card): DailyProductionCard => ({
        ...card,
        id: `${card.orderProductId}-available-${card.quantity ?? card.remainingQuantity}`,
        quantity: null,
        estimatedDurationMinutes: null,
        durationSource: null,
        remainingQuantity: card.quantity ?? card.remainingQuantity,
        productionDate: null,
        sequence: undefined,
        sourceOrderProductId: card.orderProductId,
      }),
    );

  return {
    availableCards: [...availableCards, ...returnedCards],
    scheduledCards: scheduledCards.filter((card) => !selectedIds.has(card.id)),
  };
}

export function updateDailyScheduledCardQuantity({
  availableCards,
  scheduledCards,
  cardId,
  quantity,
}: {
  availableCards: DailyProductionCard[];
  scheduledCards: DailyProductionCard[];
  cardId: string;
  quantity: number;
}) {
  const targetCard = scheduledCards.find((card) => card.id === cardId);

  if (!targetCard) {
    return { availableCards, scheduledCards };
  }

  const boundedQuantity = Math.max(0, Math.min(quantity, targetCard.remainingQuantity));
  const remainderQuantity = targetCard.remainingQuantity - boundedQuantity;
  const nextAvailableCards = availableCards.filter((card) => card.sourceOrderProductId !== targetCard.orderProductId);

  if (remainderQuantity > 0) {
    nextAvailableCards.push({
      ...targetCard,
      id: `${targetCard.orderProductId}-available-${remainderQuantity}`,
      quantity: null,
      estimatedDurationMinutes: null,
      durationSource: null,
      remainingQuantity: remainderQuantity,
      productionDate: null,
      sequence: undefined,
      sourceOrderProductId: targetCard.orderProductId,
    });
  }

  return {
    availableCards: nextAvailableCards,
      scheduledCards: scheduledCards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            quantity: boundedQuantity,
            estimatedDurationMinutes: calculateDailyDuration(boundedQuantity, card.defaultUnitsPerHour),
            durationSource: "product_default" as const,
          }
        : card,
    ),
  };
}

export function calculateTimelineRowSpan(estimatedDurationMinutes: number | null | undefined) {
  return Math.max(1, Math.ceil((estimatedDurationMinutes ?? 0) / 30));
}

export function reorderDailyCards(cards: DailyProductionCard[], activeId: string, overId: string) {
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

export function buildDailyConfirmationPlan(
  cards: DailyProductionCard[],
  options: DailyConfirmationOptions,
): DailyConfirmationResult {
  if (cards.some((card) => !card.quantity || card.quantity <= 0)) {
    return {
      ok: false,
      error: "수량이 입력되지 않은 생산 항목이 있습니다.",
      dayPlan: null,
    };
  }

  let cursor = options.workStartTime;
  const items = cards.map((card, index) => {
    const estimatedDurationMinutes =
      card.estimatedDurationMinutes ?? calculateDailyDuration(card.quantity ?? 0, card.defaultUnitsPerHour);
    const startTime = cursor;
    const endTime = addMinutes(startTime, estimatedDurationMinutes);
    cursor = endTime;

    return {
      id: card.id,
      orderProductId: card.orderProductId,
      productionDate: options.productionDate,
      departmentCode: options.departmentCode,
      sequence: index + 1,
      startTime,
      endTime,
      quantity: card.quantity ?? 0,
      completedQuantity: card.completedQuantity,
      estimatedDurationMinutes,
      durationSource: card.durationSource ?? "product_default",
      workStatus: card.workStatus,
    };
  });

  return {
    ok: true,
    dayPlan: {
      id: `daily-plan-${options.departmentCode}-${options.productionDate}`,
      productionDate: options.productionDate,
      departmentCode: options.departmentCode,
      workStartTime: options.workStartTime,
      items,
    },
  };
}
