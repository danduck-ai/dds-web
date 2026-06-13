import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { ShipmentManagementWorkspace } from "./ShipmentManagementWorkspace";
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
      orderQuantity: 300,
      shipmentPlans: [
        {
          id: "shipment-s-1",
          plannedShipDate: "2026-06-13",
          quantity: 100,
          status: "ready",
        },
        {
          id: "shipment-s-2",
          plannedShipDate: "2026-06-15",
          quantity: 200,
          status: "completed",
        },
      ],
      productionPlans: [],
    },
    {
      orderProductId: "product-r",
      orderId: "order-2",
      orderNo: "O-DSE-26061400002",
      orderRequestedDate: "2026-06-14",
      customerName: "세림테크",
      designNo: "DS-R100",
      productName: "실리콘 패킹 R",
      specification: "R-100 / 흑색",
      departmentCode: "R",
      orderQuantity: 120,
      shipmentPlans: [
        {
          id: "shipment-r-1",
          plannedShipDate: "2026-06-10",
          quantity: 120,
          status: "completed",
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
      quantity: 160,
      lotNo: "LOT-20260612-001",
      equipmentLine: "압출 2라인",
      storageLocation: "A-01",
      qualityStatus: "passed",
      operatorName: "박현우",
      memo: null,
      productionPlanItemId: null,
      transactionType: "production_receipt",
      createdAt: "2026-06-12T09:00:00.000Z",
    },
    {
      id: "receipt-r-1",
      orderProductId: "product-r",
      receiptDate: "2026-06-10",
      quantity: 120,
      lotNo: "LOT-20260610-001",
      equipmentLine: "R-1라인",
      storageLocation: "R-A01",
      qualityStatus: "passed",
      operatorName: "박현우",
      memo: null,
      productionPlanItemId: null,
      transactionType: "production_receipt",
      createdAt: "2026-06-10T09:00:00.000Z",
    },
  ],
  shipmentRecords: [
    {
      id: "shipment-record-s-1",
      shipmentPlanId: "shipment-s-1",
      shippedDate: "2026-06-13",
      quantity: 40,
      createdAt: "2026-06-13T10:00:00.000Z",
    },
    {
      id: "shipment-record-r-1",
      shipmentPlanId: "shipment-r-1",
      shippedDate: "2026-06-10",
      quantity: 120,
      createdAt: "2026-06-10T10:00:00.000Z",
    },
  ],
};

describe("ShipmentManagementWorkspace", () => {
  test("renders shipment plan rows with requested columns and hides old completed shipments by default", () => {
    render(<ShipmentManagementWorkspace currentDate="2026-06-13" initialSeed={seed} role="P" />);

    expect(screen.getByRole("heading", { name: "출하 관리" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "3일이상 출하완료건 제외" })).toBeChecked();

    const table = screen.getByRole("table", { name: "출하계획 목록" });
    expect(within(table).getByRole("columnheader", { name: "고객명" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "제품정보" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "부서코드" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "출하수량" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "출하상태" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "입력" })).toBeInTheDocument();

    expect(within(table).getAllByText("동성전자")).toHaveLength(2);
    expect(within(table).getAllByText("압출 실리콘 가스켓 S")).toHaveLength(2);
    expect(within(table).getByText("40 / 100개")).toBeInTheDocument();
    expect(within(table).getByText("부분출하")).toBeInTheDocument();
    expect(within(table).queryByText("세림테크")).not.toBeInTheDocument();
  });

  test("can include completed shipments older than three days", async () => {
    const user = userEvent.setup();
    render(<ShipmentManagementWorkspace currentDate="2026-06-13" initialSeed={seed} role="P" />);

    await user.click(screen.getByRole("checkbox", { name: "3일이상 출하완료건 제외" }));

    expect(screen.getByText("세림테크")).toBeInTheDocument();
    expect(screen.getAllByText("출하완료")).toHaveLength(2);
  });

  test("opens a right drawer for shipment input and records partial shipment history inside the drawer", async () => {
    const user = userEvent.setup();
    render(<ShipmentManagementWorkspace currentDate="2026-06-13" initialSeed={seed} role="P" />);

    await user.click(screen.getByRole("button", { name: "압출 실리콘 가스켓 S 2026-06-13 출하 실적 입력" }));

    const drawer = screen.getByRole("dialog", { name: "압출 실리콘 가스켓 S 출하 실적 입력" });
    expect(within(drawer).getByText("동성전자")).toBeInTheDocument();
    expect(within(drawer).getByText("출하 가능 60개")).toBeInTheDocument();

    const historyTable = within(drawer).getByRole("table", { name: "출하 이력" });
    expect(within(historyTable).getByRole("columnheader", { name: "출고일" })).toBeInTheDocument();
    expect(within(historyTable).getByRole("columnheader", { name: "출하수량" })).toBeInTheDocument();
    expect(within(historyTable).getByText("2026-06-13")).toBeInTheDocument();
    expect(within(historyTable).getByText("40개")).toBeInTheDocument();

    await user.clear(within(drawer).getByLabelText("출고일"));
    await user.type(within(drawer).getByLabelText("출고일"), "2026-06-14");
    await user.type(within(drawer).getByLabelText("출하수량"), "20");
    await user.click(within(drawer).getByRole("button", { name: "입력" }));

    expect(screen.getByText("60 / 100개")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "압출 실리콘 가스켓 S 2026-06-13 출하 실적 입력" }));

    const reopenedDrawer = screen.getByRole("dialog", { name: "압출 실리콘 가스켓 S 출하 실적 입력" });
    const updatedHistoryTable = within(reopenedDrawer).getByRole("table", { name: "출하 이력" });
    expect(within(updatedHistoryTable).getByText("2026-06-14")).toBeInTheDocument();
    expect(within(updatedHistoryTable).getByText("20개")).toBeInTheDocument();
  });

  test("allows administrative users to enter shipment records", () => {
    render(<ShipmentManagementWorkspace currentDate="2026-06-13" initialSeed={seed} role="A" />);

    expect(screen.getByRole("button", { name: "압출 실리콘 가스켓 S 2026-06-13 출하 실적 입력" })).toBeEnabled();
  });

  test("renders shipment input as disabled for read only executive roles", () => {
    render(<ShipmentManagementWorkspace currentDate="2026-06-13" initialSeed={seed} role="E" />);

    expect(screen.getByRole("button", { name: "압출 실리콘 가스켓 S 2026-06-13 출하 실적 입력" })).toBeDisabled();
  });
});
