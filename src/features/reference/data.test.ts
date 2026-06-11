import { describe, expect, test } from "vitest";

import { mapContacts, mapCustomerRows, mapDesignRows } from "./data";

describe("reference row mapping", () => {
  test("maps designs into read-only table rows", () => {
    expect(
      mapDesignRows([
        {
          id: "design-1",
          design_no: "DS-1042",
          product_name: "실리콘 패킹 R",
          specification: "R-100 / 5T",
          department_code: "R",
          default_units_per_hour: 120,
        },
      ]),
    ).toEqual([
      {
        id: "design-1",
        designNo: "DS-1042",
        productName: "실리콘 패킹 R",
        specification: "R-100 / 5T",
        departmentCode: "R",
        defaultUnitsPerHour: 120,
      },
    ]);
  });

  test("maps customers with their contact summaries", () => {
    const contacts = mapContacts([
      {
        id: "contact-1",
        customer_id: "customer-1",
        name: "김영수",
        phone: "010-1000-1001",
        email: "youngsoo@example.com",
        position: "구매팀장",
      },
    ]);

    expect(
      mapCustomerRows(
        [
          {
            id: "customer-1",
            name: "동성전자",
            business_registration_no: "101-81-00001",
            identifier: "DS-ELEC",
          },
        ],
        contacts,
      ),
    ).toEqual([
      {
        id: "customer-1",
        name: "동성전자",
        identifier: "DS-ELEC",
        businessRegistrationNo: "101-81-00001",
        contactSummary: "김영수 / 010-1000-1001",
      },
    ]);
  });
});
