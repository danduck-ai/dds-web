# Production Planning Day View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `[생산 계획]` page with a Carbon `ContentSwitcher`, a functional `[생산일 기준 보기]` planning board, and a placeholder `[출하건 기준 보기]`.

**Architecture:** The page reuses the existing order hierarchy (`Order -> OrderProduct -> ShipmentPlan -> ProductionPlan`) and keeps production planning behavior in pure functions under `src/features/production`. The UI is a Carbon-based client component with dnd-kit providing vertical sortable cards; persistence is local component state for this POC.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Carbon React, dnd-kit, Vitest, Testing Library.

---

## Source Decisions

- Top-level route: `/production/plans`.
- Left navigation label: `생산 계획`.
- Mode switch labels: `생산일 기준 보기`, `출하건 기준 보기`.
- `출하건 기준 보기` is a construction placeholder for this iteration.
- `생산일 기준 보기` has no search box.
- The selected department defaults from `profile.departmentCode` when it is `R`, `S`, or `P`; otherwise it defaults to `R`.
- Production start time defaults to `09:00` and is selected in 30-minute increments.
- The main planning area is a vertical draggable card container, not a table.
- The `확정` button performs explicit save only after a final warning modal.
- All recommended defaults from the design discussion are adopted.

## Drag-And-Drop Research

- Carbon React has building blocks such as `ContentSwitcher`, `Switch`, `Dropdown`, `NumberInput`, `Modal`, `Button`, `Tag`, and `Tile`.
- Carbon has drag-and-drop file upload, but no first-party sortable card/list component for this workflow.
- Use dnd-kit for card ordering: `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`.
- Keep Carbon visual surfaces: Carbon controls around the board, Carbon tokens in CSS, and dnd-kit only for drag behavior.

## File Structure

- Modify `package.json` / `pnpm-lock.yaml`: add dnd-kit dependencies.
- Modify `src/features/orders/types.ts`: add profile department and optional production-plan scheduling fields needed by the POC.
- Modify `src/lib/auth/session.ts`: expose `departmentCode`.
- Modify `src/features/mock-data/dss.json`: add mock profile department values and richer production-plan rows.
- Create `src/features/production/types.ts`: page-specific card and draft board types.
- Create `src/features/production/planning.ts`: pure helpers for department defaults, time options, cards, quantity splitting, deferral, sequencing, and confirmation validation.
- Create `src/features/production/planning.test.ts`: TDD coverage for all pure planning behavior.
- Create `src/features/production/data.ts`: flatten released orders into production-planning cards.
- Create `src/components/production/ProductionPlanningWorkspace.tsx`: main client UI.
- Create `src/components/production/ProductionPlanningWorkspace.test.tsx`: TDD coverage for mode switch, controls, quantity behavior, confirmation, placeholder, and card actions.
- Create `src/app/production/plans/page.tsx`: authenticated route.
- Modify `src/components/app-shell/AppShell.tsx`: add `생산 계획` navigation.
- Modify `src/components/app-shell/AppShell.test.tsx`: assert production navigation and active state.
- Modify `src/app/globals.scss`: production board/card styles using Carbon tokens.

## Tests

### Pure Logic Tests

- `getInitialDepartment` returns profile department for `R/S/P` and falls back to `R` otherwise.
- `createHalfHourOptions` includes `09:00` and steps by 30 minutes.
- `createProductionPlanningCards` includes date-less available plans for the selected department and excludes plans deferred beyond the selected production date.
- `updateCardQuantity` computes duration from `defaultUnitsPerHour` and creates a draft remainder card when the input quantity is lower than the remaining shipment quantity.
- `deferCardToNextDay` sets the availability date to the next calendar day.
- `buildConfirmationPlan` rejects cards left on the board without a valid quantity.
- `buildConfirmationPlan` calculates start/end times from the selected start time and card sequence.

### Component Tests

- The page renders `생산일 기준 보기`, `출하건 기준 보기`, department control, start-time control, and `확정`.
- It defaults department from the current profile.
- `출하건 기준 보기` renders a construction placeholder.
- Entering a partial quantity creates a visible remainder card.
- Clicking `오늘 제외` removes a card from the current board.
- `확정` is disabled while visible cards have missing quantities.
- After all visible cards have quantities, `확정` opens the irreversible warning modal.
- Confirming the modal shows the success state and keeps the board in the confirmed order.
- dnd-kit can be mocked in unit tests; pure ordering behavior is covered by logic tests.

## Task 1: Dependency And Plan Setup

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Add: `docs/superpowers/plans/2026-06-12-production-planning-day-view.md`

- [ ] **Step 1: Install dnd-kit packages**

Run:

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: dependencies added to `package.json` and `pnpm-lock.yaml`.

## Task 2: Production Planning Pure Logic

**Files:**
- Create: `src/features/production/types.ts`
- Create: `src/features/production/planning.ts`
- Create: `src/features/production/planning.test.ts`

- [ ] **Step 1: Write failing pure logic tests**

Run:

```bash
pnpm test src/features/production/planning.test.ts --run
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement minimal pure planning helpers**

Implement functions:

```ts
getInitialDepartment(profileDepartment: string | null | undefined): DepartmentCode
createHalfHourOptions(): string[]
createProductionPlanningCards(orders: OrderListRow[], options: CardFilterOptions): ProductionPlanCard[]
updateCardQuantity(cards: ProductionPlanCard[], cardId: string, quantity: number): ProductionPlanCard[]
deferCardToNextDay(cards: ProductionPlanCard[], cardId: string, selectedDate: string): ProductionPlanCard[]
reorderCards(cards: ProductionPlanCard[], activeId: string, overId: string): ProductionPlanCard[]
buildConfirmationPlan(cards: ProductionPlanCard[], options: ConfirmationOptions): ConfirmationResult
```

- [ ] **Step 3: Run pure logic tests**

Run:

```bash
pnpm test src/features/production/planning.test.ts --run
```

Expected: PASS.

## Task 3: Production Data And Profile Department

**Files:**
- Modify: `src/features/orders/types.ts`
- Modify: `src/lib/auth/session.ts`
- Modify: `src/features/mock-data/dss.json`
- Create: `src/features/production/data.ts`
- Test: `src/features/production/planning.test.ts`

- [ ] **Step 1: Add failing test for profile department and mock data flattening**

Run:

```bash
pnpm test src/features/production/planning.test.ts --run
```

Expected: FAIL until profile department and data helpers are present.

- [ ] **Step 2: Add department fields and data flattening**

Add `departmentCode?: string | null` to profile types and return it from the mock session.

- [ ] **Step 3: Run tests**

Run:

```bash
pnpm test src/features/production/planning.test.ts src/lib/auth/actions.test.ts --run
```

Expected: PASS.

## Task 4: Production Planning UI

**Files:**
- Create: `src/components/production/ProductionPlanningWorkspace.tsx`
- Create: `src/components/production/ProductionPlanningWorkspace.test.tsx`
- Modify: `src/app/globals.scss`

- [ ] **Step 1: Write failing component tests**

Run:

```bash
pnpm test src/components/production/ProductionPlanningWorkspace.test.tsx --run
```

Expected: FAIL because the component does not exist.

- [ ] **Step 2: Implement Carbon+dnd-kit UI**

Use Carbon components for the page controls and modal. Use dnd-kit sortable primitives for card ordering. Keep card styles aligned to Carbon tokens.

- [ ] **Step 3: Run component tests**

Run:

```bash
pnpm test src/components/production/ProductionPlanningWorkspace.test.tsx --run
```

Expected: PASS.

## Task 5: Route And Navigation

**Files:**
- Create: `src/app/production/plans/page.tsx`
- Modify: `src/components/app-shell/AppShell.tsx`
- Modify: `src/components/app-shell/AppShell.test.tsx`

- [ ] **Step 1: Write failing route/navigation tests**

Run:

```bash
pnpm test src/components/app-shell/AppShell.test.tsx --run
```

Expected: FAIL until `생산 계획` nav is added.

- [ ] **Step 2: Add navigation and route**

Add `생산 계획` to role navigation and render the production workspace at `/production/plans`.

- [ ] **Step 3: Run tests**

Run:

```bash
pnpm test src/components/app-shell/AppShell.test.tsx src/components/production/ProductionPlanningWorkspace.test.tsx --run
```

Expected: PASS.

## Task 6: Final Verification

Run:

```bash
pnpm lint
pnpm test --run
pnpm build
```

Expected: all commands exit 0.

If the dev server is needed for visual verification:

```bash
pnpm dev
```

Then open `/production/plans` and verify desktop/mobile layout, ContentSwitcher behavior, modal flow, and drag ordering.

---

## Transfer Timeline Revision

**Goal:** Replace the single production-day card container with a Carbon-style transfer planning surface: available production plans on the left, selected day plans on the right, quantity entry through a shared modal, and dnd-kit ordering only on the right panel.

**Architecture:** Keep production behavior in pure helpers under `src/features/production/planning.ts`; the component owns only UI selection state, modal state, and Carbon controls. The left panel shows compact one-line items. The right panel shows scheduled items whose visual height represents estimated production duration.

**Time scale:** The right panel uses the selected `생산 시작 시간` as the top of a 9-hour working window. For example, `08:30` means `08:30-17:30`. Height is not based on viewport height. Instead, one Carbon row-height unit equals 30 minutes. A card's row span is `max(1, ceil(estimatedDurationMinutes / 30))`, so plans shorter than 30 minutes still render at one row. CSS uses Carbon spacing/tokens and CSS variables such as row units; it must not hard-code arbitrary px heights.

### Transfer Tasks

- [x] Add pure helper tests for partitioning initial cards into `availableCards` and `scheduledCards`.
- [x] Add pure helper tests for moving multiple available cards to scheduled cards with a quantity map and creating draft remainders.
- [x] Add pure helper tests for moving multiple scheduled cards back to available cards with quantities reset.
- [x] Add pure helper tests for calculating timeline row spans and 9-hour end labels from the selected start time.
- [x] Implement the pure helpers in `src/features/production/planning.ts`.
- [x] Replace `ProductionPlanningWorkspace` tests with transfer-list expectations: multi-select left, quantity modal on move, multi-input modal submission, edit modal from right item, multi-select right removal, and irreversible confirmation.
- [x] Implement the UI with Carbon `Checkbox`, `Button`, `Modal`, `NumberInput`, `Tag`, and existing dnd-kit sortable behavior.
- [x] Update `src/app/globals.scss` so the left panel is compact and the right panel displays timeline rows based on Carbon row-height variables.
- [x] Verify with `pnpm lint`, focused Vitest, full Vitest, `pnpm build`, and browser QA on `/production/plans`.
