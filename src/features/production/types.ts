import type { DepartmentCode } from "@/features/orders/types";

export type DailyProductionDurationSource = "product_default" | "manual_override";

export type DailyProductionWorkStatus = "planned" | "producing" | "completed" | "cancelled";

export type DailyProductionCandidate = {
  id: string;
  orderProductId: string;
  orderId: string;
  orderNo: string;
  orderRequestedDate: string;
  orderProductCount: number;
  orderStatus: string;
  customerName: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  orderQuantity: number;
  defaultUnitsPerHour: number;
  nextShipDate: string;
  shipmentSummary: string;
};

export type DailyProductionSeedItem = {
  id: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  workStartTime: string;
  orderProductId: string;
  quantity: number;
  completedQuantity: number;
  estimatedDurationMinutes: number;
  durationSource: DailyProductionDurationSource;
  workStatus: DailyProductionWorkStatus;
  sequence: number;
};

export type DailyProductionSeed = {
  candidates: DailyProductionCandidate[];
  dayPlanItems: DailyProductionSeedItem[];
};

export type DailyProductionCard = {
  id: string;
  orderProductId: string;
  orderNo: string;
  customerName: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  orderQuantity: number;
  plannedQuantity: number;
  remainingQuantity: number;
  defaultUnitsPerHour: number;
  nextShipDate: string;
  shipmentSummary: string;
  quantity: number | null;
  completedQuantity: number;
  estimatedDurationMinutes: number | null;
  durationSource: DailyProductionDurationSource | null;
  workStatus: DailyProductionWorkStatus;
  productionDate?: string | null;
  sequence?: number;
  sourceOrderProductId?: string;
};

export type DailyPlanningCardFilterOptions = {
  departmentCode: DepartmentCode;
  productionDate: string;
};

export type DailyConfirmationOptions = {
  productionDate: string;
  departmentCode: DepartmentCode;
  workStartTime: string;
};

export type DailyProductionPlanItem = {
  id: string;
  orderProductId: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  sequence: number;
  startTime: string;
  endTime: string;
  quantity: number;
  completedQuantity: number;
  estimatedDurationMinutes: number;
  durationSource: DailyProductionDurationSource;
  workStatus: DailyProductionWorkStatus;
};

export type DailyProductionDayPlan = {
  id: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  workStartTime: string;
  items: DailyProductionPlanItem[];
};

export type DailyConfirmationResult =
  | {
      ok: true;
      dayPlan: DailyProductionDayPlan;
    }
  | {
      ok: false;
      error: string;
      dayPlan: null;
    };
