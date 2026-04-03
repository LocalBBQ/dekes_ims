# Coffee Shop Inventory System

Mobile-first PWA for inventory at a coffee shop (Shop + Storage unit). React + Node monorepo.

## Structure

- **apps/client** – React (Vite) PWA, mobile-first
- **apps/server** – Node (Express) API, auth, inventory, images
- **packages/shared** – Shared TypeScript types

## Prerequisites

- Node 18+
- npm 7+ (or pnpm; use pnpm-workspace.yaml and pnpm scripts if you prefer)

## Setup

```bash
npm install
# Edit apps/server/.env if needed (DATABASE_URL, SESSION_SECRET)
npm run db:generate -w server
npm run db:migrate -w server
npm run db:seed -w server
```

## Development

```bash
npm run dev
```

- Client: http://localhost:5173 (proxies /api to server)
- Server: http://localhost:3000

Default admin after seed: see seed output (e.g. admin@example.com / password).

## Production

```bash
npm run build
npm run start
```

Serves API and static client on one host. Use HTTPS so "Add to Home Screen" works on iPhone.

### Render (or similar)

1. **Build command** (repo root): `npm install && npm run build`
2. **Start command** (repo root): `npm start`  
   The server runs `prisma migrate deploy` automatically before `node dist/index.js` so new migrations (e.g. Shop tasks) apply on deploy.
3. **Environment variables** (required in the dashboard):
   - `DATABASE_URL` — Postgres connection string
   - `JWT_SECRET` — long random string (required in production for login)
   - `NODE_ENV` — `production`
4. If `prestart` / `prisma migrate deploy` fails, check deploy logs: usually missing `DATABASE_URL`, DB unreachable, or migration conflict. The real error appears **above** the generic `npm error Lifecycle script start failed` line.
