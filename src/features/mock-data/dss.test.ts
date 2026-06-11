import { describe, expect, test } from "vitest";

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

  test("provides a target-model multi-product order with production drafts per shipment plan", () => {
    const orderProducts = mockData.order_products.filter(
      (product) => product.order_id === "40000000-0000-4000-8000-000000000002",
    );
    const shipmentPlans = mockData.shipment_plans.filter(
      (plan) => plan.order_id === "40000000-0000-4000-8000-000000000002",
    );

    expect(orderProducts).toHaveLength(2);
    expect(shipmentPlans.reduce((sum, plan) => sum + plan.quantity, 0)).toBe(900);

    for (const shipmentPlan of shipmentPlans) {
      const drafts = mockData.production_plans.filter((plan) => plan.shipment_plan_id === shipmentPlan.id);

      expect(drafts).toHaveLength(1);
      expect(drafts[0]).toMatchObject({
        quantity: null,
        completed_quantity: 0,
        estimated_duration_minutes: null,
        duration_source: null,
        work_status: "unscheduled",
      });
    }
  });
});
