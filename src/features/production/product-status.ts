import type { DepartmentCode } from "@/features/orders/types";
import type { DailyProductionPlanStatus, DailyProductionSeed, DailyProductionSeedItem } from "./types";

export type ProductProductionPlanRow = {
  id: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  quantity: number;
  planningStatus: DailyProductionPlanStatus;
  sequence: number;
};

export type ProductProductionStatusRow = {
  id: string;
  orderProductId: string;
  orderId: string;
  orderNo: string;
  orderRequestedDate: string;
  orderProductCount: number;
  customerName: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  orderQuantity: number;
  defaultUnitsPerHour: number;
  plannedQuantity: number;
  remainingPlanQuantity: number;
  productionPlans: ProductProductionPlanRow[];
};

export type OrderProductionStatusRow = {
  id: string;
  orderId: string;
  orderNo: string;
  requestedDate: string;
  customerName: string;
  productCount: number;
  products: ProductProductionStatusRow[];
};

export type DailyProductionStatusRow = {
  id: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  plannedProductionCount: number;
};

const departmentSortOrder: Record<DepartmentCode, number> = {
  R: 0,
  S: 1,
  P: 2,
};

function sumQuantity(items: DailyProductionSeedItem[], getValue: (item: DailyProductionSeedItem) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

function toPlanRow(item: DailyProductionSeedItem): ProductProductionPlanRow {
  return {
    id: item.id,
    productionDate: item.productionDate,
    departmentCode: item.departmentCode,
    quantity: item.quantity,
    planningStatus: item.planningStatus,
    sequence: item.sequence,
  };
}

export function createDailyProductionRows(seed: DailyProductionSeed): DailyProductionStatusRow[] {
  const rowsByPlan = new Map<string, DailyProductionStatusRow>();

  for (const item of seed.dayPlanItems) {
    if (item.planningStatus === "cancelled") {
      continue;
    }

    const key = `${item.productionDate}-${item.departmentCode}`;
    const current = rowsByPlan.get(key);

    if (current) {
      current.plannedProductionCount += 1;
      continue;
    }

    rowsByPlan.set(key, {
      id: `day-${item.departmentCode}-${item.productionDate}`,
      productionDate: item.productionDate,
      departmentCode: item.departmentCode,
      plannedProductionCount: 1,
    });
  }

  return [...rowsByPlan.values()].sort(
    (left, right) =>
      right.productionDate.localeCompare(left.productionDate) ||
      departmentSortOrder[left.departmentCode] - departmentSortOrder[right.departmentCode],
  );
}

export function createProductProductionRows(seed: DailyProductionSeed): ProductProductionStatusRow[] {
  return seed.candidates
    .map((candidate) => {
      const productItems = seed.dayPlanItems.filter((item) => item.orderProductId === candidate.orderProductId);
      const activeItems = productItems.filter((item) => item.planningStatus !== "cancelled");
      const plannedQuantity = sumQuantity(activeItems, (item) => item.quantity);

      return {
        id: candidate.orderProductId,
        orderProductId: candidate.orderProductId,
        orderId: candidate.orderId,
        orderNo: candidate.orderNo,
        orderRequestedDate: candidate.orderRequestedDate,
        orderProductCount: candidate.orderProductCount,
        customerName: candidate.customerName,
        designNo: candidate.designNo,
        productName: candidate.productName,
        specification: candidate.specification,
        departmentCode: candidate.departmentCode,
        orderQuantity: candidate.orderQuantity,
        defaultUnitsPerHour: candidate.defaultUnitsPerHour,
        plannedQuantity,
        remainingPlanQuantity: Math.max(0, candidate.orderQuantity - plannedQuantity),
        productionPlans: activeItems
          .map(toPlanRow)
          .sort(
            (left, right) =>
              left.productionDate.localeCompare(right.productionDate) ||
              left.sequence - right.sequence ||
              left.id.localeCompare(right.id),
          ),
      };
    })
    .sort(
      (left, right) =>
        left.customerName.localeCompare(right.customerName, "ko-KR") ||
        left.productName.localeCompare(right.productName, "ko-KR") ||
        left.orderNo.localeCompare(right.orderNo),
    );
}

export function createOrderProductionRows(seed: DailyProductionSeed): OrderProductionStatusRow[] {
  const productRows = createProductProductionRows(seed);
  const rowsByOrderId = new Map<string, OrderProductionStatusRow>();

  for (const productRow of productRows) {
    const orderRow = rowsByOrderId.get(productRow.orderId);

    if (orderRow) {
      orderRow.products.push(productRow);
      orderRow.productCount = Math.max(orderRow.productCount, productRow.orderProductCount);
      continue;
    }

    rowsByOrderId.set(productRow.orderId, {
      id: productRow.orderId,
      orderId: productRow.orderId,
      orderNo: productRow.orderNo,
      requestedDate: productRow.orderRequestedDate,
      customerName: productRow.customerName,
      productCount: productRow.orderProductCount,
      products: [productRow],
    });
  }

  return [...rowsByOrderId.values()]
    .map((orderRow) => ({
      ...orderRow,
      products: [...orderRow.products].sort(
        (left, right) =>
          left.productName.localeCompare(right.productName, "ko-KR") ||
          left.orderProductId.localeCompare(right.orderProductId),
      ),
    }))
    .sort(
      (left, right) =>
        right.requestedDate.localeCompare(left.requestedDate) ||
        left.orderNo.localeCompare(right.orderNo),
    );
}
