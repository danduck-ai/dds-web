import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { OrderWorkspace } from "./OrderWorkspace";
import type { OrderListRow } from "@/features/orders/types";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

function product({
  id,
  designId = "design-1",
  designNo = "DS-1042",
  productName = "실리콘 패킹 R",
  specification = "R-100",
  departmentCode = "R" as const,
  quantity,
  plannedShipDate,
  shipmentPlans,
}: {
  id: string;
  designId?: string;
  designNo?: string;
  productName?: string;
  specification?: string;
  departmentCode?: "R" | "S" | "P";
  quantity: number;
  plannedShipDate: string;
  shipmentPlans?: Array<{ plannedShipDate: string; quantity: number }>;
}) {
  const productShipmentPlans = shipmentPlans ?? [{ plannedShipDate, quantity }];

  return {
    id,
    designId,
    designNo,
    productName,
    specification,
    departmentCode,
    defaultUnitsPerHour: 120,
    quantity,
    shipmentPlans: productShipmentPlans.map((plan, index) => {
      const shipmentPlanId = `${id}-shipment-${index + 1}`;

      return {
        id: shipmentPlanId,
        plannedShipDate: plan.plannedShipDate,
        quantity: plan.quantity,
        status: "ready" as const,
      };
    }),
  };
}

const layeredOrder: OrderListRow = {
  id: "order-layered",
  orderNo: "O-DSE-26061100010",
  status: "active",
  statusLabel: "접수",
  requestedDate: "2026-06-11",
  channel: "이메일",
  customerName: "동성전자",
  contactName: "김영수",
  products: [
    product({
      id: "order-layered-product-1",
      quantity: 500,
      plannedShipDate: "2026-06-18",
      shipmentPlans: [
        { plannedShipDate: "2026-06-18", quantity: 300 },
        { plannedShipDate: "2026-06-25", quantity: 200 },
      ],
    }),
    product({
      id: "order-layered-product-2",
      designId: "design-2",
      designNo: "DS-3301",
      productName: "실리콘 몰드 P",
      specification: "P-300",
      departmentCode: "P",
      quantity: 120,
      plannedShipDate: "2026-06-21",
    }),
  ],
  productSummary: "DS-1042 실리콘 패킹 R 외 1",
  totalQuantity: 620,
  shipmentLabel: "출하계획 3건",
  createdAt: "2026-06-11T02:00:00.000Z",
  completedAt: null,
  searchText: "o-dse-26061100010 동성전자 김영수 ds-1042 실리콘 패킹 r ds-3301 실리콘 몰드 p",
};

const orders: OrderListRow[] = [
  {
    id: "order-active",
    orderNo: "O-DSE-26061000001",
    status: "active",
    statusLabel: "접수",
    requestedDate: "2026-06-10",
    channel: "카톡",
    customerName: "동성전자",
    contactName: "김영수",
    products: [product({ id: "order-active-product-1", quantity: 500, plannedShipDate: "2026-06-18" })],
    productSummary: "DS-1042 실리콘 패킹 R",
    totalQuantity: 500,
    shipmentLabel: "06/18",
    createdAt: "2026-06-10T01:00:00.000Z",
    completedAt: null,
    searchText: "o-dse-26061000001 동성전자 김영수 ds-1042 실리콘 패킹 r",
  },
  {
    id: "order-released",
    orderNo: "O-SRTECH-26060900008",
    status: "released",
    statusLabel: "생산팀 전달",
    requestedDate: "2026-06-09",
    channel: "전화",
    customerName: "세림테크",
    contactName: "이준호",
    products: [
      product({
        id: "order-released-product-1",
        designId: "design-2",
        designNo: "DS-3301",
        productName: "실리콘 몰드 P",
        specification: "P-300",
        departmentCode: "P",
        quantity: 120,
        plannedShipDate: "2026-06-21",
      }),
    ],
    productSummary: "DS-3301 실리콘 몰드 P",
    totalQuantity: 120,
    shipmentLabel: "06/21",
    createdAt: "2026-06-09T01:00:00.000Z",
    completedAt: null,
    searchText: "o-srtech-26060900008 세림테크 이준호 ds-3301 실리콘 몰드 p",
  },
  {
    id: "order-completed-recent",
    orderNo: "O-WJMED-26060800004",
    status: "completed",
    statusLabel: "출하 완료",
    requestedDate: "2026-06-08",
    channel: "이메일",
    customerName: "우진메디칼",
    contactName: "한도윤",
    products: [
      product({
        id: "order-completed-recent-product-1",
        designId: "design-3",
        designNo: "DS-5124",
        productName: "의료용 실리콘 캡 S",
        specification: "S-8",
        departmentCode: "S",
        quantity: 300,
        plannedShipDate: "2026-06-12",
      }),
    ],
    productSummary: "DS-5124 의료용 실리콘 캡 S",
    totalQuantity: 300,
    shipmentLabel: "06/12",
    createdAt: "2026-06-08T07:00:00.000Z",
    completedAt: "2026-06-10T07:40:00.000Z",
    searchText: "o-wjmed-26060800004 우진메디칼 한도윤 ds-5124",
  },
  {
    id: "order-completed-old",
    orderNo: "O-DSE-26060700002",
    status: "completed",
    statusLabel: "출하 완료",
    requestedDate: "2026-06-07",
    channel: "방문",
    customerName: "동성전자",
    contactName: "김영수",
    products: [product({ id: "order-completed-old-product-1", quantity: 180, plannedShipDate: "2026-06-14" })],
    productSummary: "DS-1042 실리콘 패킹 R",
    totalQuantity: 180,
    shipmentLabel: "06/14",
    createdAt: "2026-06-07T03:45:00.000Z",
    completedAt: "2026-06-07T08:15:00.000Z",
    searchText: "o-dse-26060700002 동성전자 김영수",
  },
  {
    id: "order-cancelled",
    orderNo: "O-DSE-26060600002",
    status: "cancelled",
    statusLabel: "취소",
    requestedDate: "2026-06-06",
    channel: "기타: 팩스",
    customerName: "동성전자",
    contactName: "김영수",
    products: [
      product({
        id: "order-cancelled-product-1",
        designId: "design-2",
        designNo: "DS-3301",
        productName: "실리콘 몰드 P",
        specification: "P-300",
        departmentCode: "P",
        quantity: 80,
        plannedShipDate: "2026-06-22",
      }),
    ],
    productSummary: "DS-3301 실리콘 몰드 P",
    totalQuantity: 80,
    shipmentLabel: "06/22",
    createdAt: "2026-06-06T06:10:00.000Z",
    completedAt: null,
    searchText: "o-dse-26060600002 동성전자 김영수",
  },
];

const lookupProps = {
  contactOptions: [
    {
      value: "customer-1::contact-1",
      customerId: "customer-1",
      contactId: "contact-1",
      customerTicker: "DSE",
      label: "동성전자 / 김영수",
    },
  ],
  designOptions: [
    {
      value: "design-1",
      label: "DS-1042 / 실리콘 패킹 R / R-100",
      designNo: "DS-1042",
      productName: "실리콘 패킹 R",
      specification: "R-100",
      departmentCode: "R" as const,
      defaultUnitsPerHour: 120,
    },
  ],
};

function renderWorkspace(extraProps: Partial<React.ComponentProps<typeof OrderWorkspace>> = {}) {
  return render(
    <OrderWorkspace
      initialOrders={orders}
      initialStatus="active"
      mode="intake"
      role="A"
      receiverLabel="관리자 / admin@dss.local"
      currentDate="2026-06-11T00:00:00.000Z"
      {...lookupProps}
      {...extraProps}
    />,
  );
}

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

describe("OrderWorkspace", () => {
  beforeEach(() => {
    refreshMock.mockClear();
  });

  test("shows active-only order intake with create and row actions", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", { name: "주문 접수" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 주문" })).toBeInTheDocument();
    expect(screen.getByText("O-DSE-26061000001")).toBeInTheDocument();
    expect(screen.getByText("1개 품목")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.queryByText("O-SRTECH-26060900008")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전달" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  test("allows executive users to manage order intake", () => {
    renderWorkspace({ role: "E", receiverLabel: "임원 / executive@dss.local" });

    expect(screen.getByRole("heading", { name: "주문 접수" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 주문" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전달" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  test("keeps order products collapsed by default and expands them as sub items", async () => {
    const user = userEvent.setup();
    renderWorkspace({ initialOrders: [layeredOrder], initialStatus: "active" });

    expect(screen.getByText("O-DSE-26061100010")).toBeInTheDocument();
    expect(screen.getByText("2개 품목")).toBeInTheDocument();
    expect(screen.getByText("출하계획 3건")).toBeInTheDocument();
    expect(screen.queryByText("실리콘 몰드 P")).not.toBeInTheDocument();

    expectCarbonExpandableZebraRows(screen.getByRole("table", { name: "주문 목록" }));

    await user.click(screen.getByRole("button", { name: "O-DSE-26061100010 품목 펼치기" }));

    const subItems = screen.getByRole("region", { name: "O-DSE-26061100010 주문 품목" });
    expect(within(subItems).getByText("주문 품목")).toBeInTheDocument();
    expect(within(subItems).getByText("DS-1042")).toBeInTheDocument();
    expect(within(subItems).getByText("실리콘 패킹 R")).toBeInTheDocument();
    expect(within(subItems).getByText("DS-3301")).toBeInTheDocument();
    expect(within(subItems).getByText("실리콘 몰드 P")).toBeInTheDocument();
    expect(within(subItems).getByText("06/18 300개, 06/25 200개")).toBeInTheDocument();
  });

  test("shows read-only order status without tabs or create action", () => {
    renderWorkspace({ mode: "status" });

    expect(screen.getByRole("heading", { name: "주문 현황" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "새 주문" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("O-DSE-26061000001")).toBeInTheDocument();
    expect(screen.getByText("O-SRTECH-26060900008")).toBeInTheDocument();
    expect(screen.getByText("O-WJMED-26060800004")).toBeInTheDocument();
    expect(screen.queryByText("O-DSE-26060700002")).not.toBeInTheDocument();
    expect(screen.queryByText("O-DSE-26060600002")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "삭제됨" })).not.toBeInTheDocument();
  });

  test("can include completed orders older than three days in order status", async () => {
    const user = userEvent.setup();
    renderWorkspace({ mode: "status" });

    const excludeOldCompleted = screen.getByRole("checkbox", { name: "3일이상 출하완료건 제외" });
    expect(excludeOldCompleted).toBeChecked();
    expect(screen.queryByText("O-DSE-26060700002")).not.toBeInTheDocument();

    await user.click(excludeOldCompleted);

    expect(screen.getByText("O-DSE-26060700002")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "전체 선택" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전달" })).not.toBeInTheDocument();
  });

  test("drawer validates required fields", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));

    expect(screen.getByRole("complementary", { name: "주문 입력" })).toBeInTheDocument();
    expect(screen.getByLabelText("주문 담당자")).toHaveValue("관리자 / admin@dss.local");

    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("입력값을 확인하세요.")).toBeInTheDocument();
    expect(screen.getByText("주문 요청일: 필수 항목을 입력하세요.")).toBeInTheDocument();
  });

  test("drawer shows product shipment quantity mismatch errors", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.type(screen.getByLabelText("주문 요청일"), "2026-06-10");
    await user.selectOptions(screen.getByLabelText("채널"), "카톡");
    await user.selectOptions(screen.getByLabelText("고객사 및 담당자"), "customer-1::contact-1");
    await user.selectOptions(screen.getByLabelText("제품 1 제품/설계"), "design-1");
    await user.clear(screen.getByLabelText("제품 1 수량"));
    await user.type(screen.getByLabelText("제품 1 수량"), "500");
    await user.type(screen.getByLabelText("제품 1 출하일 1"), "2026-06-18");
    await user.clear(screen.getByLabelText("제품 1 출하수량 1"));
    await user.type(screen.getByLabelText("제품 1 출하수량 1"), "300");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText(/출하계획 수량 합계/)).toBeInTheDocument();
  });

  test("drawer supports adding another product with its own shipment plan", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      designOptions: [
        ...lookupProps.designOptions,
        {
          value: "design-2",
          label: "DS-3301 / 실리콘 몰드 P / P-300",
          designNo: "DS-3301",
          productName: "실리콘 몰드 P",
          specification: "P-300",
          departmentCode: "P" as const,
          defaultUnitsPerHour: 45,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.click(screen.getByRole("button", { name: "제품 추가" }));

    expect(screen.getByLabelText("제품 2 제품/설계")).toBeInTheDocument();
    expect(screen.getByLabelText("제품 2 출하일 1")).toBeInTheDocument();
  });

  test("prefills lookup selections when editing an order", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "수정" }));

    expect(screen.getByLabelText("고객사 및 담당자")).toHaveValue("customer-1::contact-1");
    expect(screen.getByLabelText("제품 1 제품/설계")).toHaveValue("design-1");
  });

  test("filters order drawer lookup options", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      contactOptions: [
        ...lookupProps.contactOptions,
        {
          value: "customer-2::contact-2",
          customerId: "customer-2",
          contactId: "contact-2",
          customerTicker: "SRTECH",
          label: "세림테크 / 이준호",
        },
      ],
      designOptions: [
        ...lookupProps.designOptions,
        {
          value: "design-2",
          label: "DS-3301 / 실리콘 몰드 P / P-300",
          designNo: "DS-3301",
          productName: "실리콘 몰드 P",
          specification: "P-300",
          departmentCode: "P" as const,
          defaultUnitsPerHour: 45,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.type(screen.getByRole("searchbox", { name: "고객사 및 담당자 검색" }), "세림");
    expect(screen.getByRole("option", { name: "세림테크 / 이준호" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "동성전자 / 김영수" })).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "제품/설계 검색" }), "3301");
    expect(screen.getByRole("option", { name: "DS-3301 / 실리콘 몰드 P / P-300" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "DS-1042 / 실리콘 패킹 R / R-100" })).not.toBeInTheDocument();
  });

  test("shows future-scope toasts for reference creation buttons in the drawer", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.click(screen.getByRole("button", { name: "신규" }));
    expect(screen.getByText("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "신규 제품 등록" }));
    expect(screen.getByText("신규 제품 등록 기능은 추후 개발 예정입니다.")).toBeInTheDocument();
  });

  test("creates orders in local state without refreshing server data", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.type(screen.getByLabelText("주문 요청일"), "2026-06-10");
    await user.selectOptions(screen.getByLabelText("채널"), "카톡");
    await user.selectOptions(screen.getByLabelText("고객사 및 담당자"), "customer-1::contact-1");
    await user.selectOptions(screen.getByLabelText("제품 1 제품/설계"), "design-1");
    await user.clear(screen.getByLabelText("제품 1 수량"));
    await user.type(screen.getByLabelText("제품 1 수량"), "77");
    await user.type(screen.getByLabelText("제품 1 출하일 1"), "2026-07-03");
    await user.clear(screen.getByLabelText("제품 1 출하수량 1"));
    await user.type(screen.getByLabelText("제품 1 출하수량 1"), "77");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByRole("complementary", { name: "주문 입력" })).not.toBeInTheDocument();
    expect(screen.getByText("77")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /품목 펼치기/ })[0]);
    const subItems = screen.getByRole("region", { name: /주문 품목/ });
    expect(within(subItems).getByText("07/03 77개")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("moves released orders in local state without refreshing server data", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "전달" }));
    const dialog = screen.getByRole("dialog", { name: "생산팀 전달 확인" });
    expect(within(dialog).getByRole("button", { name: "돌아가기" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "전달" }));

    expect(screen.queryByText("O-DSE-26061000001")).not.toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("supports batch cancelling selected active orders", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "O-DSE-26061000001 선택" }));
    await user.click(screen.getByRole("button", { name: "선택 주문 취소" }));
    const dialog = screen.getByRole("dialog", { name: "주문 취소 확인" });
    await user.click(within(dialog).getByRole("button", { name: "주문 취소" }));

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("O-DSE-26061000001")).not.toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("asks for confirmation before closing a dirty drawer", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.type(screen.getByLabelText("주문 요청일"), "2026-06-10");
    await user.click(screen.getByRole("button", { name: "닫기" }));

    const dialog = screen.getByRole("dialog", { name: "변경사항 확인" });
    expect(within(dialog).getByText("변경사항을 저장하지 않고 닫을까요?")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "계속 편집" })).toBeInTheDocument();
  });
});
