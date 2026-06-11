"use client";

import { Fragment, useState } from "react";
import {
  Button,
  Stack,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  Tag,
} from "@carbon/react";
import { Edit, Send, TrashCan } from "@carbon/icons-react";

import type { OrderListRow, OrderProductRecord, OrderStatus } from "@/features/orders/types";

const statusTagTypes: Record<OrderStatus, "blue" | "teal" | "green" | "gray"> = {
  active: "blue",
  released: "teal",
  completed: "green",
  cancelled: "gray",
};

function translateBatchAction(id: string, args: { totalSelected?: number; totalCount?: number } = {}) {
  switch (id) {
    case "carbon.table.batch.cancel":
      return "선택 취소";
    case "carbon.table.batch.items.selected":
    case "carbon.table.batch.item.selected":
      return `${args.totalSelected ?? 0}건 선택됨`;
    case "carbon.table.batch.selectAll":
      return `${args.totalCount ?? 0}건 전체 선택`;
    default:
      return id;
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatMonthDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  return `${match[2]}/${match[3]}`;
}

function getProductCountLabel(row: OrderListRow) {
  return `${formatNumber(row.products.length)}개 품목`;
}

function getShipmentPlanCount(row: OrderListRow) {
  return row.products.reduce((total, product) => total + product.shipmentPlans.length, 0);
}

function getShipmentPlanCountLabel(row: OrderListRow) {
  return `출하계획 ${formatNumber(getShipmentPlanCount(row))}건`;
}

function getShipmentPlanSummary(product: OrderProductRecord) {
  if (product.shipmentPlans.length === 0) {
    return "미등록";
  }

  return product.shipmentPlans
    .map((plan) => `${formatMonthDay(plan.plannedShipDate)} ${formatNumber(plan.quantity)}개`)
    .join(", ");
}

export function OrderTable({
  rows,
  canManage,
  selectedIds,
  onClearSelection,
  onReleaseSelected,
  onCancelSelected,
  onToggleAll,
  onToggleOne,
  onEdit,
  onRelease,
  onCancel,
}: {
  rows: OrderListRow[];
  canManage: boolean;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onReleaseSelected: () => void;
  onCancelSelected: () => void;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (row: OrderListRow) => void;
  onRelease: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const tableColumnCount = 1 + 9 + (canManage ? 2 : 0);

  if (rows.length === 0) {
    return null;
  }

  function toggleExpanded(rowId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  }

  return (
    <TableContainer description="현재 상태에 해당하는 주문 목록입니다." title="주문 목록">
      {canManage ? (
        <TableToolbar aria-label="주문 선택 작업">
          <TableBatchActions
            onCancel={onClearSelection}
            shouldShowBatchActions={selectedIds.size > 0}
            totalCount={rows.length}
            totalSelected={selectedIds.size}
            translateWithId={translateBatchAction}
          >
            <TableBatchAction renderIcon={Send} onClick={onReleaseSelected}>
              선택 주문 생산팀 전달
            </TableBatchAction>
            <TableBatchAction renderIcon={TrashCan} onClick={onCancelSelected}>
              선택 주문 취소
            </TableBatchAction>
          </TableBatchActions>
          <TableToolbarContent />
        </TableToolbar>
      ) : null}
      <Table className="dss-order-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableExpandHeader id="orders-expand" />
            {canManage ? (
              <TableSelectAll
                aria-label="전체 선택"
                checked={allSelected}
                id="orders-select-all"
                indeterminate={selectedIds.size > 0 && !allSelected}
                name="orders-select-all"
                onSelect={() => onToggleAll()}
              />
            ) : null}
            <TableHeader>주문번호</TableHeader>
            <TableHeader>주문요청일</TableHeader>
            <TableHeader>고객사</TableHeader>
            <TableHeader>담당자</TableHeader>
            <TableHeader>채널</TableHeader>
            <TableHeader>품목수</TableHeader>
            <TableHeader>총수량</TableHeader>
            <TableHeader>출하계획</TableHeader>
            <TableHeader>상태</TableHeader>
            {canManage ? <TableHeader>관리</TableHeader> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = expandedIds.has(row.id);
            const productCountLabel = getProductCountLabel(row);
            const shipmentPlanCountLabel = getShipmentPlanCountLabel(row);

            return (
              <Fragment key={row.id}>
                <TableExpandRow
                  aria-controls={`order-products-${row.id}`}
                  aria-label={`${row.orderNo} 품목 펼치기`}
                  expandHeader="orders-expand"
                  expandIconDescription="품목 펼치기"
                  isExpanded={isExpanded}
                  isSelected={selectedIds.has(row.id)}
                  onExpand={() => toggleExpanded(row.id)}
                >
                  {canManage ? (
                    <TableSelectRow
                      aria-label={`${row.orderNo} 선택`}
                      checked={selectedIds.has(row.id)}
                      id={`orders-select-${row.id}`}
                      name="orders-select-row"
                      onSelect={() => onToggleOne(row.id)}
                    />
                  ) : null}
                  <TableCell title={row.orderNo}>
                    {row.orderNo}
                  </TableCell>
                  <TableCell title={row.requestedDate}>
                    {row.requestedDate}
                  </TableCell>
                  <TableCell title={row.customerName}>
                    {row.customerName}
                  </TableCell>
                  <TableCell title={row.contactName}>
                    {row.contactName}
                  </TableCell>
                  <TableCell title={row.channel}>
                    {row.channel}
                  </TableCell>
                  <TableCell title={productCountLabel}>
                    {productCountLabel}
                  </TableCell>
                  <TableCell title={`${row.totalQuantity}`}>
                    {formatNumber(row.totalQuantity)}
                  </TableCell>
                  <TableCell title={shipmentPlanCountLabel}>
                    {shipmentPlanCountLabel}
                  </TableCell>
                  <TableCell title={row.statusLabel}>
                    <Tag size="sm" type={statusTagTypes[row.status]}>
                      {row.statusLabel}
                    </Tag>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Stack className="dss-table-actions" gap={2} orientation="horizontal">
                        <Button
                          hasIconOnly
                          iconDescription="수정"
                          kind="ghost"
                          renderIcon={Edit}
                          size="sm"
                          tooltipPosition="top"
                          type="button"
                          onClick={() => onEdit(row)}
                        />
                        <Button
                          hasIconOnly
                          iconDescription="전달"
                          kind="ghost"
                          renderIcon={Send}
                          size="sm"
                          tooltipPosition="top"
                          type="button"
                          onClick={() => onRelease(row.id)}
                        />
                        <Button
                          hasIconOnly
                          iconDescription="취소"
                          kind="danger--ghost"
                          renderIcon={TrashCan}
                          size="sm"
                          tooltipPosition="top"
                          type="button"
                          onClick={() => onCancel(row.id)}
                        />
                      </Stack>
                    </TableCell>
                  ) : null}
                </TableExpandRow>
                {isExpanded ? (
                  <TableExpandedRow id={`order-products-${row.id}`} colSpan={tableColumnCount}>
                    <section
                      aria-label={`${row.orderNo} 주문 품목`}
                      className="dss-order-products"
                      role="region"
                    >
                      <h3>주문 품목</h3>
                      <div
                        aria-label={`${row.orderNo} 품목 목록`}
                        className="dss-order-products__table"
                        role="table"
                      >
                        <div
                          className="dss-order-products__row dss-order-products__row--header"
                          role="row"
                        >
                          <span role="columnheader">설계번호</span>
                          <span role="columnheader">품명</span>
                          <span role="columnheader">규격</span>
                          <span role="columnheader">부서</span>
                          <span role="columnheader">수량</span>
                          <span role="columnheader">출하계획</span>
                        </div>
                        {row.products.map((product) => (
                          <div className="dss-order-products__row" key={product.id} role="row">
                            <span role="cell">{product.designNo}</span>
                            <span role="cell">{product.productName}</span>
                            <span role="cell">{product.specification}</span>
                            <span role="cell">{product.departmentCode}</span>
                            <span role="cell">{formatNumber(product.quantity)}개</span>
                            <span role="cell">{getShipmentPlanSummary(product)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </TableExpandedRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
