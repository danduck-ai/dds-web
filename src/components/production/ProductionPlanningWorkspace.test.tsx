import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { ProductionPlanningWorkspace } from "./ProductionPlanningWorkspace";
import type { OrderListRow } from "@/features/orders/types";

function releasedOrder(): OrderListRow {
  return {
    id: "order-production",
    orderNo: "O-DSE-26061200001",
    status: "released",
    statusLabel: "생산팀 전달",
    requestedDate: "2026-06-12",
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
          {
            id: "shipment-s",
            plannedShipDate: "2026-06-18",
            quantity: 300,
            status: "ready",
            productionPlans: [
              {
                id: "plan-s-draft",
                shipmentPlanId: "shipment-s",
                quantity: null,
                completedQuantity: 0,
                estimatedDurationMinutes: null,
                durationSource: null,
                workStatus: "unscheduled",
              },
            ],
          },
          {
            id: "shipment-s-second",
            plannedShipDate: "2026-06-25",
            quantity: 120,
            status: "ready",
            productionPlans: [
              {
                id: "plan-s-second-draft",
                shipmentPlanId: "shipment-s-second",
                quantity: null,
                completedQuantity: 0,
                estimatedDurationMinutes: null,
                durationSource: null,
                workStatus: "unscheduled",
              },
            ],
          },
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
        shipmentPlans: [
          {
            id: "shipment-r",
            plannedShipDate: "2026-06-20",
            quantity: 100,
            status: "ready",
            productionPlans: [
              {
                id: "plan-r-draft",
                shipmentPlanId: "shipment-r",
                quantity: null,
                completedQuantity: 0,
                estimatedDurationMinutes: null,
                durationSource: null,
                workStatus: "unscheduled",
              },
            ],
          },
        ],
      },
    ],
    productSummary: "DS-S120 압출 실리콘 가스켓 S 외 1",
    totalQuantity: 400,
    shipmentLabel: "출하계획 2건",
    createdAt: "2026-06-12T00:00:00.000Z",
    completedAt: null,
    searchText: "o-dse-26061200001 동성전자",
  };
}

function renderWorkspace() {
  return render(
    <ProductionPlanningWorkspace
      currentDate="2026-06-12"
      initialOrders={[releasedOrder()]}
      profile={{
        displayName: "박현우",
        email: "production@dss.local",
        role: "P",
        departmentCode: "S",
      }}
    />,
  );
}

const firstAvailableLabel = "[동성전자] 압출 실리콘 가스켓 S 300개 (D-6)";
const secondAvailableLabel = "[동성전자] 압출 실리콘 가스켓 S 120개 (D-13)";
const firstRemainderLabel = "[동성전자] 압출 실리콘 가스켓 S 120개 (D-6)";

describe("ProductionPlanningWorkspace", () => {
  test("renders production-day mode controls with the profile department selected", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "생산 계획" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "생산일 기준 보기" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "출하건 기준 보기" })).toBeInTheDocument();
    expect(screen.getByLabelText("부서")).toHaveValue("S");
    expect(screen.getByLabelText("생산 시작 시간")).toHaveValue("09:00");
    expect(screen.getByRole("region", { name: "미배정 생산계획" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "오늘 생산계획" })).toBeInTheDocument();
    expect(screen.getByText("09:00-18:00")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: firstAvailableLabel })).toBeInTheDocument();
    expect(screen.queryByText("실리콘 패킹 R")).not.toBeInTheDocument();
  });

  test("aligns transfer actions with the top of the planning panels", () => {
    renderWorkspace();

    expect(screen.getByLabelText("생산계획 이동")).toHaveClass("dss-production-transfer__actions--panel-top");
  });

  test("shows a construction placeholder for shipment-plan mode", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "출하건 기준 보기" }));

    expect(screen.getByText("출하건 기준 보기는 공사중입니다.")).toBeInTheDocument();
  });

  test("highlights the selected panel and keeps panel selection exclusive", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const availablePanel = screen.getByRole("region", { name: "미배정 생산계획" });
    const scheduledPanel = screen.getByRole("region", { name: "오늘 생산계획" });
    const firstAvailableCheckbox = screen.getByRole("checkbox", { name: firstAvailableLabel });

    await user.click(firstAvailableCheckbox);

    expect(firstAvailableCheckbox).toBeChecked();
    expect(availablePanel).toHaveAttribute("data-active", "true");
    expect(firstAvailableCheckbox.closest(".dss-production-available-row")).toHaveAttribute("data-selected", "true");
    expect(scheduledPanel).not.toHaveAttribute("data-active", "true");

    await user.click(screen.getByRole("heading", { name: "오늘 생산계획" }));

    expect(firstAvailableCheckbox).not.toBeChecked();
    expect(availablePanel).not.toHaveAttribute("data-active", "true");
    expect(firstAvailableCheckbox.closest(".dss-production-available-row")).not.toHaveAttribute("data-selected", "true");

    await user.click(firstAvailableCheckbox);
    await user.click(screen.getByRole("button", { name: "선택 항목 생산계획에 추가" }));
    const dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-18 생산수량" }), "300");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    const secondAvailableCheckbox = screen.getByRole("checkbox", { name: secondAvailableLabel });
    await user.click(secondAvailableCheckbox);
    const scheduledCheckbox = screen.getByRole("checkbox", { name: "O-DSE-26061200001 2026-06-18 오늘 생산계획 선택" });
    await user.click(scheduledCheckbox);

    expect(secondAvailableCheckbox).not.toBeChecked();
    expect(scheduledCheckbox).toBeChecked();
    expect(availablePanel).not.toHaveAttribute("data-active", "true");
    expect(scheduledPanel).toHaveAttribute("data-active", "true");
    expect(scheduledCheckbox.closest(".dss-production-scheduled-card")).toHaveAttribute("data-selected", "true");

    const transferActions = document.querySelector(".dss-production-transfer__actions");
    expect(transferActions).toBeInstanceOf(HTMLElement);

    await user.click(transferActions as HTMLElement);

    expect(scheduledCheckbox).not.toBeChecked();
    expect(scheduledPanel).not.toHaveAttribute("data-active", "true");
    expect(scheduledCheckbox.closest(".dss-production-scheduled-card")).not.toHaveAttribute("data-selected", "true");
  });

  test("moves multiple selected available plans to today after entering quantities in one modal", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: firstAvailableLabel }));
    await user.click(screen.getByRole("checkbox", { name: secondAvailableLabel }));
    await user.click(screen.getByRole("button", { name: "선택 항목 생산계획에 추가" }));

    const dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    expect(within(dialog).getByText("잔량 300개")).toBeInTheDocument();
    expect(within(dialog).getByText("잔량 120개")).toBeInTheDocument();

    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-18 생산수량" }), "180");
    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-25 생산수량" }), "120");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    const scheduledRegion = screen.getByRole("region", { name: "오늘 생산계획" });
    expect(screen.getByRole("checkbox", { name: firstRemainderLabel })).toBeInTheDocument();
    expect(within(scheduledRegion).getByText("09:00-10:30")).toBeInTheDocument();
    expect(within(scheduledRegion).getByText("1시간 30분")).toBeInTheDocument();
    expect(within(scheduledRegion).getAllByText("O-DSE-26061200001")).toHaveLength(2);
    expect(within(scheduledRegion).getByText("생산 180개")).toBeInTheDocument();
    expect(within(scheduledRegion).getByText("D-6")).toBeInTheDocument();
    expect(within(scheduledRegion).queryByText("O-DSE-26061200001 · 출하 2026-06-18")).not.toBeInTheDocument();
    expect(within(scheduledRegion).getByText("10:30-11:30")).toBeInTheDocument();
    expect(within(scheduledRegion).getByText("1시간")).toBeInTheDocument();
    expect(within(scheduledRegion).getByText("생산 120개")).toBeInTheDocument();
    expect(within(scheduledRegion).getByText("D-13")).toBeInTheDocument();
    expect(within(scheduledRegion).queryByText("O-DSE-26061200001 · 출하 2026-06-25")).not.toBeInTheDocument();
  });

  test("moves the visible nine-hour timeline window when the production start time changes", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.selectOptions(screen.getByLabelText("생산 시작 시간"), "08:30");

    expect(screen.getByText("08:30-17:30")).toBeInTheDocument();
  });

  test("edits a scheduled item quantity with the same quantity modal", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: firstAvailableLabel }));
    await user.click(screen.getByRole("button", { name: "선택 항목 생산계획에 추가" }));
    let dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-18 생산수량" }), "180");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    await user.click(screen.getByRole("button", { name: "O-DSE-26061200001 2026-06-18 수량 수정" }));
    dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    const quantityInput = within(dialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-18 생산수량" });
    await user.clear(quantityInput);
    await user.type(quantityInput, "300");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    expect(screen.queryByRole("checkbox", { name: firstRemainderLabel })).not.toBeInTheDocument();
    expect(screen.getByText("09:00-11:30")).toBeInTheDocument();
  });

  test("moves selected scheduled items back to the available panel", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: firstAvailableLabel }));
    await user.click(screen.getByRole("button", { name: "선택 항목 생산계획에 추가" }));
    const dialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    await user.type(within(dialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-18 생산수량" }), "300");
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    await user.click(screen.getByRole("checkbox", { name: "O-DSE-26061200001 2026-06-18 오늘 생산계획 선택" }));
    await user.click(screen.getByRole("button", { name: "선택 항목 미배정으로 이동" }));

    expect(within(screen.getByRole("region", { name: "오늘 생산계획" })).queryByText("압출 실리콘 가스켓 S")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: firstAvailableLabel })).toBeInTheDocument();
  });

  test("requires quantities before opening the irreversible confirmation modal", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByRole("button", { name: "확정" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: firstAvailableLabel }));
    await user.click(screen.getByRole("button", { name: "선택 항목 생산계획에 추가" }));
    const quantityDialog = screen.getByRole("dialog", { name: "생산수량 입력" });
    await user.type(within(quantityDialog).getByRole("spinbutton", { name: "O-DSE-26061200001 2026-06-18 생산수량" }), "300");
    await user.click(within(quantityDialog).getByRole("button", { name: "적용" }));

    await user.click(screen.getByRole("button", { name: "확정" }));

    const dialog = screen.getByRole("dialog", { name: "생산계획을 확정할까요?" });
    expect(within(dialog).getByText("확정 후에는 이 화면에서 되돌릴 수 없습니다.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "확정" }));

    expect(screen.getByText("생산계획이 확정되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("09:00-11:30")).toBeInTheDocument();
  });

  test("hydrates sortable cards without dnd describedby attribute mismatch", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const element = (
      <ProductionPlanningWorkspace
        currentDate="2026-06-12"
        initialOrders={[releasedOrder()]}
        profile={{
          displayName: "박현우",
          email: "production@dss.local",
          role: "P",
          departmentCode: "S",
        }}
      />
    );
    const container = document.createElement("div");
    let root: Root | undefined;

    container.innerHTML = renderToString(element);
    document.body.appendChild(container);

    try {
      await act(async () => {
        root = hydrateRoot(container, element);
      });

      const hydrationWarnings = errorSpy.mock.calls
        .flat()
        .map((message) => String(message))
        .filter((message) => message.includes("hydrated but some attributes") || message.includes("DndDescribedBy"));

      expect(hydrationWarnings).toEqual([]);
    } finally {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
      errorSpy.mockRestore();
    }
  });
});
