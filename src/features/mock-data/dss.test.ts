import { describe, expect, test } from "vitest";

import { listOrderStatusRows } from "@/features/orders/data";
import { listDailyProductionSeed } from "@/features/production/daily-seed";
import { createDailyProductionPlanningCards } from "@/features/production/daily-planning";
import { createDailyProductionRows } from "@/features/production/product-status";
import mockData from "./dss.json";

type IntegratedMockData = typeof mockData & {
  production_day_plans?: Array<{
    id: string;
    production_date: string;
    department_code: "R" | "S" | "P";
    work_start_time: string;
  }>;
  production_day_plan_items?: Array<{
    id: string;
    production_day_plan_id: string;
    order_product_id: string;
    quantity: number;
    planning_status: "scheduled" | "cancelled";
  }>;
  production_receipts?: Array<{
    id: string;
    order_product_id: string;
    quantity: number;
    production_day_plan_item_id: string | null;
  }>;
  shipment_records?: Array<{
    id: string;
    shipment_plan_id: string;
    quantity: number;
  }>;
};

const integratedMockData = mockData as IntegratedMockData;

describe("DSS mock data", () => {
  test("covers the main order workflow with rich lookup data", () => {
    const activeCustomers = mockData.customers.filter((customer) => customer.is_active);
    const activeContacts = mockData.contacts.filter((contact) => contact.is_active);
    const activeDesigns = mockData.designs.filter((design) => design.is_active);

    expect(activeCustomers.length).toBeGreaterThanOrEqual(6);
    expect(activeContacts.length).toBeGreaterThanOrEqual(8);
    expect(activeDesigns.length).toBeGreaterThanOrEqual(9);
    expect(activeCustomers.every((customer) => /^[A-Z0-9]+$/.test(customer.ticker))).toBe(true);
    expect(activeDesigns.every((design) => design.default_units_per_hour > 0)).toBe(true);
    expect(new Set(activeDesigns.map((design) => design.department_code))).toEqual(new Set(["P", "R", "S"]));

    expect(mockData.orders.filter((order) => order.status === "active")).toHaveLength(4);
    expect(mockData.orders.filter((order) => order.status === "released")).toHaveLength(5);
    expect(mockData.orders.filter((order) => order.status === "completed")).toHaveLength(4);
    expect(mockData.orders.filter((order) => order.status === "cancelled")).toHaveLength(2);
    expect(mockData.orders.every((order) => /^O-[A-Z0-9]+-\d{11}$/.test(order.order_no))).toBe(true);
  });

  test("provides completed_at only for completed orders", () => {
    for (const order of mockData.orders) {
      if (order.status === "completed") {
        expect(order.completed_at, `${order.order_no} completed_at`).toMatch(/T.*Z$/);
      } else {
        expect(order.completed_at, `${order.order_no} completed_at`).toBeNull();
      }
    }
  });

  test("uses normalized order products and shipment plans for every order", () => {
    for (const order of integratedMockData.orders) {
      const orderProducts = integratedMockData.order_products.filter((product) => product.order_id === order.id);
      const productQuantity = orderProducts.reduce((sum, product) => sum + product.quantity, 0);
      const shipmentQuantity = integratedMockData.shipment_plans
        .filter((plan) => plan.order_id === order.id)
        .reduce((sum, plan) => sum + plan.quantity, 0);

      expect(orderProducts.length, `${order.order_no} order products`).toBeGreaterThan(0);
      expect(productQuantity, `${order.order_no} product total`).toBeGreaterThan(0);
      expect(shipmentQuantity, `${order.order_no} shipment total`).toBe(productQuantity);

      for (const product of orderProducts) {
        const shipmentPlans = integratedMockData.shipment_plans.filter((plan) => plan.order_product_id === product.id);
        const shipmentQuantity = shipmentPlans.reduce((sum, plan) => sum + plan.quantity, 0);

        expect(shipmentPlans.length, `${product.id} shipment plans`).toBeGreaterThan(0);
        expect(shipmentQuantity, `${product.id} shipment total`).toBe(product.quantity);
      }
    }
  });

  test("keeps production, receipt, and shipment ledgers consistent with order lifecycle", () => {
    const orderById = new Map(integratedMockData.orders.map((order) => [order.id, order]));
    const productById = new Map(integratedMockData.order_products.map((product) => [product.id, product]));
    const shipmentPlanById = new Map(integratedMockData.shipment_plans.map((plan) => [plan.id, plan]));
    const productionDayPlanById = new Map(
      (integratedMockData.production_day_plans ?? []).map((plan) => [plan.id, plan]),
    );
    const productionItemById = new Map(
      (integratedMockData.production_day_plan_items ?? []).map((item) => [item.id, item]),
    );
    const activeOrderIds = new Set(
      integratedMockData.orders.filter((order) => order.status === "active").map((order) => order.id),
    );

    for (const item of integratedMockData.production_day_plan_items ?? []) {
      const product = productById.get(item.order_product_id);
      const order = product ? orderById.get(product.order_id) : null;
      const dayPlan = productionDayPlanById.get(item.production_day_plan_id);

      expect(product, `${item.id} order product`).toBeDefined();
      expect(dayPlan, `${item.id} production day plan`).toBeDefined();
      expect(order?.status, `${item.id} order status`).not.toBe("active");
      expect(dayPlan?.department_code, `${item.id} department`).toBe(product?.department_code_snapshot);
      expect(dayPlan?.production_date.localeCompare(order?.requested_date ?? ""), `${item.id} date order`).toBeGreaterThanOrEqual(0);
    }

    for (const receipt of integratedMockData.production_receipts ?? []) {
      const product = productById.get(receipt.order_product_id);
      const order = product ? orderById.get(product.order_id) : null;
      const planItem = receipt.production_day_plan_item_id
        ? productionItemById.get(receipt.production_day_plan_item_id)
        : null;

      expect(product, `${receipt.id} order product`).toBeDefined();
      expect(order?.status, `${receipt.id} order status`).not.toBe("active");
      expect(planItem?.order_product_id ?? receipt.order_product_id, `${receipt.id} plan product`).toBe(
        receipt.order_product_id,
      );
    }

    for (const shipmentRecord of integratedMockData.shipment_records ?? []) {
      const shipmentPlan = shipmentPlanById.get(shipmentRecord.shipment_plan_id);
      const order = shipmentPlan ? orderById.get(shipmentPlan.order_id) : null;

      expect(shipmentPlan, `${shipmentRecord.id} shipment plan`).toBeDefined();
      expect(order?.status, `${shipmentRecord.id} order status`).not.toBe("active");
    }

    const activeOrderProductIds = new Set(
      integratedMockData.order_products
        .filter((product) => activeOrderIds.has(product.order_id))
        .map((product) => product.id),
    );
    const activeShipmentPlanIds = new Set(
      integratedMockData.shipment_plans
        .filter((plan) => activeOrderProductIds.has(plan.order_product_id))
        .map((plan) => plan.id),
    );

    expect(
      (integratedMockData.production_day_plan_items ?? []).some((item) =>
        activeOrderProductIds.has(item.order_product_id),
      ),
    ).toBe(false);
    expect(
      (integratedMockData.production_receipts ?? []).some((receipt) =>
        activeOrderProductIds.has(receipt.order_product_id),
      ),
    ).toBe(false);
    expect(
      (integratedMockData.shipment_records ?? []).some((record) =>
        activeShipmentPlanIds.has(record.shipment_plan_id),
      ),
    ).toBe(false);
  });

  test("keeps production, inventory, and shipment quantities within order product limits", () => {
    const shipmentPlanById = new Map(integratedMockData.shipment_plans.map((plan) => [plan.id, plan]));
    const receiptQuantityByProductId = new Map<string, number>();
    const plannedQuantityByProductId = new Map<string, number>();
    const shippedQuantityByPlanId = new Map<string, number>();
    const shippedQuantityByProductId = new Map<string, number>();

    for (const receipt of integratedMockData.production_receipts ?? []) {
      receiptQuantityByProductId.set(
        receipt.order_product_id,
        (receiptQuantityByProductId.get(receipt.order_product_id) ?? 0) + receipt.quantity,
      );
    }

    for (const item of integratedMockData.production_day_plan_items ?? []) {
      if (item.planning_status === "cancelled") {
        continue;
      }

      plannedQuantityByProductId.set(
        item.order_product_id,
        (plannedQuantityByProductId.get(item.order_product_id) ?? 0) + item.quantity,
      );
    }

    for (const record of integratedMockData.shipment_records ?? []) {
      const shipmentPlan = shipmentPlanById.get(record.shipment_plan_id);

      shippedQuantityByPlanId.set(
        record.shipment_plan_id,
        (shippedQuantityByPlanId.get(record.shipment_plan_id) ?? 0) + record.quantity,
      );

      if (shipmentPlan) {
        shippedQuantityByProductId.set(
          shipmentPlan.order_product_id,
          (shippedQuantityByProductId.get(shipmentPlan.order_product_id) ?? 0) + record.quantity,
        );
      }
    }

    for (const shipmentPlan of integratedMockData.shipment_plans) {
      const shippedQuantity = shippedQuantityByPlanId.get(shipmentPlan.id) ?? 0;

      expect(shippedQuantity, `${shipmentPlan.id} shipped quantity`).toBeLessThanOrEqual(shipmentPlan.quantity);
      expect(shipmentPlan.shipped_quantity, `${shipmentPlan.id} shipped cache`).toBe(shippedQuantity);
    }

    for (const product of integratedMockData.order_products) {
      const plannedQuantity = plannedQuantityByProductId.get(product.id) ?? 0;
      const receiptQuantity = receiptQuantityByProductId.get(product.id) ?? 0;
      const shippedQuantity = shippedQuantityByProductId.get(product.id) ?? 0;

      expect(plannedQuantity, `${product.id} planned quantity`).toBeLessThanOrEqual(product.quantity);
      expect(receiptQuantity, `${product.id} receipt quantity`).toBeLessThanOrEqual(product.quantity);
      expect(shippedQuantity, `${product.id} shipped quantity`).toBeLessThanOrEqual(product.quantity);
      expect(shippedQuantity, `${product.id} shipped from stock`).toBeLessThanOrEqual(receiptQuantity);
    }
  });

  test("provides a target-model multi-product order without production drafts", () => {
    const orderProducts = mockData.order_products.filter(
      (product) => product.order_id === "40000000-0000-4000-8000-000000000002",
    );
    const shipmentPlans = mockData.shipment_plans.filter(
      (plan) => plan.order_id === "40000000-0000-4000-8000-000000000002",
    );

    expect(orderProducts).toHaveLength(2);
    expect(shipmentPlans.reduce((sum, plan) => sum + plan.quantity, 0)).toBe(900);
    expect("production_plans" in mockData).toBe(false);
  });

  test("keeps target-model product and shipment plan quantities consistent", () => {
    for (const product of mockData.order_products) {
      const shipmentPlans = mockData.shipment_plans.filter((plan) => plan.order_product_id === product.id);
      const shipmentTotal = shipmentPlans.reduce((sum, plan) => sum + plan.quantity, 0);

      expect(shipmentPlans.length, `${product.id} shipment plans`).toBeGreaterThan(0);
      expect(shipmentTotal, `${product.id} shipment total`).toBe(product.quantity);
    }
  });

  test("feeds daily production planning with OrderProduct candidates and seeded day plans", async () => {
    const orders = await listOrderStatusRows();
    const seed = await listDailyProductionSeed();
    const cardsFor = (departmentCode: "R" | "S" | "P", productionDate = "2026-06-13") =>
      createDailyProductionPlanningCards(seed, {
        departmentCode,
        productionDate,
      });

    const rCards = cardsFor("R");
    const sCards = cardsFor("S");
    const pCards = cardsFor("P");

    expect(orders.some((order) => order.status === "released")).toBe(true);
    expect(rCards.length).toBeGreaterThanOrEqual(2);
    expect(sCards.length).toBeGreaterThanOrEqual(1);
    expect(pCards.length).toBeGreaterThanOrEqual(1);

    expect(rCards.some((card) => card.productionDate === "2026-06-13" && card.sequence === 1)).toBe(true);
    expect(rCards.some((card) => card.quantity === null && card.remainingQuantity > 0)).toBe(true);
    expect(pCards.some((card) => card.planningStatus === "scheduled" && card.quantity !== null)).toBe(true);
    expect(rCards.every((card) => !("shipmentPlanId" in card))).toBe(true);
  });

  test("feeds daily production status with varied seeded production day plans", async () => {
    const seed = await listDailyProductionSeed();
    const rows = createDailyProductionRows(seed);

    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(new Set(rows.map((row) => row.productionDate)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(rows.map((row) => row.departmentCode))).toEqual(new Set(["R", "S", "P"]));
    expect(rows.some((row) => row.plannedProductionCount >= 2)).toBe(true);
  });
});
