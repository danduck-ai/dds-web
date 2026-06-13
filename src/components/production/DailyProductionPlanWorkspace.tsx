"use client";

import {
  Button,
  Checkbox,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Tag,
  TextInput,
  Tile,
  ToastNotification,
} from "@carbon/react";
import { ArrowLeft, ArrowRight, Checkmark, Edit, Time } from "@carbon/icons-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, type PointerEvent, useEffect, useMemo, useState } from "react";

import { TOAST_TIMEOUT_MS, ToastStack } from "@/components/notifications/ToastProvider";
import type { AppRole, DepartmentCode } from "@/features/orders/types";
import {
  buildDailyConfirmationPlan,
  buildTimelineWindow,
  calculateTimelineRowSpan,
  createDailyProductionPlanningCards,
  createHalfHourOptions,
  getInitialDepartment,
  moveDailyCardsToAvailable,
  moveDailyCardsToSchedule,
  partitionDailyPlanningCards,
  reorderDailyCards,
  updateDailyScheduledCardQuantity,
} from "@/features/production/daily-planning";
import type {
  DailyProductionCard,
  DailyProductionPlanItem,
  DailyProductionSeed,
  DailyProductionSeedItem,
} from "@/features/production/types";

export type DailyProductionProfile = {
  displayName: string;
  email: string;
  role: AppRole;
  departmentCode?: string | null;
};

type QuantityModalState = {
  mode: "schedule" | "edit";
  cards: DailyProductionCard[];
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatDuration(value: number | null | undefined) {
  if (!value) {
    return "소요시간 미정";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

function getDateDiffInDays(fromDate: string, toDate: string) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();

  return Math.round((to - from) / millisecondsPerDay);
}

function formatNextShipCountdown(productionDate: string, nextShipDate: string) {
  if (nextShipDate === "-") {
    return "출하일 미정";
  }

  const daysUntilShipment = getDateDiffInDays(productionDate, nextShipDate);

  if (daysUntilShipment === 0) {
    return "다음 출하 D-Day";
  }

  return daysUntilShipment > 0 ? `다음 출하 D-${daysUntilShipment}` : `다음 출하 D+${Math.abs(daysUntilShipment)}`;
}

function formatAvailableCardLabel(card: DailyProductionCard, productionDate: string) {
  return `[${card.customerName}] ${card.productName} ${formatNumber(card.remainingQuantity)}개 (${formatNextShipCountdown(
    productionDate,
    card.nextShipDate,
  )})`;
}

function getCardActionName(card: DailyProductionCard) {
  return `${card.orderNo} ${card.productName}`;
}

function resequenceCards(cards: DailyProductionCard[]) {
  return cards.map((card, index) => ({ ...card, sequence: index + 1 }));
}

function AvailableProductionRow({
  card,
  checked,
  onToggle,
  productionDate,
}: {
  card: DailyProductionCard;
  checked: boolean;
  onToggle: (cardId: string, checked: boolean) => void;
  productionDate: string;
}) {
  const label = formatAvailableCardLabel(card, productionDate);

  return (
    <li className="dss-production-available-row" data-selected={checked ? "true" : undefined}>
      <Checkbox
        checked={checked}
        id={`daily-available-${card.id}`}
        labelText={label}
        onChange={(_, { checked: nextChecked }) => onToggle(card.id, nextChecked)}
      />
    </li>
  );
}

function ScheduledProductionCard({
  assignment,
  card,
  checked,
  onEdit,
  onToggle,
}: {
  assignment?: DailyProductionPlanItem;
  card: DailyProductionCard;
  checked: boolean;
  onEdit: (card: DailyProductionCard) => void;
  onToggle: (cardId: string, checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const cardActionName = getCardActionName(card);
  const timeRange = assignment ? `${assignment.startTime}-${assignment.endTime}` : "시간 미정";
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    "--dss-production-row-span": calculateTimelineRowSpan(card.estimatedDurationMinutes),
  } as CSSProperties;

  return (
    <article
      className="dss-production-scheduled-card"
      data-dragging={isDragging}
      data-selected={checked ? "true" : undefined}
      ref={setNodeRef}
      style={style}
    >
      <div className="dss-production-scheduled-card__select" onPointerDown={(event) => event.stopPropagation()}>
        <Checkbox
          checked={checked}
          hideLabel
          id={`daily-scheduled-${card.id}`}
          labelText={`${cardActionName} 일간 생산 항목 선택`}
          onChange={(_, { checked: nextChecked }) => onToggle(card.id, nextChecked)}
        />
      </div>

      <div
        className="dss-production-scheduled-card__handle"
        aria-label={`${cardActionName} 순서 이동`}
        {...attributes}
        {...listeners}
      >
        <div className="dss-production-scheduled-card__time">
          <Time size={16} />
          <span className="dss-production-scheduled-card__time-text">
            <span>{timeRange}</span>
            <span>{formatDuration(card.estimatedDurationMinutes)}</span>
          </span>
        </div>
        <div className="dss-production-scheduled-card__main">
          <strong>{card.productName}</strong>
          <span className="dss-production-scheduled-card__secondary">
            <span>{card.orderNo}</span>
            <span>생산 {formatNumber(card.quantity ?? 0)}개</span>
          </span>
        </div>
        <div className="dss-production-scheduled-card__metrics">
          <Tag size="sm" type="cyan">
            {card.shipmentSummary}
          </Tag>
        </div>
      </div>

      <Button
        aria-label={`${cardActionName} 수량 수정`}
        hasIconOnly
        iconDescription={`${cardActionName} 수량 수정`}
        kind="ghost"
        renderIcon={Edit}
        size="sm"
        type="button"
        onClick={() => onEdit(card)}
        onPointerDown={(event) => event.stopPropagation()}
      />
    </article>
  );
}

export function DailyProductionPlanWorkspace({
  currentDate,
  embedded = false,
  initialDepartmentCode,
  initialProductionDate: initialProductionDateOption,
  initialSeed,
  onSaved,
  profile,
  toastDurationMs = TOAST_TIMEOUT_MS,
}: {
  currentDate: string;
  embedded?: boolean;
  initialDepartmentCode?: DepartmentCode;
  initialProductionDate?: string;
  initialSeed: DailyProductionSeed;
  onSaved?: (message: string, dayPlanItems: DailyProductionSeedItem[]) => void;
  profile: DailyProductionProfile;
  toastDurationMs?: number;
}) {
  const initialProductionDate = initialProductionDateOption ?? currentDate.slice(0, 10);
  const initialDepartment = initialDepartmentCode ?? getInitialDepartment(profile.departmentCode);
  const [productionDate, setProductionDate] = useState(initialProductionDate);
  const [departmentCode, setDepartmentCode] = useState<DepartmentCode>(initialDepartment);
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [availableCards, setAvailableCards] = useState<DailyProductionCard[]>(
    () => createPlanningPanels(initialDepartment, initialProductionDate).availableCards,
  );
  const [scheduledCards, setScheduledCards] = useState<DailyProductionCard[]>(
    () => createPlanningPanels(initialDepartment, initialProductionDate).scheduledCards,
  );
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(() => new Set());
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(() => new Set());
  const [quantityModal, setQuantityModal] = useState<QuantityModalState | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [confirmedItems, setConfirmedItems] = useState<DailyProductionPlanItem[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const startTimeOptions = useMemo(() => createHalfHourOptions(), []);
  const timelineWindow = buildTimelineWindow(workStartTime);
  const confirmationPlan = buildDailyConfirmationPlan(scheduledCards, {
    departmentCode,
    productionDate,
    workStartTime,
  });
  const assignmentsByCardId = new Map(
    (confirmationPlan.ok ? confirmationPlan.dayPlan.items : confirmedItems).map((assignment) => [assignment.id, assignment]),
  );
  const canSubmitQuantityModal =
    quantityModal?.cards.every((card) => {
      const quantity = Number(quantityDrafts[card.id]);
      return Number.isFinite(quantity) && quantity > 0 && quantity <= card.remainingQuantity;
    }) ?? false;

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, toastDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage, toastDurationMs]);

  function createPlanningPanels(nextDepartmentCode: DepartmentCode, nextProductionDate: string) {
    return partitionDailyPlanningCards(
      createDailyProductionPlanningCards(initialSeed, {
        departmentCode: nextDepartmentCode,
        productionDate: nextProductionDate,
      }),
      nextProductionDate,
    );
  }

  function resetCommitState() {
    setConfirmedItems([]);
    setSuccessMessage("");
  }

  function refreshPanels(nextDepartmentCode = departmentCode, nextProductionDate = productionDate) {
    const nextPanels = createPlanningPanels(nextDepartmentCode, nextProductionDate);

    setAvailableCards(nextPanels.availableCards);
    setScheduledCards(resequenceCards(nextPanels.scheduledCards));
    setSelectedAvailableIds(new Set());
    setSelectedScheduledIds(new Set());
    setQuantityModal(null);
    setQuantityDrafts({});
    resetCommitState();
  }

  function toggleAvailable(cardId: string, checked: boolean) {
    if (checked) {
      setSelectedScheduledIds(new Set());
    }

    setSelectedAvailableIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }

      return next;
    });
  }

  function toggleScheduled(cardId: string, checked: boolean) {
    if (checked) {
      setSelectedAvailableIds(new Set());
    }

    setSelectedScheduledIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }

      return next;
    });
  }

  function openScheduleQuantityModal() {
    const cards = availableCards.filter((card) => selectedAvailableIds.has(card.id));

    if (cards.length === 0) {
      return;
    }

    setQuantityDrafts(Object.fromEntries(cards.map((card) => [card.id, card.quantity ? String(card.quantity) : ""])));
    setQuantityModal({ mode: "schedule", cards });
  }

  function openEditQuantityModal(card: DailyProductionCard) {
    setQuantityDrafts({ [card.id]: card.quantity ? String(card.quantity) : "" });
    setQuantityModal({ mode: "edit", cards: [card] });
  }

  function closeQuantityModal() {
    setQuantityModal(null);
    setQuantityDrafts({});
  }

  function applyQuantityModal() {
    if (!quantityModal || !canSubmitQuantityModal) {
      return;
    }

    if (quantityModal.mode === "schedule") {
      const result = moveDailyCardsToSchedule({
        availableCards,
        scheduledCards,
        productionDate,
        quantitiesByCardId: new Map(quantityModal.cards.map((card) => [card.id, Number(quantityDrafts[card.id])])),
      });

      setAvailableCards(result.availableCards);
      setScheduledCards(resequenceCards(result.scheduledCards));
      setSelectedAvailableIds(new Set());
    } else {
      let nextAvailableCards = availableCards;
      let nextScheduledCards = scheduledCards;

      for (const card of quantityModal.cards) {
        const result = updateDailyScheduledCardQuantity({
          availableCards: nextAvailableCards,
          scheduledCards: nextScheduledCards,
          cardId: card.id,
          quantity: Number(quantityDrafts[card.id]),
        });

        nextAvailableCards = result.availableCards;
        nextScheduledCards = result.scheduledCards;
      }

      setAvailableCards(nextAvailableCards);
      setScheduledCards(resequenceCards(nextScheduledCards));
    }

    setSelectedScheduledIds(new Set());
    closeQuantityModal();
    resetCommitState();
  }

  function moveSelectedScheduledToAvailable() {
    if (selectedScheduledIds.size === 0) {
      return;
    }

    const result = moveDailyCardsToAvailable({
      availableCards,
      scheduledCards,
      cardIds: Array.from(selectedScheduledIds),
    });

    setAvailableCards(result.availableCards);
    setScheduledCards(resequenceCards(result.scheduledCards));
    setSelectedScheduledIds(new Set());
    resetCommitState();
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    setScheduledCards((current) =>
      resequenceCards(reorderDailyCards(current, String(event.active.id), String(event.over?.id))),
    );
    resetCommitState();
  }

  function handleSave() {
    if (!confirmationPlan.ok) {
      return;
    }

    setConfirmedItems(confirmationPlan.dayPlan.items);
    const message = "일간 생산 계획표가 저장되었습니다.";
    const savedItems = confirmationPlan.dayPlan.items.map(
      (item): DailyProductionSeedItem => ({
        id: item.id,
        productionDate: item.productionDate,
        departmentCode: item.departmentCode,
        workStartTime: confirmationPlan.dayPlan.workStartTime,
        orderProductId: item.orderProductId,
        quantity: item.quantity,
        estimatedDurationMinutes: item.estimatedDurationMinutes,
        durationSource: item.durationSource,
        planningStatus: item.planningStatus,
        sequence: item.sequence,
      }),
    );

    if (onSaved) {
      onSaved(message, savedItems);
      return;
    }

    setSuccessMessage(message);
  }

  function handleWorkspacePointerDown(event: PointerEvent<HTMLElement>) {
    const target = event.target;
    const targetNode = target as Node;
    const transferActions = event.currentTarget.querySelector<HTMLElement>(".dss-production-transfer__actions");
    const clickedTransferButton =
      target instanceof Element && transferActions?.contains(target) && target.closest("button");

    if (clickedTransferButton) {
      return;
    }

    const availablePanel = event.currentTarget.querySelector<HTMLElement>('[data-production-panel="available"]');
    const scheduledPanel = event.currentTarget.querySelector<HTMLElement>('[data-production-panel="scheduled"]');

    if (selectedAvailableIds.size > 0 && availablePanel && !availablePanel.contains(targetNode)) {
      setSelectedAvailableIds(new Set());
    }

    if (selectedScheduledIds.size > 0 && scheduledPanel && !scheduledPanel.contains(targetNode)) {
      setSelectedScheduledIds(new Set());
    }
  }

  const workspaceContent = (
    <>
      <section className="dss-production-controls" aria-label="일간 생산계획 조건">
        <TextInput
          id="daily-production-date"
          labelText="생산일"
          onChange={(event) => {
            setProductionDate(event.target.value);
            refreshPanels(departmentCode, event.target.value);
          }}
          size="md"
          type="date"
          value={productionDate}
        />
        <Select
          id="daily-production-department"
          labelText="부서"
          onChange={(event) => {
            const nextDepartment = getInitialDepartment(event.target.value);
            setDepartmentCode(nextDepartment);
            refreshPanels(nextDepartment, productionDate);
          }}
          size="md"
          value={departmentCode}
        >
          <SelectItem text="R" value="R" />
          <SelectItem text="S" value="S" />
          <SelectItem text="P" value="P" />
        </Select>
        <Select
          id="daily-production-start-time"
          labelText="생산 시작 시간"
          onChange={(event) => {
            setWorkStartTime(event.target.value);
            resetCommitState();
          }}
          size="md"
          value={workStartTime}
        >
          {startTimeOptions.map((option) => (
            <SelectItem key={option} text={option} value={option} />
          ))}
        </Select>
        <Button
          disabled={!confirmationPlan.ok || scheduledCards.length === 0}
          renderIcon={Checkmark}
          type="button"
          onClick={handleSave}
        >
          저장
        </Button>
      </section>

      {successMessage ? (
        <ToastStack>
          <ToastNotification
            hideCloseButton
            kind="success"
            lowContrast
            onClose={() => setSuccessMessage("")}
            statusIconDescription="성공"
            subtitle={successMessage}
            timeout={toastDurationMs}
            title="저장 완료"
          />
        </ToastStack>
      ) : null}

      <section className="dss-production-transfer" aria-label="일간 생산계획 편성">
        <section
          className="dss-production-panel"
          aria-label="생산 대상 주문제품"
          data-active={selectedAvailableIds.size > 0 ? "true" : undefined}
          data-production-panel="available"
        >
          <div className="dss-production-panel__header">
            <div>
              <h2>생산 대상 주문제품</h2>
              <span>{availableCards.length}건</span>
            </div>
            <Tag size="sm" type="gray">
              미계획 수량
            </Tag>
          </div>

          {availableCards.length === 0 ? (
            <Tile className="dss-empty-state">일간 계획에 추가할 주문제품이 없습니다.</Tile>
          ) : (
            <ul className="dss-production-available-list">
              {availableCards.map((card) => (
                <AvailableProductionRow
                  card={card}
                  checked={selectedAvailableIds.has(card.id)}
                  key={card.id}
                  onToggle={toggleAvailable}
                  productionDate={productionDate}
                />
              ))}
            </ul>
          )}
        </section>

        <div
          className="dss-production-transfer__actions dss-production-transfer__actions--panel-top"
          aria-label="일간 생산계획 이동"
        >
          <Button
            aria-label="선택 제품 계획표에 추가"
            disabled={selectedAvailableIds.size === 0}
            kind="secondary"
            renderIcon={ArrowRight}
            size="sm"
            type="button"
            onClick={openScheduleQuantityModal}
          >
            추가
          </Button>
          <Button
            aria-label="선택 항목 생산 대상으로 이동"
            disabled={selectedScheduledIds.size === 0}
            kind="secondary"
            renderIcon={ArrowLeft}
            size="sm"
            type="button"
            onClick={moveSelectedScheduledToAvailable}
          >
            제거
          </Button>
        </div>

        <section
          className="dss-production-panel dss-production-panel--timeline"
          aria-label="일간 생산 계획표"
          data-active={selectedScheduledIds.size > 0 ? "true" : undefined}
          data-production-panel="scheduled"
        >
          <div className="dss-production-panel__header">
            <div>
              <h2>일간 생산 계획표</h2>
              <span>{scheduledCards.length}건</span>
            </div>
            <Tag size="sm" type="blue">
              {timelineWindow.startTime}-{timelineWindow.endTime}
            </Tag>
          </div>

          {scheduledCards.length === 0 ? (
            <Tile className="dss-empty-state">오늘 배치된 주문제품이 없습니다.</Tile>
          ) : (
            <DndContext
              id="daily-production-sortable-instructions"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={scheduledCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                <div className="dss-production-timeline-list">
                  {scheduledCards.map((card) => (
                    <ScheduledProductionCard
                      assignment={assignmentsByCardId.get(card.id)}
                      card={card}
                      checked={selectedScheduledIds.has(card.id)}
                      key={card.id}
                      onEdit={openEditQuantityModal}
                      onToggle={toggleScheduled}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </section>

      {quantityModal ? (
        <Modal
          modalHeading="생산수량 입력"
          onRequestClose={closeQuantityModal}
          onRequestSubmit={applyQuantityModal}
          open={Boolean(quantityModal)}
          primaryButtonDisabled={!canSubmitQuantityModal}
          primaryButtonText="적용"
          secondaryButtonText="취소"
          size="lg"
        >
          <div className="dss-production-quantity-modal">
            {quantityModal.cards.map((card) => (
              <section className="dss-production-quantity-modal__item" key={card.id}>
                <div className="dss-production-quantity-modal__header">
                  <div>
                    <h3>{card.productName}</h3>
                    <p>
                      {card.orderNo} · {card.shipmentSummary}
                    </p>
                  </div>
                  <Tag size="sm" type="cyan">
                    계획 가능 {formatNumber(card.remainingQuantity)}개
                  </Tag>
                </div>
                <dl className="dss-production-quantity-modal__meta">
                  <div>
                    <dt>고객사</dt>
                    <dd>{card.customerName}</dd>
                  </div>
                  <div>
                    <dt>설계</dt>
                    <dd>{card.designNo}</dd>
                  </div>
                  <div>
                    <dt>규격</dt>
                    <dd>{card.specification}</dd>
                  </div>
                  <div>
                    <dt>기준 생산성</dt>
                    <dd>시간당 {formatNumber(card.defaultUnitsPerHour)}개</dd>
                  </div>
                </dl>
                <NumberInput
                  allowEmpty
                  hideSteppers
                  id={`daily-quantity-${card.id}`}
                  invalid={Boolean(quantityDrafts[card.id]) && !Number.isFinite(Number(quantityDrafts[card.id]))}
                  invalidText="생산수량을 확인하세요."
                  label={`${getCardActionName(card)} 생산수량`}
                  max={card.remainingQuantity}
                  min={1}
                  onChange={(_, state) =>
                    setQuantityDrafts((current) => ({
                      ...current,
                      [card.id]: String(state.value ?? ""),
                    }))
                  }
                  size="md"
                  type="number"
                  value={quantityDrafts[card.id] ?? ""}
                />
              </section>
            ))}
          </div>
        </Modal>
      ) : null}

    </>
  );

  if (embedded) {
    return (
      <section
        aria-label="일간 생산 계획 작성"
        className="dss-production-page dss-production-page--embedded"
        onPointerDownCapture={handleWorkspacePointerDown}
      >
        {workspaceContent}
      </section>
    );
  }

  return (
    <main className="dss-page dss-production-page" onPointerDownCapture={handleWorkspacePointerDown}>
      <header className="dss-page-header">
        <div>
          <h1>일간 생산 계획표 작성</h1>
          <p>주문제품을 선택해 생산일과 부서 기준의 일간 생산계획표를 작성합니다.</p>
        </div>
      </header>

      {workspaceContent}
    </main>
  );
}
