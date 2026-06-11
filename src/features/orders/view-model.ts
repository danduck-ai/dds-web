import type { OrderListRow, OrderRecord, OrderStatus } from "./types";

const statusLabels: Record<OrderStatus, string> = {
  active: "접수",
  released: "생산팀 전달",
  completed: "출하 완료",
  cancelled: "취소",
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
  const totalQuantity = order.products.reduce((sum, product) => sum + product.quantity, 0);
  const firstProduct = order.products[0];
  const productSummary = firstProduct
    ? `${firstProduct.designNo} ${firstProduct.productName}${order.products.length > 1 ? ` 외 ${order.products.length - 1}` : ""}`
    : "-";
  const shipmentPlans = order.products.flatMap((product) => product.shipmentPlans);
  const shipmentLabel =
    shipmentPlans.length === 1
      ? formatMonthDay(shipmentPlans[0]?.plannedShipDate ?? "")
      : `출하계획 ${shipmentPlans.length}건`;

  return {
    ...order,
    productSummary,
    shipmentLabel,
    totalQuantity,
    statusLabel: getStatusLabel(order.status),
    searchText: [
      order.orderNo,
      order.customerName,
      order.contactName,
      productSummary,
      ...order.products.flatMap((product) => [
        product.designNo,
        product.productName,
        product.specification,
        product.departmentCode,
      ]),
    ]
      .join(" ")
      .toLowerCase(),
  };
}
