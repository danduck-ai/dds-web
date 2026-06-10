# DSS Web Implementation Notes

## Additions Beyond Source Documents

- Development quick-login buttons are implemented for A, P, and E roles.
- Local seed data is managed from the web project through `pnpm seed:local`.
- `pnpm seed:local` also synchronizes `order_number_sequences` with seeded order numbers so new local orders can be created immediately after seeding.
- Mobile layouts use a compact top navigation and horizontally scrollable work tables to keep order entry usable on small screens.
- Playwright E2E coverage was added for A-role order creation, edit, production release, cancellation, and mobile table overflow.
- Seed accounts:
  - A: `admin@dss.local` / `dss-admin-1234`
  - P: `production@dss.local` / `dss-production-1234`
  - E: `executive@dss.local` / `dss-executive-1234`

These additions exist only to make local POC testing fast and repeatable.
