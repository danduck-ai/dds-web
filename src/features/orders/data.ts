import type {
  DepartmentCode,
  OrderProductRecord,
  OrderRecord,
  OrderStatus,
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
  received_by: string;
  created_at: string;
  completed_at: string | null;
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

type MockData = {
  customers: MockCustomerRow[];
  contacts: MockContactRow[];
  designs: MockDesignRow[];
  orders: MockOrderRow[];
  order_products: MockOrderProductRow[];
  shipment_plans: MockShipmentPlanRow[];
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

function mapShipmentPlanRow(row: MockShipmentPlanRow): ShipmentPlanRecord {
  return {
    id: row.id,
    plannedShipDate: row.planned_ship_date,
    quantity: row.quantity,
    status: asShipmentStatus(row.status),
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
  return dssData.order_products
    .filter((product) => product.order_id === order.id)
    .map((product) =>
      mapOrderProductRow(product, designById.get(product.design_id), shipmentPlansByProductId.get(product.id) ?? []),
    );
}

function listMockOrders(filterOrder: (order: MockOrderRow) => boolean) {
  const customerById = new Map(dssData.customers.map((customer) => [customer.id, customer]));
  const contactById = new Map(dssData.contacts.map((contact) => [contact.id, contact]));
  const designById = new Map(dssData.designs.map((design) => [design.id, design]));
  const shipmentPlansByProductId = new Map<string, ShipmentPlanRecord[]>();

  for (const plan of dssData.shipment_plans) {
    const current = shipmentPlansByProductId.get(plan.order_product_id) ?? [];
    current.push(mapShipmentPlanRow(plan));
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
