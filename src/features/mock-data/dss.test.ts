import { describe, expect, test } from "vitest";

import { listOrderStatusRows } from "@/features/orders/data";
import { listDailyProductionSeed } from "@/features/production/daily-seed";
import { createDailyProductionPlanningCards } from "@/features/production/daily-planning";
import { createDailyProductionRows } from "@/features/production/product-status";
import mockData from "./dss.json";

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

    expect(mockData.orders.filter((order) => order.status === "active")).toHaveLength(5);
    expect(mockData.orders.filter((order) => order.status === "released")).toHaveLength(4);
    expect(mockData.orders.filter((order) => order.status === "completed")).toHaveLength(4);
    expect(mockData.orders.filter((order) => order.status === "cancelled")).toHaveLength(2);
    expect(mockData.orders.every((order) => /^O-[A-Z0-9]+-\d{11}$/.test(order.order_no))).toBe(true);
    expect(mockData.orders.filter((order) => order.delivery_type === "split").length).toBeGreaterThanOrEqual(5);
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

  test("keeps order schedules consistent with order quantities", () => {
    for (const order of mockData.orders) {
      const schedules = mockData.delivery_schedules.filter((schedule) => schedule.order_id === order.id);
      const scheduledQuantity = schedules.reduce((sum, schedule) => sum + schedule.quantity, 0);

      expect(schedules.length, `${order.order_no} should have delivery schedules`).toBeGreaterThan(0);
      expect(scheduledQuantity, `${order.order_no} schedule total`).toBe(order.quantity);

      if (order.delivery_type === "single") {
        expect(schedules, `${order.order_no} single delivery schedule`).toHaveLength(1);
      } else {
        expect(schedules.length, `${order.order_no} split delivery schedules`).toBeGreaterThanOrEqual(2);
      }
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
    expect(pCards.some((card) => card.workStatus === "producing" && card.quantity !== null)).toBe(true);
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
