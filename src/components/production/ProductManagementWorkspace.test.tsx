import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { ProductManagementWorkspace } from "./ProductManagementWorkspace";
import type { ProductionManagementSeed } from "@/features/production/product-management";

const seed: ProductionManagementSeed = {
  orderProducts: [
    {
      orderProductId: "product-s",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      customerName: "동성전자",
      designNo: "DS-S120",
      productName: "압출 실리콘 가스켓 S",
      specification: "S-120 / 적색 / 연속압출",
      departmentCode: "S",
      orderQuantity: 100,
      shipmentPlans: [
        {
          id: "shipment-s-1",
          plannedShipDate: "2026-06-20",
          quantity: 40,
          status: "ready",
        },
        {
          id: "shipment-s-2",
          plannedShipDate: "2026-07-01",
          quantity: 60,
          status: "ready",
        },
      ],
      productionPlans: [
        {
          id: "plan-s-1",
          productionDate: "2026-06-13",
          departmentCode: "S",
          quantity: 80,
          sequence: 1,
        },
      ],
    },
    {
      orderProductId: "product-r",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      customerName: "동성전자",
      designNo: "DS-R100",
      productName: "실리콘 패킹 R",
      specification: "R-100 / 흑색",
      departmentCode: "R",
      orderQuantity: 120,
      shipmentPlans: [
        {
          id: "shipment-r-1",
          plannedShipDate: "2026-06-26",
          quantity: 120,
          status: "partial",
        },
      ],
      productionPlans: [],
    },
  ],
  receipts: [
    {
      id: "receipt-s-1",
      orderProductId: "product-s",
      receiptDate: "2026-06-12",
      quantity: 80,
      lotNo: "LOT-20260612-001",
      equipmentLine: "압출 2라인",
      storageLocation: "A-01",
      qualityStatus: "not_recorded",
      operatorName: "박현우",
      memo: "초도 입고",
      productionPlanItemId: null,
      transactionType: "production_receipt",
      createdAt: "2026-06-12T09:00:00.000Z",
    },
  ],
};

function renderWorkspace() {
  return render(<ProductManagementWorkspace currentDate="2026-06-13" initialSeed={seed} />);
}

describe("ProductManagementWorkspace", () => {
  test("renders production result actions and history without the inventory status table", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "생산 결과" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "생산 제품 입력" })).toBeInTheDocument();
    expect(screen.queryByLabelText("주문제품")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "생산수량" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("LOT/배치번호")).not.toBeInTheDocument();
    expect(screen.queryByText("주문제품을 선택하세요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "주문 제품 기준 재고 현황" })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "생산 제품 입력 히스토리" })).toBeInTheDocument();
  });

  test("opens receipt input fields in a drawer with optional help", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "생산 제품 입력" }));

    const drawer = screen.getByRole("dialog", { name: "생산 제품 입력" });
    expect(drawer.parentElement).toHaveClass("dss-drawer-layer");
    expect(drawer.parentElement).not.toHaveClass("dss-drawer-layer--start");
    expect(within(drawer).getByLabelText("주문제품")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("주문제품")).not.toHaveAttribute("aria-invalid", "true");
    expect(within(drawer).getByRole("spinbutton", { name: "생산수량" })).toBeInTheDocument();
    expect(within(drawer).getByLabelText("생산일")).toHaveValue("2026-06-13");
    expect(within(drawer).getByLabelText("LOT/배치번호")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("설비 또는 라인")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("보관위치")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("관련 생산계획")).toHaveValue("");
    expect(within(drawer).getByLabelText("품질상태")).toHaveValue("not_recorded");
    expect(within(drawer).getByLabelText("담당자")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("비고")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "LOT/배치번호 도움말" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "설비 또는 라인 도움말" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "보관위치 도움말" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "관련 생산계획 도움말" })).toBeInTheDocument();
  });

  test("adds a produced product receipt, auto-generates lot number, and updates OrderProduct stock", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "생산 제품 입력" }));
    const drawer = screen.getByRole("dialog", { name: "생산 제품 입력" });

    await user.selectOptions(within(drawer).getByLabelText("주문제품"), "product-s");
    await user.type(within(drawer).getByRole("spinbutton", { name: "생산수량" }), "20");
    await user.click(within(drawer).getByRole("button", { name: "입력" }));

    const historyTable = screen.getByRole("table", { name: "생산 제품 입력 히스토리" });

    expect(within(historyTable).getByText("LOT-20260613-002")).toBeInTheDocument();
    expect(within(historyTable).getByText("20개")).toBeInTheDocument();
    expect(screen.getByText("생산 제품 입력이 등록되었습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "생산 제품 입력" })).not.toBeInTheDocument();
  });

  test("blocks receipt input beyond the remaining OrderProduct quantity", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "생산 제품 입력" }));
    const drawer = screen.getByRole("dialog", { name: "생산 제품 입력" });

    await user.selectOptions(within(drawer).getByLabelText("주문제품"), "product-s");
    await user.type(within(drawer).getByRole("spinbutton", { name: "생산수량" }), "21");

    expect(within(drawer).getByText("입력 가능 수량은 20개 이하입니다.")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "입력" })).toBeDisabled();
  });

  test("shows related order and shipment details for each receipt line item", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "LOT-20260612-001 관련 주문/출하 상세보기" }));

    const drawer = screen.getByRole("dialog", { name: "LOT-20260612-001 상세" });
    expect(within(drawer).getByText("O-DSE-26061300001")).toBeInTheDocument();
    expect(within(drawer).getByText("동성전자")).toBeInTheDocument();
    expect(within(drawer).getAllByText("압출 실리콘 가스켓 S").length).toBeGreaterThan(0);
    expect(within(drawer).getByText("선택하지 않음")).toBeInTheDocument();
    expect(within(drawer).getByRole("table", { name: "관련 출하건" })).toBeInTheDocument();
    expect(within(drawer).getByText("2026-06-20")).toBeInTheDocument();
    expect(within(drawer).getByText("40개")).toBeInTheDocument();
    expect(within(drawer).getByText("2026-07-01")).toBeInTheDocument();
    expect(within(drawer).getByText("60개")).toBeInTheDocument();
  });
});
