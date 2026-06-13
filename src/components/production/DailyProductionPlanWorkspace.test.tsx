import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { buildDailyProductionSeed } from "@/features/production/daily-planning";
import type { OrderListRow } from "@/features/orders/types";
import { DailyProductionPlanWorkspace } from "./DailyProductionPlanWorkspace";

function releasedOrder(): OrderListRow {
  return {
    id: "order-production",
    orderNo: "O-DSE-26061300001",
    status: "released",
    statusLabel: "생산팀 전달",
    requestedDate: "2026-06-13",
    channel: "이메일",
    customerName: "동성전자",
    contactName: "김영수",
    products: [
      {
        id: "product-s",
        designId: "design-s",
        designNo: "DS-S120",
        productName: "압출 실리콘 가스켓 S",
        specification: "S-120 / 적색",
        departmentCode: "S",
        defaultUnitsPerHour: 120,
        quantity: 300,
        shipmentPlans: [
          { id: "shipment-s-1", plannedShipDate: "2026-06-18", quantity: 100, status: "ready" },
          { id: "shipment-s-2", plannedShipDate: "2026-06-25", quantity: 200, status: "ready" },
        ],
      },
      {
        id: "product-r",
        designId: "design-r",
        designNo: "DS-R100",
        productName: "실리콘 패킹 R",
        specification: "R-100",
        departmentCode: "R",
        defaultUnitsPerHour: 100,
        quantity: 100,
        shipmentPlans: [{ id: "shipment-r", plannedShipDate: "2026-06-20", quantity: 100, status: "ready" }],
      },
    ],
    productSummary: "DS-S120 압출 실리콘 가스켓 S 외 1",
    totalQuantity: 400,
    shipmentLabel: "출하계획 3건",
    createdAt: "2026-06-13T00:00:00.000Z",
    completedAt: null,
    searchText: "o-dse-26061300001 동성전자",
  };
}

function renderWorkspace(options: { toastDurationMs?: number } = {}) {
  return render(
    <DailyProductionPlanWorkspace
      currentDate="2026-06-13"
      initialSeed={buildDailyProductionSeed([releasedOrder()], [])}
      profile={{
        displayName: "박현우",
        email: "production@dss.local",
        role: "P",
        departmentCode: "S",
      }}
      toastDurationMs={options.toastDurationMs}
    />,
  );
}

const availableLabel = "[동성전자] 압출 실리콘 가스켓 S 300개 (다음 출하 D-5)";

describe("DailyProductionPlanWorkspace", () => {
  test("renders OrderProduct candidates on the left and daily plan items on the right", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "일간 생산 계획표 작성" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "생산일 기준 보기" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("부서")).toHaveValue("S");
    expect(screen.getByLabelText("생산 시작 시간")).toHaveValue("09:00");
    expect(screen.getByRole("region", { name: "생산 대상 주문제품" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "일간 생산 계획표" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: availableLabel })).toBeInTheDocument();
    expect(screen.queryByText("실리콘 패킹 R")).not.toBeInTheDocument();
  });

  test("moves selected OrderProduct candidates into the daily plan after quantity input", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: availableLabel }));
    await user.click(screen.getByRole("button", { name: "선택 제품 계획표에 추가" }));

    const dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    expect(within(dialog).getByText("계획 가능 300개")).toBeInTheDocument();

    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061300001 압출 실리콘 가스켓 S 생산수량" }), "180");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    expect(screen.getByText("생산 180개")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "[동성전자] 압출 실리콘 가스켓 S 120개 (다음 출하 D-5)" })).toBeInTheDocument();
  });

  test("saves the daily plan immediately and shows a temporary toast", async () => {
    const user = userEvent.setup();
    renderWorkspace({ toastDurationMs: 100 });

    await user.click(screen.getByRole("checkbox", { name: availableLabel }));
    await user.click(screen.getByRole("button", { name: "선택 제품 계획표에 추가" }));

    const dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061300001 압출 실리콘 가스켓 S 생산수량" }), "300");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByRole("dialog", { name: "일간 생산 계획표를 확정할까요?" })).not.toBeInTheDocument();
    expect(await screen.findByText("일간 생산 계획표가 저장되었습니다.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("일간 생산 계획표가 저장되었습니다.")).not.toBeInTheDocument();
    });
  });
});
