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
  products: [
    {
      designId: "design-1",
      quantity: 500,
      shipmentPlans: [{ plannedShipDate: "2026-06-18", quantity: 500 }],
    },
  ],
};

describe("validateOrderForm", () => {
  test("accepts product-level shipment plans that match each product quantity", () => {
    const result = validateOrderForm(baseOrder);

    expect(result.ok).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });

  test("accepts multiple products with independent shipment plan totals", () => {
    const result = validateOrderForm({
      ...baseOrder,
      products: [
        ...baseOrder.products,
        {
          designId: "design-2",
          quantity: 200,
          shipmentPlans: [
            { plannedShipDate: "2026-06-20", quantity: 120 },
            { plannedShipDate: "2026-06-27", quantity: 80 },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  test("rejects a product when shipment plan quantity differs from product quantity", () => {
    const result = validateOrderForm({
      ...baseOrder,
      products: [
        {
          designId: "design-1",
          quantity: 500,
          shipmentPlans: [{ plannedShipDate: "2026-06-18", quantity: 300 }],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.products).toContain("제품 1");
    expect(result.fieldErrors.products).toContain("출하계획 수량 합계");
  });

  test("rejects shipment plan rows missing a date or quantity", () => {
    const result = validateOrderForm({
      ...baseOrder,
      products: [
        {
          designId: "design-1",
          quantity: 500,
          shipmentPlans: [
            { plannedShipDate: "2026-06-18", quantity: 300 },
            { plannedShipDate: "", quantity: 200 },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.products).toContain("모든 출하계획 행");
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
