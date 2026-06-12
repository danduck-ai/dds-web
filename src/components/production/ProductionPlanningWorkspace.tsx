"use client";

import {
  Button,
  Checkbox,
  ContentSwitcher,
  InlineNotification,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Switch,
  Tag,
  TextInput,
  Tile,
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
import { type CSSProperties, type PointerEvent, useMemo, useState } from "react";

import type { AppRole, DepartmentCode, OrderListRow } from "@/features/orders/types";
import {
  buildConfirmationPlan,
  buildTimelineWindow,
  calculateTimelineRowSpan,
  createHalfHourOptions,
  createProductionPlanningCards,
  getInitialDepartment,
  moveCardsToAvailable,
  moveCardsToSchedule,
  partitionPlanningCards,
  reorderCards,
  updateScheduledCardQuantity,
} from "@/features/production/planning";
import type { ProductionPlanAssignment, ProductionPlanCard } from "@/features/production/types";

type ProductionProfile = {
  displayName: string;
  email: string;
  role: AppRole;
  departmentCode?: string | null;
};

type PlanningMode = "production-date" | "shipment-plan";
type QuantityModalState = {
  mode: "schedule" | "edit";
  cards: ProductionPlanCard[];
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

function getCardActionName(card: ProductionPlanCard) {
  return `${card.orderNo} ${card.plannedShipDate}`;
}

function getDateDiffInDays(fromDate: string, toDate: string) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();

  return Math.round((to - from) / millisecondsPerDay);
}

function formatShipmentCountdown(productionDate: string, plannedShipDate: string) {
  const daysUntilShipment = getDateDiffInDays(productionDate, plannedShipDate);

  if (daysUntilShipment === 0) {
    return "D-Day";
  }

  return daysUntilShipment > 0 ? `D-${daysUntilShipment}` : `D+${Math.abs(daysUntilShipment)}`;
}

function formatAvailableCardLabel(card: ProductionPlanCard, productionDate: string) {
  return `[${card.customerName}] ${card.productName} ${formatNumber(card.remainingQuantity)}개 (${formatShipmentCountdown(
    productionDate,
    card.plannedShipDate,
  )})`;
}

function resequenceCards(cards: ProductionPlanCard[]) {
  return cards.map((card, index) => ({ ...card, sequence: index + 1 }));
}

function AvailableProductionRow({
  card,
  checked,
  onToggle,
  productionDate,
}: {
  card: ProductionPlanCard;
  checked: boolean;
  onToggle: (cardId: string, checked: boolean) => void;
  productionDate: string;
}) {
  const label = formatAvailableCardLabel(card, productionDate);

  return (
    <li className="dss-production-available-row" data-selected={checked ? "true" : undefined}>
      <Checkbox
        checked={checked}
        id={`available-${card.id}`}
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
  productionDate,
}: {
  assignment?: ProductionPlanAssignment;
  card: ProductionPlanCard;
  checked: boolean;
  onEdit: (card: ProductionPlanCard) => void;
  onToggle: (cardId: string, checked: boolean) => void;
  productionDate: string;
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
          id={`scheduled-${card.id}`}
          labelText={`${cardActionName} 오늘 생산계획 선택`}
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
            {formatShipmentCountdown(productionDate, card.plannedShipDate)}
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

export function ProductionPlanningWorkspace({
  currentDate,
  initialOrders,
  profile,
}: {
  currentDate: string;
  initialOrders: OrderListRow[];
  profile: ProductionProfile;
}) {
  const initialProductionDate = currentDate.slice(0, 10);
  const initialDepartment = getInitialDepartment(profile.departmentCode);
  const [mode, setMode] = useState<PlanningMode>("production-date");
  const [productionDate, setProductionDate] = useState(initialProductionDate);
  const [departmentCode, setDepartmentCode] = useState<DepartmentCode>(initialDepartment);
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [availableCards, setAvailableCards] = useState<ProductionPlanCard[]>(
    () => createPlanningPanels(initialDepartment, initialProductionDate).availableCards,
  );
  const [scheduledCards, setScheduledCards] = useState<ProductionPlanCard[]>(
    () => createPlanningPanels(initialDepartment, initialProductionDate).scheduledCards,
  );
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(() => new Set());
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(() => new Set());
  const [quantityModal, setQuantityModal] = useState<QuantityModalState | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmedAssignments, setConfirmedAssignments] = useState<ProductionPlanAssignment[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const startTimeOptions = useMemo(() => createHalfHourOptions(), []);
  const timelineWindow = buildTimelineWindow(workStartTime);
  const confirmationPlan = buildConfirmationPlan(scheduledCards, {
    departmentCode,
    productionDate,
    workStartTime,
  });
  const assignmentsByPlanId = new Map(
    (confirmationPlan.ok ? confirmationPlan.assignments : confirmedAssignments).map((assignment) => [
      assignment.productionPlanId,
      assignment,
    ]),
  );
  const canSubmitQuantityModal =
    quantityModal?.cards.every((card) => {
      const quantity = Number(quantityDrafts[card.id]);
      return Number.isFinite(quantity) && quantity > 0 && quantity <= card.remainingQuantity;
    }) ?? false;

  function createPlanningPanels(nextDepartmentCode: DepartmentCode, nextProductionDate: string) {
    return partitionPlanningCards(
      createProductionPlanningCards(initialOrders, {
        departmentCode: nextDepartmentCode,
        productionDate: nextProductionDate,
      }),
      nextProductionDate,
    );
  }

  function resetCommitState() {
    setConfirmedAssignments([]);
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

  function openEditQuantityModal(card: ProductionPlanCard) {
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
      const result = moveCardsToSchedule({
        availableCards,
        scheduledCards,
        productionDate,
        quantitiesByCardId: new Map(
          quantityModal.cards.map((card) => [card.id, Number(quantityDrafts[card.id])]),
        ),
      });

      setAvailableCards(result.availableCards);
      setScheduledCards(resequenceCards(result.scheduledCards));
      setSelectedAvailableIds(new Set());
    } else {
      let nextAvailableCards = availableCards;
      let nextScheduledCards = scheduledCards;

      for (const card of quantityModal.cards) {
        const result = updateScheduledCardQuantity({
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

    const result = moveCardsToAvailable({
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

    setScheduledCards((current) => resequenceCards(reorderCards(current, String(event.active.id), String(event.over?.id))));
    resetCommitState();
  }

  function handleConfirm() {
    if (!confirmationPlan.ok) {
      return;
    }

    setConfirmedAssignments(confirmationPlan.assignments);
    setConfirmOpen(false);
    setSuccessMessage("생산계획이 확정되었습니다.");
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

  return (
    <main className="dss-page dss-production-page" onPointerDownCapture={handleWorkspacePointerDown}>
      <header className="dss-page-header">
        <div>
          <h1>생산 계획</h1>
          <p>미배정 생산계획을 생산일과 부서 기준으로 편성합니다.</p>
        </div>
      </header>

      <ContentSwitcher
        className="dss-status-switcher"
        onChange={({ index }) => setMode(index === 1 ? "shipment-plan" : "production-date")}
        selectedIndex={mode === "production-date" ? 0 : 1}
        size="md"
      >
        <Switch name="production-date" text="생산일 기준 보기" />
        <Switch name="shipment-plan" text="출하건 기준 보기" />
      </ContentSwitcher>

      {mode === "shipment-plan" ? (
        <Tile className="dss-production-under-construction">출하건 기준 보기는 공사중입니다.</Tile>
      ) : (
        <>
          <section className="dss-production-controls" aria-label="생산계획 조건">
            <TextInput
              id="production-date"
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
              id="production-department"
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
              id="production-start-time"
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
              onClick={() => setConfirmOpen(true)}
            >
              확정
            </Button>
          </section>

          {successMessage ? (
            <InlineNotification
              className="dss-production-notification"
              hideCloseButton
              kind="success"
              lowContrast
              subtitle={successMessage}
              title="확정 완료"
            />
          ) : null}

          <section className="dss-production-transfer" aria-label="생산계획 편성">
            <section
              className="dss-production-panel"
              aria-label="미배정 생산계획"
              data-active={selectedAvailableIds.size > 0 ? "true" : undefined}
              data-production-panel="available"
            >
              <div className="dss-production-panel__header">
                <div>
                  <h2>미배정 생산계획</h2>
                  <span>{availableCards.length}건</span>
                </div>
                <Tag size="sm" type="gray">
                  수량 미입력
                </Tag>
              </div>

              {availableCards.length === 0 ? (
                <Tile className="dss-empty-state">미배정 생산계획이 없습니다.</Tile>
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
              aria-label="생산계획 이동"
            >
              <Button
                aria-label="선택 항목 생산계획에 추가"
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
                aria-label="선택 항목 미배정으로 이동"
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
              aria-label="오늘 생산계획"
              data-active={selectedScheduledIds.size > 0 ? "true" : undefined}
              data-production-panel="scheduled"
            >
              <div className="dss-production-panel__header">
                <div>
                  <h2>오늘 생산계획</h2>
                  <span>{scheduledCards.length}건</span>
                </div>
                <Tag size="sm" type="blue">
                  {timelineWindow.startTime}-{timelineWindow.endTime}
                </Tag>
              </div>

              {scheduledCards.length === 0 ? (
                <Tile className="dss-empty-state">오늘 배치된 생산계획이 없습니다.</Tile>
              ) : (
                <DndContext
                  id="production-planning-sortable-instructions"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={scheduledCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                    <div className="dss-production-timeline-list">
                      {scheduledCards.map((card) => (
                        <ScheduledProductionCard
                          assignment={assignmentsByPlanId.get(card.productionPlanId)}
                          card={card}
                          checked={selectedScheduledIds.has(card.id)}
                          key={card.id}
                          onEdit={openEditQuantityModal}
                          onToggle={toggleScheduled}
                          productionDate={productionDate}
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
                          {card.orderNo} · 출하 {card.plannedShipDate}
                        </p>
                      </div>
                      <Tag size="sm" type="cyan">
                        잔량 {formatNumber(card.remainingQuantity)}개
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
                      id={`quantity-${card.id}`}
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

          {confirmOpen ? (
            <Modal
              danger
              modalHeading="생산계획을 확정할까요?"
              onRequestClose={() => setConfirmOpen(false)}
              onRequestSubmit={handleConfirm}
              open={confirmOpen}
              primaryButtonText="확정"
              secondaryButtonText="계속 편집"
              size="sm"
            >
              <p>확정하면 선택한 생산일, 부서, 생산 시작 시간, 카드 순서, 입력 수량이 생산계획에 저장됩니다.</p>
              <p>확정 후에는 이 화면에서 되돌릴 수 없습니다.</p>
            </Modal>
          ) : null}
        </>
      )}
    </main>
  );
}
