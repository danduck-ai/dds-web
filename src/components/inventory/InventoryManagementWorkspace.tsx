"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Tag,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandHeader,
  TableExpandedRow,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";

import {
  createInventoryLedgerRows,
  createInventoryRows,
  type ProductionInventoryLedgerRow,
  type ProductionInventoryRow,
  type ProductionManagementSeed,
} from "@/features/production/product-management";

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatSignedQuantity(value: number) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${formatNumber(Math.abs(value))}개`;
}

function InventoryStatusTable({ rows }: { rows: ProductionInventoryRow[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  if (rows.length === 0) {
    return <Tile className="dss-empty-state">표시할 주문제품 재고가 없습니다.</Tile>;
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
    <TableContainer title="주문 제품 기준 재고 현황">
      <Table className="dss-inventory-status-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableExpandHeader id="inventory-expand" />
            <TableHeader>고객사</TableHeader>
            <TableHeader>제품명</TableHeader>
            <TableHeader>재고수량</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = expandedIds.has(row.orderProductId);

            return (
              <Fragment key={row.orderProductId}>
                <TableExpandRow
                  aria-controls={`inventory-storage-${row.orderProductId}`}
                  aria-label={`${row.productName} 보관장소별 재고 펼치기`}
                  expandHeader="inventory-expand"
                  expandIconDescription="보관장소별 재고 펼치기"
                  isExpanded={isExpanded}
                  onExpand={() => toggleExpanded(row.orderProductId)}
                >
                  <TableCell title={row.customerName}>{row.customerName}</TableCell>
                  <TableCell title={`${row.productName} ${row.specification}`}>
                    <strong>{row.productName}</strong>
                    <span className="dss-product-status-table__secondary">{row.specification}</span>
                  </TableCell>
                  <TableCell>{formatNumber(row.stockQuantity)}개</TableCell>
                </TableExpandRow>
                <TableExpandedRow
                  className="dss-inventory-status-table__expanded"
                  colSpan={4}
                  hidden={!isExpanded}
                  id={`inventory-storage-${row.orderProductId}`}
                >
                  {isExpanded ? (
                    <TableContainer title={`${row.productName} 보관장소별 재고`}>
                      <Table className="dss-inventory-storage-table" size="md" useZebraStyles>
                        <TableHead>
                          <TableRow>
                            <TableHeader>보관장소</TableHeader>
                            <TableHeader>수량</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {row.storageLocationGroups.map((group) => (
                            <TableRow key={`${row.orderProductId}-${group.storageLocation}`}>
                              <TableCell>{group.storageLocation}</TableCell>
                              <TableCell>{formatNumber(group.quantity)}개</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : null}
                </TableExpandedRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function InventoryLedgerTable({ rows }: { rows: ProductionInventoryLedgerRow[] }) {
  if (rows.length === 0) {
    return <Tile className="dss-empty-state">표시할 입/출고 내역이 없습니다.</Tile>;
  }

  return (
    <TableContainer title="입/출고 내역">
      <Table className="dss-inventory-ledger-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableHeader>구분</TableHeader>
            <TableHeader>제품명</TableHeader>
            <TableHeader>수량</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Tag type={row.transactionKind === "inbound" ? "green" : "red"}>{row.transactionLabel}</Tag>
              </TableCell>
              <TableCell title={`${row.productName} ${row.specification}`}>
                <strong>{row.productName}</strong>
                <span className="dss-product-status-table__secondary">{row.specification}</span>
              </TableCell>
              <TableCell className={`dss-inventory-ledger-table__quantity dss-inventory-ledger-table__quantity--${row.transactionKind}`}>
                {formatSignedQuantity(row.signedQuantity)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function InventoryManagementWorkspace({ initialSeed }: { initialSeed: ProductionManagementSeed }) {
  const inventoryRows = useMemo(() => createInventoryRows(initialSeed), [initialSeed]);
  const ledgerRows = useMemo(() => createInventoryLedgerRows(initialSeed), [initialSeed]);

  return (
    <main className="dss-page dss-inventory-management-page">
      <header className="dss-page-header">
        <div>
          <h1>재고 관리</h1>
          <p>주문 제품 기준 현재 재고와 입출고 흐름을 확인합니다.</p>
        </div>
      </header>

      <InventoryStatusTable rows={inventoryRows} />
      <InventoryLedgerTable rows={ledgerRows} />
    </main>
  );
}
