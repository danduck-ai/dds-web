import type {
  DepartmentCode,
  OrderProductRecord,
  OrderRecord,
  OrderStatus,
  ProductionDurationSource,
  ProductionPlanRecord,
  ProductionWorkStatus,
  ShipmentPlanRecord,
  ShipmentStatus,
} from "./types";
import { createOrderListRow } from "./view-model";
import mockData from "@/features/mock-data/dss.json";

type MockCustomerRow = {
  id: string;
  name: string;
  identifier: string | null;
  ticker?: string | null;
};

type MockContactRow = {
  id: string;
  name: string;
};

type MockDesignRow = {
  id: string;
  design_no: string;
  product_name: string;
  specification: string;
  department_code: string;
  default_units_per_hour?: number;
};

type MockOrderRow = {
  id: string;
  order_no: string;
  status: string;
  requested_date: string;
  channel: string;
  customer_id: string;
  contact_id: string;
  design_id: string;
  quantity: number;
  received_by: string;
  created_at: string;
  completed_at: string | null;
};

type MockDeliveryScheduleRow = {
  id: string;
  order_id: string;
  scheduled_date: string;
  quantity: number;
};

type MockOrderProductRow = {
  id: string;
  order_id: string;
  design_id: string;
  quantity: number;
  design_no_snapshot?: string;
  product_name_snapshot?: string;
  specification_snapshot?: string;
  department_code_snapshot?: string;
  default_units_per_hour_snapshot?: number;
};

type MockShipmentPlanRow = {
  id: string;
  order_id: string;
  order_product_id: string;
  planned_ship_date: string;
  quantity: number;
  status: string;
};

type MockProductionPlanRow = {
  id: string;
  shipment_plan_id: string;
  quantity: number | null;
  completed_quantity: number;
  estimated_duration_minutes: number | null;
  duration_source: string | null;
  work_status: string;
};

type MockData = {
  customers: MockCustomerRow[];
  contacts: MockContactRow[];
  designs: MockDesignRow[];
  orders: MockOrderRow[];
  delivery_schedules: MockDeliveryScheduleRow[];
  order_products?: MockOrderProductRow[];
  shipment_plans?: MockShipmentPlanRow[];
  production_plans?: MockProductionPlanRow[];
};

const dssData = mockData as unknown as MockData;
const orderCodePattern = /^O-[A-Z0-9]+-\d{11}$/;

function isOrderStatus(value: string): value is OrderStatus {
  return value === "active" || value === "released" || value === "completed" || value === "cancelled";
}

function asDepartmentCode(value: string | undefined): DepartmentCode {
  return value === "S" || value === "P" ? value : "R";
}

function asShipmentStatus(value: string | undefined): ShipmentStatus {
  return value === "partial" || value === "completed" || value === "stopped" ? value : "ready";
}

function asProductionDurationSource(value: string | null): ProductionDurationSource | null {
  return value === "product_default" || value === "manual_override" ? value : null;
}

function asProductionWorkStatus(value: string | undefined): ProductionWorkStatus {
  if (value === "scheduled" || value === "producing" || value === "completed") {
    return value;
  }

  return "unscheduled";
}

function fallbackCustomerTicker(customer: MockCustomerRow | undefined) {
  const source = customer?.ticker || customer?.identifier || customer?.name || "CUSTOMER";
  const ticker = source.replace(/[^a-z0-9]/gi, "").toUpperCase();

  return ticker || "CUSTOMER";
}

function deriveOrderCode(order: MockOrderRow, customer: MockCustomerRow | undefined) {
  if (orderCodePattern.test(order.order_no)) {
    return order.order_no;
  }

  const datePart = order.order_no.match(/^(\d{6})-/)?.[1] ?? order.requested_date.replaceAll("-", "").slice(2);
  const sequencePart = order.order_no.match(/-(\d+)$/)?.[1] ?? "1";

  return `O-${fallbackCustomerTicker(customer)}-${datePart}${sequencePart.padStart(5, "0").slice(-5)}`;
}

function mapProductionPlanRow(row: MockProductionPlanRow): ProductionPlanRecord {
  return {
    id: row.id,
    shipmentPlanId: row.shipment_plan_id,
    quantity: row.quantity,
    completedQuantity: row.completed_quantity,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    durationSource: asProductionDurationSource(row.duration_source),
    workStatus: asProductionWorkStatus(row.work_status),
  };
}

function createDraftProductionPlan(shipmentPlanId: string): ProductionPlanRecord {
  return {
    id: `${shipmentPlanId}-production-draft`,
    shipmentPlanId,
    quantity: null,
    completedQuantity: 0,
    estimatedDurationMinutes: null,
    durationSource: null,
    workStatus: "unscheduled",
  };
}

function mapShipmentPlanRow(
  row: MockShipmentPlanRow,
  productionPlansByShipmentId: Map<string, ProductionPlanRecord[]>,
): ShipmentPlanRecord {
  const productionPlans = productionPlansByShipmentId.get(row.id) ?? [createDraftProductionPlan(row.id)];

  return {
    id: row.id,
    plannedShipDate: row.planned_ship_date,
    quantity: row.quantity,
    status: asShipmentStatus(row.status),
    productionPlans,
  };
}

function createFallbackShipmentPlan(schedule: MockDeliveryScheduleRow): ShipmentPlanRecord {
  const id = `shipment-${schedule.id}`;

  return {
    id,
    plannedShipDate: schedule.scheduled_date,
    quantity: schedule.quantity,
    status: "ready",
    productionPlans: [createDraftProductionPlan(id)],
  };
}

function mapOrderProductRow(
  row: MockOrderProductRow,
  design: MockDesignRow | undefined,
  shipmentPlans: ShipmentPlanRecord[],
): OrderProductRecord {
  return {
    id: row.id,
    designId: row.design_id,
    designNo: row.design_no_snapshot ?? design?.design_no ?? "-",
    productName: row.product_name_snapshot ?? design?.product_name ?? "-",
    specification: row.specification_snapshot ?? design?.specification ?? "-",
    departmentCode: asDepartmentCode(row.department_code_snapshot ?? design?.department_code),
    defaultUnitsPerHour: row.default_units_per_hour_snapshot ?? design?.default_units_per_hour ?? 60,
    quantity: row.quantity,
    shipmentPlans,
  };
}

function createFallbackOrderProduct(
  order: MockOrderRow,
  design: MockDesignRow | undefined,
  shipmentPlans: ShipmentPlanRecord[],
): OrderProductRecord {
  return {
    id: `product-${order.id}`,
    designId: order.design_id,
    designNo: design?.design_no ?? "-",
    productName: design?.product_name ?? "-",
    specification: design?.specification ?? "-",
    departmentCode: asDepartmentCode(design?.department_code),
    defaultUnitsPerHour: design?.default_units_per_hour ?? 60,
    quantity: order.quantity,
    shipmentPlans,
  };
}

export function mapOrderRow(
  row: MockOrderRow,
  context: {
    customer: MockCustomerRow | undefined;
    contact: MockContactRow | undefined;
    products: OrderProductRecord[];
  },
): OrderRecord {
  return {
    id: row.id,
    orderNo: deriveOrderCode(row, context.customer),
    status: row.status as OrderStatus,
    requestedDate: row.requested_date,
    channel: row.channel,
    customerName: context.customer?.name ?? "-",
    contactName: context.contact?.name ?? "-",
    products: context.products,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function buildOrderProducts(
  order: MockOrderRow,
  designById: Map<string, MockDesignRow>,
  shipmentPlansByProductId: Map<string, ShipmentPlanRecord[]>,
) {
  const targetProducts = (dssData.order_products ?? []).filter((product) => product.order_id === order.id);

  if (targetProducts.length > 0) {
    return targetProducts.map((product) =>
      mapOrderProductRow(product, designById.get(product.design_id), shipmentPlansByProductId.get(product.id) ?? []),
    );
  }

  const fallbackShipmentPlans = dssData.delivery_schedules
    .filter((schedule) => schedule.order_id === order.id)
    .map(createFallbackShipmentPlan);

  return [createFallbackOrderProduct(order, designById.get(order.design_id), fallbackShipmentPlans)];
}

function listMockOrders(filterOrder: (order: MockOrderRow) => boolean) {
  const customerById = new Map(dssData.customers.map((customer) => [customer.id, customer]));
  const contactById = new Map(dssData.contacts.map((contact) => [contact.id, contact]));
  const designById = new Map(dssData.designs.map((design) => [design.id, design]));
  const productionPlansByShipmentId = new Map<string, ProductionPlanRecord[]>();

  for (const plan of dssData.production_plans ?? []) {
    const current = productionPlansByShipmentId.get(plan.shipment_plan_id) ?? [];
    current.push(mapProductionPlanRow(plan));
    productionPlansByShipmentId.set(plan.shipment_plan_id, current);
  }

  const shipmentPlansByProductId = new Map<string, ShipmentPlanRecord[]>();

  for (const plan of dssData.shipment_plans ?? []) {
    const current = shipmentPlansByProductId.get(plan.order_product_id) ?? [];
    current.push(mapShipmentPlanRow(plan, productionPlansByShipmentId));
    shipmentPlansByProductId.set(plan.order_product_id, current);
  }

  return dssData.orders
    .filter((order) => isOrderStatus(order.status) && filterOrder(order))
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((order) =>
      mapOrderRow(order, {
        customer: customerById.get(order.customer_id),
        contact: contactById.get(order.contact_id),
        products: buildOrderProducts(order, designById, shipmentPlansByProductId),
      }),
    )
    .map(createOrderListRow);
}

export async function listOrders(status: OrderStatus) {
  return listMockOrders((order) => order.status === status);
}

export async function listOrderStatusRows() {
  return listMockOrders((order) => order.status !== "cancelled");
}
