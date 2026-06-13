import { describe, expect, test } from "vitest";

import {
  buildCancelOrderMutation,
  buildCreateOrderMutation,
  buildReleaseOrderMutation,
  ensureActiveOrder,
} from "./actions";
import type { OrderFormInput } from "./types";

const form: OrderFormInput = {
  requestedDate: "2026-06-10",
  channel: "카톡",
  customChannel: "",
  customerId: "customer-1",
  contactId: "contact-1",
  products: [
    {
      designId: "design-1",
      quantity: 500,
      shipmentPlans: [
        { plannedShipDate: "2026-06-18", quantity: 300 },
        { plannedShipDate: "2026-06-25", quantity: 200 },
      ],
    },
  ],
};

describe("buildCreateOrderMutation", () => {
  test("validates schedule totals before creating payloads", () => {
    const result = buildCreateOrderMutation(
      {
        ...form,
        products: [
          {
            designId: "design-1",
            quantity: 500,
            shipmentPlans: [{ plannedShipDate: "2026-06-18", quantity: 300 }],
          },
        ],
      },
      "profile-1",
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.products).toContain("출하계획 수량 합계");
  });

  test("creates order, product, and shipment plan payloads without production drafts", () => {
    const result = buildCreateOrderMutation(form, "profile-1");

    if (!result.ok) {
      throw new Error("Expected valid form to create an order mutation.");
    }

    expect(result.order).toMatchObject({
      status: "active",
      requested_date: "2026-06-10",
      channel: "카톡",
      customer_id: "customer-1",
      contact_id: "contact-1",
      received_by: "profile-1",
    });
    expect(result.orderProducts).toEqual([
      {
        design_id: "design-1",
        quantity: 500,
        shipment_plans: [
          {
            planned_ship_date: "2026-06-18",
            quantity: 300,
          },
          {
            planned_ship_date: "2026-06-25",
            quantity: 200,
          },
        ],
      },
    ]);
  });
});

describe("ensureActiveOrder", () => {
  test("rejects updates for non-active orders", () => {
    expect(() => ensureActiveOrder({ id: "order-1", status: "released" })).toThrow(
      "접수 상태 주문만 변경할 수 있습니다.",
    );
  });
});

describe("status mutation builders", () => {
  test("builds released status patch and event", () => {
    const mutation = buildReleaseOrderMutation("order-1", "profile-1", "2026-06-10T02:00:00.000Z");

    expect(mutation.orderPatch).toEqual({
      status: "released",
      released_at: "2026-06-10T02:00:00.000Z",
      released_by: "profile-1",
    });
    expect(mutation.event).toMatchObject({
      order_id: "order-1",
      from_status: "active",
      to_status: "released",
      changed_by: "profile-1",
    });
  });

  test("builds cancelled status patch and event", () => {
    const mutation = buildCancelOrderMutation("order-1", "profile-1", "2026-06-10T03:00:00.000Z");

    expect(mutation.orderPatch).toEqual({
      status: "cancelled",
      cancelled_at: "2026-06-10T03:00:00.000Z",
      cancelled_by: "profile-1",
    });
    expect(mutation.event).toMatchObject({
      order_id: "order-1",
      from_status: "active",
      to_status: "cancelled",
      changed_by: "profile-1",
    });
  });
});
