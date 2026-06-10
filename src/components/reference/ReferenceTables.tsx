"use client";

import { useState } from "react";

import type { CustomerTableRow, DesignTableRow } from "@/features/reference/data";

function FutureToast({ message }: { message: string }) {
  return (
    <div className="toast-viewport" aria-live="polite">
      <div className="toast toast--info">{message}</div>
    </div>
  );
}

export function DesignReferenceTable({ rows }: { rows: DesignTableRow[] }) {
  const [toast, setToast] = useState("");

  return (
    <section className="reference-page">
      {toast ? <FutureToast message={toast} /> : null}
      <header className="reference-page__header">
        <div>
          <h1>설계 관리</h1>
          <p>제품 설계 기준 정보를 조회합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setToast("신규 제품/설계 등록 기능은 추후 개발 예정입니다.")}
        >
          신규 설계 입력
        </button>
      </header>
      <div className="reference-table-wrap">
        <table className="reference-table">
          <thead>
            <tr>
              <th>설계번호</th>
              <th>품명</th>
              <th>규격</th>
              <th>부서코드</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td title={row.designNo}>{row.designNo}</td>
                <td title={row.productName}>{row.productName}</td>
                <td title={row.specification}>{row.specification}</td>
                <td title={row.departmentCode}>{row.departmentCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CustomerReferenceTable({ rows }: { rows: CustomerTableRow[] }) {
  const [toast, setToast] = useState("");

  return (
    <section className="reference-page">
      {toast ? <FutureToast message={toast} /> : null}
      <header className="reference-page__header">
        <div>
          <h1>고객 관리</h1>
          <p>발주처 고객 정보를 조회합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setToast("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")}
        >
          신규 고객 입력
        </button>
      </header>
      <div className="reference-table-wrap">
        <table className="reference-table">
          <thead>
            <tr>
              <th>고객명</th>
              <th>식별 정보</th>
              <th>사업자번호</th>
              <th>담당자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td title={row.name}>{row.name}</td>
                <td title={row.identifier}>{row.identifier}</td>
                <td title={row.businessRegistrationNo}>{row.businessRegistrationNo}</td>
                <td title={row.contactSummary}>{row.contactSummary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
