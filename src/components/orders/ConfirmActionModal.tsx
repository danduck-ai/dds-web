"use client";

import { Modal } from "@carbon/react";

export function ConfirmActionModal({
  title,
  body,
  confirmLabel,
  cancelLabel = "계속 편집",
  danger = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      danger={danger}
      modalHeading={title}
      onRequestClose={onCancel}
      onRequestSubmit={() => onConfirm()}
      onSecondarySubmit={onCancel}
      open
      primaryButtonText={confirmLabel}
      secondaryButtonText={cancelLabel}
      size="xs"
    >
      <p>{body}</p>
    </Modal>
  );
}
