import type { OrderFormInput, OrderStatus, ValidationResult } from "./types";
import { validateOrderForm } from "./validation";

type OrderMutationRow = {
  id?: string;
  status: "active";
  requested_date: string;
  channel: string;
  customer_id: string;
  contact_id: string;
  received_by: string;
};

type ProductionPlanMutationRow = {
  quantity: null;
  completed_quantity: 0;
  estimated_duration_minutes: null;
  duration_source: null;
  work_status: "unscheduled";
};

type ShipmentPlanMutationRow = {
  planned_ship_date: string;
  quantity: number;
  production_plan: ProductionPlanMutationRow;
};

type OrderProductMutationRow = {
  design_id: string;
  quantity: number;
  shipment_plans: ShipmentPlanMutationRow[];
};

type FailedMutation = ValidationResult & {
  ok: false;
};

type CreateOrderMutation =
  | FailedMutation
  | {
      ok: true;
      order: OrderMutationRow;
      orderProducts: OrderProductMutationRow[];
      fieldErrors?: never;
    };

export type OrderActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: ValidationResult["fieldErrors"];
};

export function normalizeChannel(input: OrderFormInput) {
  if (input.channel === "기타") {
    return `기타: ${input.customChannel?.trim() ?? ""}`;
  }

  return input.channel;
}

export function buildCreateOrderMutation(
  input: OrderFormInput,
  receivedBy: string,
): CreateOrderMutation {
  const validation = validateOrderForm(input);

  if (!validation.ok) {
    return { ...validation, ok: false };
  }

  return {
    ok: true,
    order: {
      status: "active",
      requested_date: input.requestedDate,
      channel: normalizeChannel(input),
      customer_id: input.customerId,
      contact_id: input.contactId,
      received_by: receivedBy,
    },
    orderProducts: input.products.map((product) => ({
      design_id: product.designId,
      quantity: product.quantity,
      shipment_plans: product.shipmentPlans.map((plan) => ({
        planned_ship_date: plan.plannedShipDate,
        quantity: plan.quantity,
        production_plan: {
          quantity: null,
          completed_quantity: 0,
          estimated_duration_minutes: null,
          duration_source: null,
          work_status: "unscheduled",
        },
      })),
    })),
  };
}

export function ensureActiveOrder(order: { id: string; status: OrderStatus }) {
  if (order.status !== "active") {
    throw new Error("접수 상태 주문만 변경할 수 있습니다.");
  }
}

export function buildReleaseOrderMutation(orderId: string, changedBy: string, changedAt: string) {
  return {
    orderPatch: {
      status: "released" as const,
      released_at: changedAt,
      released_by: changedBy,
    },
    event: {
      order_id: orderId,
      from_status: "active" as const,
      to_status: "released" as const,
      changed_by: changedBy,
      note: "released to production",
    },
  };
}

export function buildCancelOrderMutation(orderId: string, changedBy: string, changedAt: string) {
  return {
    orderPatch: {
      status: "cancelled" as const,
      cancelled_at: changedAt,
      cancelled_by: changedBy,
    },
    event: {
      order_id: orderId,
      from_status: "active" as const,
      to_status: "cancelled" as const,
      changed_by: changedBy,
      note: "cancelled from order workspace",
    },
  };
}
