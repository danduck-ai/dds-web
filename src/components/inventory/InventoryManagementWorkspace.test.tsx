import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { InventoryManagementWorkspace } from "./InventoryManagementWorkspace";
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
          quantity: 100,
          status: "partial",
        },
      ],
      productionPlans: [],
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
      shipmentPlans: [],
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
    {
      id: "receipt-s-2",
      orderProductId: "product-s",
      receiptDate: "2026-06-12",
      quantity: 30,
      lotNo: "LOT-20260612-002",
      equipmentLine: "압출 2라인",
      storageLocation: "B-02",
      qualityStatus: "passed",
      operatorName: "박현우",
      memo: null,
      productionPlanItemId: null,
      transactionType: "production_receipt",
      createdAt: "2026-06-12T10:00:00.000Z",
    },
  ],
  shipmentRecords: [
    {
      id: "shipment-record-s-1",
      shipmentPlanId: "shipment-s-1",
      shippedDate: "2026-06-13",
      quantity: 25,
      createdAt: "2026-06-13T09:00:00.000Z",
    },
  ],
};

function expectCarbonExpandableZebraRows(table: HTMLElement) {
  const tableBody = table.querySelector("tbody");
  expect(tableBody).not.toBeNull();

  const parentRows = Array.from(tableBody!.children).filter((row) => row.hasAttribute("data-parent-row"));
  const childRows = Array.from(tableBody!.children).filter((row) => row.hasAttribute("data-child-row"));

  expect(table).toHaveClass("cds--data-table--zebra");
  expect(parentRows.length).toBeGreaterThan(0);
  expect(childRows).toHaveLength(parentRows.length);

  parentRows.forEach((parentRow) => {
    expect(parentRow.nextElementSibling).toHaveAttribute("data-child-row", "true");
  });
}

describe("InventoryManagementWorkspace", () => {
  test("renders inventory status and inbound/outbound history on one screen", () => {
    render(<InventoryManagementWorkspace initialSeed={seed} />);

    expect(screen.getByRole("heading", { name: "재고 관리" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "재고 관리 보기" })).not.toBeInTheDocument();
    expect(screen.getByText("주문 제품 기준 현재 재고와 입출고 흐름을 확인합니다.")).toBeInTheDocument();
    expect(screen.queryByText(/OrderProduct/)).not.toBeInTheDocument();

    const inventoryTable = screen.getByRole("table", { name: "주문 제품 기준 재고 현황" });
    expect(within(inventoryTable).getByRole("columnheader", { name: "고객사" })).toBeInTheDocument();
    expect(within(inventoryTable).getByRole("columnheader", { name: "제품명" })).toBeInTheDocument();
    expect(within(inventoryTable).getByRole("columnheader", { name: "재고수량" })).toBeInTheDocument();
    expect(within(inventoryTable).queryByRole("columnheader", { name: "주문코드" })).not.toBeInTheDocument();
    expect(within(inventoryTable).queryByRole("columnheader", { name: "주문수량" })).not.toBeInTheDocument();
    expect(within(inventoryTable).queryByRole("columnheader", { name: "입력가능" })).not.toBeInTheDocument();
    expect(within(inventoryTable).queryByRole("columnheader", { name: "입력건수" })).not.toBeInTheDocument();

    expect(within(inventoryTable).getByText("압출 실리콘 가스켓 S")).toBeInTheDocument();
    expect(within(inventoryTable).getByText("85개")).toBeInTheDocument();
    expect(within(inventoryTable).queryByText("실리콘 패킹 R")).not.toBeInTheDocument();
    expectCarbonExpandableZebraRows(inventoryTable);

    const ledgerTable = screen.getByRole("table", { name: "입/출고 내역" });
    expect(within(ledgerTable).getByRole("columnheader", { name: "구분" })).toBeInTheDocument();
    expect(within(ledgerTable).getByRole("columnheader", { name: "제품명" })).toBeInTheDocument();
    expect(within(ledgerTable).getByRole("columnheader", { name: "수량" })).toBeInTheDocument();
    expect(within(ledgerTable).getAllByText("입고")).toHaveLength(2);
    expect(within(ledgerTable).getByText("출고")).toBeInTheDocument();
    expect(within(ledgerTable).getByText("+80개")).toBeInTheDocument();
    expect(within(ledgerTable).getByText("+30개")).toBeInTheDocument();
    expect(within(ledgerTable).getByText("-25개")).toBeInTheDocument();
  });

  test("expands an inventory row to show stock grouped by storage location", async () => {
    const user = userEvent.setup();
    render(<InventoryManagementWorkspace initialSeed={seed} />);

    await user.click(screen.getByRole("button", { name: "압출 실리콘 가스켓 S 보관장소별 재고 펼치기" }));

    const detailTable = screen.getByRole("table", { name: "압출 실리콘 가스켓 S 보관장소별 재고" });
    expect(within(detailTable).getByRole("columnheader", { name: "보관장소" })).toBeInTheDocument();
    expect(within(detailTable).getByRole("columnheader", { name: "수량" })).toBeInTheDocument();
    expect(within(detailTable).getByText("A-01")).toBeInTheDocument();
    expect(within(detailTable).getByText("55개")).toBeInTheDocument();
    expect(within(detailTable).getByText("B-02")).toBeInTheDocument();
    expect(within(detailTable).getByText("30개")).toBeInTheDocument();
  });
});
