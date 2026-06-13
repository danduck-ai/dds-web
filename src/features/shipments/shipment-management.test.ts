import { describe, expect, test } from "vitest";

import { listProductionManagementSeed, type ProductionManagementSeed } from "@/features/production/product-management";
import {
  createShipmentManagementRows,
  createShipmentRecord,
  filterShipmentManagementRows,
  getShipmentInputLimit,
  validateShipmentRecordDraft,
} from "./shipment-management";

const seed: ProductionManagementSeed = {
  orderProducts: [
    {
      orderProductId: "product-s",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      customerName: "동성전자",
      designNo: "DS-S120",
      productName: "압출 실리콘 가스켓 S",
      specification: "S-120 / 적색 / 연속압출",
      departmentCode: "S",
      orderQuantity: 300,
      shipmentPlans: [
        {
          id: "shipment-s-1",
          plannedShipDate: "2026-06-13",
          quantity: 100,
          status: "ready",
        },
        {
          id: "shipment-s-2",
          plannedShipDate: "2026-06-15",
          quantity: 200,
          status: "completed",
        },
      ],
      productionPlans: [],
    },
    {
      orderProductId: "product-r",
      orderId: "order-2",
      orderNo: "O-DSE-26061400002",
      orderRequestedDate: "2026-06-14",
      customerName: "세림테크",
      designNo: "DS-R100",
      productName: "실리콘 패킹 R",
      specification: "R-100 / 흑색",
      departmentCode: "R",
      orderQuantity: 120,
      shipmentPlans: [
        {
          id: "shipment-r-1",
          plannedShipDate: "2026-06-10",
          quantity: 120,
          status: "completed",
        },
      ],
      productionPlans: [],
    },
  ],
  receipts: [
    {
      id: "receipt-s-1",
      orderProductId: "product-s",
      receiptDate: "2026-06-12",
      quantity: 160,
      lotNo: "LOT-20260612-001",
      equipmentLine: "압출 2라인",
      storageLocation: "A-01",
      qualityStatus: "passed",
      operatorName: "박현우",
      memo: null,
      productionPlanItemId: null,
      transactionType: "production_receipt",
      createdAt: "2026-06-12T09:00:00.000Z",
    },
    {
      id: "receipt-r-1",
      orderProductId: "product-r",
      receiptDate: "2026-06-10",
      quantity: 120,
      lotNo: "LOT-20260610-001",
      equipmentLine: "R-1라인",
      storageLocation: "R-A01",
      qualityStatus: "passed",
      operatorName: "박현우",
      memo: null,
      productionPlanItemId: null,
      transactionType: "production_receipt",
      createdAt: "2026-06-10T09:00:00.000Z",
    },
  ],
  shipmentRecords: [
    {
      id: "shipment-record-s-1",
      shipmentPlanId: "shipment-s-1",
      shippedDate: "2026-06-13",
      quantity: 40,
      createdAt: "2026-06-13T10:00:00.000Z",
    },
    {
      id: "shipment-record-r-1",
      shipmentPlanId: "shipment-r-1",
      shippedDate: "2026-06-10",
      quantity: 120,
      createdAt: "2026-06-10T10:00:00.000Z",
    },
  ],
};

describe("shipment management helpers", () => {
  test("creates shipment rows from shipment plans with product and history summaries", () => {
    const rows = createShipmentManagementRows(seed);
    const partialRow = rows.find((row) => row.shipmentPlanId === "shipment-s-1");

    expect(rows.map((row) => row.shipmentPlanId)).toEqual(["shipment-r-1", "shipment-s-1", "shipment-s-2"]);
    expect(partialRow).toMatchObject({
      customerName: "동성전자",
      productName: "압출 실리콘 가스켓 S",
      specification: "S-120 / 적색 / 연속압출",
      departmentCode: "S",
      plannedQuantity: 100,
      shippedQuantity: 40,
      remainingQuantity: 60,
      availableToShipQuantity: 120,
      shipmentStatus: "partial",
      shipmentStatusLabel: "부분출하",
      shipmentQuantityLabel: "40 / 100개",
    });
    expect(partialRow?.shipmentRecords).toEqual([
      {
        id: "shipment-record-s-1",
        shipmentPlanId: "shipment-s-1",
        shippedDate: "2026-06-13",
        quantity: 40,
        createdAt: "2026-06-13T10:00:00.000Z",
      },
    ]);
  });

  test("excludes completed shipment rows older than three days by default", () => {
    const rows = createShipmentManagementRows(seed);

    expect(filterShipmentManagementRows(rows, { currentDate: "2026-06-13T00:00:00.000Z", excludeOldCompleted: true }).map((row) => row.shipmentPlanId)).toEqual([
      "shipment-s-1",
      "shipment-s-2",
    ]);
    expect(filterShipmentManagementRows(rows, { currentDate: "2026-06-13T00:00:00.000Z", excludeOldCompleted: false }).map((row) => row.shipmentPlanId)).toEqual([
      "shipment-r-1",
      "shipment-s-1",
      "shipment-s-2",
    ]);
  });

  test("validates shipment draft against remaining plan quantity and available stock", () => {
    const row = createShipmentManagementRows(seed).find((item) => item.shipmentPlanId === "shipment-s-1");

    expect(validateShipmentRecordDraft(row, { shippedDate: "", quantity: 1 })).toMatchObject({
      ok: false,
      fieldErrors: {
        shippedDate: "출고일을 입력하세요.",
      },
    });
    expect(validateShipmentRecordDraft(row, { shippedDate: "2026-06-13", quantity: 0 })).toMatchObject({
      ok: false,
      fieldErrors: {
        quantity: "출하수량은 1개 이상이어야 합니다.",
      },
    });
    expect(validateShipmentRecordDraft(row, { shippedDate: "2026-06-13", quantity: 61 })).toMatchObject({
      ok: false,
      fieldErrors: {
        quantity: "출하 가능 수량은 60개 이하입니다.",
      },
    });
    expect(validateShipmentRecordDraft(row, { shippedDate: "2026-06-13", quantity: 60 })).toEqual({
      ok: true,
      fieldErrors: {},
    });
  });

  test("creates shipment records and updates row status for partial and completed shipments", () => {
    const row = createShipmentManagementRows(seed).find((item) => item.shipmentPlanId === "shipment-s-1");
    const record = createShipmentRecord(row, { shippedDate: "2026-06-14", quantity: 20 }, { createdAt: "2026-06-14T12:00:00.000Z", sequence: 2 });
    const updatedRows = createShipmentManagementRows({ ...seed, shipmentRecords: [...(seed.shipmentRecords ?? []), record] });
    const updatedRow = updatedRows.find((item) => item.shipmentPlanId === "shipment-s-1");

    expect(record).toMatchObject({
      id: "shipment-record-shipment-s-1-20260614-002",
      shipmentPlanId: "shipment-s-1",
      shippedDate: "2026-06-14",
      quantity: 20,
    });
    expect(updatedRow).toMatchObject({
      shippedQuantity: 60,
      remainingQuantity: 40,
      shipmentStatus: "partial",
      shipmentStatusLabel: "부분출하",
    });

    const completionRecord = createShipmentRecord(updatedRow, { shippedDate: "2026-06-14", quantity: 40 }, { createdAt: "2026-06-14T13:00:00.000Z", sequence: 3 });
    const completedRows = createShipmentManagementRows({
      ...seed,
      shipmentRecords: [...(seed.shipmentRecords ?? []), record, completionRecord],
    });

    expect(completedRows.find((item) => item.shipmentPlanId === "shipment-s-1")).toMatchObject({
      shippedQuantity: 100,
      remainingQuantity: 0,
      shipmentStatus: "completed",
      shipmentStatusLabel: "출하완료",
    });
  });

  test("default shipment seed covers ready, partial, completed, and multi-record histories", async () => {
    const defaultSeed = await listProductionManagementSeed();
    const rows = createShipmentManagementRows(defaultSeed);
    const statusSet = new Set(rows.map((row) => row.shipmentStatus));

    expect(statusSet).toEqual(new Set(["ready", "partial", "completed"]));
    expect(rows.filter((row) => row.shipmentRecords.length > 0).length).toBeGreaterThanOrEqual(5);
    expect(rows.some((row) => row.shipmentRecords.length >= 2)).toBe(true);
    expect(rows.some((row) => row.shipmentStatus === "completed" && row.lastShippedDate === "2026-06-09")).toBe(true);
  });

  test("default shipment seed includes visible ready rows with stock available for input testing", async () => {
    const defaultSeed = await listProductionManagementSeed();
    const rows = createShipmentManagementRows(defaultSeed);
    const visibleRows = filterShipmentManagementRows(rows, {
      currentDate: "2026-06-13",
      excludeOldCompleted: true,
    });
    const activeInputRows = visibleRows.filter((row) => row.shipmentStatus !== "completed" && getShipmentInputLimit(row) > 0);

    expect(activeInputRows.length).toBeGreaterThanOrEqual(3);
    expect(activeInputRows.some((row) => row.shipmentPlanId === "51000000-0000-4000-8000-000000000002")).toBe(true);
    expect(activeInputRows.some((row) => row.shipmentPlanId === "51000000-0000-4000-8000-000000000009")).toBe(true);
  });
});
