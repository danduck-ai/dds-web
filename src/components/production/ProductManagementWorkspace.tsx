"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
  ToastNotification,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
} from "@carbon/react";
import { Add, Close, Information } from "@carbon/icons-react";

import {
  createInventoryRows,
  createProductionReceiptRecord,
  createReceiptHistoryRows,
  validateProductionReceiptDraft,
  type ProductionManagementOrderProduct,
  type ProductionManagementSeed,
  type ProductionReceiptHistoryRow,
  type ProductionReceiptQualityStatus,
  type ProductionReceiptRecord,
} from "@/features/production/product-management";

const qualityStatusLabels: Record<ProductionReceiptQualityStatus, string> = {
  not_recorded: "미입력",
  passed: "합격",
  failed: "불합격",
};

const shipmentStatusLabels = {
  ready: "대기",
  partial: "부분출하",
  completed: "완료",
  stopped: "중지",
};

const qualityTagTypes: Record<ProductionReceiptQualityStatus, "gray" | "green" | "red"> = {
  not_recorded: "gray",
  passed: "green",
  failed: "red",
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

function formatOrderProductOption(product: ProductionManagementOrderProduct) {
  return `${product.orderNo} / ${product.productName} / ${product.specification}`;
}

function FieldHelp({ label, text }: { label: string; text: string }) {
  return (
    <Toggletip align="bottom-start" className="dss-production-management-help">
      <ToggletipButton label={`${label} 도움말`}>
        <Information />
      </ToggletipButton>
      <ToggletipContent>
        <p>{text}</p>
      </ToggletipContent>
    </Toggletip>
  );
}

function OptionalFieldHelp({ label, text }: { label: string; text: string }) {
  return (
    <div className="dss-production-management-field-help">
      <FieldHelp label={label} text={text} />
    </div>
  );
}

function ReceiptHistoryTable({
  rows,
  onOpenDetail,
}: {
  rows: ProductionReceiptHistoryRow[];
  onOpenDetail: (row: ProductionReceiptHistoryRow) => void;
}) {
  if (rows.length === 0) {
    return <Tile className="dss-empty-state">등록된 생산 제품 입력 히스토리가 없습니다.</Tile>;
  }

  return (
    <TableContainer title="생산 제품 입력 히스토리">
      <Table className="dss-production-management-history-table" size="lg" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableHeader>입력일</TableHeader>
            <TableHeader>LOT/배치번호</TableHeader>
            <TableHeader>제품명</TableHeader>
            <TableHeader>수량</TableHeader>
            <TableHeader>보관위치</TableHeader>
            <TableHeader>설비/라인</TableHeader>
            <TableHeader>품질</TableHeader>
            <TableHeader>상세</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.receiptId}>
              <TableCell title={row.receiptDate}>{row.receiptDate}</TableCell>
              <TableCell title={row.lotNo}>{row.lotNo}</TableCell>
              <TableCell title={`${row.productName} ${row.specification}`}>
                <strong>{row.productName}</strong>
                <span className="dss-product-status-table__secondary">{row.orderNo}</span>
              </TableCell>
              <TableCell>{formatNumber(row.quantity)}개</TableCell>
              <TableCell>{row.storageLocation ?? "미입력"}</TableCell>
              <TableCell>{row.equipmentLine ?? "미입력"}</TableCell>
              <TableCell>
                <Tag size="sm" type={qualityTagTypes[row.qualityStatus]}>
                  {qualityStatusLabels[row.qualityStatus]}
                </Tag>
              </TableCell>
              <TableCell>
                <Button
                  aria-label={`${row.lotNo} 관련 주문/출하 상세보기`}
                  kind="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onOpenDetail(row)}
                >
                  상세보기
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ReceiptDetailDrawer({ row, onClose }: { row: ProductionReceiptHistoryRow; onClose: () => void }) {
  const selectedPlan = row.productionPlans.find((plan) => plan.id === row.productionPlanItemId) ?? null;

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

  return (
    <div
      className="dss-drawer-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside aria-label={`${row.lotNo} 상세`} aria-modal="true" className="dss-order-drawer" role="dialog">
        <header className="dss-order-drawer__header">
          <div>
            <h2>{row.lotNo}</h2>
            <p>{row.productName}</p>
          </div>
          <Button
            hasIconOnly
            iconDescription="상세 닫기"
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
                <dt>주문코드</dt>
                <dd>{row.orderNo}</dd>
              </div>
              <div>
                <dt>고객사</dt>
                <dd>{row.customerName}</dd>
              </div>
              <div>
                <dt>제품명</dt>
                <dd>{row.productName}</dd>
              </div>
              <div>
                <dt>규격</dt>
                <dd>{row.specification}</dd>
              </div>
              <div>
                <dt>입력수량</dt>
                <dd>{formatNumber(row.quantity)}개</dd>
              </div>
              <div>
                <dt>관련 생산계획</dt>
                <dd>
                  {selectedPlan
                    ? `${selectedPlan.productionDate} / ${selectedPlan.departmentCode} / ${formatNumber(
                        selectedPlan.quantity,
                      )}개`
                    : "선택하지 않음"}
                </dd>
              </div>
            </dl>

            <TableContainer title="관련 출하건">
              <Table className="dss-production-management-shipment-table" size="md">
                <TableHead>
                  <TableRow>
                    <TableHeader>출하예정일</TableHeader>
                    <TableHeader>수량</TableHeader>
                    <TableHeader>상태</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.shipmentPlans.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>{shipment.plannedShipDate}</TableCell>
                      <TableCell>{formatNumber(shipment.quantity)}개</TableCell>
                      <TableCell>{shipmentStatusLabels[shipment.status]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <dl className="dss-product-status-drawer__summary">
              <div>
                <dt>보관위치</dt>
                <dd>{row.storageLocation ?? "미입력"}</dd>
              </div>
              <div>
                <dt>설비/라인</dt>
                <dd>{row.equipmentLine ?? "미입력"}</dd>
              </div>
              <div>
                <dt>품질상태</dt>
                <dd>{qualityStatusLabels[row.qualityStatus]}</dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{row.operatorName ?? "미입력"}</dd>
              </div>
              <div className="dss-production-management-detail__memo">
                <dt>비고</dt>
                <dd>{row.memo ?? "미입력"}</dd>
              </div>
            </dl>
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

function ProductionReceiptDrawer({
  currentDate,
  receiptSequence,
  seed,
  onClose,
  onSaved,
}: {
  currentDate: string;
  receiptSequence: number;
  seed: ProductionManagementSeed;
  onClose: () => void;
  onSaved: (receipt: ProductionReceiptRecord) => void;
}) {
  const [orderProductId, setOrderProductId] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [receiptDate, setReceiptDate] = useState(currentDate);
  const [lotNo, setLotNo] = useState("");
  const [equipmentLine, setEquipmentLine] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [qualityStatus, setQualityStatus] = useState<ProductionReceiptQualityStatus>("not_recorded");
  const [operatorName, setOperatorName] = useState("");
  const [memo, setMemo] = useState("");
  const [productionPlanItemId, setProductionPlanItemId] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inventoryRows = useMemo(() => createInventoryRows(seed), [seed]);
  const selectedInventoryRow = inventoryRows.find((row) => row.orderProductId === orderProductId) ?? null;
  const quantity = getQuantityValue(quantityValue);
  const validation = validateProductionReceiptDraft(seed, { orderProductId, quantity });
  const shouldShowOrderProductError =
    !validation.ok && Boolean(validation.fieldErrors.orderProductId) && (hasSubmitted || quantityValue.trim().length > 0);
  const shouldShowQuantityError = quantityValue.trim().length > 0 && !validation.ok && Boolean(validation.fieldErrors.quantity);
  const canSubmit = validation.ok && Boolean(receiptDate);

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

    const nextReceipt = createProductionReceiptRecord(
      seed,
      {
        orderProductId,
        quantity,
        receiptDate,
        lotNo,
        equipmentLine,
        storageLocation,
        qualityStatus,
        operatorName,
        memo,
        productionPlanItemId,
      },
      {
        createdAt: `${receiptDate}T12:00:00.000Z`,
        sequence: receiptSequence,
      },
    );

    onSaved(nextReceipt);
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
        aria-label="생산 제품 입력"
        aria-modal="true"
        className="dss-order-drawer dss-production-receipt-drawer"
        role="dialog"
      >
        <header className="dss-order-drawer__header">
          <div>
            <h2>생산 제품 입력</h2>
            <p>주문 제품 기준 입고</p>
          </div>
          <Button
            hasIconOnly
            iconDescription="생산 제품 입력 닫기"
            kind="ghost"
            renderIcon={Close}
            size="sm"
            tooltipPosition="right"
            type="button"
            onClick={onClose}
          />
        </header>

        <Form
          aria-label="생산 제품 입력 폼"
          className="dss-order-drawer__body dss-production-management-form dss-production-management-form--drawer"
          id="production-receipt-drawer-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="dss-production-management-form__field">
            <Select
              aria-label="주문제품"
              id="production-management-order-product"
              invalid={shouldShowOrderProductError}
              invalidText={!validation.ok ? validation.fieldErrors.orderProductId : undefined}
              labelText="주문제품"
              onChange={(event) => {
                setOrderProductId(event.target.value);
                setProductionPlanItemId("");
              }}
              value={orderProductId}
            >
              <SelectItem text="선택" value="" />
              {seed.orderProducts.map((product) => (
                <SelectItem key={product.orderProductId} text={formatOrderProductOption(product)} value={product.orderProductId} />
              ))}
            </Select>
            <OptionalFieldHelp
              label="주문제품"
              text="재고를 쌓을 기준입니다. 같은 설계라도 주문제품이 다르면 별도 제품으로 관리합니다."
            />
          </div>

          <div className="dss-production-management-form__field">
            <NumberInput
              allowEmpty
              aria-label="생산수량"
              hideSteppers
              id="production-management-quantity"
              invalid={shouldShowQuantityError}
              invalidText={!validation.ok ? validation.fieldErrors.quantity : undefined}
              label="생산수량"
              max={selectedInventoryRow?.remainingReceivableQuantity}
              min={1}
              onChange={(_, state) => setQuantityValue(String(state.value ?? ""))}
              size="md"
              type="number"
              value={quantityValue}
            />
            <OptionalFieldHelp
              label="생산수량"
              text="이번에 생산 완료되어 재고로 쌓을 수량입니다. 주문제품의 남은 입력 가능 수량을 넘길 수 없습니다."
            />
          </div>

          <div className="dss-production-management-form__field">
            <TextInput
              aria-label="생산일"
              id="production-management-receipt-date"
              labelText="생산일"
              onChange={(event) => setReceiptDate(event.target.value)}
              type="date"
              value={receiptDate}
            />
            <OptionalFieldHelp label="생산일" text="제품이 생산되어 재고로 입력되는 기준일입니다. 기본값은 오늘입니다." />
          </div>

          <div className="dss-production-management-form__field">
            <TextInput
              aria-label="LOT/배치번호"
              id="production-management-lot-no"
              labelText="LOT/배치번호"
              onChange={(event) => setLotNo(event.target.value)}
              placeholder="비우면 자동생성"
              value={lotNo}
            />
            <OptionalFieldHelp
              label="LOT/배치번호"
              text="동일 조건으로 생산된 묶음을 추적하기 위한 번호입니다. 비우면 LOT-YYYYMMDD-NNN 형태로 생성합니다."
            />
          </div>

          <div className="dss-production-management-form__field">
            <TextInput
              aria-label="설비 또는 라인"
              id="production-management-equipment-line"
              labelText="설비 또는 라인"
              onChange={(event) => setEquipmentLine(event.target.value)}
              placeholder="예: S-2라인"
              value={equipmentLine}
            />
            <OptionalFieldHelp
              label="설비 또는 라인"
              text="이 제품을 생산한 물리적 설비나 생산 라인입니다. 품질 이슈가 있을 때 원인을 좁히는 데 씁니다."
            />
          </div>

          <div className="dss-production-management-form__field">
            <TextInput
              aria-label="보관위치"
              id="production-management-storage-location"
              labelText="보관위치"
              onChange={(event) => setStorageLocation(event.target.value)}
              placeholder="예: S-B01"
              value={storageLocation}
            />
            <OptionalFieldHelp
              label="보관위치"
              text="생산된 제품이 실제로 놓인 창고, 랙, 구역입니다. 출하 시 FIFO 후보를 찾기 쉽게 합니다."
            />
          </div>

          <div className="dss-production-management-form__field">
            <Select
              aria-label="관련 생산계획"
              id="production-management-plan"
              labelText="관련 생산계획"
              onChange={(event) => setProductionPlanItemId(event.target.value)}
              value={productionPlanItemId}
            >
              <SelectItem text="선택하지 않음" value="" />
              {(selectedInventoryRow?.productionPlans ?? []).map((plan) => (
                <SelectItem
                  key={plan.id}
                  text={`${plan.productionDate} / ${plan.departmentCode} / ${formatNumber(plan.quantity)}개`}
                  value={plan.id}
                />
              ))}
            </Select>
            <OptionalFieldHelp
              label="관련 생산계획"
              text="참조용 연결입니다. 이 값을 비워도 재고 원장은 주문제품 기준으로 독립 생성됩니다."
            />
          </div>

          <div className="dss-production-management-form__field">
            <Select
              aria-label="품질상태"
              id="production-management-quality-status"
              labelText="품질상태"
              onChange={(event) => setQualityStatus(event.target.value as ProductionReceiptQualityStatus)}
              value={qualityStatus}
            >
              <SelectItem text="미입력" value="not_recorded" />
              <SelectItem text="합격" value="passed" />
              <SelectItem text="불합격" value="failed" />
            </Select>
            <OptionalFieldHelp label="품질상태" text="검사 결과를 입력하지 않으면 미입력으로 남깁니다." />
          </div>

          <div className="dss-production-management-form__field">
            <TextInput
              aria-label="담당자"
              id="production-management-operator"
              labelText="담당자"
              onChange={(event) => setOperatorName(event.target.value)}
              value={operatorName}
            />
            <OptionalFieldHelp label="담당자" text="생산 입고를 입력하거나 확인한 사람입니다." />
          </div>

          <div className="dss-production-management-form__field dss-production-management-form__field--wide">
            <TextArea
              aria-label="비고"
              id="production-management-memo"
              labelText="비고"
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              value={memo}
            />
            <OptionalFieldHelp label="비고" text="입고 시점에 남겨야 할 특이사항을 적습니다." />
          </div>
        </Form>

        <footer className="dss-order-drawer__footer">
          <Button kind="secondary" type="button" onClick={onClose}>
            닫기
          </Button>
          <Button disabled={!canSubmit} form="production-receipt-drawer-form" renderIcon={Add} type="submit">
            입력
          </Button>
        </footer>
      </aside>
    </div>
  );
}

export function ProductManagementWorkspace({
  currentDate,
  initialSeed,
}: {
  currentDate: string;
  initialSeed: ProductionManagementSeed;
}) {
  const [receipts, setReceipts] = useState(() => initialSeed.receipts);
  const [toastMessage, setToastMessage] = useState("");
  const [isReceiptDrawerOpen, setIsReceiptDrawerOpen] = useState(false);
  const [selectedHistoryRow, setSelectedHistoryRow] = useState<ProductionReceiptHistoryRow | null>(null);
  const seed = useMemo(() => ({ ...initialSeed, receipts }), [initialSeed, receipts]);
  const historyRows = useMemo(() => createReceiptHistoryRows(seed), [seed]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(""), 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function saveReceipt(receipt: ProductionReceiptRecord) {
    setReceipts((current) => [...current, receipt]);
    setToastMessage("생산 제품 입력이 등록되었습니다.");
  }

  return (
    <main className="dss-page dss-production-management-page">
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
          <h1>생산 결과</h1>
          <p>생산 입고 결과를 입력하고 입력 히스토리와 관련 주문/출하 상세를 확인합니다.</p>
        </div>
        <Button renderIcon={Add} type="button" onClick={() => setIsReceiptDrawerOpen(true)}>
          생산 제품 입력
        </Button>
      </header>

      <ReceiptHistoryTable onOpenDetail={setSelectedHistoryRow} rows={historyRows} />

      {isReceiptDrawerOpen ? (
        <ProductionReceiptDrawer
          currentDate={currentDate}
          receiptSequence={receipts.length + 1}
          seed={seed}
          onClose={() => setIsReceiptDrawerOpen(false)}
          onSaved={saveReceipt}
        />
      ) : null}
      {selectedHistoryRow ? <ReceiptDetailDrawer onClose={() => setSelectedHistoryRow(null)} row={selectedHistoryRow} /> : null}
    </main>
  );
}
