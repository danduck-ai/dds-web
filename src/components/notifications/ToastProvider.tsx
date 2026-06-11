"use client";

import { ToastNotification } from "@carbon/react";

export type ToastMessage = {
  id: string;
  kind: "success" | "error" | "info";
  title: string;
};

export function ToastViewport({ messages }: { messages: ToastMessage[] }) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="dss-toast-stack" aria-live="polite">
      {messages.map((message) => (
        <ToastNotification
          hideCloseButton
          key={message.id}
          kind={message.kind}
          lowContrast
          statusIconDescription={message.kind}
          title={message.title}
        />
      ))}
    </div>
  );
}
