"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Button,
  ContentSwitcher,
  Form,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
  ToastNotification,
} from "@carbon/react";
import { Add, Calendar, Close } from "@carbon/icons-react";

import {
  DailyProductionPlanWorkspace,
  type DailyProductionProfile,
} from "@/components/production/DailyProductionPlanWorkspace";
import { TOAST_TIMEOUT_MS, ToastStack } from "@/components/notifications/ToastProvider";
import type { DepartmentCode } from "@/features/orders/types";
import { getInitialDepartment } from "@/features/production/daily-planning";
import {
  createDailyProductionRows,
  createOrderProductionRows,
  createProductProductionRows,
  type DailyProductionStatusRow,
  type OrderProductionStatusRow,
  type ProductProductionPlanRow,
  type ProductProductionStatusRow,
} from "@/features/production/product-status";
import type { DailyProductionSeed, DailyProductionSeedItem, DailyProductionWorkStatus } from "@/features/production/types";

type ViewMode = "day" | "product" | "order";

type DailyPlanningModalState = {
  productionDate: string;
  departmentCode: DepartmentCode;
};

const planStatusLabels: Record<DailyProductionWorkStatus, string> = {
  planned: "계획",
  producing: "생산중",
  completed: "완료",
  cancelled: "취소",
};

const planStatusTagTypes: Record<DailyProductionWorkStatus, "blue" | "teal" | "green" | "gray"> = {
  planned: "blue",
  producing: "teal",
  completed: "green",
  cancelled: "gray",
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function calculateDurationMinutes(quantity: number, defaultUnitsPerHour: number) {
  return Math.ceil((quantity / defaultUnitsPerHour) * 60);
}

function getQuantityValue(value: string) {
  if (!value.trim()) {
    return 0;
  }

  return Number(value);
}

function ProductStatusCells({
  row,
  onOpenPlan,
}: {
  row: ProductProductionStatusRow;
  onOpenPlan: (rowId: string) => void;
}) {
  return (
    <>
      <TableCell title={row.customerName}>{row.customerName}</TableCell>
      <TableCell title={`${row.productName} ${row.specification}`}>
        <strong>{row.productName}</strong>
        <span className="dss-product-status-table__secondary">{row.specification}</span>
      </TableCell>
      <TableCell title={`${row.todayProducingQuantity}`}>{formatNumber(row.todayProducingQuantity)}개</TableCell>
      <TableCell title={row.completionLabel}>{row.completionLabel}</TableCell>
      <TableCell>
        <Button
          aria-label={`${row.productName} 생산계획 계획하기`}
          kind="ghost"
          renderIcon={Calendar}
          size="sm"
          type="button"
          onClick={() => onOpenPlan(row.id)}
        >
          계획하기
        </Button>
      </TableCell>
    </>
  );
}

function ProductStatusTable({
  currentDate,
  rows,
  onOpenPlan,
}: {
  currentDate: string;
  rows: ProductProductionStatusRow[];
  onOpenPlan: (rowId: string) => void;
}) {
  if (rows.length === 0) {
    return <Tile className="dss-empty-state">표시할 주문제품이 없습니다.</Tile>;
  }

  return (
    <TableContainer description={`기준일 ${currentDate}`} title="주문제품 목록">
      <Table className="dss-product-status-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableHeader>고객사</TableHeader>
            <TableHeader>제품명</TableHeader>
            <TableHeader>오늘 생산중</TableHeader>
            <TableHeader>완료율</TableHeader>
            <TableHeader>생산계획</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <ProductStatusCells onOpenPlan={onOpenPlan} row={row} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function DailyStatusTable({
  currentDate,
  onOpenDailyPlan,
  rows,
}: {
  currentDate: string;
  onOpenDailyPlan: (productionDate: string, departmentCode: DepartmentCode) => void;
  rows: DailyProductionStatusRow[];
}) {
  if (rows.length === 0) {
    return <Tile className="dss-empty-state">표시할 일자별 생산계획이 없습니다.</Tile>;
  }

  return (
    <TableContainer description={`기준일 ${currentDate}`} title="일자별 생산계획 목록">
      <Table className="dss-product-status-day-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableHeader>날짜</TableHeader>
            <TableHeader>부서</TableHeader>
            <TableHeader>예정된 생산건수</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell title={row.productionDate}>{row.productionDate}</TableCell>
              <TableCell title={row.departmentCode}>{row.departmentCode}</TableCell>
              <TableCell>
                <Button
                  aria-label={`${row.productionDate} ${row.departmentCode} 예정된 생산건수 열기`}
                  kind="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onOpenDailyPlan(row.productionDate, row.departmentCode)}
                >
                  {formatNumber(row.plannedProductionCount)}건
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function OrderProductsTable({
  order,
  onOpenPlan,
}: {
  order: OrderProductionStatusRow;
  onOpenPlan: (rowId: string) => void;
}) {
  return (
    <section
      aria-label={`${order.orderNo} 주문제품 생산 현황`}
      className="dss-product-status-order-products"
      role="region"
    >
      <Table className="dss-product-status-table dss-product-status-table--nested" size="md">
        <TableHead>
          <TableRow>
            <TableHeader>고객사</TableHeader>
            <TableHeader>제품명</TableHeader>
            <TableHeader>오늘 생산중</TableHeader>
            <TableHeader>완료율</TableHeader>
            <TableHeader>생산계획</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {order.products.map((product) => (
            <TableRow key={product.id}>
              <ProductStatusCells onOpenPlan={onOpenPlan} row={product} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function OrderStatusTable({
  currentDate,
  rows,
  expandedOrderIds,
  onOpenPlan,
  onToggleExpanded,
}: {
  currentDate: string;
  rows: OrderProductionStatusRow[];
  expandedOrderIds: Set<string>;
  onOpenPlan: (rowId: string) => void;
  onToggleExpanded: (orderId: string) => void;
}) {
  if (rows.length === 0) {
    return <Tile className="dss-empty-state">표시할 주문이 없습니다.</Tile>;
  }

  return (
    <TableContainer description={`기준일 ${currentDate}`} title="주문 목록">
      <Table className="dss-product-status-order-table" size="lg">
        <TableHead>
          <TableRow>
            <TableExpandHeader id="product-status-orders-expand" />
            <TableHeader>주문코드</TableHeader>
            <TableHeader>주문날짜</TableHeader>
            <TableHeader>고객사</TableHeader>
            <TableHeader>품목수</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = expandedOrderIds.has(row.id);

            return (
              <Fragment key={row.id}>
                <TableExpandRow
                  aria-controls={`product-status-order-products-${row.id}`}
                  aria-label={`${row.orderNo} 주문제품 펼치기`}
                  className="dss-product-status-order-row"
                  data-dss-expanded={isExpanded ? "true" : undefined}
                  expandHeader="product-status-orders-expand"
                  expandIconDescription="주문제품 펼치기"
                  isExpanded={isExpanded}
                  onExpand={() => onToggleExpanded(row.id)}
                >
                  <TableCell title={row.orderNo}>{row.orderNo}</TableCell>
                  <TableCell title={row.requestedDate}>{row.requestedDate}</TableCell>
                  <TableCell title={row.customerName}>{row.customerName}</TableCell>
                  <TableCell title={`${row.productCount}`}>{formatNumber(row.productCount)}개</TableCell>
                </TableExpandRow>
                {isExpanded ? (
                  <TableExpandedRow
                    className="dss-product-status-order-expanded-row"
                    id={`product-status-order-products-${row.id}`}
                    colSpan={5}
                  >
                    <OrderProductsTable onOpenPlan={onOpenPlan} order={row} />
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

function ProductPlanList({ plans }: { plans: ProductProductionPlanRow[] }) {
  if (plans.length === 0) {
    return <Tile className="dss-product-status-drawer__empty">등록된 생산계획이 없습니다.</Tile>;
  }

  return (
    <div aria-label="생산계획 목록" className="dss-product-status-plan-list" role="table">
      <div className="dss-product-status-plan-list__row dss-product-status-plan-list__row--header" role="row">
        <span role="columnheader">날짜</span>
        <span role="columnheader">수량</span>
        <span role="columnheader">상태</span>
      </div>
      {plans.map((plan) => (
        <div className="dss-product-status-plan-list__row" key={plan.id} role="row">
          <span role="cell">{plan.productionDate}</span>
          <span role="cell">{formatNumber(plan.quantity)}개</span>
          <span role="cell">
            <Tag size="sm" type={planStatusTagTypes[plan.workStatus]}>
              {planStatusLabels[plan.workStatus]}
            </Tag>
          </span>
        </div>
      ))}
    </div>
  );
}

function ProductionPlanDrawer({
  currentDate,
  row,
  onClose,
  onCreatePlan,
}: {
  currentDate: string;
  row: ProductProductionStatusRow;
  onClose: () => void;
  onCreatePlan: (row: ProductProductionStatusRow, productionDate: string, quantity: number) => void;
}) {
  const [productionDate, setProductionDate] = useState(currentDate);
  const [quantityValue, setQuantityValue] = useState("");
  const quantity = getQuantityValue(quantityValue);
  const hasQuantityInput = quantityValue.trim().length > 0;
  const quantityInvalid =
    hasQuantityInput &&
    (!Number.isFinite(quantity) || quantity <= 0 || quantity > row.remainingPlanQuantity);
  const canCreate = Boolean(productionDate) && hasQuantityInput && !quantityInvalid && row.remainingPlanQuantity > 0;

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

  function handleCreatePlan() {
    if (!canCreate) {
      return;
    }

    onCreatePlan(row, productionDate, quantity);
    setQuantityValue("");
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
        aria-label={`${row.productName} 생산계획 Drawer`}
        aria-modal="true"
        className="dss-order-drawer dss-product-status-drawer"
        role="dialog"
      >
        <header className="dss-order-drawer__header">
          <div>
            <h2>생산계획</h2>
            <p>{row.productName}</p>
          </div>
          <Button
            hasIconOnly
            iconDescription="생산계획 닫기"
            kind="ghost"
            renderIcon={Close}
            size="sm"
            tooltipPosition="left"
            type="button"
            onClick={onClose}
          />
        </header>

        <div className="dss-order-drawer__body">
          <Stack gap={6}>
            <dl className="dss-product-status-drawer__summary">
              <div>
                <dt>고객사</dt>
                <dd>{row.customerName}</dd>
              </div>
              <div>
                <dt>전체수량</dt>
                <dd>{formatNumber(row.orderQuantity)}개</dd>
              </div>
              <div>
                <dt>완료율</dt>
                <dd>{row.completionLabel}</dd>
              </div>
              <div>
                <dt>생산계획</dt>
                <dd>{formatNumber(row.plannedQuantity)}개</dd>
              </div>
            </dl>

            <Tag size="sm" type={row.remainingPlanQuantity > 0 ? "cyan" : "gray"}>
              계획 가능 {formatNumber(row.remainingPlanQuantity)}개
            </Tag>

            <section aria-label={`${row.productName} 생산계획 목록`}>
              <ProductPlanList plans={row.productionPlans} />
            </section>

            <Form
              aria-label="생산계획 생성"
              className="dss-product-status-drawer__form"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreatePlan();
              }}
            >
              <TextInput
                id="product-production-date"
                labelText="생산일"
                onChange={(event) => setProductionDate(event.target.value)}
                type="date"
                value={productionDate}
              />
              <NumberInput
                allowEmpty
                hideSteppers
                id="product-production-quantity"
                invalid={quantityInvalid}
                invalidText={`1부터 ${formatNumber(row.remainingPlanQuantity)}까지 입력하세요.`}
                label="생산수량"
                max={row.remainingPlanQuantity}
                min={1}
                onChange={(_, state) => setQuantityValue(String(state.value ?? ""))}
                size="md"
                type="number"
                value={quantityValue}
              />
              <Button disabled={!canCreate} renderIcon={Add} type="submit">
                생성
              </Button>
            </Form>
          </Stack>
        </div>

        <footer className="dss-order-drawer__footer">
          <Button kind="secondary" type="button" onClick={onClose}>
            닫기
          </Button>
        </footer>
      </aside>
    </div>
  );
}

export function ProductProductionStatusWorkspace({
  currentDate,
  initialSeed,
  profile,
}: {
  currentDate: string;
  initialSeed: DailyProductionSeed;
  profile: DailyProductionProfile;
}) {
  const [dayPlanItems, setDayPlanItems] = useState<DailyProductionSeedItem[]>(() => initialSeed.dayPlanItems);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [dailyPlanningModal, setDailyPlanningModal] = useState<DailyPlanningModalState | null>(null);
  const [dailyPlanningToast, setDailyPlanningToast] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(() => new Set());
  const seed = useMemo(() => ({ ...initialSeed, dayPlanItems }), [dayPlanItems, initialSeed]);
  const dayRows = useMemo(() => createDailyProductionRows(seed), [seed]);
  const rows = useMemo(() => createProductProductionRows(seed, { currentDate }), [currentDate, seed]);
  const orderRows = useMemo(() => createOrderProductionRows(seed, { currentDate }), [currentDate, seed]);
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null;

  function createPlan(row: ProductProductionStatusRow, productionDate: string, quantity: number) {
    setDayPlanItems((current) => {
      const sameDateItems = current.filter(
        (item) =>
          item.orderProductId === row.orderProductId &&
          item.productionDate === productionDate &&
          item.departmentCode === row.departmentCode &&
          item.workStatus !== "cancelled",
      );
      const nextSequence = Math.max(0, ...sameDateItems.map((item) => item.sequence)) + 1;

      return [
        ...current,
        {
          id: `${row.orderProductId}-plan-${productionDate}-${current.length + 1}`,
          productionDate,
          departmentCode: row.departmentCode,
          workStartTime: "09:00",
          orderProductId: row.orderProductId,
          quantity,
          completedQuantity: 0,
          estimatedDurationMinutes: calculateDurationMinutes(quantity, row.defaultUnitsPerHour),
          durationSource: "product_default",
          workStatus: "planned",
          sequence: nextSequence,
        },
      ];
    });
  }

  function toggleExpandedOrder(orderId: string) {
    setExpandedOrderIds((current) => {
      const next = new Set(current);

      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }

      return next;
    });
  }

  function openDefaultDailyPlanningModal() {
    setDailyPlanningModal({
      productionDate: currentDate,
      departmentCode: getInitialDepartment(profile.departmentCode),
    });
  }

  useEffect(() => {
    if (!dailyPlanningToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDailyPlanningToast("");
    }, TOAST_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [dailyPlanningToast]);

  return (
    <main className="dss-page dss-product-status-page">
      {dailyPlanningToast ? (
        <ToastStack>
          <ToastNotification
            hideCloseButton
            kind="success"
            lowContrast
            onClose={() => setDailyPlanningToast("")}
            statusIconDescription="성공"
            subtitle={dailyPlanningToast}
            timeout={TOAST_TIMEOUT_MS}
            title="저장 완료"
          />
        </ToastStack>
      ) : null}

      <header className="dss-page-header">
        <div>
          <h1>생산 현황</h1>
          <p>일자별, 제품별 또는 주문별로 생산 진행 수량과 계획 일정을 확인합니다.</p>
        </div>
      </header>

      <div className="dss-product-status-view-controls">
        <ContentSwitcher
          aria-label="생산 현황 보기"
          className="dss-product-status-switcher"
          onChange={({ index }) => setViewMode(index === 0 ? "day" : index === 1 ? "product" : "order")}
          selectedIndex={viewMode === "day" ? 0 : viewMode === "product" ? 1 : 2}
          size="md"
        >
          <Switch name="day" text="일자별" />
          <Switch name="product" text="제품별" />
          <Switch name="order" text="주문별" />
        </ContentSwitcher>

        {viewMode === "day" ? (
          <Button renderIcon={Calendar} type="button" onClick={openDefaultDailyPlanningModal}>
            일간 생산 계획 작성
          </Button>
        ) : null}
      </div>

      {viewMode === "day" ? (
        <DailyStatusTable
          currentDate={currentDate}
          onOpenDailyPlan={(productionDate, departmentCode) =>
            setDailyPlanningModal({ productionDate, departmentCode })
          }
          rows={dayRows}
        />
      ) : viewMode === "product" ? (
        <ProductStatusTable currentDate={currentDate} onOpenPlan={setSelectedRowId} rows={rows} />
      ) : (
        <OrderStatusTable
          currentDate={currentDate}
          expandedOrderIds={expandedOrderIds}
          onOpenPlan={setSelectedRowId}
          onToggleExpanded={toggleExpandedOrder}
          rows={orderRows}
        />
      )}

      {selectedRow ? (
        <ProductionPlanDrawer
          currentDate={currentDate}
          onClose={() => setSelectedRowId(null)}
          onCreatePlan={createPlan}
          row={selectedRow}
        />
      ) : null}

      {dailyPlanningModal ? (
        <Modal
          className="dss-product-status-daily-planning-modal"
          modalHeading="일간 생산 계획 작성"
          onRequestClose={() => setDailyPlanningModal(null)}
          open={Boolean(dailyPlanningModal)}
          passiveModal
          size="lg"
        >
          <DailyProductionPlanWorkspace
            currentDate={currentDate}
            embedded
            initialDepartmentCode={dailyPlanningModal.departmentCode}
            initialProductionDate={dailyPlanningModal.productionDate}
            initialSeed={seed}
            key={`${dailyPlanningModal.productionDate}-${dailyPlanningModal.departmentCode}`}
            onSaved={(message) => {
              setDailyPlanningModal(null);
              setDailyPlanningToast(message);
            }}
            profile={profile}
          />
        </Modal>
      ) : null}
    </main>
  );
}
