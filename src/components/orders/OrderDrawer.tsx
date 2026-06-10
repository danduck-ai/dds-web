"use client";

import { useMemo, useState } from "react";

import type { OrderFormInput, OrderListRow } from "@/features/orders/types";
import { validateOrderForm } from "@/features/orders/validation";
import type { ContactOption, DesignOption } from "@/features/reference/data";
import { ConfirmActionModal } from "./ConfirmActionModal";

type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof OrderFormInput | "schedules", string>>;
};

const emptyForm: OrderFormInput = {
  requestedDate: "",
  channel: "",
  customChannel: "",
  customerId: "",
  contactId: "",
  designId: "",
  quantity: 0,
  deliveryType: "single",
  schedules: [{ scheduledDate: "", quantity: 0 }],
};

function formFromOrder(order: OrderListRow | null): OrderFormInput {
  if (!order) {
    return emptyForm;
  }

  return {
    requestedDate: order.requestedDate,
    channel: order.channel.startsWith("기타:") ? "기타" : order.channel,
    customChannel: order.channel.startsWith("기타:") ? order.channel.replace("기타:", "").trim() : "",
    customerId: "",
    contactId: "",
    designId: "",
    quantity: order.quantity,
    deliveryType: order.deliveryType,
    schedules: order.schedules.map((schedule) => ({ ...schedule })),
  };
}

export function OrderDrawer({
  mode,
  order,
  contactOptions,
  designOptions,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  order: OrderListRow | null;
  contactOptions: ContactOption[];
  designOptions: DesignOption[];
  onClose: () => void;
  onSubmit: (input: OrderFormInput) => Promise<ActionResult>;
}) {
  const [form, setForm] = useState<OrderFormInput>(() => formFromOrder(order));
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<ActionResult["fieldErrors"]>({});
  const [summary, setSummary] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedPair = useMemo(
    () => (form.customerId && form.contactId ? `${form.customerId}::${form.contactId}` : ""),
    [form.contactId, form.customerId],
  );

  function patchForm(patch: Partial<OrderFormInput>) {
    setDirty(true);
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchSchedule(index: number, patch: Partial<OrderFormInput["schedules"][number]>) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      schedules: current.schedules.map((schedule, scheduleIndex) =>
        scheduleIndex === index ? { ...schedule, ...patch } : schedule,
      ),
    }));
  }

  function setDeliveryType(deliveryType: "single" | "split") {
    patchForm({
      deliveryType,
      schedules:
        deliveryType === "split"
          ? [
              form.schedules[0] ?? { scheduledDate: "", quantity: 0 },
              form.schedules[1] ?? { scheduledDate: "", quantity: 0 },
            ]
          : [form.schedules[0] ?? { scheduledDate: "", quantity: 0 }],
    });
  }

  async function handleSubmit() {
    const validation = validateOrderForm(form);
    if (!validation.ok) {
      setErrors(validation.fieldErrors);
      setSummary("입력값을 확인하세요.");
      return;
    }

    setSaving(true);
    const result = await onSubmit(form);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setSummary(result.message);
      return;
    }

    onClose();
  }

  function requestClose() {
    if (dirty) {
      setShowCloseConfirm(true);
      return;
    }

    onClose();
  }

  return (
    <>
      <aside aria-label={mode === "create" ? "주문 입력" : "주문 수정"} className="order-drawer">
        <header className="order-drawer__header">
          <h2>{mode === "create" ? "주문 입력" : "주문 수정"}</h2>
          <button aria-label="닫기" type="button" onClick={requestClose}>
            닫기
          </button>
        </header>

        {summary ? <div className="drawer-error">{summary}</div> : null}

        <div className="order-drawer__body">
          <section>
            <h3>1. 주문 접수</h3>
            <label>
              주문 요청일
              <input
                aria-label="주문 요청일"
                type="date"
                value={form.requestedDate}
                onChange={(event) => patchForm({ requestedDate: event.target.value })}
              />
            </label>
            <label>
              채널
              <select
                aria-label="채널"
                value={form.channel}
                onChange={(event) => patchForm({ channel: event.target.value })}
              >
                <option value="">선택</option>
                <option value="이메일">이메일</option>
                <option value="카톡">카톡</option>
                <option value="전화">전화</option>
                <option value="기타">기타</option>
              </select>
            </label>
            {form.channel === "기타" ? (
              <label>
                기타 채널명
                <input
                  aria-label="기타 채널명"
                  value={form.customChannel}
                  onChange={(event) => patchForm({ customChannel: event.target.value })}
                />
              </label>
            ) : null}
            {errors?.requestedDate ? <p className="field-error">{errors.requestedDate}</p> : null}
            {errors?.channel ? <p className="field-error">{errors.channel}</p> : null}
            {errors?.customChannel ? <p className="field-error">{errors.customChannel}</p> : null}
          </section>

          <section>
            <h3>2. 고객사 및 담당자</h3>
            <label>
              고객사 및 담당자
              <select
                aria-label="고객사 및 담당자"
                value={selectedPair}
                onChange={(event) => {
                  const [customerId, contactId] = event.target.value.split("::");
                  patchForm({ customerId: customerId ?? "", contactId: contactId ?? "" });
                }}
              >
                <option value="">선택</option>
                {contactOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {errors?.customerId ? <p className="field-error">{errors.customerId}</p> : null}
            <button type="button" className="ghost-button" disabled>
              신규
            </button>
          </section>

          <section>
            <h3>3. 제품/설계</h3>
            <label>
              제품/설계
              <select
                aria-label="제품/설계"
                value={form.designId}
                onChange={(event) => patchForm({ designId: event.target.value })}
              >
                <option value="">선택</option>
                {designOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              주문 수량
              <input
                aria-label="주문 수량"
                min="0"
                type="number"
                value={form.quantity}
                onChange={(event) => patchForm({ quantity: Number(event.target.value) })}
              />
            </label>
            {errors?.designId ? <p className="field-error">{errors.designId}</p> : null}
            {errors?.quantity ? <p className="field-error">{errors.quantity}</p> : null}
          </section>

          <section>
            <h3>4. 납기</h3>
            <div className="segmented-control">
              <label>
                <input
                  checked={form.deliveryType === "single"}
                  name="deliveryType"
                  type="radio"
                  onChange={() => setDeliveryType("single")}
                />
                일반 출하
              </label>
              <label>
                <input
                  aria-label="분할 출하"
                  checked={form.deliveryType === "split"}
                  name="deliveryType"
                  type="radio"
                  onChange={() => setDeliveryType("split")}
                />
                분할 출하
              </label>
            </div>
            {form.schedules.map((schedule, index) => (
              <div className="schedule-row" key={index}>
                <label>
                  출하일 {index + 1}
                  <input
                    aria-label={`출하일 ${index + 1}`}
                    type="date"
                    value={schedule.scheduledDate}
                    onChange={(event) => patchSchedule(index, { scheduledDate: event.target.value })}
                  />
                </label>
                <label>
                  수량 {index + 1}
                  <input
                    aria-label={`수량 ${index + 1}`}
                    min="0"
                    type="number"
                    value={schedule.quantity}
                    onChange={(event) => patchSchedule(index, { quantity: Number(event.target.value) })}
                  />
                </label>
              </div>
            ))}
            {errors?.schedules ? <p className="field-error">{errors.schedules}</p> : null}
          </section>
        </div>

        <footer className="order-drawer__footer">
          <button disabled={saving} type="button" onClick={handleSubmit}>
            저장
          </button>
        </footer>
      </aside>

      {showCloseConfirm ? (
        <ConfirmActionModal
          title="변경사항 확인"
          body="변경사항을 저장하지 않고 닫을까요?"
          confirmLabel="닫기"
          onCancel={() => setShowCloseConfirm(false)}
          onConfirm={onClose}
        />
      ) : null}
    </>
  );
}
