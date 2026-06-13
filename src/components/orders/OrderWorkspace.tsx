"use client";

import { Button, Checkbox, Tile } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useMemo, useState } from "react";

import type { AppRole, OrderListRow, OrderStatus } from "@/features/orders/types";
import type { ContactOption, DesignOption } from "@/features/reference/data";
import {
  cancelLocalOrders,
  createLocalOrder,
  releaseLocalOrders,
  updateLocalOrder,
} from "@/features/orders/local-state";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { OrderDrawer } from "./OrderDrawer";
import { OrderTable } from "./OrderTable";
import { TOAST_TIMEOUT_MS, ToastMessage, ToastViewport } from "@/components/notifications/ToastProvider";

type OrderWorkspaceMode = "intake" | "status";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isCompletedAtLeastThreeDaysAgo(order: OrderListRow, currentDate: string) {
  if (order.status !== "completed" || !order.completedAt) {
    return false;
  }

  const completedAt = new Date(order.completedAt).getTime();
  const currentAt = new Date(currentDate).getTime();

  if (!Number.isFinite(completedAt) || !Number.isFinite(currentAt)) {
    return false;
  }

  return currentAt - completedAt >= THREE_DAYS_MS;
}

export function OrderWorkspace({
  initialOrders,
  initialStatus,
  mode = "intake",
  role,
  receiverLabel,
  contactOptions,
  designOptions,
  currentDate,
}: {
  initialOrders: OrderListRow[];
  initialStatus: OrderStatus;
  mode?: OrderWorkspaceMode;
  role: AppRole;
  receiverLabel: string;
  contactOptions: ContactOption[];
  designOptions: DesignOption[];
  currentDate?: string;
}) {
  const [orders, setOrders] = useState<OrderListRow[]>(() => initialOrders);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludeOldCompleted, setExcludeOldCompleted] = useState(true);
  const [drawerState, setDrawerState] = useState<null | { mode: "create" | "edit"; order: OrderListRow | null }>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<null | { kind: "release" | "cancel"; ids: string[] }>(
    null,
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const effectiveCurrentDate = currentDate ?? new Date().toISOString();

  const rows = useMemo(
    () =>
      orders.filter((order) => {
        if (mode === "intake") {
          return order.status === initialStatus;
        }

        if (order.status === "cancelled") {
          return false;
        }

        return !excludeOldCompleted || !isCompletedAtLeastThreeDaysAgo(order, effectiveCurrentDate);
      }),
    [effectiveCurrentDate, excludeOldCompleted, initialStatus, mode, orders],
  );
  const canManage = role === "A" && mode === "intake" && initialStatus === "active";
  const title = mode === "intake" ? "주문 접수" : "주문 현황";
  const description =
    mode === "intake"
      ? "새 주문을 등록하고 생산팀 전달 전 접수 주문을 관리합니다."
      : "취소건을 제외한 전체 주문 진행 상태를 한 목록에서 확인합니다.";
  const emptyMessage = mode === "intake" ? "접수 중인 주문이 없습니다." : "조회할 주문이 없습니다.";

  function showToast(kind: ToastMessage["kind"], title: string) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, kind, title }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_TIMEOUT_MS);
  }

  function toggleAll() {
    setSelectedIds((current) => {
      if (rows.every((row) => current.has(row.id))) {
        return new Set();
      }

      return new Set(rows.map((row) => row.id));
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function executePendingAction() {
    if (!pendingAction) {
      return;
    }

    const result =
      pendingAction.kind === "release"
        ? releaseLocalOrders(orders, pendingAction.ids)
        : cancelLocalOrders(orders, pendingAction.ids);

    showToast(result.ok ? "success" : "error", result.message);
    setPendingAction(null);
    setSelectedIds(new Set());

    if (result.ok) {
      setOrders(result.orders);
    }
  }

  return (
    <main className="dss-page">
      <ToastViewport messages={toasts} />
      <header className="dss-page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {canManage ? (
          <Button renderIcon={Add} type="button" onClick={() => setDrawerState({ mode: "create", order: null })}>
            새 주문
          </Button>
        ) : null}
      </header>

      {mode === "status" ? (
        <div className="dss-order-filter-bar">
          <Checkbox
            checked={excludeOldCompleted}
            id="orders-exclude-old-completed"
            labelText="3일이상 출하완료건 제외"
            onChange={(_, { checked }) => setExcludeOldCompleted(checked)}
          />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Tile className="dss-empty-state">{emptyMessage}</Tile>
      ) : (
        <OrderTable
          rows={rows}
          canManage={canManage}
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          onReleaseSelected={() => setPendingAction({ kind: "release", ids: Array.from(selectedIds) })}
          onCancelSelected={() => setPendingAction({ kind: "cancel", ids: Array.from(selectedIds) })}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onEdit={(order) => setDrawerState({ mode: "edit", order })}
          onRelease={(id) => setPendingAction({ kind: "release", ids: [id] })}
          onCancel={(id) => setPendingAction({ kind: "cancel", ids: [id] })}
        />
      )}

      {drawerState ? (
        <OrderDrawer
          mode={drawerState.mode}
          order={drawerState.order}
          contactOptions={contactOptions}
          designOptions={designOptions}
          receiverLabel={receiverLabel}
          onClose={() => setDrawerState(null)}
          onFutureAction={(message) => showToast("info", message)}
          onSubmit={async (input) => {
            const result =
              drawerState.mode === "edit" && drawerState.order
                ? updateLocalOrder(drawerState.order, input, { contactOptions, designOptions })
                : createLocalOrder(input, orders, { contactOptions, designOptions });
            showToast(result.ok ? "success" : "error", result.message);
            if (result.ok) {
              setOrders((current) =>
                drawerState.mode === "edit" && drawerState.order
                  ? current.map((order) => (order.id === drawerState.order?.id ? result.order : order))
                  : [result.order, ...current],
              );
              setSelectedIds(new Set());
            }
            return result;
          }}
        />
      ) : null}

      {pendingAction ? (
        <ConfirmActionModal
          title={pendingAction.kind === "release" ? "생산팀 전달 확인" : "주문 취소 확인"}
          body={`${pendingAction.ids.length}건을 ${
            pendingAction.kind === "release" ? "생산팀에 전달" : "취소"
          }할까요?`}
          confirmLabel={pendingAction.kind === "release" ? "전달" : "주문 취소"}
          cancelLabel="돌아가기"
          danger={pendingAction.kind === "cancel"}
          onCancel={() => setPendingAction(null)}
          onConfirm={executePendingAction}
        />
      ) : null}
    </main>
  );
}
