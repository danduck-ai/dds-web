import { describe, expect, test } from "vitest";

import { createOrderListRow, getStatusLabel } from "./view-model";
import type { OrderRecord } from "./types";

const baseRecord: OrderRecord = {
  id: "order-1",
  orderNo: "260610-0001",
  status: "active",
  requestedDate: "2026-06-10",
  channel: "카톡",
  customerName: "동성전자",
  contactName: "김영수",
  designNo: "DS-1042",
  productName: "실리콘 패킹",
  specification: "R-100",
  departmentCode: "R",
  quantity: 500,
  deliveryType: "single",
  schedules: [{ scheduledDate: "2026-06-18", quantity: 500 }],
  createdAt: "2026-06-10T01:00:00.000Z",
};

describe("getStatusLabel", () => {
  test("maps DB statuses to Korean tab labels", () => {
    expect(getStatusLabel("active")).toBe("접수");
    expect(getStatusLabel("released")).toBe("생산중");
    expect(getStatusLabel("completed")).toBe("출하 완료");
    expect(getStatusLabel("cancelled")).toBe("삭제됨");
  });
});

describe("createOrderListRow", () => {
  test("formats a single delivery date as MM/DD", () => {
    const row = createOrderListRow(baseRecord);

    expect(row.deliveryLabel).toBe("06/18");
    expect(row.statusLabel).toBe("접수");
    expect(row.searchText).toContain("동성전자");
  });

  test("formats split delivery as 분할", () => {
    const row = createOrderListRow({
      ...baseRecord,
      deliveryType: "split",
      schedules: [
        { scheduledDate: "2026-06-18", quantity: 300 },
        { scheduledDate: "2026-06-25", quantity: 200 },
      ],
    });

    expect(row.deliveryLabel).toBe("분할");
  });
});
