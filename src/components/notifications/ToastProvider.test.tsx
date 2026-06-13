import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ToastViewport, TOAST_TIMEOUT_MS } from "./ToastProvider";

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastViewport", () => {
  test("renders toast notifications in a body-level stack with newest first", () => {
    render(
      <ToastViewport
        messages={[
          { id: "older", kind: "info", title: "이전 알림" },
          { id: "newer", kind: "success", title: "새 알림" },
        ]}
      />,
    );

    const toastStack = screen.getByText("새 알림").closest(".dss-toast-stack");
    const toastTitles = Array.from(toastStack?.querySelectorAll(".cds--toast-notification__title") ?? []).map(
      (element) => element.textContent,
    );

    expect(toastStack?.parentElement).toBe(document.body);
    expect(toastTitles).toEqual(["새 알림", "이전 알림"]);
  });

  test("uses Carbon status colors with a consistent low-contrast toast style", () => {
    render(
      <ToastViewport
        messages={[
          { id: "info", kind: "info", title: "안내 알림" },
          { id: "success", kind: "success", title: "성공 알림" },
          { id: "warning", kind: "warning", title: "주의 알림" },
          { id: "error", kind: "error", title: "오류 알림" },
        ]}
      />,
    );

    const infoToast = screen.getByText("안내 알림").closest(".cds--toast-notification");
    const successToast = screen.getByText("성공 알림").closest(".cds--toast-notification");
    const warningToast = screen.getByText("주의 알림").closest(".cds--toast-notification");
    const errorToast = screen.getByText("오류 알림").closest(".cds--toast-notification");

    expect(infoToast).toHaveClass("cds--toast-notification--info");
    expect(infoToast).toHaveClass("cds--toast-notification--low-contrast");
    expect(successToast).toHaveClass("cds--toast-notification--success");
    expect(successToast).toHaveClass("cds--toast-notification--low-contrast");
    expect(warningToast).toHaveClass("cds--toast-notification--warning");
    expect(warningToast).toHaveClass("cds--toast-notification--low-contrast");
    expect(errorToast).toHaveClass("cds--toast-notification--error");
    expect(errorToast).toHaveClass("cds--toast-notification--low-contrast");
  });

  test("dismisses toast notifications after the Carbon recommended timeout", async () => {
    vi.useFakeTimers();

    render(<ToastViewport messages={[{ id: "info", kind: "info", title: "자동 종료 알림" }]} />);

    expect(screen.getByText("자동 종료 알림")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(TOAST_TIMEOUT_MS);
    });

    expect(screen.queryByText("자동 종료 알림")).not.toBeInTheDocument();
  });
});
