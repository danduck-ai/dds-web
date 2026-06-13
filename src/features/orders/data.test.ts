import { describe, expect, test } from "vitest";

import { listOrderStatusRows, listOrders } from "./data";

describe("order data loaders", () => {
  test("maps completed_at from mock order rows", async () => {
    const rows = await listOrders("completed");

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.completedAt)).toBe(true);
  });

  test("loads all non-cancelled orders for the order status page", async () => {
    const rows = await listOrderStatusRows();
    const statuses = new Set(rows.map((row) => row.status));

    expect(statuses).toEqual(new Set(["active", "released", "completed"]));
    expect(rows.some((row) => row.status === "cancelled")).toBe(false);
    expect(rows[0].createdAt >= rows[1].createdAt).toBe(true);
  });

  test("maps order codes, multiple products, and shipment plans without production drafts", async () => {
    const rows = await listOrders("active");
    const multiProductOrder = rows.find((row) => row.products.length > 1);

    expect(multiProductOrder?.orderNo).toMatch(/^O-[A-Z0-9]+-\d{11}$/);
    expect(multiProductOrder?.productSummary).toContain("외 1");
    expect(multiProductOrder?.totalQuantity).toBe(
      multiProductOrder?.products.reduce((sum, product) => sum + product.quantity, 0),
    );
    expect(
      multiProductOrder?.products.flatMap((product) =>
        product.shipmentPlans.filter((plan) => "productionPlans" in plan),
      ),
    ).toEqual([]);
  });
});
