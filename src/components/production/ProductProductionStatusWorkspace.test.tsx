import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import type { DailyProductionSeed, DailyProductionSeedItem } from "@/features/production/types";
import { ProductProductionStatusWorkspace } from "./ProductProductionStatusWorkspace";

function seedItem(patch: Partial<DailyProductionSeedItem> = {}): DailyProductionSeedItem {
  return {
    id: patch.id ?? "done-yesterday",
    productionDate: patch.productionDate ?? "2026-06-12",
    departmentCode: patch.departmentCode ?? "S",
    workStartTime: patch.workStartTime ?? "09:00",
    orderProductId: patch.orderProductId ?? "product-s",
    quantity: patch.quantity ?? 80,
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? 40,
    durationSource: patch.durationSource ?? "product_default",
    planningStatus: patch.planningStatus ?? "scheduled",
    sequence: patch.sequence ?? 1,
  };
}

const seed: DailyProductionSeed = {
  candidates: [
    {
      id: "product-s-candidate",
      orderProductId: "product-s",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      orderProductCount: 2,
      orderStatus: "released",
      customerName: "동성전자",
      designNo: "DS-S120",
      productName: "압출 실리콘 가스켓 S",
      specification: "S-120 / 적색",
      departmentCode: "S",
      orderQuantity: 300,
      defaultUnitsPerHour: 120,
      nextShipDate: "2026-06-18",
      shipmentSummary: "06/18 100개 외 1",
    },
    {
      id: "product-r-candidate",
      orderProductId: "product-r",
      orderId: "order-1",
      orderNo: "O-DSE-26061300001",
      orderRequestedDate: "2026-06-13",
      orderProductCount: 2,
      orderStatus: "released",
      customerName: "동성전자",
      designNo: "DS-R100",
      productName: "실리콘 패킹 R",
      specification: "R-100 / 흑색",
      departmentCode: "R",
      orderQuantity: 120,
      defaultUnitsPerHour: 100,
      nextShipDate: "2026-06-20",
      shipmentSummary: "06/20 120개",
    },
  ],
  dayPlanItems: [
    seedItem({ id: "planned-yesterday", productionDate: "2026-06-12", quantity: 80 }),
    seedItem({
      id: "planned-today",
      productionDate: "2026-06-13",
      quantity: 40,
      sequence: 2,
    }),
    seedItem({
      id: "future-plan",
      productionDate: "2026-06-15",
      quantity: 100,
      sequence: 1,
    }),
    seedItem({
      id: "r-today-plan",
      orderProductId: "product-r",
      productionDate: "2026-06-13",
      departmentCode: "R",
      quantity: 50,
      sequence: 1,
    }),
  ],
};

function renderWorkspace() {
  return render(
    <ProductProductionStatusWorkspace
      currentDate="2026-06-13"
      initialSeed={seed}
      profile={{
        displayName: "박현우",
        email: "production@dss.local",
        role: "P",
        departmentCode: "S",
      }}
    />,
  );
}

describe("ProductProductionStatusWorkspace", () => {
  test("defaults to daily production rows with existing production day plans", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "생산 계획" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["일자별", "제품별", "주문별"]);
    expect(screen.getByRole("tab", { name: "일자별" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "제품별" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "주문별" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("table", { name: "일자별 생산계획 목록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일간 생산 계획 작성" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "날짜" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "부서" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "예정된 생산건수" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-06-13 R 예정된 생산건수 열기" })).toHaveTextContent("1건");
    expect(screen.queryByText("2026-06-14")).not.toBeInTheDocument();
  });

  test("opens daily production planning modal from the daily view action", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "일간 생산 계획 작성" }));

    const dialog = screen.getByRole("dialog", { name: "일간 생산 계획 작성" });
    expect(within(dialog).getByLabelText("생산일")).toHaveValue("2026-06-13");
    expect(within(dialog).getByLabelText("부서")).toHaveValue("S");
  });

  test("closes the daily production planning modal after saving", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "일간 생산 계획 작성" }));
    const dialog = screen.getByRole("dialog", { name: "일간 생산 계획 작성" });

    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(screen.queryByRole("dialog", { name: "일간 생산 계획 작성" })).not.toBeInTheDocument();
    expect(screen.getByText("일간 생산 계획표가 저장되었습니다.")).toBeInTheDocument();
  });

  test("opens daily production planning modal from a daily production count row", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "2026-06-13 R 예정된 생산건수 열기" }));

    const dialog = screen.getByRole("dialog", { name: "일간 생산 계획 작성" });
    expect(within(dialog).getByLabelText("생산일")).toHaveValue("2026-06-13");
    expect(within(dialog).getByLabelText("부서")).toHaveValue("R");
  });

  test("renders product rows with plan quantities and no completion ratio", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "제품별" }));

    expect(screen.getByRole("tab", { name: "제품별" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("columnheader", { name: "고객사" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "제품명" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "계획수량" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "미계획수량" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "생산계획" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "오늘 생산중" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "완료율" })).not.toBeInTheDocument();
    expect(screen.getAllByText("동성전자").length).toBeGreaterThan(0);
    expect(screen.getByText("압출 실리콘 가스켓 S")).toBeInTheDocument();
    expect(screen.getByText("220개")).toBeInTheDocument();
    expect(screen.getByText("80개")).toBeInTheDocument();
    expect(screen.queryByText("26.7% (80/300)")).not.toBeInTheDocument();
  });

  test("opens a production plan drawer and creates a new date quantity plan", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "제품별" }));
    await user.click(screen.getByRole("button", { name: "압출 실리콘 가스켓 S 생산계획 계획하기" }));

    const drawer = screen.getByRole("dialog", { name: "압출 실리콘 가스켓 S 생산계획 Drawer" });
    expect(within(drawer).getByText("2026-06-15")).toBeInTheDocument();
    expect(within(drawer).getAllByText("100개")[0]).toBeInTheDocument();
    expect(within(drawer).getByText("계획 가능 80개")).toBeInTheDocument();
    expect(within(drawer).queryByText("완료율")).not.toBeInTheDocument();

    await user.clear(within(drawer).getByLabelText("생산일"));
    await user.type(within(drawer).getByLabelText("생산일"), "2026-06-16");
    await user.type(within(drawer).getByRole("spinbutton", { name: "생산수량" }), "60");
    await user.click(within(drawer).getByRole("button", { name: "생성" }));

    expect(within(drawer).getByText("2026-06-16")).toBeInTheDocument();
    expect(within(drawer).getByText("60개")).toBeInTheDocument();
    expect(within(drawer).getByText("계획 가능 20개")).toBeInTheDocument();
  });

  test("switches to order rows and expands OrderProduct production status rows", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "주문별" }));

    expect(screen.getByRole("tab", { name: "주문별" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("columnheader", { name: "주문코드" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "주문날짜" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "고객사" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "품목수" })).toBeInTheDocument();
    expect(screen.getByText("O-DSE-26061300001")).toBeInTheDocument();
    expect(screen.getByText("2026-06-13")).toBeInTheDocument();
    expect(screen.getByText("2개")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "O-DSE-26061300001 주문제품 펼치기" }));

    const region = screen.getByRole("region", { name: "O-DSE-26061300001 주문제품 생산 계획" });
    expect(within(region).getByRole("columnheader", { name: "계획수량" })).toBeInTheDocument();
    expect(within(region).getByRole("columnheader", { name: "미계획수량" })).toBeInTheDocument();
    expect(within(region).getByText("실리콘 패킹 R")).toBeInTheDocument();
    expect(within(region).getByText("50개")).toBeInTheDocument();
    expect(within(region).getByText("70개")).toBeInTheDocument();
    expect(within(region).queryByText("0% (0/120)")).not.toBeInTheDocument();
  });

  test("uses stable group styling for order rows instead of Carbon zebra striping", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "주문별" }));

    const orderTable = screen.getByRole("table", { name: "주문 목록" });
    const orderRow = screen.getByText("O-DSE-26061300001").closest("tr");

    expect(orderTable).not.toHaveClass("cds--data-table--zebra");
    expect(orderRow).toHaveClass("dss-product-status-order-row");

    await user.click(screen.getByRole("button", { name: "O-DSE-26061300001 주문제품 펼치기" }));

    const expandedRegion = screen.getByRole("region", { name: "O-DSE-26061300001 주문제품 생산 계획" });
    expect(orderRow).toHaveAttribute("data-dss-expanded", "true");
    expect(expandedRegion.closest("tr")).toHaveClass("dss-product-status-order-expanded-row");
  });

  test("opens the same production plan drawer from an expanded order product row", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "주문별" }));
    await user.click(screen.getByRole("button", { name: "O-DSE-26061300001 주문제품 펼치기" }));

    const region = screen.getByRole("region", { name: "O-DSE-26061300001 주문제품 생산 계획" });
    await user.click(within(region).getByRole("button", { name: "압출 실리콘 가스켓 S 생산계획 계획하기" }));

    expect(screen.getByRole("dialog", { name: "압출 실리콘 가스켓 S 생산계획 Drawer" })).toBeInTheDocument();
  });
});
