---
name: shop-deployment-architecture
description: Describes Shop Inventory System hosting architecture (Vite/React client, Express/Prisma API) and guides migration or redesign when cold starts, Render free tier spin-down, or staff-facing latency block adoption. Use when discussing deployment, hosting, Render, cold start, always-on, moving the API, static hosting, or production architecture changes for this repo.
---

# Shop Inventory — deployment and architecture

## Repo shape (ground truth)

- **Monorepo**: npm workspaces `apps/*`, `packages/*`.
- **Client**: `apps/client` — Vite, React, React Router, TanStack Query, PWA (`vite-plugin-pwa`). Build output is static assets.
- **Server**: `apps/server` — Express, Prisma, sessions, JWT, file uploads (`multer`). Long-lived Node process; not serverless by default.
- **Shared**: `packages/*` — types and shared code consumed by client and server.

When proposing changes, **read** `package.json` files and server entry (`apps/server/src`) if you need to confirm scripts, env vars, or coupling (e.g. session cookies, CORS, upload paths).

## Problem framing: “Render is fine but cold start kills adoption”

On **Render free (or similar) idle spin-down**:

- The **first request after idle** pays: process boot, Prisma connect, route warm-up — often **many seconds**.
- Staff interpret that as “the app is broken,” not “wait 30 seconds.” **Perceived reliability** matters more than average latency.

Separate **symptoms** from **fixes**:

| Symptom | Usually points to |
|--------|-------------------|
| First load after minutes idle is very slow | Idle spin-down / cold start |
| Every request is slow | DB region, N+1 queries, missing indexes, oversized payloads |
| Timeouts on first request only | Cold start + aggressive client timeout |

Always mention **measuring** (browser Network tab, server logs with request timing) before recommending a large refactor.

## Decision order (prefer smallest change that fixes adoption)

1. **Keep architecture; remove idle**  
   - **Paid always-on** instance on the same platform (e.g. Render paid) if budget allows — smallest code change.  
   - **Scheduled ping** only as a temporary band-aid; it is fragile, can violate ToS on some hosts, and does not fix all cold paths (e.g. separate workers).

2. **Keep Express + Prisma; change host**  
   - Any host that offers a **cheap always-on** VM or container (e.g. Fly.io, Railway, VPS) with the **database in the same region** as the API.  
   - Re-check: **DATABASE_URL**, **session store** (in-memory sessions do not survive multi-instance without sticky sessions or Redis), **file uploads** (ephemeral disk vs object storage).

3. **Split static UI from API** (common for SPAs)  
   - **Static client**: Cloudflare Pages, Netlify, GitHub Pages, S3+CloudFront, or Vercel **static** — eliminates “cold” for HTML/assets; first API call may still be cold if the API spins down.  
   - **API**: still needs an always-on or accept-serverless tradeoffs (see below).

4. **Refactor toward serverless / edge** (largest effort)  
   - Prisma + long sessions + multipart uploads map poorly to pure serverless without redesign (connection pooling, session store, upload to object storage).  
   - Only recommend when constraints (cost, scale, ops) clearly require it.

## Options snapshot (no endorsement of a single vendor)

Use this to **compare** options in conversation; verify current pricing and limits on vendor docs.

| Direction | Cold start impact | Typical migration effort |
|-----------|-------------------|---------------------------|
| Upgrade to always-on on current host | Removes idle cold starts | Low (config + billing) |
| Same stack, new host with always-on | Same | Low–medium (Dockerfile, env, DB networking) |
| Static CDN + API on always-on | UI fast; API depends on API tier | Medium (CORS, cookie domain, asset URLs) |
| API on serverless (Lambda/Functions) | Cold starts may persist or shift | High (Prisma pooling, sessions, uploads) |

## What to ask the user before recommending one path

- **Budget**: fixed monthly cap? (always-on vs free tier)
- **Database**: managed Postgres host and region (must stay compatible with Prisma)
- **Sessions**: cookie-only vs server store; need multi-instance later?
- **Uploads**: local disk only or can move to object storage?
- **Domain/TLS**: single domain vs `app.` + `api.` split

## Output format for recommendations

When the user asks where to deploy or how to fix cold starts, respond with:

1. **Current bottleneck** — idle spin-down vs always slow vs DB.
2. **Two or three viable paths** — ordered by implementation cost.
3. **Concrete next steps for this repo** — which folders/env vars/scripts change; what to validate (health check URL, first-login flow, file upload).
4. **Risks** — session stickiness, Prisma in serverless, CORS after splitting origins.

Do **not** prescribe a vendor as the only solution; tie suggestions to their constraints and this codebase’s Express + Prisma assumptions.

## Optional deep dive

For extended hosting comparisons or runbooks, add or link a project-specific `reference.md` in this skill folder — keep `SKILL.md` under ~500 lines.
