# DSS Order Management Web Design

## Status

Approved on 2026-06-10.

## Decision Summary

Build approach 2: a POC operations web app with a left navigation shell, focused order status workspace, and right-side order entry drawer.

The app should feel like a production-ready internal operations tool, not a marketing site or demo dashboard. The UI must stay close to `docs/ui_spec.md`, which is the source of truth for order management interactions.

## Source Documents Reviewed

- `docs/prd.md`
- `docs/feature_list.md`
- `docs/tech_spec.md`
- `docs/database_schema.md`
- `docs/information_architecture.md`
- `docs/lofi_wireframe.md`
- `docs/ui_spec.md`

## Product Scope

The POC replaces the Excel-based order intake ledger with a database-backed web workflow.

In scope:

- Supabase Auth email/password login.
- Development seed accounts for roles A, P, and E.
- Role-aware navigation shell.
- Order status workspace with tabs: `접수`, `생산중`, `출하 완료`, `삭제됨`.
- Order creation and editing in a right-side drawer.
- Active order cancellation through status change to `cancelled`.
- Active order release to production through status change to `released`.
- Single and multi-select actions in the `접수` tab.
- Read-only status tabs for `생산중`, `출하 완료`, and `삭제됨`.
- Customer/contact lookup and product/design lookup from existing reference data.
- Design and customer management pages for read-only reference lookup.
- Toasts for success, failure, and future-scope actions.
- Documentation of any UX additions that were not already specified.

Out of scope:

- Email or PDF order ingestion.
- AI order parsing.
- Customer/contact/design/product creation, editing, or deletion.
- Production process management screens.
- Shipment execution screens.
- Manual `completed` state transition UI.
- Inventory, external integrations, or advanced reporting.

## Architecture

Use Next.js App Router, TypeScript, IBM Carbon Design System, Supabase Auth, Supabase PostgreSQL, and Next.js Server Actions.

The web app lives in `/Users/keki/dev/dds-web`. The development database is the separate local Supabase project in `/Users/keki/dev/dss-db`. The app connects to that local Supabase instance through environment variables. Local defaults are:

- Supabase API: `http://127.0.0.1:54321`
- Supabase DB: `127.0.0.1:54322`
- Supabase Studio: `http://127.0.0.1:54323`
- App URL: `http://127.0.0.1:3000`

The app should not duplicate the database project. Schema and seed work belongs in `/Users/keki/dev/dss-db`; web UI, actions, and tests belong in `/Users/keki/dev/dds-web`.

Server Actions handle order mutations. Browser code uses only publishable Supabase client configuration. Service role keys are never exposed to the client.

## Navigation And Roles

Use a Carbon UI Shell style layout with a compact left sidebar.

Menu policy:

- A role: show `주문 현황`, `설계 관리`, and `고객 관리`.
- P role: show `주문 현황`; default to the `생산중` tab.
- E role: show `주문 현황`, `설계 관리`, and `고객 관리`.

Login landing policy:

- A role enters `주문 현황` on the `접수` tab.
- P role enters `주문 현황` on the `생산중` tab.
- E role enters `주문 현황` with read-only access.

Role checks use `profiles.role`. Do not authorize from user-editable user metadata.

## Authentication

Implement Supabase Auth email/password login.

Development seed accounts:

- A role: `admin@dss.local`
- P role: `production@dss.local`
- E role: `executive@dss.local`

The login screen includes normal email/password fields plus development-only quick-login buttons for the three roles. Quick-login buttons are part of the POC development experience and must be documented in the implementation notes.

## Order Workspace UI

The main screen is always the order list. Do not add a dashboard, hero area, summary cards, decorative banners, or unrelated overview panels.

Tabs:

- `접수` maps to `orders.status = 'active'`.
- `생산중` maps to `orders.status = 'released'`.
- `출하 완료` maps to `orders.status = 'completed'`.
- `삭제됨` maps to `orders.status = 'cancelled'`.

The `접수` tab shows:

- Header checkbox.
- Row checkboxes.
- Batch action bar when at least one visible row is selected.
- Row actions: edit, release to production, cancel.

Read-only tabs show:

- No checkboxes.
- No management/action column.
- Rows as scan-friendly read-only records.

Table rules:

- Fixed desktop column widths.
- Horizontal scroll on narrow viewports.
- One-line cell text.
- Ellipsis for overflow.
- Full value available through hover title.
- Stable row height across tabs and state changes.

Empty states:

- `접수`: `접수된 주문이 없습니다.`
- `생산중`: `생산중 주문이 없습니다.`
- `출하 완료`: `출하 완료 주문이 없습니다.`
- `삭제됨`: `취소된 주문이 없습니다.`

## Order Drawer UI

Create and edit orders in the same right-side drawer.

Sections:

1. `주문 접수`
2. `고객사 및 담당자`
3. `제품/설계`
4. `납기`

Drawer behavior:

- Right-side sliding panel.
- Background list disabled while open.
- Internal vertical scroll.
- Sticky bottom save area.
- Close button, overlay click, and Escape attempt to close.
- Unsaved changes trigger a confirmation modal before closing.
- Successful save closes the drawer and shows a toast.
- Failed save keeps the drawer open.

Validation:

- Requested date is required.
- Channel is required.
- Custom channel text is required when channel is `기타`.
- Customer/contact pair is required.
- Product/design selection is required.
- Quantity must be greater than zero.
- Single delivery requires one delivery date.
- Split delivery requires date and quantity for every row.
- Split delivery quantity total must equal order quantity.

Validation errors appear both as a drawer-level summary and field-level messages.

## Data Model Use

Use the existing schema from the database project.

Primary read model:

- `orders`
- `customers`
- `customer_contacts`
- `designs`
- `delivery_schedules`

Mutations:

- Order create inserts `orders`, one or more `delivery_schedules`, and an `order_status_events` row.
- Order edit updates only `active` orders and replaces or updates related delivery schedules consistently.
- Release to production updates `orders.status` to `released`, sets `released_at` and `released_by`, and writes an `order_status_events` row.
- Cancel updates `orders.status` to `cancelled`, sets `cancelled_at` and `cancelled_by`, and writes an `order_status_events` row.

The UI does not create production tasks in this POC.

## Reference Pages

`설계 관리` and `고객 관리` are read-only lookup pages.

They exist to make the POC feel like an operational system and to support inspection of the same reference data used in the order drawer. They do not provide create, edit, delete, or import functions.

Future-scope create buttons may be shown only when they display the documented "future development" toast and do not open unfinished forms.

## Additional UX Additions

These are intentionally added because they make the POC smoother to use:

- Development quick-login buttons for A, P, and E.
- Loading states on save, release, cancel, and login actions.
- Defensive empty states per tab.
- Toasts for future-scope reference data registration buttons.
- Implementation notes documenting all additions beyond the source docs.

Record these in `docs/implementation_notes.md` when implemented.

## Testing And Quality Gate

Use test-driven implementation for behavior changes.

Automated coverage:

- Unit tests for validation and data-shaping logic.
- Server Action tests for order create, edit, release, cancel, and validation failures.
- Component tests for tab-specific action visibility, drawer validation, quick login, and read-only role behavior.
- E2E tests for A-role order create, edit, release, and cancel flows.

Manual and browser-based UI verification:

- Desktop order workspace has no incoherent text overlap.
- Mobile/narrow viewport keeps table usable through horizontal scrolling.
- Drawer content scrolls internally.
- Drawer bottom action area stays fixed.
- Toast appears at the top center and above drawer/modal layers.
- Confirmation modals appear for release, cancel, and unsaved close.
- Buttons and table cells do not clip important Korean labels.
- Role-specific navigation and actions match the policy above.

Completion criteria:

- Local Supabase connection works.
- Seed accounts can log in.
- Order create/edit/release/cancel flows work against the local DB.
- Status tabs reflect state changes immediately after mutation.
- Reference lookup pages read local DB data.
- UI passes desktop and mobile visual checks.
- Additional UX additions are documented in `docs/implementation_notes.md`.

