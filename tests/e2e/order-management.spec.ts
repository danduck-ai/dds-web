import { expect, test } from "@playwright/test";
import pg from "pg";

const dbUrl = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function queryOne<T>(sql: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows[0];
  } finally {
    await client.end();
  }
}

async function quickLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "사무직으로 로그인" }).click();
  await expect(page.getByRole("heading", { name: "주문 현황" })).toBeVisible();
}

async function createOrder(page: import("@playwright/test").Page, dueDate: string, quantity: string) {
  await page.getByRole("button", { name: "새 주문" }).click();
  const drawer = page.getByRole("complementary", { name: "주문 입력" });
  await expect(drawer).toBeVisible();
  await page.getByLabel("주문 요청일").fill("2026-06-10");
  await page.getByLabel("채널").selectOption("카톡");
  await page.getByLabel("고객사 및 담당자").selectOption({ label: "동성전자 / 김영수" });
  await page.getByLabel("제품/설계").selectOption({ label: "DS-1042 / 실리콘 패킹 R / R-100 / 5T" });
  await page.getByLabel("주문 수량").fill(quantity);
  await page.getByLabel("출하일 1").fill(dueDate);
  await page.getByLabel("수량 1").fill(quantity);
  await page.getByRole("button", { name: "저장" }).click();
  await expect(drawer).toBeHidden();
}

test.describe("order management flow", () => {
  test.beforeEach(async () => {
    await queryOne(
      `
        delete from public.orders
        where id in (
          select o.id
          from public.orders o
          left join public.delivery_schedules ds on ds.order_id = o.id
          where (o.requested_date = '2026-06-10' and o.quantity in (77, 88, 66))
            or ds.scheduled_date in ('2026-07-03', '2026-07-04')
        )
      `,
    );
  });

  test("A role creates, edits, releases, and cancels orders", async ({ page }) => {
    await quickLogin(page);

    await createOrder(page, "2026-07-03", "77");
    await expect(page.getByText("07/03")).toBeVisible();

    const created = await queryOne<{ id: string }>(
      `
        select o.id
        from public.orders o
        join public.delivery_schedules ds on ds.order_id = o.id
        where ds.scheduled_date = '2026-07-03' and o.quantity = 77
        order by o.created_at desc
        limit 1
      `,
    );
    expect(created.id).toBeTruthy();

    const createdRow = page.locator("tr", { hasText: "07/03" });
    await createdRow.getByRole("button", { name: "수정" }).click();
    const editDrawer = page.getByRole("complementary", { name: "주문 수정" });
    await expect(editDrawer).toBeVisible();
    await page.getByLabel("주문 수량").fill("88");
    await page.getByLabel("수량 1").fill("88");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(editDrawer).toBeHidden();

    const edited = await queryOne<{ quantity: number }>("select quantity from public.orders where id = $1", [
      created.id,
    ]);
    expect(edited.quantity).toBe(88);

    const releaseRow = page.locator("tr", { hasText: "07/03" });
    await releaseRow.getByRole("button", { name: "전달" }).click();
    const releaseDialog = page.getByRole("dialog", { name: "생산팀 전달 확인" });
    await releaseDialog.getByRole("button", { name: "전달" }).click();
    await expect(releaseDialog).toBeHidden();
    await page.getByRole("tab", { name: "생산중" }).click();
    await expect(page.getByText("07/03")).toBeVisible();

    await page.getByRole("tab", { name: "접수" }).click();
    await createOrder(page, "2026-07-04", "66");
    const cancelRow = page.locator("tr", { hasText: "07/04" });
    await cancelRow.getByRole("button", { name: "취소" }).click();
    const cancelDialog = page.getByRole("dialog", { name: "주문 취소 확인" });
    await cancelDialog.getByRole("button", { name: "주문 취소" }).click();
    await expect(cancelDialog).toBeHidden();
    await page.getByRole("tab", { name: "삭제됨" }).click();
    await expect(page.getByText("07/04")).toBeVisible();
  });

  test("mobile viewport keeps the order table horizontally scrollable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await quickLogin(page);

    const tableWrap = page.locator(".order-table-wrap");
    await expect(tableWrap).toBeVisible();
    const dimensions = await tableWrap.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  });
});
