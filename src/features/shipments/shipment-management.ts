import type { ShipmentStatus } from "@/features/orders/types";
import type { ProductionManagementOrderProduct, ProductionManagementSeed, ProductionShipmentRecord } from "@/features/production/product-management";

export type ShipmentManagementRow = ProductionManagementOrderProduct & {
  id: string;
  shipmentPlanId: string;
  plannedShipDate: string;
  plannedQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  availableToShipQuantity: number;
  shipmentStatus: ShipmentStatus;
  shipmentStatusLabel: string;
  shipmentQuantityLabel: string;
  lastShippedDate: string | null;
  shipmentRecords: ProductionShipmentRecord[];
};

export type ShipmentRecordDraft = {
  shippedDate: string;
  quantity: number;
};

export type ShipmentRecordValidationResult =
  | {
      ok: true;
      fieldErrors: Record<string, never>;
    }
  | {
      ok: false;
      fieldErrors: Partial<Record<"shippedDate" | "quantity", string>>;
    };

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  ready: "출하준비",
  partial: "부분출하",
  completed: "출하완료",
  stopped: "출하중지",
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function getDatePart(value: string) {
  return value.replaceAll("-", "");
}

function getSequencePart(sequence: number) {
  return String(sequence).padStart(3, "0");
}

function getReceiptQuantity(seed: ProductionManagementSeed, orderProductId: string) {
  return seed.receipts
    .filter((receipt) => receipt.orderProductId === orderProductId)
    .reduce((sum, receipt) => sum + receipt.quantity, 0);
}

function getProductShipmentQuantity(seed: ProductionManagementSeed, product: ProductionManagementOrderProduct) {
  const shipmentPlanIds = new Set(product.shipmentPlans.map((plan) => plan.id));

  return (seed.shipmentRecords ?? [])
    .filter((record) => shipmentPlanIds.has(record.shipmentPlanId))
    .reduce((sum, record) => sum + record.quantity, 0);
}

function deriveShipmentStatus(planStatus: ShipmentStatus, plannedQuantity: number, shippedQuantity: number): ShipmentStatus {
  if (shippedQuantity >= plannedQuantity || (planStatus === "completed" && shippedQuantity === 0)) {
    return "completed";
  }

  if (planStatus === "stopped") {
    return "stopped";
  }

  if (shippedQuantity > 0) {
    return "partial";
  }

  return "ready";
}

function getDisplayedShippedQuantity(planStatus: ShipmentStatus, plannedQuantity: number, shippedQuantity: number) {
  if (planStatus === "completed" && shippedQuantity === 0) {
    return plannedQuantity;
  }

  return Math.min(plannedQuantity, shippedQuantity);
}

function isCompletedAtLeastThreeDaysAgo(row: ShipmentManagementRow, currentDate: string) {
  if (row.shipmentStatus !== "completed") {
    return false;
  }

  const sourceDate = row.lastShippedDate ?? row.plannedShipDate;
  const completedAt = new Date(sourceDate).getTime();
  const currentAt = new Date(currentDate).getTime();

  if (!Number.isFinite(completedAt) || !Number.isFinite(currentAt)) {
    return false;
  }

  return currentAt - completedAt >= THREE_DAYS_MS;
}

export function createShipmentManagementRows(seed: ProductionManagementSeed): ShipmentManagementRow[] {
  return seed.orderProducts
    .flatMap((product) => {
      const receiptQuantity = getReceiptQuantity(seed, product.orderProductId);
      const productShippedQuantity = getProductShipmentQuantity(seed, product);
      const availableToShipQuantity = Math.max(0, receiptQuantity - productShippedQuantity);

      return product.shipmentPlans.map((shipmentPlan) => {
        const shipmentRecords = (seed.shipmentRecords ?? [])
          .filter((record) => record.shipmentPlanId === shipmentPlan.id)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
        const actualShippedQuantity = shipmentRecords.reduce((sum, record) => sum + record.quantity, 0);
        const shippedQuantity = getDisplayedShippedQuantity(
          shipmentPlan.status,
          shipmentPlan.quantity,
          actualShippedQuantity,
        );
        const shipmentStatus = deriveShipmentStatus(shipmentPlan.status, shipmentPlan.quantity, actualShippedQuantity);
        const lastShippedDate = shipmentRecords[0]?.shippedDate ?? (shipmentStatus === "completed" ? shipmentPlan.plannedShipDate : null);

        return {
          ...product,
          id: shipmentPlan.id,
          shipmentPlanId: shipmentPlan.id,
          plannedShipDate: shipmentPlan.plannedShipDate,
          plannedQuantity: shipmentPlan.quantity,
          shippedQuantity,
          remainingQuantity: Math.max(0, shipmentPlan.quantity - shippedQuantity),
          availableToShipQuantity,
          shipmentStatus,
          shipmentStatusLabel: shipmentStatusLabels[shipmentStatus],
          shipmentQuantityLabel: `${formatNumber(shippedQuantity)} / ${formatNumber(shipmentPlan.quantity)}개`,
          lastShippedDate,
          shipmentRecords,
        };
      });
    })
    .sort(
      (left, right) =>
        left.plannedShipDate.localeCompare(right.plannedShipDate) ||
        left.customerName.localeCompare(right.customerName, "ko-KR") ||
        left.productName.localeCompare(right.productName, "ko-KR") ||
        left.shipmentPlanId.localeCompare(right.shipmentPlanId),
    );
}

export function filterShipmentManagementRows(
  rows: ShipmentManagementRow[],
  options: { currentDate: string; excludeOldCompleted: boolean },
) {
  return rows.filter(
    (row) => !options.excludeOldCompleted || !isCompletedAtLeastThreeDaysAgo(row, options.currentDate),
  );
}

export function getShipmentInputLimit(row: ShipmentManagementRow | null | undefined) {
  if (!row) {
    return 0;
  }

  return Math.min(row.remainingQuantity, row.availableToShipQuantity);
}

export function validateShipmentRecordDraft(
  row: ShipmentManagementRow | null | undefined,
  draft: ShipmentRecordDraft,
): ShipmentRecordValidationResult {
  const fieldErrors: Partial<Record<"shippedDate" | "quantity", string>> = {};
  const inputLimit = getShipmentInputLimit(row);

  if (!draft.shippedDate) {
    fieldErrors.shippedDate = "출고일을 입력하세요.";
  }

  if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) {
    fieldErrors.quantity = "출하수량은 1개 이상이어야 합니다.";
  } else if (!row) {
    fieldErrors.quantity = "출하계획을 찾을 수 없습니다.";
  } else if (draft.quantity > inputLimit) {
    fieldErrors.quantity = `출하 가능 수량은 ${formatNumber(inputLimit)}개 이하입니다.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
    };
  }

  return {
    ok: true,
    fieldErrors: {},
  };
}

export function createShipmentRecord(
  row: ShipmentManagementRow | null | undefined,
  draft: ShipmentRecordDraft,
  options: { createdAt: string; sequence: number },
): ProductionShipmentRecord {
  const validation = validateShipmentRecordDraft(row, draft);

  if (!validation.ok || !row) {
    throw new Error(Object.values(validation.fieldErrors)[0] ?? "출하 실적 입력값을 확인하세요.");
  }

  return {
    id: `shipment-record-${row.shipmentPlanId}-${getDatePart(draft.shippedDate)}-${getSequencePart(options.sequence)}`,
    shipmentPlanId: row.shipmentPlanId,
    shippedDate: draft.shippedDate,
    quantity: draft.quantity,
    createdAt: options.createdAt,
  };
}
