import type { DepartmentCode, ProductionWorkStatus } from "@/features/orders/types";

export type ProductionPlanCard = {
  id: string;
  productionPlanId: string;
  shipmentPlanId: string;
  orderNo: string;
  customerName: string;
  designNo: string;
  productName: string;
  specification: string;
  departmentCode: DepartmentCode;
  plannedShipDate: string;
  shipmentQuantity: number;
  remainingQuantity: number;
  defaultUnitsPerHour: number;
  quantity: number | null;
  estimatedDurationMinutes: number | null;
  workStatus: ProductionWorkStatus;
  availableFromDate?: string | null;
  productionDate?: string | null;
  sequence?: number;
  sourceProductionPlanId?: string;
};

export type CardFilterOptions = {
  departmentCode: DepartmentCode;
  productionDate: string;
};

export type ConfirmationOptions = {
  productionDate: string;
  departmentCode: DepartmentCode;
  workStartTime: string;
};

export type ProductionPlanAssignment = {
  productionPlanId: string;
  productionDate: string;
  departmentCode: DepartmentCode;
  sequence: number;
  startTime: string;
  endTime: string;
  quantity: number;
  estimatedDurationMinutes: number;
};

export type ConfirmationResult =
  | {
      ok: true;
      assignments: ProductionPlanAssignment[];
    }
  | {
      ok: false;
      error: string;
      assignments: [];
    };

export type DeferCardResult = {
  visibleCards: ProductionPlanCard[];
  deferredCard: ProductionPlanCard | null;
};
