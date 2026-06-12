export type AppRole = "A" | "P" | "E";

export type OrderStatus = "active" | "released" | "completed" | "cancelled";

export type DepartmentCode = "R" | "S" | "P";

export type ShipmentStatus = "ready" | "partial" | "completed" | "stopped";

export type ProductionDurationSource = "product_default" | "manual_override";

export type ProductionWorkStatus = "unscheduled" | "scheduled" | "producing" | "completed";

export type ShipmentPlanInput = {
  plannedShipDate: string;
  quantity: number;
};

export type OrderProductInput = {
  designId: string;
  quantity: number;
  shipmentPlans: ShipmentPlanInput[];
};

export type OrderFormInput = {
  requestedDate: string;
  channel: string;
  customChannel?: string;
  customerId: string;
  contactId: string;
  products: OrderProductInput[];
};

export type FieldErrors = Partial<Record<keyof OrderFormInput | "products", string>>;

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
  products: OrderProductRecord[];
  createdAt: string;
  completedAt: string | null;
};

export type ProductionPlanRecord = {
  id: string;
  shipmentPlanId: string;
  quantity: number | null;
  completedQuantity: number;
  estimatedDurationMinutes: number | null;
  durationSource: ProductionDurationSource | null;
  workStatus: ProductionWorkStatus;
  availableFromDate?: string | null;
  productionDate?: string | null;
  sequence?: number;
};

export type ShipmentPlanRecord = {
  id: string;
  plannedShipDate: string;
  quantity: number;
  status: ShipmentStatus;
  productionPlans: ProductionPlanRecord[];
};

export type OrderProductRecord = {
  id: string;
  designId: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  defaultUnitsPerHour: number;
  quantity: number;
  shipmentPlans: ShipmentPlanRecord[];
};

export type OrderListRow = OrderRecord & {
  statusLabel: string;
  productSummary: string;
  shipmentLabel: string;
  totalQuantity: number;
  searchText: string;
};
