import type { OrderFormInput, OrderProductInput, OrderStatus, ValidationResult } from "./types";

const REQUIRED_MESSAGE = "필수 항목을 입력하세요.";

function addError(
  result: ValidationResult,
  field: keyof ValidationResult["fieldErrors"],
  message: string,
) {
  result.fieldErrors[field] = message;
  result.summary.push(message);
}

function isPresent(value: string | undefined) {
  return Boolean(value?.trim());
}

function validateProduct(
  result: ValidationResult,
  product: OrderProductInput,
  productIndex: number,
) {
  const productLabel = `제품 ${productIndex + 1}`;

  if (!isPresent(product.designId)) {
    addError(result, "products", `${productLabel}: 제품/설계를 선택하세요.`);
  }

  if (!Number.isInteger(product.quantity) || product.quantity <= 0) {
    addError(result, "products", `${productLabel}: 제품 수량은 1 이상이어야 합니다.`);
  }

  if (product.shipmentPlans.length === 0) {
    addError(result, "products", `${productLabel}: 출하계획을 1건 이상 입력하세요.`);
    return;
  }

  const hasInvalidShipmentPlan = product.shipmentPlans.some(
    (plan) =>
      !isPresent(plan.plannedShipDate) ||
      !Number.isInteger(plan.quantity) ||
      plan.quantity <= 0,
  );

  if (hasInvalidShipmentPlan) {
    addError(result, "products", `${productLabel}: 모든 출하계획 행의 출하일과 수량을 입력하세요.`);
  }

  const shipmentTotal = product.shipmentPlans.reduce(
    (sum, plan) => sum + (Number.isFinite(plan.quantity) ? plan.quantity : 0),
    0,
  );

  if (product.quantity > 0 && shipmentTotal !== product.quantity) {
    addError(
      result,
      "products",
      `${productLabel}: 출하계획 수량 합계 ${shipmentTotal.toLocaleString("ko-KR")}개가 제품 수량 ${product.quantity.toLocaleString("ko-KR")}개와 일치해야 합니다.`,
    );
  }
}

export function validateOrderForm(input: OrderFormInput): ValidationResult {
  const result: ValidationResult = {
    ok: true,
    fieldErrors: {},
    summary: [],
  };

  if (!isPresent(input.requestedDate)) {
    addError(result, "requestedDate", `주문 요청일: ${REQUIRED_MESSAGE}`);
  }

  if (!isPresent(input.channel)) {
    addError(result, "channel", `채널: ${REQUIRED_MESSAGE}`);
  }

  if (input.channel === "기타" && !isPresent(input.customChannel)) {
    addError(result, "customChannel", "기타 채널명을 입력하세요.");
  }

  if (!isPresent(input.customerId) || !isPresent(input.contactId)) {
    addError(result, "customerId", "고객사와 담당자를 선택하세요.");
  }

  if (input.products.length === 0) {
    addError(result, "products", "제품을 1개 이상 입력하세요.");
  } else {
    input.products.forEach((product, productIndex) => {
      validateProduct(result, product, productIndex);
    });
  }

  result.ok = Object.keys(result.fieldErrors).length === 0;
  return result;
}

export function canEditOrder(status: OrderStatus) {
  return status === "active";
}

export function canReleaseOrder(status: OrderStatus) {
  return status === "active";
}

export function canCancelOrder(status: OrderStatus) {
  return status === "active";
}
