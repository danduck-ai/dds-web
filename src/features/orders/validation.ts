import type { OrderFormInput, OrderStatus, ValidationResult } from "./types";

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

  if (!isPresent(input.designId)) {
    addError(result, "designId", "제품/설계를 선택하세요.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    addError(result, "quantity", "주문 수량은 1 이상이어야 합니다.");
  }

  if (input.deliveryType === "single") {
    if (input.schedules.length !== 1) {
      addError(result, "schedules", "일반 출하는 납기일 1건만 입력하세요.");
    }
  } else if (input.schedules.length < 2) {
    addError(result, "schedules", "분할 출하는 2건 이상의 출하 행이 필요합니다.");
  }

  const hasInvalidSchedule = input.schedules.some(
    (schedule) =>
      !isPresent(schedule.scheduledDate) ||
      !Number.isInteger(schedule.quantity) ||
      schedule.quantity <= 0,
  );

  if (hasInvalidSchedule) {
    addError(result, "schedules", "모든 분할 출하 행의 출하일과 수량을 입력하세요.");
  }

  const scheduleTotal = input.schedules.reduce(
    (sum, schedule) => sum + (Number.isFinite(schedule.quantity) ? schedule.quantity : 0),
    0,
  );

  if (input.quantity > 0 && scheduleTotal !== input.quantity) {
    addError(
      result,
      "schedules",
      `납기 수량 합계 ${scheduleTotal.toLocaleString("ko-KR")}개가 주문 수량 ${input.quantity.toLocaleString("ko-KR")}개와 일치해야 합니다.`,
    );
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
