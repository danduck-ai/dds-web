"use client";

import { ToastNotification } from "@carbon/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export type ToastMessage = {
  id: string;
  kind: "success" | "error" | "info" | "warning";
  title: string;
};

export const TOAST_TIMEOUT_MS = 5000;

const statusIconDescriptions: Record<ToastMessage["kind"], string> = {
  error: "오류",
  info: "정보",
  success: "성공",
  warning: "주의",
};

export function ToastStack({ children }: { children: ReactNode }) {
  const portalRoot = typeof document === "undefined" ? null : document.body;

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div className="dss-toast-stack" aria-live="polite">
      {children}
    </div>,
    portalRoot,
  );
}

export function ToastViewport({ messages }: { messages: ToastMessage[] }) {
  if (messages.length === 0) {
    return null;
  }

  const newestFirstMessages = [...messages].reverse();

  return (
    <ToastStack>
      {newestFirstMessages.map((message) => (
        <ToastNotification
          hideCloseButton
          key={message.id}
          kind={message.kind}
          lowContrast
          statusIconDescription={statusIconDescriptions[message.kind]}
          timeout={TOAST_TIMEOUT_MS}
          title={message.title}
        />
      ))}
    </ToastStack>
  );
}
