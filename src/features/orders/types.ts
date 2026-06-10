export type AppRole = "A" | "P" | "E";

export type OrderStatus = "active" | "released" | "completed" | "cancelled";

export type DeliveryType = "single" | "split";

export type DepartmentCode = "R" | "S" | "P";

export type DeliveryScheduleInput = {
  scheduledDate: string;
  quantity: number;
};

export type OrderFormInput = {
  requestedDate: string;
  channel: string;
  customChannel?: string;
  customerId: string;
  contactId: string;
  designId: string;
  quantity: number;
  deliveryType: DeliveryType;
  schedules: DeliveryScheduleInput[];
};

export type FieldErrors = Partial<Record<keyof OrderFormInput | "schedules", string>>;

export type ValidationResult = {
  ok: boolean;
  fieldErrors: FieldErrors;
  summary: string[];
};

export type OrderRecord = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  requestedDate: string;
  channel: string;
  customerName: string;
  contactName: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  quantity: number;
  deliveryType: DeliveryType;
  schedules: DeliveryScheduleInput[];
  createdAt: string;
};

export type OrderListRow = OrderRecord & {
  statusLabel: string;
  deliveryLabel: string;
  searchText: string;
};
