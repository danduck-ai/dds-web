import type { OrderListRow, OrderRecord, OrderStatus } from "./types";

const statusLabels: Record<OrderStatus, string> = {
  active: "접수",
  released: "생산중",
  completed: "출하 완료",
  cancelled: "삭제됨",
};

export function getStatusLabel(status: OrderStatus) {
  return statusLabels[status];
}

function formatMonthDay(date: string) {
  const [, month, day] = date.split("-");
  if (!month || !day) {
    return date;
  }

  return `${month}/${day}`;
}

export function createOrderListRow(order: OrderRecord): OrderListRow {
  const deliveryLabel =
    order.deliveryType === "split"
      ? "분할"
      : formatMonthDay(order.schedules[0]?.scheduledDate ?? "");

  return {
    ...order,
    deliveryLabel,
    statusLabel: getStatusLabel(order.status),
    searchText: [
      order.orderNo,
      order.customerName,
      order.contactName,
      order.designNo,
      order.productName,
      order.specification,
      order.departmentCode,
    ]
      .join(" ")
      .toLowerCase(),
  };
}
