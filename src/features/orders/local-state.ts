import type { ContactOption, DesignOption } from "@/features/reference/data";

import type {
  OrderFormInput,
  OrderListRow,
  OrderProductInput,
  OrderProductRecord,
  OrderRecord,
  OrderStatus,
  ShipmentPlanInput,
  ShipmentPlanRecord,
} from "./types";
import { validateOrderForm } from "./validation";
import { createOrderListRow } from "./view-model";

export type LocalOrderActionResult = {
  ok: false;
  message: string;
  fieldErrors?: Partial<Record<keyof OrderFormInput | "products", string>>;
};

type SuccessfulLocalOrderAction = {
  ok: true;
  message: string;
  order: OrderListRow;
};

type SuccessfulLocalOrderBatchAction = {
  ok: true;
  message: string;
  orders: OrderListRow[];
};

type LookupContext = {
  contactOptions: ContactOption[];
  designOptions: DesignOption[];
};

function splitContactLabel(label: string) {
  const [customerName, ...contactParts] = label.split(" / ");

  return {
    customerName: customerName || "-",
    contactName: contactParts.join(" / ") || "-",
  };
}

function createFailure(
  message: string,
  fieldErrors?: LocalOrderActionResult["fieldErrors"],
): LocalOrderActionResult {
  return { ok: false, message, fieldErrors };
}

function normalizeChannel(input: OrderFormInput) {
  if (input.channel === "기타") {
    return `기타: ${input.customChannel?.trim() ?? ""}`;
  }

  return input.channel;
}

function nextOrderIdentity(orders: OrderListRow[], customerTicker: string) {
  const now = new Date();
  const orderDate = now.toISOString().slice(2, 10).replaceAll("-", "");
  const prefix = `O-${customerTicker}-${orderDate}`;
  const sequence = orders
    .filter((order) => order.orderNo.startsWith(prefix))
    .reduce((max, order) => {
      const value = Number.parseInt(order.orderNo.slice(-5), 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

  return {
    id: `mock-order-${customerTicker}-${orderDate}-${String(sequence + 1).padStart(5, "0")}`,
    orderNo: `${prefix}${String(sequence + 1).padStart(5, "0")}`,
    createdAt: now.toISOString(),
  };
}

function createProductionDraft(shipmentPlanId: string) {
  return {
    id: `${shipmentPlanId}-production-draft`,
    shipmentPlanId,
    quantity: null,
    completedQuantity: 0,
    estimatedDurationMinutes: null,
    durationSource: null,
    workStatus: "unscheduled" as const,
  };
}

function buildShipmentPlanRecord({
  plan,
  existingPlan,
  productId,
  productIndex,
  planIndex,
}: {
  plan: ShipmentPlanInput;
  existingPlan?: ShipmentPlanRecord;
  productId: string;
  productIndex: number;
  planIndex: number;
}): ShipmentPlanRecord {
  const id = existingPlan?.id ?? `${productId}-shipment-${productIndex + 1}-${planIndex + 1}`;

  return {
    id,
    plannedShipDate: plan.plannedShipDate,
    quantity: plan.quantity,
    status: existingPlan?.status ?? "ready",
    productionPlans: existingPlan?.productionPlans ?? [createProductionDraft(id)],
  };
}

function buildProductRecord({
  product,
  productIndex,
  design,
  existingProduct,
}: {
  product: OrderProductInput;
  productIndex: number;
  design: DesignOption;
  existingProduct?: OrderProductRecord;
}): OrderProductRecord {
  const id = existingProduct?.id ?? `local-product-${productIndex + 1}-${design.value}`;

  return {
    id,
    designId: design.value,
    designNo: design.designNo,
    productName: design.productName,
    specification: design.specification,
    departmentCode: design.departmentCode,
    defaultUnitsPerHour: design.defaultUnitsPerHour,
    quantity: product.quantity,
    shipmentPlans: product.shipmentPlans.map((plan, planIndex) =>
      buildShipmentPlanRecord({
        plan,
        existingPlan: existingProduct?.shipmentPlans[planIndex],
        productId: id,
        productIndex,
        planIndex,
      }),
    ),
  };
}

function buildOrderRecord({
  input,
  contactOptions,
  designOptions,
  existingOrder,
  identity,
}: LookupContext & {
  input: OrderFormInput;
  existingOrder?: OrderListRow;
  identity: Pick<OrderRecord, "id" | "orderNo" | "createdAt">;
}): LocalOrderActionResult | SuccessfulLocalOrderAction {
  const contact = contactOptions.find(
    (option) => option.customerId === input.customerId && option.contactId === input.contactId,
  );

  if (!contact) {
    return createFailure("고객사와 담당자를 선택하세요.", {
      customerId: "고객사와 담당자를 선택하세요.",
    });
  }

  const products: OrderProductRecord[] = [];

  for (const [productIndex, product] of input.products.entries()) {
    const design = designOptions.find((option) => option.value === product.designId);

    if (!design) {
      return createFailure("제품/설계를 선택하세요.", {
        products: `제품 ${productIndex + 1}: 제품/설계를 선택하세요.`,
      });
    }

    products.push(
      buildProductRecord({
        product,
        productIndex,
        design,
        existingProduct: existingOrder?.products[productIndex],
      }),
    );
  }

  const { customerName, contactName } = splitContactLabel(contact.label);
  const record: OrderRecord = {
    id: identity.id,
    orderNo: identity.orderNo,
    status: existingOrder?.status ?? "active",
    requestedDate: input.requestedDate,
    channel: normalizeChannel(input),
    customerName,
    contactName,
    products,
    createdAt: identity.createdAt,
    completedAt: existingOrder?.completedAt ?? null,
  };

  return {
    ok: true,
    message: existingOrder ? "주문이 수정되었습니다." : "주문이 저장되었습니다.",
    order: createOrderListRow(record),
  };
}

export function createLocalOrder(
  input: OrderFormInput,
  orders: OrderListRow[],
  lookups: LookupContext,
): LocalOrderActionResult | SuccessfulLocalOrderAction {
  const validation = validateOrderForm(input);

  if (!validation.ok) {
    return {
      ok: false,
      message: "입력값을 확인하세요.",
      fieldErrors: validation.fieldErrors,
    };
  }

  return buildOrderRecord({
    input,
    ...lookups,
    identity: nextOrderIdentity(
      orders,
      lookups.contactOptions.find(
        (option) => option.customerId === input.customerId && option.contactId === input.contactId,
      )?.customerTicker ?? "CUSTOMER",
    ),
  });
}

export function updateLocalOrder(
  order: OrderListRow,
  input: OrderFormInput,
  lookups: LookupContext,
): LocalOrderActionResult | SuccessfulLocalOrderAction {
  if (order.status !== "active") {
    return createFailure("접수 상태 주문만 변경할 수 있습니다.");
  }

  const validation = validateOrderForm(input);

  if (!validation.ok) {
    return {
      ok: false,
      message: "입력값을 확인하세요.",
      fieldErrors: validation.fieldErrors,
    };
  }

  return buildOrderRecord({
    input,
    ...lookups,
    existingOrder: order,
    identity: {
      id: order.id,
      orderNo: order.orderNo,
      createdAt: order.createdAt,
    },
  });
}

function moveLocalOrders(
  orders: OrderListRow[],
  orderIds: string[],
  nextStatus: Extract<OrderStatus, "released" | "cancelled">,
): LocalOrderActionResult | SuccessfulLocalOrderBatchAction {
  const selectedIds = new Set(orderIds);
  const selectedOrders = orders.filter((order) => selectedIds.has(order.id));

  if (selectedOrders.length !== orderIds.length) {
    return createFailure("선택한 주문을 찾을 수 없습니다.");
  }

  if (selectedOrders.some((order) => order.status !== "active")) {
    return createFailure("접수 상태 주문만 변경할 수 있습니다.");
  }

  const nextOrders = orders.map((order) =>
    selectedIds.has(order.id) ? createOrderListRow({ ...order, status: nextStatus }) : order,
  );

  return {
    ok: true,
    message:
      nextStatus === "released"
        ? `${orderIds.length}건을 생산팀에 전달했습니다.`
        : `${orderIds.length}건을 취소했습니다.`,
    orders: nextOrders,
  };
}

export function releaseLocalOrders(orders: OrderListRow[], orderIds: string[]) {
  return moveLocalOrders(orders, orderIds, "released");
}

export function cancelLocalOrders(orders: OrderListRow[], orderIds: string[]) {
  return moveLocalOrders(orders, orderIds, "cancelled");
}
