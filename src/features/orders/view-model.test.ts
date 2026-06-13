import { describe, expect, test } from "vitest";

import { createOrderListRow, getStatusLabel } from "./view-model";
import type { OrderRecord } from "./types";

const baseRecord: OrderRecord = {
  id: "order-1",
  orderNo: "O-DSE-26061000001",
  status: "active",
  requestedDate: "2026-06-10",
  channel: "카톡",
  customerName: "동성전자",
  contactName: "김영수",
  products: [
    {
      id: "product-1",
      designId: "design-1",
      designNo: "DS-1042",
      productName: "실리콘 패킹",
      specification: "R-100",
      departmentCode: "R",
      defaultUnitsPerHour: 120,
      quantity: 500,
      shipmentPlans: [
        {
          id: "shipment-1",
          plannedShipDate: "2026-06-18",
          quantity: 500,
          status: "ready",
        },
      ],
    },
  ],
  createdAt: "2026-06-10T01:00:00.000Z",
  completedAt: null,
};

describe("getStatusLabel", () => {
  test("maps DB statuses to Korean tab labels", () => {
    expect(getStatusLabel("active")).toBe("접수");
    expect(getStatusLabel("released")).toBe("생산팀 전달");
    expect(getStatusLabel("completed")).toBe("출하 완료");
    expect(getStatusLabel("cancelled")).toBe("취소");
  });
});

describe("createOrderListRow", () => {
  test("summarizes a single-product order", () => {
    const row = createOrderListRow(baseRecord);

    expect(row.productSummary).toBe("DS-1042 실리콘 패킹");
    expect(row.totalQuantity).toBe(500);
    expect(row.shipmentLabel).toBe("06/18");
    expect(row.statusLabel).toBe("접수");
    expect(row.searchText).toContain("동성전자");
  });

  test("summarizes multiple products and shipment plans", () => {
    const row = createOrderListRow({
      ...baseRecord,
      products: [
        ...baseRecord.products,
        {
          id: "product-2",
          designId: "design-2",
          designNo: "DS-3301",
          productName: "실리콘 몰드",
          specification: "P-300",
          departmentCode: "P",
          defaultUnitsPerHour: 60,
          quantity: 200,
          shipmentPlans: [
            {
              id: "shipment-2",
              plannedShipDate: "2026-06-25",
              quantity: 120,
              status: "ready",
            },
            {
              id: "shipment-3",
              plannedShipDate: "2026-07-02",
              quantity: 80,
              status: "ready",
            },
          ],
        },
      ],
    });

    expect(row.productSummary).toBe("DS-1042 실리콘 패킹 외 1");
    expect(row.totalQuantity).toBe(700);
    expect(row.shipmentLabel).toBe("출하계획 3건");
    expect(row.searchText).toContain("ds-3301");
  });
});
