"use client";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  ToastNotification,
} from "@carbon/react";
import { useState } from "react";

import type { CustomerTableRow, DesignTableRow } from "@/features/reference/data";

function FutureToast({ message }: { message: string }) {
  return (
    <div className="dss-toast-stack" aria-live="polite">
      <ToastNotification
        hideCloseButton
        kind="info"
        lowContrast
        statusIconDescription="정보"
        title={message}
      />
    </div>
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function DesignReferenceTable({ rows }: { rows: DesignTableRow[] }) {
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.designNo, row.productName, row.specification, row.departmentCode]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows;

  return (
    <section className="dss-page">
      {toast ? <FutureToast message={toast} /> : null}
      <header className="dss-page-header">
        <div>
          <h1>설계 관리</h1>
          <p>제품 설계 기준 정보를 조회합니다.</p>
        </div>
        <Button
          kind="secondary"
          type="button"
          onClick={() => setToast("신규 제품/설계 등록 기능은 추후 개발 예정입니다.")}
        >
          신규 설계 입력
        </Button>
      </header>
      <TableContainer description="주문 입력에서 사용하는 설계 기준 정보입니다." title="설계 목록">
        <TableToolbar aria-label="설계 검색 도구">
          <TableToolbarContent>
            <TableToolbarSearch
              defaultExpanded
              expanded
              id="design-reference-search"
              labelText="설계 검색"
              persistent
              placeholder="설계번호, 품명, 규격 검색"
              onChange={(event, value) => {
                setQuery(event === "" ? value ?? "" : event.target.value);
              }}
              onClear={() => setQuery("")}
            />
          </TableToolbarContent>
        </TableToolbar>
        <Table className="dss-reference-table" size="lg" useZebraStyles>
          <TableHead>
            <TableRow>
              <TableHeader>설계번호</TableHeader>
              <TableHeader>품명</TableHeader>
              <TableHeader>규격</TableHeader>
              <TableHeader>부서코드</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>검색 결과가 없습니다.</TableCell>
              </TableRow>
            ) : null}
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell title={row.designNo}>{row.designNo}</TableCell>
                <TableCell title={row.productName}>{row.productName}</TableCell>
                <TableCell title={row.specification}>{row.specification}</TableCell>
                <TableCell title={row.departmentCode}>{row.departmentCode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}

export function CustomerReferenceTable({ rows }: { rows: CustomerTableRow[] }) {
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const filteredRows = normalizedQuery
    ? rows.filter((row) =>
        [row.name, row.identifier, row.businessRegistrationNo, row.contactSummary]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows;

  return (
    <section className="dss-page">
      {toast ? <FutureToast message={toast} /> : null}
      <header className="dss-page-header">
        <div>
          <h1>고객 관리</h1>
          <p>발주처 고객 정보를 조회합니다.</p>
        </div>
        <Button
          kind="secondary"
          type="button"
          onClick={() => setToast("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")}
        >
          신규 고객 입력
        </Button>
      </header>
      <TableContainer description="주문 입력에서 사용하는 고객사와 담당자 정보입니다." title="고객 목록">
        <TableToolbar aria-label="고객 검색 도구">
          <TableToolbarContent>
            <TableToolbarSearch
              defaultExpanded
              expanded
              id="customer-reference-search"
              labelText="고객 검색"
              persistent
              placeholder="고객명, 담당자, 사업자번호 검색"
              onChange={(event, value) => {
                setQuery(event === "" ? value ?? "" : event.target.value);
              }}
              onClear={() => setQuery("")}
            />
          </TableToolbarContent>
        </TableToolbar>
        <Table className="dss-reference-table" size="lg" useZebraStyles>
          <TableHead>
            <TableRow>
              <TableHeader>고객명</TableHeader>
              <TableHeader>식별 정보</TableHeader>
              <TableHeader>사업자번호</TableHeader>
              <TableHeader>담당자</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>검색 결과가 없습니다.</TableCell>
              </TableRow>
            ) : null}
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell title={row.name}>{row.name}</TableCell>
                <TableCell title={row.identifier}>{row.identifier}</TableCell>
                <TableCell title={row.businessRegistrationNo}>{row.businessRegistrationNo}</TableCell>
                <TableCell title={row.contactSummary}>{row.contactSummary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}
