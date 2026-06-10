import { describe, expect, test } from "vitest";

import {
  canCancelOrder,
  canEditOrder,
  canReleaseOrder,
  validateOrderForm,
} from "./validation";
import type { OrderFormInput } from "./types";

const baseOrder: OrderFormInput = {
  requestedDate: "2026-06-10",
  channel: "카톡",
  customChannel: "",
  customerId: "customer-1",
  contactId: "contact-1",
  designId: "design-1",
  quantity: 500,
  deliveryType: "single",
  schedules: [{ scheduledDate: "2026-06-18", quantity: 500 }],
};

describe("validateOrderForm", () => {
  test("accepts a single delivery schedule that matches the order quantity", () => {
    const result = validateOrderForm(baseOrder);

    expect(result.ok).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });

  test("rejects single delivery when the schedule quantity does not match the order quantity", () => {
    const result = validateOrderForm({
      ...baseOrder,
      schedules: [{ scheduledDate: "2026-06-18", quantity: 300 }],
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.schedules).toContain("납기 수량 합계");
  });

  test("rejects split delivery when a row is missing date or quantity", () => {
    const result = validateOrderForm({
      ...baseOrder,
      deliveryType: "split",
      schedules: [
        { scheduledDate: "2026-06-18", quantity: 300 },
        { scheduledDate: "", quantity: 200 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.schedules).toContain("모든 분할 출하 행");
  });

  test("rejects split delivery when total quantity differs from order quantity", () => {
    const result = validateOrderForm({
      ...baseOrder,
      deliveryType: "split",
      schedules: [
        { scheduledDate: "2026-06-18", quantity: 300 },
        { scheduledDate: "2026-06-25", quantity: 100 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.schedules).toContain("납기 수량 합계");
  });

  test("requires custom channel text when channel is 기타", () => {
    const result = validateOrderForm({
      ...baseOrder,
      channel: "기타",
      customChannel: "",
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.customChannel).toBe("기타 채널명을 입력하세요.");
  });
});

describe("status mutation policy", () => {
  test("only active orders can be edited, released, or cancelled", () => {
    expect(canEditOrder("active")).toBe(true);
    expect(canReleaseOrder("active")).toBe(true);
    expect(canCancelOrder("active")).toBe(true);

    for (const status of ["released", "completed", "cancelled"] as const) {
      expect(canEditOrder(status)).toBe(false);
      expect(canReleaseOrder(status)).toBe(false);
      expect(canCancelOrder(status)).toBe(false);
    }
  });
});
