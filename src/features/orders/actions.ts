import pg from "pg";
import { revalidatePath } from "next/cache";

import type { OrderFormInput, OrderStatus, ValidationResult } from "./types";
import { validateOrderForm } from "./validation";
import { getCurrentProfile } from "@/lib/auth/session";

type OrderMutationRow = {
  id?: string;
  status: "active";
  requested_date: string;
  channel: string;
  customer_id: string;
  contact_id: string;
  design_id: string;
  quantity: number;
  delivery_type: "single" | "split";
  received_by: string;
};

type ScheduleMutationRow = {
  scheduled_date: string;
  quantity: number;
};

type FailedMutation = ValidationResult & {
  ok: false;
};

type CreateOrderMutation =
  | FailedMutation
  | {
      ok: true;
      order: OrderMutationRow;
      schedules: ScheduleMutationRow[];
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
      design_id: input.designId,
      quantity: input.quantity,
      delivery_type: input.deliveryType,
      received_by: receivedBy,
    },
    schedules: input.schedules.map((schedule) => ({
      scheduled_date: schedule.scheduledDate,
      quantity: schedule.quantity,
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

function getDatabaseUrl() {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("SUPABASE_DB_URL is required for order mutations.");
  }

  return databaseUrl;
}

async function withDbTransaction<T>(callback: (client: pg.Client) => Promise<T>) {
  const client = new pg.Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function requireAdministrativeProfile() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "A") {
    throw new Error("사무직 사용자만 주문을 변경할 수 있습니다.");
  }

  return profile;
}

export async function createOrder(input: OrderFormInput): Promise<OrderActionResult> {
  "use server";

  const profile = await requireAdministrativeProfile();
  const mutation = buildCreateOrderMutation(input, profile.id);

  if (!mutation.ok) {
    return {
      ok: false,
      message: "입력값을 확인하세요.",
      fieldErrors: mutation.fieldErrors,
    };
  }

  try {
    await withDbTransaction(async (client) => {
      const orderResult = await client.query<{ id: string }>(
        `
          insert into public.orders
            (
              status, requested_date, channel,
              customer_id, contact_id, design_id, quantity, delivery_type,
              received_by
            )
          values
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          returning id
        `,
        [
          mutation.order.status,
          mutation.order.requested_date,
          mutation.order.channel,
          mutation.order.customer_id,
          mutation.order.contact_id,
          mutation.order.design_id,
          mutation.order.quantity,
          mutation.order.delivery_type,
          mutation.order.received_by,
        ],
      );

      const orderId = orderResult.rows[0].id;

      for (const schedule of mutation.schedules) {
        await client.query(
          `
            insert into public.delivery_schedules
              (order_id, scheduled_date, quantity)
            values ($1, $2, $3)
          `,
          [orderId, schedule.scheduled_date, schedule.quantity],
        );
      }

      await client.query(
        `
          insert into public.order_status_events
            (order_id, from_status, to_status, changed_by, note)
          values ($1, null, 'active', $2, 'created from order workspace')
        `,
        [orderId, profile.id],
      );
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "주문 저장에 실패했습니다.",
    };
  }

  revalidatePath("/orders");
  return { ok: true, message: "주문이 저장되었습니다." };
}

export async function releaseOrders(orderIds: string[]): Promise<OrderActionResult> {
  "use server";

  const profile = await requireAdministrativeProfile();
  const changedAt = new Date().toISOString();

  try {
    await withDbTransaction(async (client) => {
      for (const orderId of orderIds) {
        const current = await client.query<{ id: string; status: OrderStatus }>(
          "select id, status from public.orders where id = $1 for update",
          [orderId],
        );
        ensureActiveOrder(current.rows[0]);

        const mutation = buildReleaseOrderMutation(orderId, profile.id, changedAt);
        await client.query(
          `
            update public.orders
            set status = $2, released_at = $3, released_by = $4
            where id = $1
          `,
          [
            orderId,
            mutation.orderPatch.status,
            mutation.orderPatch.released_at,
            mutation.orderPatch.released_by,
          ],
        );
        await client.query(
          `
            insert into public.order_status_events
              (order_id, from_status, to_status, changed_by, note)
            values ($1, $2, $3, $4, $5)
          `,
          [
            mutation.event.order_id,
            mutation.event.from_status,
            mutation.event.to_status,
            mutation.event.changed_by,
            mutation.event.note,
          ],
        );
      }
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "생산팀 전달에 실패했습니다.",
    };
  }

  revalidatePath("/orders");
  return { ok: true, message: `${orderIds.length}건을 생산팀에 전달했습니다.` };
}

export async function cancelOrders(orderIds: string[]): Promise<OrderActionResult> {
  "use server";

  const profile = await requireAdministrativeProfile();
  const changedAt = new Date().toISOString();

  try {
    await withDbTransaction(async (client) => {
      for (const orderId of orderIds) {
        const current = await client.query<{ id: string; status: OrderStatus }>(
          "select id, status from public.orders where id = $1 for update",
          [orderId],
        );
        ensureActiveOrder(current.rows[0]);

        const mutation = buildCancelOrderMutation(orderId, profile.id, changedAt);
        await client.query(
          `
            update public.orders
            set status = $2, cancelled_at = $3, cancelled_by = $4
            where id = $1
          `,
          [
            orderId,
            mutation.orderPatch.status,
            mutation.orderPatch.cancelled_at,
            mutation.orderPatch.cancelled_by,
          ],
        );
        await client.query(
          `
            insert into public.order_status_events
              (order_id, from_status, to_status, changed_by, note)
            values ($1, $2, $3, $4, $5)
          `,
          [
            mutation.event.order_id,
            mutation.event.from_status,
            mutation.event.to_status,
            mutation.event.changed_by,
            mutation.event.note,
          ],
        );
      }
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "주문 취소에 실패했습니다.",
    };
  }

  revalidatePath("/orders");
  return { ok: true, message: `${orderIds.length}건을 취소했습니다.` };
}
