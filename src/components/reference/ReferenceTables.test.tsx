import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { TOAST_TIMEOUT_MS } from "@/components/notifications/ToastProvider";
import { CustomerReferenceTable, DesignReferenceTable } from "./ReferenceTables";

afterEach(() => {
  vi.useRealTimers();
});

describe("ReferenceTables", () => {
  test("renders designs as read-only rows", () => {
    render(
      <DesignReferenceTable
        rows={[
          {
            id: "design-1",
            designNo: "DS-1042",
            productName: "실리콘 패킹 R",
            specification: "R-100 / 5T",
            departmentCode: "R",
          },
        ]}
      />,
    );

    expect(screen.getByText("DS-1042")).toBeInTheDocument();
    expect(screen.getByText("실리콘 패킹 R")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
  });

  test("filters designs with the Carbon table search", async () => {
    const user = userEvent.setup();
    render(
      <DesignReferenceTable
        rows={[
          {
            id: "design-1",
            designNo: "DS-1042",
            productName: "실리콘 패킹 R",
            specification: "R-100 / 5T",
            departmentCode: "R",
          },
          {
            id: "design-2",
            designNo: "DS-3301",
            productName: "실리콘 몰드 P",
            specification: "P-300",
            departmentCode: "P",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "설계 검색" }), "3301");

    expect(screen.getByText("DS-3301")).toBeInTheDocument();
    expect(screen.queryByText("DS-1042")).not.toBeInTheDocument();
  });

  test("renders customers as read-only rows and shows future-scope toast", async () => {
    const user = userEvent.setup();
    render(
      <CustomerReferenceTable
        rows={[
          {
            id: "customer-1",
            name: "동성전자",
            identifier: "DS-ELEC",
            businessRegistrationNo: "101-81-00001",
            contactSummary: "김영수 / 010-1000-1001",
          },
        ]}
      />,
    );

    expect(screen.getByText("동성전자")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "신규 고객 입력" }));

    const toastMessage = await screen.findByText("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.");
    const toastStack = toastMessage.closest(".dss-toast-stack");

    expect(toastMessage).toBeInTheDocument();
    expect(toastStack?.parentElement).toBe(document.body);
    expect(document.querySelector(".dss-page .dss-toast-stack")).not.toBeInTheDocument();
  });

  test("dismisses future-scope toasts after the Carbon recommended timeout", async () => {
    vi.useFakeTimers();

    render(
      <CustomerReferenceTable
        rows={[
          {
            id: "customer-1",
            name: "동성전자",
            identifier: "DS-ELEC",
            businessRegistrationNo: "101-81-00001",
            contactSummary: "김영수 / 010-1000-1001",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "신규 고객 입력" }));

    expect(screen.getByText("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(TOAST_TIMEOUT_MS);
    });

    expect(screen.queryByText("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")).not.toBeInTheDocument();
  });

  test("filters customers with the Carbon table search", async () => {
    const user = userEvent.setup();
    render(
      <CustomerReferenceTable
        rows={[
          {
            id: "customer-1",
            name: "동성전자",
            identifier: "DS-ELEC",
            businessRegistrationNo: "101-81-00001",
            contactSummary: "김영수 / 010-1000-1001",
          },
          {
            id: "customer-2",
            name: "세림테크",
            identifier: "SR-TECH",
            businessRegistrationNo: "101-81-00002",
            contactSummary: "이준호 / 010-2000-2002",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "고객 검색" }), "세림");

    expect(screen.getByText("세림테크")).toBeInTheDocument();
    expect(screen.queryByText("동성전자")).not.toBeInTheDocument();
  });
});
