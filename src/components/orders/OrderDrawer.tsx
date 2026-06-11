"use client";

import {
  Button,
  Form,
  FormGroup,
  InlineNotification,
  NumberInput,
  Search,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import { Add, Close, TrashCan } from "@carbon/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { OrderFormInput, OrderListRow, OrderProductInput } from "@/features/orders/types";
import { validateOrderForm } from "@/features/orders/validation";
import type { ContactOption, DesignOption } from "@/features/reference/data";
import { ConfirmActionModal } from "./ConfirmActionModal";

type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof OrderFormInput | "products", string>>;
};

const emptyProduct: OrderProductInput = {
  designId: "",
  quantity: 0,
  shipmentPlans: [{ plannedShipDate: "", quantity: 0 }],
};

const emptyForm: OrderFormInput = {
  requestedDate: "",
  channel: "",
  customChannel: "",
  customerId: "",
  contactId: "",
  products: [emptyProduct],
};

function numericFieldValue(value: number) {
  return value === 0 ? "" : value;
}

function normalizeNumericInput(value: number | string) {
  if (value === "") {
    return 0;
  }

  return Number(value);
}

function formFromOrder(
  order: OrderListRow | null,
  contactOptions: ContactOption[],
  designOptions: DesignOption[],
): OrderFormInput {
  if (!order) {
    return emptyForm;
  }

  const contactOption = contactOptions.find(
    (option) => option.label === `${order.customerName} / ${order.contactName}`,
  );

  return {
    requestedDate: order.requestedDate,
    channel: order.channel.startsWith("기타:") ? "기타" : order.channel,
    customChannel: order.channel.startsWith("기타:") ? order.channel.replace("기타:", "").trim() : "",
    customerId: contactOption?.customerId ?? "",
    contactId: contactOption?.contactId ?? "",
    products:
      order.products.length > 0
        ? order.products.map((product) => ({
            designId: designOptions.find((option) => option.designNo === product.designNo)?.value ?? "",
            quantity: product.quantity,
            shipmentPlans: product.shipmentPlans.map((plan) => ({
              plannedShipDate: plan.plannedShipDate,
              quantity: plan.quantity,
            })),
          }))
        : [emptyProduct],
  };
}

export function OrderDrawer({
  mode,
  order,
  contactOptions,
  designOptions,
  receiverLabel,
  onClose,
  onFutureAction,
  onSubmit,
}: {
  mode: "create" | "edit";
  order: OrderListRow | null;
  contactOptions: ContactOption[];
  designOptions: DesignOption[];
  receiverLabel: string;
  onClose: () => void;
  onFutureAction: (message: string) => void;
  onSubmit: (input: OrderFormInput) => Promise<ActionResult>;
}) {
  const [form, setForm] = useState<OrderFormInput>(() => formFromOrder(order, contactOptions, designOptions));
  const [contactQuery, setContactQuery] = useState("");
  const [designQuery, setDesignQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<ActionResult["fieldErrors"]>({});
  const [summary, setSummary] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestedDateRef = useRef<HTMLInputElement>(null);
  const heading = mode === "create" ? "주문 입력" : "주문 수정";

  const selectedPair = useMemo(
    () => (form.customerId && form.contactId ? `${form.customerId}::${form.contactId}` : ""),
    [form.contactId, form.customerId],
  );
  const selectedContactOption = useMemo(
    () => contactOptions.find((option) => option.value === selectedPair),
    [contactOptions, selectedPair],
  );
  const selectedDesignIds = useMemo(
    () => new Set(form.products.map((product) => product.designId).filter(Boolean)),
    [form.products],
  );
  const filteredContactOptions = useMemo(() => {
    const normalizedQuery = contactQuery.trim().toLowerCase();
    const matches = normalizedQuery
      ? contactOptions.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
      : contactOptions;

    if (selectedContactOption && !matches.some((option) => option.value === selectedContactOption.value)) {
      return [selectedContactOption, ...matches];
    }

    return matches;
  }, [contactOptions, contactQuery, selectedContactOption]);
  const filteredDesignOptions = useMemo(() => {
    const normalizedQuery = designQuery.trim().toLowerCase();
    const matches = normalizedQuery
      ? designOptions.filter((option) =>
          [option.label, option.designNo, option.productName, option.specification, option.departmentCode]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : designOptions;

    const selectedOptions = designOptions.filter(
      (option) => selectedDesignIds.has(option.value) && !matches.some((match) => match.value === option.value),
    );

    return [...selectedOptions, ...matches];
  }, [designOptions, designQuery, selectedDesignIds]);

  useEffect(() => {
    requestedDateRef.current?.focus();
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      if (dirty) {
        setShowCloseConfirm(true);
      } else {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dirty, onClose]);

  function patchForm(patch: Partial<OrderFormInput>) {
    setDirty(true);
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchProduct(productIndex: number, patch: Partial<OrderProductInput>) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex ? { ...product, ...patch } : product,
      ),
    }));
  }

  function patchShipmentPlan(
    productIndex: number,
    planIndex: number,
    patch: Partial<OrderProductInput["shipmentPlans"][number]>,
  ) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              shipmentPlans: product.shipmentPlans.map((plan, currentPlanIndex) =>
                currentPlanIndex === planIndex ? { ...plan, ...patch } : plan,
              ),
            }
          : product,
      ),
    }));
  }

  function addProduct() {
    setDirty(true);
    setForm((current) => ({
      ...current,
      products: [
        ...current.products,
        {
          designId: "",
          quantity: 0,
          shipmentPlans: [{ plannedShipDate: "", quantity: 0 }],
        },
      ],
    }));
  }

  function removeProduct(productIndex: number) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      products: current.products.filter((_, index) => index !== productIndex),
    }));
  }

  function addShipmentPlan(productIndex: number) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              shipmentPlans: [...product.shipmentPlans, { plannedShipDate: "", quantity: 0 }],
            }
          : product,
      ),
    }));
  }

  function removeShipmentPlan(productIndex: number, planIndex: number) {
    setDirty(true);
    setForm((current) => ({
      ...current,
      products: current.products.map((product, index) =>
        index === productIndex
          ? {
              ...product,
              shipmentPlans: product.shipmentPlans.filter((_, currentPlanIndex) => currentPlanIndex !== planIndex),
            }
          : product,
      ),
    }));
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
      <div
        className="dss-drawer-layer"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            requestClose();
          }
        }}
      >
        <aside aria-label={heading} className="dss-order-drawer">
          <header className="dss-order-drawer__header">
            <h2>{heading}</h2>
            <Button
              hasIconOnly
              iconDescription={`${heading} 닫기`}
              kind="ghost"
              renderIcon={Close}
              size="sm"
              tooltipPosition="left"
              type="button"
              onClick={requestClose}
            />
          </header>

        <Form
          aria-label={heading}
          className="dss-order-drawer__body"
          id="order-drawer-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Stack gap={6}>
            {summary ? (
              <InlineNotification
                hideCloseButton
                kind="error"
                lowContrast
                statusIconDescription="오류"
                subtitle={summary}
                title="입력 오류"
              />
            ) : null}

            <FormGroup legendText="1. 주문 접수">
              <Stack gap={5}>
                <div className="dss-form-grid">
                  <TextInput
                    id="order-requested-date"
                    invalid={Boolean(errors?.requestedDate)}
                    invalidText={errors?.requestedDate}
                    labelText="주문 요청일"
                    ref={requestedDateRef}
                    type="date"
                    value={form.requestedDate}
                    onChange={(event) => patchForm({ requestedDate: event.target.value })}
                  />
                  <Select
                    id="order-channel"
                    invalid={Boolean(errors?.channel)}
                    invalidText={errors?.channel}
                    labelText="채널"
                    value={form.channel}
                    onChange={(event) => patchForm({ channel: event.target.value })}
                  >
                    <SelectItem text="선택" value="" />
                    <SelectItem text="이메일" value="이메일" />
                    <SelectItem text="카톡" value="카톡" />
                    <SelectItem text="전화" value="전화" />
                    <SelectItem text="기타" value="기타" />
                  </Select>
                </div>
                {form.channel === "기타" ? (
                  <TextInput
                    id="order-custom-channel"
                    invalid={Boolean(errors?.customChannel)}
                    invalidText={errors?.customChannel}
                    labelText="기타 채널명"
                    value={form.customChannel}
                    onChange={(event) => patchForm({ customChannel: event.target.value })}
                  />
                ) : null}
                <TextInput
                  id="order-receiver"
                  labelText="주문 담당자"
                  readOnly
                  value={receiverLabel}
                />
              </Stack>
            </FormGroup>

            <FormGroup legendText="2. 고객사 및 담당자">
              <Stack gap={5}>
                <Search
                  closeButtonLabelText="고객사 및 담당자 검색 지우기"
                  id="order-customer-contact-search"
                  labelText="고객사 및 담당자 검색"
                  placeholder="고객사명 또는 담당자명 검색"
                  size="md"
                  value={contactQuery}
                  onChange={(event) => setContactQuery(event.target.value)}
                  onClear={() => setContactQuery("")}
                />
                <Select
                  id="order-customer-contact"
                  invalid={Boolean(errors?.customerId)}
                  invalidText={errors?.customerId}
                  labelText="고객사 및 담당자"
                  value={selectedPair}
                  onChange={(event) => {
                    const [customerId, contactId] = event.target.value.split("::");
                    patchForm({ customerId: customerId ?? "", contactId: contactId ?? "" });
                  }}
                >
                  <SelectItem text="선택" value="" />
                  {filteredContactOptions.map((option) => (
                    <SelectItem key={option.value} text={option.label} value={option.value} />
                  ))}
                </Select>
                <Button
                  kind="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onFutureAction("신규 고객사/담당자 등록 기능은 추후 개발 예정입니다.")}
                >
                  신규
                </Button>
              </Stack>
            </FormGroup>

            <FormGroup legendText="3. 제품 및 출하계획">
              <Stack gap={5}>
                <Search
                  closeButtonLabelText="제품/설계 검색 지우기"
                  id="order-design-search"
                  labelText="제품/설계 검색"
                  placeholder="설계번호, 품명, 규격 검색"
                  size="md"
                  value={designQuery}
                  onChange={(event) => setDesignQuery(event.target.value)}
                  onClear={() => setDesignQuery("")}
                />
                <Button
                  kind="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onFutureAction("신규 제품 등록 기능은 추후 개발 예정입니다.")}
                >
                  신규 제품 등록
                </Button>
                {form.products.map((product, productIndex) => (
                  <section className="dss-product-card" key={productIndex}>
                    <div className="dss-product-card__header">
                      <strong>{`제품 ${productIndex + 1}`}</strong>
                      <Button
                        disabled={form.products.length === 1}
                        kind="ghost"
                        renderIcon={TrashCan}
                        size="sm"
                        type="button"
                        onClick={() => removeProduct(productIndex)}
                      >
                        제품 삭제
                      </Button>
                    </div>
                    <Stack gap={5}>
                      <div className="dss-form-grid">
                        <Select
                          id={`order-product-design-${productIndex}`}
                          labelText={`제품 ${productIndex + 1} 제품/설계`}
                          value={product.designId}
                          onChange={(event) => patchProduct(productIndex, { designId: event.target.value })}
                        >
                          <SelectItem text="선택" value="" />
                          {filteredDesignOptions.map((option) => (
                            <SelectItem key={option.value} text={option.label} value={option.value} />
                          ))}
                        </Select>
                        <NumberInput
                          allowEmpty
                          id={`order-product-quantity-${productIndex}`}
                          label={`제품 ${productIndex + 1} 수량`}
                          min={0}
                          step={1}
                          value={numericFieldValue(product.quantity)}
                          onChange={(_, { value }) =>
                            patchProduct(productIndex, { quantity: normalizeNumericInput(value) })
                          }
                        />
                      </div>

                      <Stack gap={4}>
                        {product.shipmentPlans.map((plan, planIndex) => (
                          <div className="dss-schedule-grid" key={planIndex}>
                            <TextInput
                              id={`order-product-${productIndex}-shipment-date-${planIndex}`}
                              labelText={`제품 ${productIndex + 1} 출하일 ${planIndex + 1}`}
                              type="date"
                              value={plan.plannedShipDate}
                              onChange={(event) =>
                                patchShipmentPlan(productIndex, planIndex, {
                                  plannedShipDate: event.target.value,
                                })
                              }
                            />
                            <div className="dss-schedule-quantity">
                              <NumberInput
                                allowEmpty
                                id={`order-product-${productIndex}-shipment-quantity-${planIndex}`}
                                label={`제품 ${productIndex + 1} 출하수량 ${planIndex + 1}`}
                                min={0}
                                step={1}
                                value={numericFieldValue(plan.quantity)}
                                onChange={(_, { value }) =>
                                  patchShipmentPlan(productIndex, planIndex, {
                                    quantity: normalizeNumericInput(value),
                                  })
                                }
                              />
                              <Button
                                disabled={product.shipmentPlans.length === 1}
                                hasIconOnly
                                iconDescription="출하계획 삭제"
                                kind="ghost"
                                renderIcon={TrashCan}
                                size="sm"
                                tooltipPosition="top"
                                type="button"
                                onClick={() => removeShipmentPlan(productIndex, planIndex)}
                              />
                            </div>
                          </div>
                        ))}
                        <Button
                          kind="ghost"
                          renderIcon={Add}
                          size="sm"
                          type="button"
                          onClick={() => addShipmentPlan(productIndex)}
                        >
                          출하계획 추가
                        </Button>
                      </Stack>
                    </Stack>
                  </section>
                ))}
                {errors?.products ? (
                  <InlineNotification
                    hideCloseButton
                    kind="error"
                    lowContrast
                    statusIconDescription="오류"
                    subtitle={errors.products}
                    title="제품 및 출하계획 오류"
                  />
                ) : null}
                <Button kind="tertiary" renderIcon={Add} size="sm" type="button" onClick={addProduct}>
                  제품 추가
                </Button>
              </Stack>
            </FormGroup>
          </Stack>
        </Form>

          <footer className="dss-order-drawer__footer">
            <Button kind="secondary" type="button" onClick={requestClose}>
              닫기
            </Button>
            <Button disabled={saving} type="button" onClick={() => void handleSubmit()}>
              {saving ? "저장 중" : "저장"}
            </Button>
          </footer>
        </aside>
      </div>

      {showCloseConfirm ? (
        <ConfirmActionModal
          title="변경사항 확인"
          body="변경사항을 저장하지 않고 닫을까요?"
          confirmLabel="닫기"
          danger
          onCancel={() => setShowCloseConfirm(false)}
          onConfirm={onClose}
        />
      ) : null}
    </>
  );
}
