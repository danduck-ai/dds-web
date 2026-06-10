import { createClient } from "@/lib/supabase/server";

export type DesignRow = {
  id: string;
  design_no: string;
  product_name: string;
  specification: string;
  department_code: "R" | "S" | "P";
};

export type DesignTableRow = {
  id: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: "R" | "S" | "P";
};

export type CustomerRow = {
  id: string;
  name: string;
  business_registration_no: string | null;
  identifier: string | null;
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
  label: string;
};

export type DesignOption = {
  value: string;
  label: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: "R" | "S" | "P";
};

export function mapDesignRows(rows: DesignRow[]): DesignTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    designNo: row.design_no,
    productName: row.product_name,
    specification: row.specification,
    departmentCode: row.department_code,
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("designs")
    .select("id,design_no,product_name,specification,department_code")
    .eq("is_active", true)
    .order("design_no")
    .returns<DesignRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return mapDesignRows(data ?? []);
}

export async function listCustomers() {
  const supabase = await createClient();
  const [{ data: customers, error: customersError }, { data: contacts, error: contactsError }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id,name,business_registration_no,identifier")
        .eq("is_active", true)
        .order("name")
        .returns<CustomerRow[]>(),
      supabase
        .from("customer_contacts")
        .select("id,customer_id,name,phone,email,position")
        .eq("is_active", true)
        .order("name")
        .returns<ContactRow[]>(),
    ]);

  if (customersError) {
    throw new Error(customersError.message);
  }

  if (contactsError) {
    throw new Error(contactsError.message);
  }

  return mapCustomerRows(customers ?? [], mapContacts(contacts ?? []));
}

export async function listOrderFormLookups() {
  const supabase = await createClient();
  const [
    { data: customers, error: customersError },
    { data: contacts, error: contactsError },
    { data: designs, error: designsError },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,business_registration_no,identifier")
      .eq("is_active", true)
      .order("name")
      .returns<CustomerRow[]>(),
    supabase
      .from("customer_contacts")
      .select("id,customer_id,name,phone,email,position")
      .eq("is_active", true)
      .order("name")
      .returns<ContactRow[]>(),
    supabase
      .from("designs")
      .select("id,design_no,product_name,specification,department_code")
      .eq("is_active", true)
      .order("design_no")
      .returns<DesignRow[]>(),
  ]);

  if (customersError) {
    throw new Error(customersError.message);
  }
  if (contactsError) {
    throw new Error(contactsError.message);
  }
  if (designsError) {
    throw new Error(designsError.message);
  }

  const customerNameById = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));

  const contactOptions: ContactOption[] = (contacts ?? []).map((contact) => ({
    value: `${contact.customer_id}::${contact.id}`,
    customerId: contact.customer_id,
    contactId: contact.id,
    label: `${customerNameById.get(contact.customer_id) ?? "-"} / ${contact.name}`,
  }));

  const designOptions: DesignOption[] = mapDesignRows(designs ?? []).map((design) => ({
    value: design.id,
    label: `${design.designNo} / ${design.productName} / ${design.specification}`,
    designNo: design.designNo,
    productName: design.productName,
    specification: design.specification,
    departmentCode: design.departmentCode,
  }));

  return { contactOptions, designOptions };
}
