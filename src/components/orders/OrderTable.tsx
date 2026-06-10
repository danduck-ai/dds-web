"use client";

import type { OrderListRow } from "@/features/orders/types";

export function OrderTable({
  rows,
  canManage,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onEdit,
  onRelease,
  onCancel,
}: {
  rows: OrderListRow[];
  canManage: boolean;
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (row: OrderListRow) => void;
  onRelease: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="order-table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            {canManage ? (
              <th className="order-table__select">
                <input
                  aria-label="전체 선택"
                  checked={allSelected}
                  onChange={onToggleAll}
                  type="checkbox"
                />
              </th>
            ) : null}
            <th className="order-table__order-no">주문번호</th>
            <th className="order-table__date">주문요청일</th>
            <th className="order-table__customer">고객사</th>
            <th className="order-table__contact">담당자</th>
            <th className="order-table__compact">채널</th>
            <th className="order-table__compact">납기</th>
            <th className="order-table__compact">상태</th>
            {canManage ? <th className="order-table__actions">관리</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {canManage ? (
                <td className="order-table__select">
                  <input
                    aria-label={`${row.orderNo} 선택`}
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggleOne(row.id)}
                    type="checkbox"
                  />
                </td>
              ) : null}
              <td className="order-table__order-no" title={row.orderNo}>
                {row.orderNo}
              </td>
              <td className="order-table__date" title={row.requestedDate}>
                {row.requestedDate}
              </td>
              <td className="order-table__customer" title={row.customerName}>
                {row.customerName}
              </td>
              <td className="order-table__contact" title={row.contactName}>
                {row.contactName}
              </td>
              <td className="order-table__compact" title={row.channel}>
                {row.channel}
              </td>
              <td className="order-table__compact" title={row.deliveryLabel}>
                {row.deliveryLabel}
              </td>
              <td className="order-table__compact" title={row.statusLabel}>
                {row.statusLabel}
              </td>
              {canManage ? (
                <td className="order-table__actions">
                  <button type="button" onClick={() => onEdit(row)}>
                    수정
                  </button>
                  <button type="button" onClick={() => onRelease(row.id)}>
                    전달
                  </button>
                  <button type="button" onClick={() => onCancel(row.id)}>
                    취소
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
