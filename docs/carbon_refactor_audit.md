# Carbon refactor audit

## Objective

Remove custom visual treatments from the DSS order-management web app and map each UI surface to official Carbon Design System guidance and `@carbon/react` components.

## Official references used

- UI shell left panel: https://carbondesignsystem.com/components/UI-shell-left-panel/usage/
- UI shell left panel code: https://carbondesignsystem.com/components/UI-shell-left-panel/code/
- Button: https://carbondesignsystem.com/components/button/usage/
- Data table: https://carbondesignsystem.com/components/data-table/usage/
- Content switcher: https://carbondesignsystem.com/components/content-switcher/usage/
- Modal: https://carbondesignsystem.com/components/modal/usage/
- Form: https://carbondesignsystem.com/components/form/usage/
- Text input: https://carbondesignsystem.com/components/text-input/usage/
- Select: https://carbondesignsystem.com/components/select/usage/
- Number input: https://carbondesignsystem.com/components/number-input/usage/
- Notification: https://carbondesignsystem.com/components/notification/usage/
- Tag: https://carbondesignsystem.com/components/tag/usage/
- Tile: https://carbondesignsystem.com/components/tile/usage/
- Spacing: https://carbondesignsystem.com/elements/spacing/overview/

## Custom design inventory

| Area | Custom selectors or code found | Carbon replacement |
| --- | --- | --- |
| Login | `.login-page`, `.login-panel`, `.login-panel__header`, `.login-panel__form`, `.login-panel__quick`, raw form inputs/buttons | `Tile`, `Form`, `Stack`, `TextInput`, `PasswordInput`, `Button` |
| App shell | `.app-shell`, `.app-shell__sidebar`, `.app-shell__brand`, `.app-shell__nav`, `.app-shell__nav-items`, `.app-shell__nav-link`, `.app-shell__profile`, `.app-shell__logout`, custom hover/selected CSS | `Header`, `HeaderName`, `SideNav`, `SideNavItems`, `SideNavLink.isActive`, `SideNavDetails`, `Button` |
| Page headers | `.orders-page`, `.orders-page__header`, `.reference-page`, `.reference-page__header` | Carbon page layout using Carbon spacing tokens, `Stack`, and `Button` |
| Status filtering | `.status-tabs` and custom `role="tab"` buttons | `ContentSwitcher` and `Switch`, per Carbon guidance for narrowing related content |
| Batch actions | `.batch-bar` and raw buttons | `TableToolbar`, `TableBatchActions`, `TableBatchAction` |
| Order table | `.order-table-wrap`, `.order-table`, `.order-table__*`, raw checkbox inputs, raw row action buttons | Carbon Data table primitives: `TableContainer`, `Table`, `TableHead`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableSelectAll`, `TableSelectRow`, `Button`, `Tag` |
| Order entry | `.order-drawer`, `.order-drawer__*`, raw side panel, raw inputs/selects/radios, `.drawer-error`, `.field-error`, `.ghost-button`, `.segmented-control`, `.schedule-row` | `Modal`, `Form`, `Stack`, `FormGroup`, `InlineNotification`, `TextInput`, `Select`, `SelectItem`, `NumberInput`, `RadioButtonGroup`, `RadioButton`, `Button` |
| Confirmations | `.modal-backdrop`, `.confirm-modal`, `.confirm-modal__actions`, `.danger-button` | `Modal` with `danger`, `primaryButtonText`, `secondaryButtonText` |
| Notifications | `.toast-viewport`, `.toast`, `.toast--success`, `.toast--error` | `ToastNotification`; only a minimal app-level stack positions multiple toasts |
| Reference tables | `.reference-table-wrap`, `.reference-table`, raw table/buttons, duplicated future toast markup | Carbon Data table primitives, `Button`, `ToastNotification` |

## Remaining app-specific CSS

The refactor keeps only layout glue that Carbon does not provide as a ready component in this app:

- Page padding and shell content offsets around the fixed Carbon UI shell.
- Minimal responsive layout for page headers and form rows.
- Minimum data-table width for horizontal scrolling on narrow operational screens.
- Toast stack positioning for multiple `ToastNotification` instances.
- Carbon typography mixin application for page and login headings.

These rules use Carbon tokens or layout-only properties and do not redefine Carbon component hover, selected, danger, error, table, modal, or input visual states.

## Implementation notes

- Sidebar current-menu styling is now produced by `SideNavLink.isActive`, which adds Carbon's `cds--side-nav__link--current` class.
- Order status narrowing uses `ContentSwitcher` and `Switch`, matching Carbon guidance for narrowing related content groups.
- Row actions use Carbon icon-only ghost and danger ghost buttons with tooltips, keeping the table dense enough for operational use.
- Order create/edit moved from a custom right drawer to Carbon `Modal` with Carbon form controls and field-level `invalid` states.
- Confirmation dialogs use Carbon `Modal`, with `danger` only for destructive actions.
- Notifications use Carbon `ToastNotification`; the app only positions a stack container.

## Verification

- `pnpm lint`
- `pnpm test --run`
- `pnpm build`
- `pnpm e2e`
- Browser QA at 1280px desktop and 390px mobile viewport for login, order list, selected SideNav state, order Modal validation, and mobile table scrolling.
