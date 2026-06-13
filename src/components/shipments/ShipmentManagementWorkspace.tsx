"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  NumberInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
  ToastNotification,
} from "@carbon/react";
import { Add, Close } from "@carbon/icons-react";

import type { AppRole, ShipmentStatus } from "@/features/orders/types";
import type { ProductionManagementSeed, ProductionShipmentRecord } from "@/features/production/product-management";
import {
  createShipmentManagementRows,
  createShipmentRecord,
  filterShipmentManagementRows,
  getShipmentInputLimit,
  validateShipmentRecordDraft,
  type ShipmentManagementRow,
} from "@/features/shipments/shipment-management";

const shipmentStatusTagTypes: Record<ShipmentStatus, "blue" | "cyan" | "green" | "gray"> = {
  ready: "blue",
  partial: "cyan",
  completed: "green",
  stopped: "gray",
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function getQuantityValue(value: string) {
  if (!value.trim()) {
    return 0;
  }

  return Number(value);
}

function ShipmentHistoryTable({ records }: { records: ProductionShipmentRecord[] }) {
  return (
    <TableContainer title="출하 이력">
      <Table className="dss-shipment-history-table" size="md">
        <TableHead>
          <TableRow>
            <TableHeader>출고일</TableHeader>
            <TableHeader>출하수량</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.shippedDate}</TableCell>
              <TableCell>{formatNumber(record.quantity)}개</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ShipmentInputDrawer({
  currentDate,
  recordSequence,
  row,
  onClose,
  onSaved,
}: {
  currentDate: string;
  recordSequence: number;
  row: ShipmentManagementRow;
  onClose: () => void;
  onSaved: (record: ProductionShipmentRecord) => void;
}) {
  const [shippedDate, setShippedDate] = useState(currentDate);
  const [quantityValue, setQuantityValue] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const quantity = getQuantityValue(quantityValue);
  const inputLimit = getShipmentInputLimit(row);
  const validation = validateShipmentRecordDraft(row, { shippedDate, quantity });
  const shouldShowDateError = hasSubmitted && !validation.ok && Boolean(validation.fieldErrors.shippedDate);
  const shouldShowQuantityError =
    (hasSubmitted || quantityValue.trim().length > 0) && !validation.ok && Boolean(validation.fieldErrors.quantity);
  const canSubmit = validation.ok;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit() {
    if (!canSubmit) {
      setHasSubmitted(true);
      return;
    }

    const record = createShipmentRecord(
      row,
      {
        shippedDate,
        quantity,
      },
      {
        createdAt: `${shippedDate}T12:00:00.000Z`,
        sequence: recordSequence,
      },
    );

    onSaved(record);
    onClose();
  }

  return (
    <div
      className="dss-drawer-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        aria-label={`${row.productName} 출하 실적 입력`}
        aria-modal="true"
        className="dss-order-drawer dss-shipment-input-drawer"
        role="dialog"
      >
        <header className="dss-order-drawer__header">
          <div>
            <h2>출하 실적 입력</h2>
            <p>{row.productName}</p>
          </div>
          <Button
            hasIconOnly
            iconDescription="출하 실적 입력 닫기"
            kind="ghost"
            renderIcon={Close}
            size="sm"
            tooltipPosition="left"
            type="button"
            onClick={onClose}
          />
        </header>

        <Form
          aria-label="출하 실적 입력 폼"
          className="dss-order-drawer__body dss-shipment-input-form"
          id="shipment-input-drawer-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Stack gap={6}>
            <dl className="dss-shipment-drawer__summary">
              <div>
                <dt>고객명</dt>
                <dd>{row.customerName}</dd>
              </div>
              <div>
                <dt>제품정보</dt>
                <dd>
                  {row.productName}
                  <span>{row.specification}</span>
                </dd>
              </div>
              <div>
                <dt>출하예정일</dt>
                <dd>{row.plannedShipDate}</dd>
              </div>
              <div>
                <dt>출하수량</dt>
                <dd>{row.shipmentQuantityLabel}</dd>
              </div>
              <div>
                <dt>출하상태</dt>
                <dd>{row.shipmentStatusLabel}</dd>
              </div>
              <div>
                <dt>입력한도</dt>
                <dd>출하 가능 {formatNumber(inputLimit)}개</dd>
              </div>
            </dl>

            <div className="dss-shipment-input-form__fields">
              <TextInput
                aria-label="출고일"
                id="shipment-input-date"
                invalid={shouldShowDateError}
                invalidText={!validation.ok ? validation.fieldErrors.shippedDate : undefined}
                labelText="출고일"
                onChange={(event) => setShippedDate(event.target.value)}
                type="date"
                value={shippedDate}
              />
              <NumberInput
                allowEmpty
                aria-label="출하수량"
                hideSteppers
                id="shipment-input-quantity"
                invalid={shouldShowQuantityError}
                invalidText={!validation.ok ? validation.fieldErrors.quantity : undefined}
                label="출하수량"
                max={inputLimit}
                min={1}
                onChange={(_, state) => setQuantityValue(String(state.value ?? ""))}
                size="md"
                type="number"
                value={quantityValue}
              />
            </div>

            <ShipmentHistoryTable records={row.shipmentRecords} />
          </Stack>
        </Form>

        <footer className="dss-order-drawer__footer">
          <Button kind="secondary" type="button" onClick={onClose}>
            닫기
          </Button>
          <Button disabled={!canSubmit} form="shipment-input-drawer-form" renderIcon={Add} type="submit">
            입력
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function ShipmentPlanTable({
  canInput,
  rows,
  onOpenInput,
}: {
  canInput: boolean;
  rows: ShipmentManagementRow[];
  onOpenInput: (row: ShipmentManagementRow) => void;
}) {
  if (rows.length === 0) {
    return <Tile className="dss-empty-state">표시할 출하계획이 없습니다.</Tile>;
  }

  return (
    <TableContainer title="출하계획 목록">
      <Table className="dss-shipment-management-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableHeader>고객명</TableHeader>
            <TableHeader>제품정보</TableHeader>
            <TableHeader>부서코드</TableHeader>
            <TableHeader>출하수량</TableHeader>
            <TableHeader>출하상태</TableHeader>
            <TableHeader>입력</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const inputLimit = getShipmentInputLimit(row);

            return (
              <TableRow key={row.shipmentPlanId}>
                <TableCell title={row.customerName}>{row.customerName}</TableCell>
                <TableCell title={`${row.productName} ${row.specification}`}>
                  <strong>{row.productName}</strong>
                  <span className="dss-product-status-table__secondary">
                    {row.specification} / 출하예정 {row.plannedShipDate}
                  </span>
                </TableCell>
                <TableCell>{row.departmentCode}</TableCell>
                <TableCell>{row.shipmentQuantityLabel}</TableCell>
                <TableCell>
                  <Tag size="sm" type={shipmentStatusTagTypes[row.shipmentStatus]}>
                    {row.shipmentStatusLabel}
                  </Tag>
                </TableCell>
                <TableCell>
                  <Button
                    aria-label={`${row.productName} ${row.plannedShipDate} 출하 실적 입력`}
                    disabled={!canInput || inputLimit <= 0}
                    kind="ghost"
                    size="sm"
                    type="button"
                    onClick={() => onOpenInput(row)}
                  >
                    입력
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function ShipmentManagementWorkspace({
  currentDate,
  initialSeed,
  role,
}: {
  currentDate: string;
  initialSeed: ProductionManagementSeed;
  role: AppRole;
}) {
  const [shipmentRecords, setShipmentRecords] = useState(() => initialSeed.shipmentRecords ?? []);
  const [excludeOldCompleted, setExcludeOldCompleted] = useState(true);
  const [selectedShipmentPlanId, setSelectedShipmentPlanId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const seed = useMemo(() => ({ ...initialSeed, shipmentRecords }), [initialSeed, shipmentRecords]);
  const rows = useMemo(() => createShipmentManagementRows(seed), [seed]);
  const visibleRows = useMemo(
    () => filterShipmentManagementRows(rows, { currentDate, excludeOldCompleted }),
    [currentDate, excludeOldCompleted, rows],
  );
  const selectedRow = rows.find((row) => row.shipmentPlanId === selectedShipmentPlanId) ?? null;
  const canInput = role !== "E";

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(""), 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function saveShipmentRecord(record: ProductionShipmentRecord) {
    setShipmentRecords((current) => [...current, record]);
    setToastMessage("출하 실적이 등록되었습니다.");
  }

  return (
    <main className="dss-page dss-shipment-management-page">
      {toastMessage ? (
        <div className="dss-toast-stack" aria-live="polite">
          <ToastNotification
            hideCloseButton
            kind="success"
            lowContrast
            statusIconDescription="성공"
            subtitle={toastMessage}
            title="등록 완료"
          />
        </div>
      ) : null}

      <header className="dss-page-header">
        <div>
          <h1>출하 관리</h1>
          <p>출하계획 기준으로 출하수량과 상태를 확인하고 출하 실적을 입력합니다.</p>
        </div>
      </header>

      <div className="dss-order-filter-bar">
        <Checkbox
          checked={excludeOldCompleted}
          id="shipments-exclude-old-completed"
          labelText="3일이상 출하완료건 제외"
          onChange={(_, { checked }) => setExcludeOldCompleted(checked)}
        />
      </div>

      <ShipmentPlanTable canInput={canInput} rows={visibleRows} onOpenInput={(row) => setSelectedShipmentPlanId(row.shipmentPlanId)} />

      {selectedRow ? (
        <ShipmentInputDrawer
          currentDate={currentDate}
          recordSequence={shipmentRecords.length + 1}
          row={selectedRow}
          onClose={() => setSelectedShipmentPlanId(null)}
          onSaved={saveShipmentRecord}
        />
      ) : null}
    </main>
  );
}
