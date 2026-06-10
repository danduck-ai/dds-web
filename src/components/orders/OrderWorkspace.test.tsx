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

const orders: OrderListRow[] = [
  {
    id: "order-active",
    orderNo: "260610-0001",
    status: "active",
    statusLabel: "접수",
    requestedDate: "2026-06-10",
    channel: "카톡",
    customerName: "동성전자",
    contactName: "김영수",
    designNo: "DS-1042",
    productName: "실리콘 패킹 R",
    specification: "R-100",
    departmentCode: "R",
    quantity: 500,
    deliveryType: "single",
    deliveryLabel: "06/18",
    schedules: [{ scheduledDate: "2026-06-18", quantity: 500 }],
    createdAt: "2026-06-10T01:00:00.000Z",
    searchText: "260610-0001 동성전자 김영수",
  },
  {
    id: "order-released",
    orderNo: "260609-0008",
    status: "released",
    statusLabel: "생산중",
    requestedDate: "2026-06-09",
    channel: "전화",
    customerName: "세림테크",
    contactName: "이준호",
    designNo: "DS-3301",
    productName: "실리콘 몰드 P",
    specification: "P-300",
    departmentCode: "P",
    quantity: 120,
    deliveryType: "single",
    deliveryLabel: "06/21",
    schedules: [{ scheduledDate: "2026-06-21", quantity: 120 }],
    createdAt: "2026-06-09T01:00:00.000Z",
    searchText: "260609-0008 세림테크 이준호",
  },
];

const lookupProps = {
  contactOptions: [
    {
      value: "customer-1::contact-1",
      customerId: "customer-1",
      contactId: "contact-1",
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
    },
  ],
};

function renderWorkspace(extraProps: Partial<React.ComponentProps<typeof OrderWorkspace>> = {}) {
  return render(
    <OrderWorkspace
      initialOrders={orders}
      initialStatus="active"
      role="A"
      onCreateOrder={vi.fn().mockResolvedValue({ ok: true, message: "saved" })}
      onReleaseOrders={vi.fn().mockResolvedValue({ ok: true, message: "released" })}
      onCancelOrders={vi.fn().mockResolvedValue({ ok: true, message: "cancelled" })}
      {...lookupProps}
      {...extraProps}
    />,
  );
}

describe("OrderWorkspace", () => {
  beforeEach(() => {
    refreshMock.mockClear();
  });

  test("shows checkboxes and row actions in the active tab", () => {
    renderWorkspace();

    expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전달" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  test("hides checkboxes and actions in read-only tabs", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "생산중" }));

    expect(screen.queryByRole("checkbox", { name: "전체 선택" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전달" })).not.toBeInTheDocument();
    expect(screen.getByText("260609-0008")).toBeInTheDocument();
  });

  test("drawer validates required fields", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("입력값을 확인하세요.")).toBeInTheDocument();
    expect(screen.getByText("주문 요청일: 필수 항목을 입력하세요.")).toBeInTheDocument();
  });

  test("drawer shows split quantity mismatch errors", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "새 주문" }));
    await user.type(screen.getByLabelText("주문 요청일"), "2026-06-10");
    await user.selectOptions(screen.getByLabelText("채널"), "카톡");
    await user.selectOptions(screen.getByLabelText("고객사 및 담당자"), "customer-1::contact-1");
    await user.selectOptions(screen.getByLabelText("제품/설계"), "design-1");
    await user.clear(screen.getByLabelText("주문 수량"));
    await user.type(screen.getByLabelText("주문 수량"), "500");
    await user.click(screen.getByLabelText("분할 출하"));
    await user.type(screen.getByLabelText("출하일 1"), "2026-06-18");
    await user.clear(screen.getByLabelText("수량 1"));
    await user.type(screen.getByLabelText("수량 1"), "300");
    await user.type(screen.getByLabelText("출하일 2"), "2026-06-25");
    await user.clear(screen.getByLabelText("수량 2"));
    await user.type(screen.getByLabelText("수량 2"), "100");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText(/납기 수량 합계/)).toBeInTheDocument();
  });

  test("prefills lookup selections when editing an order", async () => {
    const user = userEvent.setup();
    const onUpdateOrder = vi.fn().mockResolvedValue({ ok: true, message: "updated" });
    renderWorkspace({ onUpdateOrder });

    await user.click(screen.getByRole("button", { name: "수정" }));

    expect(screen.getByLabelText("고객사 및 담당자")).toHaveValue("customer-1::contact-1");
    expect(screen.getByLabelText("제품/설계")).toHaveValue("design-1");
  });

  test("refreshes server data after releasing an order", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "전달" }));
    const dialog = screen.getByRole("dialog", { name: "생산팀 전달 확인" });
    expect(within(dialog).getByRole("button", { name: "돌아가기" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "전달" }));

    expect(refreshMock).toHaveBeenCalledTimes(1);
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
