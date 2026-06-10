"use client";

import { useMemo, useState } from "react";

import type { AppRole, OrderFormInput, OrderListRow, OrderStatus } from "@/features/orders/types";
import type { ContactOption, DesignOption } from "@/features/reference/data";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { OrderDrawer } from "./OrderDrawer";
import { OrderTable } from "./OrderTable";
import { ToastMessage, ToastViewport } from "@/components/notifications/ToastProvider";

type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof OrderFormInput | "schedules", string>>;
};

const tabs: Array<{ status: OrderStatus; label: string; empty: string }> = [
  { status: "active", label: "접수", empty: "접수된 주문이 없습니다." },
  { status: "released", label: "생산중", empty: "생산중 주문이 없습니다." },
  { status: "completed", label: "출하 완료", empty: "출하 완료 주문이 없습니다." },
  { status: "cancelled", label: "삭제됨", empty: "취소된 주문이 없습니다." },
];

export function OrderWorkspace({
  initialOrders,
  initialStatus,
  role,
  contactOptions,
  designOptions,
  onCreateOrder,
  onUpdateOrder,
  onReleaseOrders,
  onCancelOrders,
}: {
  initialOrders: OrderListRow[];
  initialStatus: OrderStatus;
  role: AppRole;
  contactOptions: ContactOption[];
  designOptions: DesignOption[];
  onCreateOrder: (input: OrderFormInput) => Promise<ActionResult>;
  onUpdateOrder?: (id: string, input: OrderFormInput) => Promise<ActionResult>;
  onReleaseOrders: (ids: string[]) => Promise<ActionResult>;
  onCancelOrders: (ids: string[]) => Promise<ActionResult>;
}) {
  const [activeStatus, setActiveStatus] = useState<OrderStatus>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerState, setDrawerState] = useState<null | { mode: "create" | "edit"; order: OrderListRow | null }>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<null | { kind: "release" | "cancel"; ids: string[] }>(
    null,
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const rows = useMemo(
    () => initialOrders.filter((order) => order.status === activeStatus),
    [activeStatus, initialOrders],
  );
  const activeTab = tabs.find((tab) => tab.status === activeStatus) ?? tabs[0];
  const canManage = role === "A" && activeStatus === "active";

  function showToast(kind: ToastMessage["kind"], title: string) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, kind, title }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }

  function switchTab(status: OrderStatus) {
    setActiveStatus(status);
    setSelectedIds(new Set());
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

  async function executePendingAction() {
    if (!pendingAction) {
      return;
    }

    const result =
      pendingAction.kind === "release"
        ? await onReleaseOrders(pendingAction.ids)
        : await onCancelOrders(pendingAction.ids);

    showToast(result.ok ? "success" : "error", result.message);
    setPendingAction(null);
    setSelectedIds(new Set());
  }

  return (
    <main className="orders-page">
      <ToastViewport messages={toasts} />
      <header className="orders-page__header">
        <div>
          <h1>주문 현황</h1>
          <p>등록된 주문을 접수, 생산중, 출하 완료, 삭제됨 상태로 관리합니다.</p>
        </div>
        {role === "A" ? (
          <button className="primary-button" type="button" onClick={() => setDrawerState({ mode: "create", order: null })}>
            새 주문
          </button>
        ) : null}
      </header>

      <div className="status-tabs" role="tablist" aria-label="주문 상태">
        {tabs.map((tab) => (
          <button
            aria-selected={tab.status === activeStatus}
            key={tab.status}
            role="tab"
            type="button"
            onClick={() => switchTab(tab.status)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {canManage && selectedIds.size > 0 ? (
        <div className="batch-bar">
          <span>{selectedIds.size}건 선택됨</span>
          <button type="button" onClick={() => setSelectedIds(new Set())}>
            선택 취소
          </button>
          <button
            type="button"
            onClick={() => setPendingAction({ kind: "release", ids: Array.from(selectedIds) })}
          >
            선택 주문 생산팀 전달
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="empty-state">{activeTab.empty}</div>
      ) : (
        <OrderTable
          rows={rows}
          canManage={canManage}
          selectedIds={selectedIds}
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
          onClose={() => setDrawerState(null)}
          onSubmit={async (input) => {
            const result =
              drawerState.mode === "edit" && drawerState.order && onUpdateOrder
                ? await onUpdateOrder(drawerState.order.id, input)
                : await onCreateOrder(input);
            showToast(result.ok ? "success" : "error", result.message);
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
          confirmLabel={pendingAction.kind === "release" ? "전달" : "취소"}
          onCancel={() => setPendingAction(null)}
          onConfirm={executePendingAction}
        />
      ) : null}
    </main>
  );
}
