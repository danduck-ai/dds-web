import mockData from "@/features/mock-data/dss.json";

export type DesignRow = {
  id: string;
  design_no: string;
  product_name: string;
  specification: string;
  department_code: "R" | "S" | "P";
  default_units_per_hour?: number;
};

export type DesignTableRow = {
  id: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: "R" | "S" | "P";
  defaultUnitsPerHour: number;
};

export type CustomerRow = {
  id: string;
  name: string;
  business_registration_no: string | null;
  identifier: string | null;
  ticker?: string | null;
};

export type ContactRow = {
  id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
};

export type ContactModel = {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  position: string;
};

export type CustomerTableRow = {
  id: string;
  name: string;
  identifier: string;
  businessRegistrationNo: string;
  contactSummary: string;
};

export type ContactOption = {
  value: string;
  customerId: string;
  contactId: string;
  customerTicker: string;
  label: string;
};

export type DesignOption = {
  value: string;
  label: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: "R" | "S" | "P";
  defaultUnitsPerHour: number;
};

function fallbackCustomerTicker(customer: Pick<CustomerRow, "identifier" | "name" | "id">) {
  const source = customer.identifier || customer.name || customer.id;
  const ticker = source.replace(/[^a-z0-9]/gi, "").toUpperCase();

  return ticker || "CUSTOMER";
}

export function mapDesignRows(rows: DesignRow[]): DesignTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    designNo: row.design_no,
    productName: row.product_name,
    specification: row.specification,
    departmentCode: row.department_code,
    defaultUnitsPerHour: row.default_units_per_hour ?? 60,
  }));
}

export function mapContacts(rows: ContactRow[]): ContactModel[] {
  return rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    position: row.position ?? "",
  }));
}

export function mapCustomerRows(
  rows: CustomerRow[],
  contacts: ContactModel[],
): CustomerTableRow[] {
  return rows.map((row) => {
    const customerContacts = contacts.filter((contact) => contact.customerId === row.id);
    const contactSummary =
      customerContacts.length === 0
        ? "-"
        : customerContacts
            .map((contact) => [contact.name, contact.phone].filter(Boolean).join(" / "))
            .join(", ");

    return {
      id: row.id,
      name: row.name,
      identifier: row.identifier ?? "-",
      businessRegistrationNo: row.business_registration_no ?? "-",
      contactSummary,
    };
  });
}

export async function listDesigns() {
  const rows = mockData.designs
    .filter((design) => design.is_active)
    .sort((left, right) => left.design_no.localeCompare(right.design_no));

  return mapDesignRows(rows as DesignRow[]);
}

export async function listCustomers() {
  const customers = mockData.customers
    .filter((customer) => customer.is_active)
    .sort((left, right) => left.name.localeCompare(right.name));
  const contacts = mockData.contacts
    .filter((contact) => contact.is_active)
    .sort((left, right) => left.name.localeCompare(right.name));

  return mapCustomerRows(customers, mapContacts(contacts));
}

export async function listOrderFormLookups() {
  const customers = mockData.customers
    .filter((customer) => customer.is_active)
    .sort((left, right) => left.name.localeCompare(right.name));
  const contacts = mockData.contacts
    .filter((contact) => contact.is_active)
    .sort((left, right) => left.name.localeCompare(right.name));
  const designs = mockData.designs
    .filter((design) => design.is_active)
    .sort((left, right) => left.design_no.localeCompare(right.design_no)) as DesignRow[];

  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.name]));
  const customerTickerById = new Map(
    customers.map((customer) => [
      customer.id,
      (customer.ticker || fallbackCustomerTicker(customer)).replace(/[^a-z0-9]/gi, "").toUpperCase(),
    ]),
  );

  const contactOptions: ContactOption[] = contacts.map((contact) => ({
    value: `${contact.customer_id}::${contact.id}`,
    customerId: contact.customer_id,
    contactId: contact.id,
    customerTicker: customerTickerById.get(contact.customer_id) ?? "CUSTOMER",
    label: `${customerNameById.get(contact.customer_id) ?? "-"} / ${contact.name}`,
  }));

  const designOptions: DesignOption[] = mapDesignRows(designs).map((design) => ({
    value: design.id,
    label: `${design.designNo} / ${design.productName} / ${design.specification}`,
    designNo: design.designNo,
    productName: design.productName,
    specification: design.specification,
    departmentCode: design.departmentCode,
    defaultUnitsPerHour: design.defaultUnitsPerHour,
  }));

  return { contactOptions, designOptions };
}
