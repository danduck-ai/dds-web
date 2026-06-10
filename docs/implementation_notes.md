# DSS Web Implementation Notes

## Additions Beyond Source Documents

- Development quick-login buttons are implemented for A, P, and E roles.
- Local seed data is managed from the web project through `pnpm seed:local`.
- Seed accounts:
  - A: `admin@dss.local` / `dss-admin-1234`
  - P: `production@dss.local` / `dss-production-1234`
  - E: `executive@dss.local` / `dss-executive-1234`

These additions exist only to make local POC testing fast and repeatable.
