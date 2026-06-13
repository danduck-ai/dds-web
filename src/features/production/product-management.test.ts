import { describe, expect, test } from "vitest";

import type { OrderListRow } from "@/features/orders/types";
import type { DailyProductionSeedItem } from "./types";
import {
  buildProductionManagementSeed,
  createInventoryLedgerRows,
  createInventoryRows,
  createProductionReceiptRecord,
  createReceiptHistoryRows,
  validateProductionReceiptDraft,
  type ProductionReceiptRecord,
  type ProductionShipmentRecord,
} from "./product-management";

const orders: OrderListRow[] = [
  {
    id: "order-1",
    orderNo: "O-DSE-26061300001",
    status: "released",
    statusLabel: "출고 가능",
    requestedDate: "2026-06-13",
    channel: "이메일",
    customerName: "동성전자",
    contactName: "김민정",
    productSummary: "압출 실리콘 가스켓 S 외 1",
    shipmentLabel: "2026-06-20 300개 외 1",
    totalQuantity: 420,
    searchText: "동성전자 압출 실리콘 가스켓 S",
    createdAt: "2026-06-13T00:00:00.000Z",
    completedAt: null,
    products: [
      {
        id: "product-s",
        designId: "design-s",
        designNo: "DS-S120",
        productName: "압출 실리콘 가스켓 S",
        specification: "S-120 / 적색 / 연속압출",
        departmentCode: "S",
        defaultUnitsPerHour: 65,
        quantity: 300,
        shipmentPlans: [
          {
            id: "shipment-s-1",
            plannedShipDate: "2026-06-20",
            quantity: 100,
            status: "ready",
          },
          {
            id: "shipment-s-2",
            plannedShipDate: "2026-07-01",
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
        specification: "R-100 / 흑색",
        departmentCode: "R",
        defaultUnitsPerHour: 120,
        quantity: 120,
        shipmentPlans: [
          {
            id: "shipment-r-1",
            plannedShipDate: "2026-06-26",
            quantity: 120,
            status: "partial",
          },
        ],
      },
    ],
  },
];

function seedItem(patch: Partial<DailyProductionSeedItem> = {}): DailyProductionSeedItem {
  return {
    id: patch.id ?? "plan-product-s-1",
    productionDate: patch.productionDate ?? "2026-06-13",
    departmentCode: patch.departmentCode ?? "S",
    workStartTime: patch.workStartTime ?? "09:00",
    orderProductId: patch.orderProductId ?? "product-s",
    quantity: patch.quantity ?? 80,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? 74,
    durationSource: patch.durationSource ?? "product_default",
    planningStatus: patch.planningStatus ?? "scheduled",
    sequence: patch.sequence ?? 1,
  };
}

const receipts: ProductionReceiptRecord[] = [
  {
    id: "receipt-s-1",
    orderProductId: "product-s",
    receiptDate: "2026-06-12",
    quantity: 80,
    lotNo: "LOT-20260612-001",
    equipmentLine: "압출 2라인",
    storageLocation: "A-01",
    qualityStatus: "not_recorded",
    operatorName: "박현우",
    memo: "초도 입고",
    productionPlanItemId: null,
    transactionType: "production_receipt",
    createdAt: "2026-06-12T09:00:00.000Z",
  },
  {
    id: "receipt-s-2",
    orderProductId: "product-s",
    receiptDate: "2026-06-12",
    quantity: 30,
    lotNo: "LOT-20260612-002",
    equipmentLine: "압출 2라인",
    storageLocation: "B-02",
    qualityStatus: "passed",
    operatorName: "박현우",
    memo: "추가 입고",
    productionPlanItemId: null,
    transactionType: "production_receipt",
    createdAt: "2026-06-12T10:00:00.000Z",
  },
  {
    id: "receipt-s-3",
    orderProductId: "product-s",
    receiptDate: "2026-06-12",
    quantity: 20,
    lotNo: "LOT-20260612-003",
    equipmentLine: "압출 2라인",
    storageLocation: "A-01",
    qualityStatus: "not_recorded",
    operatorName: "박현우",
    memo: null,
    productionPlanItemId: null,
    transactionType: "production_receipt",
    createdAt: "2026-06-12T11:00:00.000Z",
  },
];

const shipmentRecords: ProductionShipmentRecord[] = [
  {
    id: "shipment-record-s-1",
    shipmentPlanId: "shipment-s-1",
    shippedDate: "2026-06-13",
    quantity: 25,
    createdAt: "2026-06-13T09:00:00.000Z",
  },
];

describe("production product management helpers", () => {
  test("builds inventory rows only for stocked OrderProducts and groups quantities by storage location", () => {
    const seed = buildProductionManagementSeed(
      orders,
      [seedItem(), seedItem({ id: "cancelled", planningStatus: "cancelled" })],
      receipts,
      shipmentRecords,
    );
    const rows = createInventoryRows(seed);
    const productRow = rows.find((row) => row.orderProductId === "product-s");

    expect(rows).toHaveLength(1);
    expect(productRow).toMatchObject({
      orderProductId: "product-s",
      orderNo: "O-DSE-26061300001",
      customerName: "동성전자",
      designNo: "DS-S120",
      productName: "압출 실리콘 가스켓 S",
      orderQuantity: 300,
      stockQuantity: 105,
      remainingReceivableQuantity: 170,
    });
    expect(productRow?.storageLocationGroups).toEqual([
      { storageLocation: "A-01", quantity: 75 },
      { storageLocation: "B-02", quantity: 30 },
    ]);
    expect(productRow?.shipmentPlans.map((plan) => plan.id)).toEqual(["shipment-s-1", "shipment-s-2"]);
    expect(productRow?.productionPlans.map((plan) => plan.id)).toEqual(["plan-product-s-1"]);
  });

  test("combines production receipts and shipment records into signed inventory ledger rows", () => {
    const seed = buildProductionManagementSeed(orders, [], receipts, shipmentRecords);
    const rows = createInventoryLedgerRows(seed);

    expect(rows.map((row) => ({ id: row.id, transactionKind: row.transactionKind, signedQuantity: row.signedQuantity }))).toEqual([
      { id: "shipment-record-s-1", transactionKind: "outbound", signedQuantity: -25 },
      { id: "receipt-s-3", transactionKind: "inbound", signedQuantity: 20 },
      { id: "receipt-s-2", transactionKind: "inbound", signedQuantity: 30 },
      { id: "receipt-s-1", transactionKind: "inbound", signedQuantity: 80 },
    ]);
    expect(rows.every((row) => row.transactionLabel === "입고" || row.transactionLabel === "출고")).toBe(true);
    expect(rows[0]).toMatchObject({
      productName: "압출 실리콘 가스켓 S",
      quantity: 25,
      transactionLabel: "출고",
    });
  });

  test("validates receipt drafts against remaining OrderProduct quantity", () => {
    const seed = buildProductionManagementSeed(orders, [], receipts);

    expect(validateProductionReceiptDraft(seed, { orderProductId: "", quantity: 1 })).toEqual({
      ok: false,
      fieldErrors: {
        orderProductId: "주문제품을 선택하세요.",
      },
    });
    expect(validateProductionReceiptDraft(seed, { orderProductId: "product-s", quantity: 0 })).toMatchObject({
      ok: false,
      fieldErrors: {
        quantity: "생산수량은 1개 이상이어야 합니다.",
      },
    });
    expect(validateProductionReceiptDraft(seed, { orderProductId: "product-s", quantity: 171 })).toMatchObject({
      ok: false,
      fieldErrors: {
        quantity: "입력 가능 수량은 170개 이하입니다.",
      },
    });
    expect(validateProductionReceiptDraft(seed, { orderProductId: "product-s", quantity: 170 })).toEqual({
      ok: true,
      fieldErrors: {},
    });
  });

  test("creates a receipt record with an auto lot number and no plan binding by default", () => {
    const seed = buildProductionManagementSeed(orders, [seedItem()], receipts);
    const receipt = createProductionReceiptRecord(
      seed,
      {
        orderProductId: "product-s",
        quantity: 40,
        receiptDate: "2026-06-13",
        lotNo: "",
        equipmentLine: "",
        storageLocation: "A-02",
        qualityStatus: "not_recorded",
        operatorName: "",
        memo: "",
        productionPlanItemId: "",
      },
      {
        createdAt: "2026-06-13T10:00:00.000Z",
        sequence: 2,
      },
    );

    expect(receipt).toMatchObject({
      id: "receipt-product-s-20260613-002",
      orderProductId: "product-s",
      receiptDate: "2026-06-13",
      quantity: 40,
      lotNo: "LOT-20260613-002",
      storageLocation: "A-02",
      qualityStatus: "not_recorded",
      productionPlanItemId: null,
      transactionType: "production_receipt",
    });
  });

  test("sorts receipt history newest first and keeps related order detail on each line", () => {
    const seed = buildProductionManagementSeed(orders, [], [
      ...receipts,
      {
        ...receipts[0],
        id: "receipt-s-4",
        receiptDate: "2026-06-13",
        quantity: 40,
        lotNo: "LOT-20260613-002",
        createdAt: "2026-06-13T10:00:00.000Z",
      },
    ]);
    const historyRows = createReceiptHistoryRows(seed);

    expect(historyRows.map((row) => row.id)).toEqual(["receipt-s-4", "receipt-s-3", "receipt-s-2", "receipt-s-1"]);
    expect(historyRows[0]).toMatchObject({
      orderNo: "O-DSE-26061300001",
      customerName: "동성전자",
      productName: "압출 실리콘 가스켓 S",
      shipmentPlans: [
        {
          id: "shipment-s-1",
          plannedShipDate: "2026-06-20",
          quantity: 100,
          status: "ready",
        },
        {
          id: "shipment-s-2",
          plannedShipDate: "2026-07-01",
          quantity: 200,
          status: "ready",
        },
      ],
    });
  });
});
