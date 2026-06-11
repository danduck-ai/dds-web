import { expect, test } from "@playwright/test";

async function openOrders(page: import("@playwright/test").Page) {
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "주문 현황" })).toBeVisible();
}

async function openOrderIntake(page: import("@playwright/test").Page) {
  await page.goto("/orders/intake");
  await expect(page.getByRole("heading", { name: "주문 접수" })).toBeVisible();
}

async function createOrder(page: import("@playwright/test").Page, dueDate: string, quantity: string) {
  await page.getByRole("button", { name: "새 주문" }).click();
  const orderDrawer = page.getByRole("complementary", { name: "주문 입력" });
  await expect(orderDrawer).toBeVisible();
  await page.getByLabel("주문 요청일").fill("2026-06-10");
  await page.getByLabel("채널").selectOption("카톡");
  await page.getByLabel("고객사 및 담당자", { exact: true }).selectOption({ label: "동성전자 / 김영수" });
  await page.getByLabel("제품 1 제품/설계", { exact: true }).selectOption({
    label: "DS-1042 / 실리콘 패킹 R / R-100 / 5T",
  });
  await page.getByLabel("제품 1 수량").fill(quantity);
  await page.getByLabel("제품 1 출하일 1").fill(dueDate);
  await page.getByLabel("제품 1 출하수량 1").fill(quantity);
  await page.getByRole("button", { name: "저장" }).click();
  await expect(orderDrawer).toBeHidden();
}

test.describe("order management flow", () => {
  test("A role creates, edits, releases, and cancels orders", async ({ page }) => {
    await openOrderIntake(page);

    await createOrder(page, "2026-07-03", "77");
    const createdRow = page.locator("tr[data-parent-row]", { hasText: "77" }).first();
    await createdRow.locator(".cds--table-expand__button").click();
    await expect(page.getByText("07/03 77개")).toBeVisible();

    await createdRow.getByRole("button", { name: "수정" }).click();
    const editDrawer = page.getByRole("complementary", { name: "주문 수정" });
    await expect(editDrawer).toBeVisible();
    await page.getByLabel("제품 1 수량").fill("88");
    await page.getByLabel("제품 1 출하일 1").fill("2026-07-05");
    await page.getByLabel("제품 1 출하수량 1").fill("88");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(editDrawer).toBeHidden();
    await expect(page.getByText("07/05 88개")).toBeVisible();

    const releaseRow = page.locator("tr[data-parent-row]", { hasText: "88" }).first();
    await releaseRow.getByRole("button", { name: "전달" }).click();
    const releaseDialog = page.getByRole("dialog", { name: "생산팀 전달 확인" });
    await releaseDialog.getByRole("button", { name: "전달" }).click();
    await expect(releaseDialog).toBeHidden();
    await expect(page.getByText("07/05 88개")).toHaveCount(0);

    await openOrders(page);
    await expect(page.getByRole("button", { name: "새 주문" })).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByText("O-SRTECH-26061000008")).toBeVisible();

    await openOrderIntake(page);
    await createOrder(page, "2026-07-04", "66");
    const cancelRow = page.locator("tr[data-parent-row]", { hasText: "66" }).first();
    await cancelRow.locator(".cds--checkbox-label").click();
    await page.getByRole("button", { name: "선택 주문 취소" }).click();
    const cancelDialog = page.getByRole("dialog", { name: "주문 취소 확인" });
    await cancelDialog.getByRole("button", { name: "주문 취소" }).click();
    await expect(cancelDialog).toBeHidden();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.locator("tr[data-parent-row]", { hasText: "66" })).toHaveCount(0);
  });

  test("mobile viewport keeps the order table horizontally scrollable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOrders(page);

    const tableWrap = page.locator(".cds--data-table-content").first();
    await expect(tableWrap).toBeVisible();
    const dimensions = await tableWrap.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  });

  test("bottom drawer date and quantity controls stay clickable above the footer", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 534 });
    await openOrderIntake(page);

    await page.getByRole("button", { name: "새 주문" }).click();
    await page.getByLabel("제품 1 출하수량 1").scrollIntoViewIfNeeded();
    await page.getByLabel("제품 1 출하수량 1").fill("21");

    const drawerGeometry = await page.evaluate(() => {
      const footer = document.querySelector(".dss-order-drawer__footer")?.getBoundingClientRect();
      const dateInput = document.querySelector("#order-product-0-shipment-date-0")?.getBoundingClientRect();
      const quantityInput = document.querySelector("#order-product-0-shipment-quantity-0")?.getBoundingClientRect();

      return {
        dateGap: footer && dateInput ? footer.top - dateInput.bottom : 0,
        quantityGap: footer && quantityInput ? footer.top - quantityInput.bottom : 0,
      };
    });

    expect(drawerGeometry.dateGap).toBeGreaterThanOrEqual(32);
    expect(drawerGeometry.quantityGap).toBeGreaterThanOrEqual(32);

    const incrementButtons = page.getByRole("button", { name: "Increment number" });
    await incrementButtons.nth((await incrementButtons.count()) - 1).click();

    await expect(page.getByLabel("제품 1 출하수량 1")).toHaveValue("22");
    await expect
      .poll(() =>
        page.getByLabel("제품 1 출하수량 1").evaluate((element) => {
          const input = element as HTMLInputElement;

          return {
            valid: input.validity.valid,
            validationMessage: input.validationMessage,
          };
        }),
      )
      .toEqual({ valid: true, validationMessage: "" });
  });
});
