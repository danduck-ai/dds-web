"use client";

export function ConfirmActionModal({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
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
            계속 편집
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
