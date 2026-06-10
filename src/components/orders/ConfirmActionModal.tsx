"use client";

export function ConfirmActionModal({
  title,
  body,
  confirmLabel,
  cancelLabel = "계속 편집",
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section aria-label={title} className="confirm-modal" role="dialog">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="confirm-modal__actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
