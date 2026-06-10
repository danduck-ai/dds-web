import type { DeliveryType, OrderRecord, OrderStatus } from "./types";
import { createOrderListRow } from "./view-model";
import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  order_no: string;
  status: OrderStatus;
  requested_date: string;
  channel: string;
  quantity: number;
  delivery_type: DeliveryType;
  created_at: string;
  customers: { name: string } | null;
  customer_contacts: { name: string } | null;
  designs: {
    design_no: string;
    product_name: string;
    specification: string;
    department_code: "R" | "S" | "P";
  } | null;
  delivery_schedules: Array<{
    scheduled_date: string;
    quantity: number;
  }>;
};

export function mapOrderRow(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    orderNo: row.order_no,
    status: row.status,
    requestedDate: row.requested_date,
    channel: row.channel,
    customerName: row.customers?.name ?? "-",
    contactName: row.customer_contacts?.name ?? "-",
    designNo: row.designs?.design_no ?? "-",
    productName: row.designs?.product_name ?? "-",
    specification: row.designs?.specification ?? "-",
    departmentCode: row.designs?.department_code ?? "R",
    quantity: row.quantity,
    deliveryType: row.delivery_type,
    schedules: row.delivery_schedules.map((schedule) => ({
      scheduledDate: schedule.scheduled_date,
      quantity: schedule.quantity,
    })),
    createdAt: row.created_at,
  };
}

export async function listOrders(status: OrderStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_no,
        status,
        requested_date,
        channel,
        quantity,
        delivery_type,
        created_at,
        customers ( name ),
        customer_contacts ( name ),
        designs ( design_no, product_name, specification, department_code ),
        delivery_schedules ( scheduled_date, quantity )
      `,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapOrderRow).map(createOrderListRow);
}
