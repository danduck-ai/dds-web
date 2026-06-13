import type { AppRole } from "@/features/orders/types";

export function hasFullAccess(role: AppRole) {
  return role === "A" || role === "E";
}
