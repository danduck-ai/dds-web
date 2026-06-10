"use client";

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
    <div className="toast-viewport" aria-live="polite">
      {messages.map((message) => (
        <div className={`toast toast--${message.kind}`} key={message.id}>
          {message.title}
        </div>
      ))}
    </div>
  );
}
