import type { DepartmentCode, OrderListRow, ShipmentPlanRecord } from "@/features/orders/types";
import { listOrderStatusRows } from "@/features/orders/data";
import { listDailyProductionSeed } from "./daily-seed";
import type { DailyProductionSeedItem } from "./types";
import mockData from "@/features/mock-data/dss.json";

export type ProductionReceiptQualityStatus = "not_recorded" | "passed" | "failed";

export type ProductionReceiptTransactionType = "production_receipt" | "correction";

export type ProductionReceiptRecord = {
  id: string;
  orderProductId: string;
  receiptDate: string;
  quantity: number;
  lotNo: string;
  equipmentLine: string | null;
  storageLocation: string | null;
  qualityStatus: ProductionReceiptQualityStatus;
  operatorName: string | null;
  memo: string | null;
  productionPlanItemId: string | null;
  transactionType: ProductionReceiptTransactionType;
  createdAt: string;
};

export type ProductionShipmentRecord = {
  id: string;
  shipmentPlanId: string;
  shippedDate: string;
  quantity: number;
  createdAt: string;
};

export type ProductionPlanOption = {
  id: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  quantity: number;
  sequence: number;
};

export type ProductionManagementOrderProduct = {
  orderProductId: string;
  orderId: string;
  orderNo: string;
  orderRequestedDate: string;
  customerName: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  orderQuantity: number;
  shipmentPlans: ShipmentPlanRecord[];
  productionPlans: ProductionPlanOption[];
};

export type ProductionManagementSeed = {
  orderProducts: ProductionManagementOrderProduct[];
  receipts: ProductionReceiptRecord[];
  shipmentRecords?: ProductionShipmentRecord[];
};

export type ProductionInventoryStorageLocationGroup = {
  storageLocation: string;
  quantity: number;
};

export type ProductionInventoryRow = ProductionManagementOrderProduct & {
  id: string;
  stockQuantity: number;
  remainingReceivableQuantity: number;
  receiptCount: number;
  storageLocationGroups: ProductionInventoryStorageLocationGroup[];
};

export type ProductionReceiptHistoryRow = ProductionReceiptRecord &
  ProductionManagementOrderProduct & {
    id: string;
    receiptId: string;
  };

export type ProductionInventoryLedgerRow = ProductionManagementOrderProduct & {
  id: string;
  transactionKind: "inbound" | "outbound";
  transactionLabel: "입고" | "출고";
  quantity: number;
  signedQuantity: number;
  transactionDate: string;
  transactionAt: string;
};

export type ProductionReceiptDraft = {
  orderProductId: string;
  quantity: number;
  receiptDate?: string;
  lotNo?: string;
  equipmentLine?: string;
  storageLocation?: string;
  qualityStatus?: ProductionReceiptQualityStatus;
  operatorName?: string;
  memo?: string;
  productionPlanItemId?: string;
};

export type ProductionReceiptValidationResult =
  | {
      ok: true;
      fieldErrors: Record<string, never>;
    }
  | {
      ok: false;
      fieldErrors: Partial<Record<"orderProductId" | "quantity", string>>;
    };

type ProductionReceiptSeedRow = {
  id: string;
  order_product_id: string;
  receipt_date: string;
  quantity: number;
  lot_no: string;
  equipment_line: string | null;
  storage_location: string | null;
  quality_status: ProductionReceiptQualityStatus;
  operator_name: string | null;
  memo: string | null;
  production_day_plan_item_id: string | null;
  transaction_type: ProductionReceiptTransactionType;
  created_at: string;
};

type ProductionShipmentRecordSeedRow = {
  id: string;
  shipment_plan_id: string;
  shipped_date: string;
  quantity: number;
  created_at: string;
};

type ProductionMockData = {
  production_receipts: ProductionReceiptSeedRow[];
  shipment_records: ProductionShipmentRecordSeedRow[];
};

const productionMockData = mockData as unknown as ProductionMockData;

function mapProductionReceiptRow(row: ProductionReceiptSeedRow): ProductionReceiptRecord {
  return {
    id: row.id,
    orderProductId: row.order_product_id,
    receiptDate: row.receipt_date,
    quantity: row.quantity,
    lotNo: row.lot_no,
    equipmentLine: row.equipment_line,
    storageLocation: row.storage_location,
    qualityStatus: row.quality_status,
    operatorName: row.operator_name,
    memo: row.memo,
    productionPlanItemId: row.production_day_plan_item_id,
    transactionType: row.transaction_type,
    createdAt: row.created_at,
  };
}

function mapProductionShipmentRecordRow(row: ProductionShipmentRecordSeedRow): ProductionShipmentRecord {
  return {
    id: row.id,
    shipmentPlanId: row.shipment_plan_id,
    shippedDate: row.shipped_date,
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

const productionReceiptSeedItems = productionMockData.production_receipts.map(mapProductionReceiptRow);
const productionShipmentRecordSeedItems = productionMockData.shipment_records.map(mapProductionShipmentRecordRow);

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function getDatePart(value: string) {
  return value.replaceAll("-", "");
}

function getSequencePart(sequence: number) {
  return String(sequence).padStart(3, "0");
}

function getReceiptStock(receipts: ProductionReceiptRecord[], orderProductId: string) {
  return receipts
    .filter((receipt) => receipt.orderProductId === orderProductId)
    .reduce((sum, receipt) => sum + receipt.quantity, 0);
}

function createShipmentPlanProductMap(seed: ProductionManagementSeed) {
  const productByShipmentPlanId = new Map<string, ProductionManagementOrderProduct>();

  for (const product of seed.orderProducts) {
    for (const shipmentPlan of product.shipmentPlans) {
      productByShipmentPlanId.set(shipmentPlan.id, product);
    }
  }

  return productByShipmentPlanId;
}

function getShipmentQuantity(seed: ProductionManagementSeed, orderProductId: string) {
  const productByShipmentPlanId = createShipmentPlanProductMap(seed);

  return (seed.shipmentRecords ?? []).reduce((sum, shipmentRecord) => {
    const product = productByShipmentPlanId.get(shipmentRecord.shipmentPlanId);

    if (product?.orderProductId !== orderProductId) {
      return sum;
    }

    return sum + shipmentRecord.quantity;
  }, 0);
}

function sortReceiptsByFifo(left: ProductionReceiptRecord, right: ProductionReceiptRecord) {
  return left.receiptDate.localeCompare(right.receiptDate) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function createStorageLocationGroups(receipts: ProductionReceiptRecord[], orderProductId: string, outboundQuantity: number) {
  const quantityByStorageLocation = new Map<string, number>();
  let remainingOutboundQuantity = outboundQuantity;

  for (const receipt of receipts.filter((item) => item.orderProductId === orderProductId).sort(sortReceiptsByFifo)) {
    const consumedQuantity = Math.min(receipt.quantity, remainingOutboundQuantity);
    remainingOutboundQuantity -= consumedQuantity;
    const availableQuantity = receipt.quantity - consumedQuantity;

    if (availableQuantity <= 0) {
      continue;
    }

    const storageLocation = receipt.storageLocation ?? "미입력";
    quantityByStorageLocation.set(storageLocation, (quantityByStorageLocation.get(storageLocation) ?? 0) + availableQuantity);
  }

  return [...quantityByStorageLocation.entries()]
    .map(([storageLocation, quantity]) => ({ storageLocation, quantity }))
    .filter((group) => group.quantity > 0)
    .sort((left, right) => {
      if (left.storageLocation === "미입력") {
        return 1;
      }

      if (right.storageLocation === "미입력") {
        return -1;
      }

      return left.storageLocation.localeCompare(right.storageLocation, "ko-KR");
    });
}

function findOrderProduct(seed: ProductionManagementSeed, orderProductId: string) {
  return seed.orderProducts.find((product) => product.orderProductId === orderProductId) ?? null;
}

function createProductionPlanOption(item: DailyProductionSeedItem): ProductionPlanOption {
  return {
    id: item.id,
    productionDate: item.productionDate,
    departmentCode: item.departmentCode,
    quantity: item.quantity,
    sequence: item.sequence,
  };
}

export function createLotNo(receiptDate: string, sequence: number) {
  return `LOT-${getDatePart(receiptDate)}-${getSequencePart(sequence)}`;
}

export function buildProductionManagementSeed(
  orders: OrderListRow[],
  dayPlanItems: DailyProductionSeedItem[],
  receipts: ProductionReceiptRecord[] = productionReceiptSeedItems,
  shipmentRecords: ProductionShipmentRecord[] = productionShipmentRecordSeedItems,
): ProductionManagementSeed {
  const planItemsByOrderProductId = new Map<string, ProductionPlanOption[]>();

  for (const item of dayPlanItems) {
    if (item.planningStatus === "cancelled") {
      continue;
    }

    const current = planItemsByOrderProductId.get(item.orderProductId) ?? [];
    current.push(createProductionPlanOption(item));
    planItemsByOrderProductId.set(item.orderProductId, current);
  }

  const orderProducts = orders
    .flatMap((order) =>
      order.products.map((product) => ({
        orderProductId: product.id,
        orderId: order.id,
        orderNo: order.orderNo,
        orderRequestedDate: order.requestedDate,
        customerName: order.customerName,
        designNo: product.designNo,
        productName: product.productName,
        specification: product.specification,
        departmentCode: product.departmentCode,
        orderQuantity: product.quantity,
        shipmentPlans: [...product.shipmentPlans].sort(
          (left, right) => left.plannedShipDate.localeCompare(right.plannedShipDate) || left.id.localeCompare(right.id),
        ),
        productionPlans: [...(planItemsByOrderProductId.get(product.id) ?? [])].sort(
          (left, right) =>
            left.productionDate.localeCompare(right.productionDate) ||
            left.sequence - right.sequence ||
            left.id.localeCompare(right.id),
        ),
      })),
    )
    .sort(
      (left, right) =>
        left.customerName.localeCompare(right.customerName, "ko-KR") ||
        left.productName.localeCompare(right.productName, "ko-KR") ||
        left.orderNo.localeCompare(right.orderNo),
    );

  return {
    orderProducts,
    receipts: [...receipts],
    shipmentRecords: [...shipmentRecords],
  };
}

export function createInventoryRows(seed: ProductionManagementSeed): ProductionInventoryRow[] {
  return seed.orderProducts
    .map((product) => {
      const receiptStock = getReceiptStock(seed.receipts, product.orderProductId);
      const shipmentQuantity = getShipmentQuantity(seed, product.orderProductId);
      const stockQuantity = Math.max(0, receiptStock - shipmentQuantity);
      const receiptCount = seed.receipts.filter((receipt) => receipt.orderProductId === product.orderProductId).length;

      return {
        ...product,
        id: product.orderProductId,
        stockQuantity,
        remainingReceivableQuantity: Math.max(0, product.orderQuantity - receiptStock),
        receiptCount,
        storageLocationGroups: createStorageLocationGroups(seed.receipts, product.orderProductId, shipmentQuantity),
      };
    })
    .filter((row) => row.stockQuantity > 0);
}

export function createInventoryLedgerRows(seed: ProductionManagementSeed): ProductionInventoryLedgerRow[] {
  const productByShipmentPlanId = createShipmentPlanProductMap(seed);
  const inboundRows = seed.receipts.flatMap((receipt) => {
    const product = findOrderProduct(seed, receipt.orderProductId);

    if (!product) {
      return [];
    }

    return [
      {
        ...product,
        id: receipt.id,
        transactionKind: "inbound" as const,
        transactionLabel: "입고" as const,
        quantity: receipt.quantity,
        signedQuantity: receipt.quantity,
        transactionDate: receipt.receiptDate,
        transactionAt: receipt.createdAt,
      },
    ];
  });
  const outboundRows = (seed.shipmentRecords ?? []).flatMap((shipmentRecord) => {
    const product = productByShipmentPlanId.get(shipmentRecord.shipmentPlanId);

    if (!product) {
      return [];
    }

    return [
      {
        ...product,
        id: shipmentRecord.id,
        transactionKind: "outbound" as const,
        transactionLabel: "출고" as const,
        quantity: shipmentRecord.quantity,
        signedQuantity: -shipmentRecord.quantity,
        transactionDate: shipmentRecord.shippedDate,
        transactionAt: shipmentRecord.createdAt,
      },
    ];
  });

  return [...inboundRows, ...outboundRows].sort(
    (left, right) => right.transactionAt.localeCompare(left.transactionAt) || right.id.localeCompare(left.id),
  );
}

export function createReceiptHistoryRows(seed: ProductionManagementSeed): ProductionReceiptHistoryRow[] {
  return seed.receipts
    .flatMap((receipt) => {
      const product = findOrderProduct(seed, receipt.orderProductId);

      if (!product) {
        return [];
      }

      return [
        {
          ...receipt,
          ...product,
          id: receipt.id,
          receiptId: receipt.id,
        },
      ];
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
}

export function validateProductionReceiptDraft(
  seed: ProductionManagementSeed,
  draft: Pick<ProductionReceiptDraft, "orderProductId" | "quantity">,
): ProductionReceiptValidationResult {
  const fieldErrors: Partial<Record<"orderProductId" | "quantity", string>> = {};
  const product = findOrderProduct(seed, draft.orderProductId);

  if (!draft.orderProductId) {
    fieldErrors.orderProductId = "주문제품을 선택하세요.";
  } else if (!product) {
    fieldErrors.orderProductId = "선택한 주문제품을 찾을 수 없습니다.";
  }

  if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) {
    fieldErrors.quantity = "생산수량은 1개 이상이어야 합니다.";
  } else if (product) {
    const remainingQuantity = Math.max(0, product.orderQuantity - getReceiptStock(seed.receipts, product.orderProductId));

    if (draft.quantity > remainingQuantity) {
      fieldErrors.quantity = `입력 가능 수량은 ${formatNumber(remainingQuantity)}개 이하입니다.`;
    }
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

export function createProductionReceiptRecord(
  seed: ProductionManagementSeed,
  draft: ProductionReceiptDraft,
  options: {
    createdAt: string;
    sequence: number;
  },
): ProductionReceiptRecord {
  const validation = validateProductionReceiptDraft(seed, {
    orderProductId: draft.orderProductId,
    quantity: draft.quantity,
  });

  if (!validation.ok) {
    throw new Error(Object.values(validation.fieldErrors)[0] ?? "생산 제품 입력값을 확인하세요.");
  }

  const receiptDate = draft.receiptDate || options.createdAt.slice(0, 10);
  const sequencePart = getSequencePart(options.sequence);

  return {
    id: `receipt-${draft.orderProductId}-${getDatePart(receiptDate)}-${sequencePart}`,
    orderProductId: draft.orderProductId,
    receiptDate,
    quantity: draft.quantity,
    lotNo: normalizeOptionalText(draft.lotNo) ?? createLotNo(receiptDate, options.sequence),
    equipmentLine: normalizeOptionalText(draft.equipmentLine),
    storageLocation: normalizeOptionalText(draft.storageLocation),
    qualityStatus: draft.qualityStatus ?? "not_recorded",
    operatorName: normalizeOptionalText(draft.operatorName),
    memo: normalizeOptionalText(draft.memo),
    productionPlanItemId: normalizeOptionalText(draft.productionPlanItemId),
    transactionType: "production_receipt",
    createdAt: options.createdAt,
  };
}

export async function listProductionManagementSeed() {
  const [orders, dailySeed] = await Promise.all([listOrderStatusRows(), listDailyProductionSeed()]);

  return buildProductionManagementSeed(orders, dailySeed.dayPlanItems);
}
