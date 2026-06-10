# DSS Order Management Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-usable POC web app for Dongseong Silicone order intake, status management, and reference-data lookup against the local Supabase DB.

**Architecture:** Next.js App Router app with Carbon UI, Supabase SSR auth, Server Actions for mutations, and focused validation/data-shaping modules covered by tests. The app connects to the separate local Supabase project at `/Users/keki/dev/dss-db`.

**Tech Stack:** Next.js 16.2.9, React, TypeScript, pnpm, IBM Carbon React 1.109.0, Supabase JS/SSR, Vitest, Testing Library, Playwright, local Supabase CLI 2.105.0.

---

## Files

Create in `/Users/keki/dev/dds-web`:

- `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`
- `.env.example`
- `src/app/**`
- `src/components/**`
- `src/features/**`
- `src/lib/**`
- `src/test/**`
- `tests/e2e/**`
- `scripts/seed-local.mjs`
- `docs/implementation_notes.md`

Create or modify in `/Users/keki/dev/dss-db` only when needed for local reproducibility:

- `supabase/seed.sql` or documented seed script usage

Do not edit the original source docs under `/Users/keki/dev/dds-web/docs/*.md`.

---

### Task 1: Scaffold App And Test Harness

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/test/setup.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.scss`

- [ ] **Step 1: Write the failing smoke test**

Create `src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

test("renders the DSS shell entry", () => {
  render(<HomePage />);
  expect(screen.getByText("DSS 주문관리")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run: `pnpm test src/app/page.test.tsx --run`

Expected: fails before the app scaffold exists.

- [ ] **Step 3: Create minimal app scaffold**

Install dependencies and create the files listed above. `src/app/page.tsx` initially returns the `DSS 주문관리` entry text.

- [ ] **Step 4: Run unit test, lint, and build**

Run:

```bash
pnpm test src/app/page.test.tsx --run
pnpm lint
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs vitest.config.ts playwright.config.ts .env.example src/app src/test
git commit -m "chore: scaffold dss web app"
```

### Task 2: Add Domain Types And Validation

**Files:**
- Create: `src/features/orders/types.ts`
- Create: `src/features/orders/validation.ts`
- Create: `src/features/orders/validation.test.ts`
- Create: `src/features/orders/view-model.ts`
- Create: `src/features/orders/view-model.test.ts`

- [ ] **Step 1: Write failing validation tests**

Test these behaviors:

- single delivery requires one positive quantity schedule matching order quantity
- split delivery requires every date/quantity and total equals order quantity
- active orders alone can be edited, released, or cancelled

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test src/features/orders/validation.test.ts src/features/orders/view-model.test.ts --run`

Expected: fails because modules are missing.

- [ ] **Step 3: Implement validation and view models**

Create typed order status, role, delivery schedule, order form, and list-row helpers. Keep functions pure and DB-free.

- [ ] **Step 4: Run tests**

Run: `pnpm test src/features/orders/validation.test.ts src/features/orders/view-model.test.ts --run`

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/orders
git commit -m "feat: add order validation model"
```

### Task 3: Supabase Clients, Auth, And Local Seed

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/actions.ts`
- Create: `src/lib/auth/actions.test.ts`
- Create: `scripts/seed-local.mjs`
- Modify: `.env.example`
- Create: `docs/implementation_notes.md`

- [ ] **Step 1: Write failing auth helper tests**

Test that dev quick-login credentials map to A/P/E seed accounts and invalid roles are rejected.

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test src/lib/auth/actions.test.ts --run`

Expected: fails because auth modules are missing.

- [ ] **Step 3: Implement Supabase SSR clients and auth actions**

Use `@supabase/ssr` `createBrowserClient` and `createServerClient`. Store sessions in cookies. Use `profiles.role` for role checks.

- [ ] **Step 4: Implement local seed script**

The script reads:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

It creates or updates:

- `admin@dss.local`
- `production@dss.local`
- `executive@dss.local`
- representative customers, contacts, designs, active orders, released orders, and cancelled orders

- [ ] **Step 5: Verify local Supabase status and seed**

Run:

```bash
supabase status -o env --workdir /Users/keki/dev/dss-db
pnpm seed:local
```

Expected: seed script exits 0 and prints created/updated counts.

- [ ] **Step 6: Run auth tests**

Run: `pnpm test src/lib/auth/actions.test.ts --run`

Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add .env.example scripts src/lib docs/implementation_notes.md package.json pnpm-lock.yaml
git commit -m "feat: add supabase auth and local seed"
```

### Task 4: Data Access And Server Actions

**Files:**
- Create: `src/features/orders/data.ts`
- Create: `src/features/orders/actions.ts`
- Create: `src/features/orders/actions.test.ts`
- Create: `src/features/reference/data.ts`
- Create: `src/features/reference/data.test.ts`

- [ ] **Step 1: Write failing action tests**

Test action-level behavior with mocked Supabase adapters:

- create order validates schedule totals
- update rejects non-active orders
- release writes `released_at`, `released_by`, and status event
- cancel writes `cancelled_at`, `cancelled_by`, and status event

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test src/features/orders/actions.test.ts src/features/reference/data.test.ts --run`

Expected: fails because modules are missing.

- [ ] **Step 3: Implement data access and actions**

Implement authenticated reads and mutations. Return typed action state objects for UI forms.

- [ ] **Step 4: Run action tests**

Run: `pnpm test src/features/orders/actions.test.ts src/features/reference/data.test.ts --run`

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/orders src/features/reference
git commit -m "feat: add order server actions"
```

### Task 5: Login And App Shell UI

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/components/app-shell/AppShell.tsx`
- Create: `src/components/app-shell/AppShell.test.tsx`
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/components/auth/LoginForm.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write failing component tests**

Test quick-login buttons, role-aware navigation, and default landing labels.

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test src/components/app-shell/AppShell.test.tsx src/components/auth/LoginForm.test.tsx --run`

Expected: fails because components are missing.

- [ ] **Step 3: Implement login and shell**

Use Carbon components and compact operations styling. Do not add dashboards or cards.

- [ ] **Step 4: Run component tests**

Run: `pnpm test src/components/app-shell/AppShell.test.tsx src/components/auth/LoginForm.test.tsx --run`

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app src/components
git commit -m "feat: add login and app shell"
```

### Task 6: Order Workspace And Drawer

**Files:**
- Create: `src/app/orders/page.tsx`
- Create: `src/components/orders/OrderWorkspace.tsx`
- Create: `src/components/orders/OrderWorkspace.test.tsx`
- Create: `src/components/orders/OrderTable.tsx`
- Create: `src/components/orders/OrderDrawer.tsx`
- Create: `src/components/orders/ConfirmActionModal.tsx`
- Create: `src/components/notifications/ToastProvider.tsx`
- Modify: `src/app/globals.scss`

- [ ] **Step 1: Write failing UI tests**

Test:

- active tab shows checkboxes and row actions
- read-only tabs hide checkboxes/actions
- drawer validates required fields
- split delivery total mismatch shows an error
- unsaved drawer close shows confirmation

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test src/components/orders/OrderWorkspace.test.tsx --run`

Expected: fails because components are missing.

- [ ] **Step 3: Implement order workspace**

Use Carbon tabs, table, side panel/modal patterns, buttons, form controls, and notifications. Keep custom CSS scoped to layout, Korean label fit, drawer stickiness, and table overflow.

- [ ] **Step 4: Run UI tests**

Run: `pnpm test src/components/orders/OrderWorkspace.test.tsx --run`

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/orders src/components src/app/globals.scss
git commit -m "feat: add order workspace"
```

### Task 7: Reference Lookup Pages

**Files:**
- Create: `src/app/reference/designs/page.tsx`
- Create: `src/app/reference/customers/page.tsx`
- Create: `src/components/reference/ReferenceTables.tsx`
- Create: `src/components/reference/ReferenceTables.test.tsx`

- [ ] **Step 1: Write failing reference page tests**

Test that designs and customers render read-only rows and future-scope buttons show toast text.

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test src/components/reference/ReferenceTables.test.tsx --run`

Expected: fails because components are missing.

- [ ] **Step 3: Implement reference lookup pages**

Add read-only Carbon tables. Buttons must not open unfinished forms.

- [ ] **Step 4: Run tests**

Run: `pnpm test src/components/reference/ReferenceTables.test.tsx --run`

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/reference src/components/reference
git commit -m "feat: add reference lookup pages"
```

### Task 8: E2E, Browser QA, And Polish

**Files:**
- Create: `tests/e2e/order-management.spec.ts`
- Modify: UI/CSS files only as required by evidence
- Modify: `docs/implementation_notes.md`

- [ ] **Step 1: Write failing E2E tests**

Test A-role quick login, order create, edit, release, and cancel flows. Include a viewport check for desktop and mobile-width table behavior.

- [ ] **Step 2: Run E2E and verify it fails before final wiring**

Run: `pnpm e2e`

Expected: initially fails where integration is not wired.

- [ ] **Step 3: Start local services**

Run:

```bash
supabase start --workdir /Users/keki/dev/dss-db
pnpm seed:local
pnpm dev
```

- [ ] **Step 4: Iterate using browser evidence**

Use Playwright and the in-app browser to verify:

- no overlapping UI at desktop width
- usable table horizontal scroll at mobile width
- drawer sticky footer
- modal and toast layering
- Korean labels fit their controls

- [ ] **Step 5: Run full verification**

Run:

```bash
pnpm lint
pnpm test --run
pnpm build
pnpm e2e
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: verify order management flows"
```

