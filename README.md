# Garage ERP Web

Standalone, dark-only React ERP application built with Vite, TypeScript, React
Router, TanStack Query and Redux Toolkit. It provides the browser ERP layout and
the purchase, sales, returns, inventory, expense, accounting, reporting and
administration workflows available in the mobile application.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Environment variables:

- `VITE_API_URL`: API base URL, including `/api`. If omitted, the mobile app's
  development API URL is used.
- `VITE_PROXY_TARGET`: optional upstream origin used by Vite's `/api` development
  proxy. Set `VITE_API_URL=/api` when using it.

## Commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## API and deployment

The browser client sends `X-Client-Type: WEB` and bearer authentication headers.
Production API servers must allow the deployed web origin through CORS, including
`Authorization`, `Content-Type`, and `X-Client-Type` request headers. They should
also allow the HTTP methods used by the ERP.

The Vite proxy only applies to local development. For production, configure CORS
on the API or route `/api` through the same-origin reverse proxy serving this app.
Because routing uses browser history, configure the web server to serve
`index.html` for unknown non-asset paths.

## Architecture

- `src/routes/config.ts`: complete role-aware navigation registry.
- `src/pages.tsx`: authentication gate, login and responsive ERP shell.
- `src/components/ui.tsx`: reusable accessible UI primitives.
- `src/lib/api.ts`: fetch client, envelopes, safe errors, token refresh and auth.
- `src/store/auth.ts`: Redux authentication state and local persistence.
- `src/features/operations`: dashboard, purchasing, sales, returns, inventory,
  expenses and outstandings.
- `src/features/accounting`: accounts, direct entries, journals, ledgers and
  financial reports.
- `src/features/admin`: staff, product master data, customer/vendor tables and
  administrative data reset.
