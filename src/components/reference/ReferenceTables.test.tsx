import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { CustomerReferenceTable, DesignReferenceTable } from "./ReferenceTables";

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

    expect(screen.getByText("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")).toBeInTheDocument();
  });
});
