# BESPIN Holocron

BESPIN Holocron is BESPIN's internal operations suite: a single Next.js app that hosts multiple tools behind one shared shell. The vision is to build focused modules (morale, host operations, games) without fragmenting auth, data, or UX.

## Table of Contents

1. [Vision](#vision)
2. [Tool Suite](#tool-suite)
3. [Tech Stack](#tech-stack)
4. [Architecture & Data Flow](#architecture--data-flow)
5. [Developer Notes](#developer-notes)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Directory Layout](#directory-layout)
9. [Authentication & Roles](#authentication--roles)
10. [Deployment Notes](#deployment-notes)

---

## Vision

- A modular tool hub that keeps navigation, auth, and data consistent across all tools.
- Fast internal workflows over generic dashboards; each tool is a focused control panel.
- Lightweight infra: SQLite + Clerk metadata instead of heavyweight services.
- A shared foundation that lets new tools ship quickly without rewriting plumbing.

## Tool Suite

### Morale (Live)

- Announcements, polls, and voting events with scheduling, auto-archive, and auto-delete.
- Polls support multi-select, anonymous mode, and admin-only voter breakdowns.
- Voting events support per-vote pricing and leaderboard modes driven by group/portfolio metadata.
- Boost contributions via PayPal checkout.
- Admin workflows: create/edit, scheduled queue, roster/role management.

### HostHub (Active + In Development)

- Personal schedule view for upcoming standup and Demo Day assignments.
- Calendar view for upcoming assignments across the roster.
- Docs hub embedding the standup schedule, "About Me" guidance, and Demo Day docs.
- Demo Day history export (CSV download).
- Admin scheduling settings UI is in development.

HostHub assignment rules (current):

- Standup shifts auto-assign for Mondays and Thursdays.
- Demo Day auto-assigns the first Wednesday of each month.
- Eligibility is derived from Clerk publicMetadata (rankCategory + rank).

### Games (In Development)

- Placeholder hub for short, lightweight games.
- Future game modules will plug into the same navigation shell.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS 4, tw-animate-css, class-variance-authority, tailwind-variants.
- **UI primitives**: Radix UI components + lucide-react icons.
- **Data layer**: Drizzle ORM + SQLite (better-sqlite3).
- **Auth & user data**: Clerk (roles and publicMetadata for group/portfolio/rank).
- **Payments**: PayPal JS SDK via `@paypal/react-paypal-js`.
- **Tooling**: ESLint 9, TypeScript 5, Vitest, Vite (test runner).

## Architecture & Data Flow

```text
Next.js App Router -> Server Actions / API Routes -> SQLite (Drizzle)
                   -> Clerk (auth + metadata)
```

- Client components call `useApiQuery` / `useApiMutation`, routed via `src/app/api/rpc/route.ts`.
- Server actions and services live in `src/server/actions` and `src/server/services`.
- Live updates for Morale use SSE (`src/app/api/stream/route.ts` + `src/lib/liveEvents`).
- Persistent uploads live in `public/uploads` and are tracked in the `uploads` table.

## Developer Notes

- The app lives in `bespick/` (this README sits at the repo root).
- SQLite database file is created at `bespick/data/bespick.sqlite` on first run.
- HostHub schedule rules and Google Docs links live in `src/server/services/hosthub-schedule.ts` and `src/lib/hosthub-docs.ts`.
- Database tables of note: `announcements`, `poll_votes`, `uploads`, `demo_day_assignments`, `standup_assignments`.
- Clerk `publicMetadata` fields in use today: `role`, `group`, `portfolio`, `rankCategory`, `rank`.
- `publishDue` is invoked by the Morale dashboard to auto-publish, archive, and delete scheduled items.
- If you change Node versions, run `npm rebuild better-sqlite3` to refresh the native module.
- Tests run with `npm run test` (Vitest). Lint with `npm run lint`.

## Getting Started

### Prerequisites

- Node.js 20.11.1 (pinned in `bespick/.nvmrc` and `bespick/package.json` `engines`).
- npm 9+ (or pnpm/bun/yarn if you prefer).
- Clerk application (publishable + secret keys).
- Optional: PayPal REST app if you want Boost contributions enabled.

### Installation

```bash
git clone <repo-url>
cd bespick
npm install
```

### Quick setup checklist

1. Copy `bespick/.env.example` to `bespick/.env.local`.
2. Run `nvm use` (or ensure Node 20.11.1 is active).
3. Add the minimum secrets: Clerk publishable + secret keys, plus PayPal client credentials if you plan to use Boost.
4. Run `npm run dev` to boot the Next.js app. The SQLite database is created at `bespick/data/bespick.sqlite` on first run.
5. Visit `http://localhost:3000` to see the Holocron hub; Morale lives at `/dashboard`, HostHub at `/hosthub`.
6. Leave `PAYPAL_ENVIRONMENT=sandbox` until you have verified the full checkout flow with sandbox buyer accounts, then switch to `live`.
7. Optionally run `npm run lint` and `npm run test` before opening a PR.

## Environment Variables

Duplicate `bespick/.env.example` to `bespick/.env.local` and populate:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend key from your Clerk instance. |
| `CLERK_SECRET_KEY` | Server-side Clerk secret. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` / `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Routes for auth flows (defaults already match `/sign-*`). |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client ID from your PayPal REST app (sandbox or live). Used in the browser to load the PayPal JS SDK. |
| `NEXT_PUBLIC_PAYPAL_CURRENCY` | Optional currency override for the PayPal JS SDK (defaults to `USD`). |
| `PAYPAL_CLIENT_ID` | Same PayPal client ID, used server-side when exchanging OAuth tokens. |
| `PAYPAL_CLIENT_SECRET` | PayPal secret used on the server to request OAuth tokens. |
| `PAYPAL_ENVIRONMENT` | `sandbox` or `live` to control which PayPal base URL is used. |
| `PAYPAL_BRAND_NAME` | Friendly brand label shown during PayPal checkout (defaults to `BESPIN Morale`). |
| `PAYPAL_API_BASE_URL` | Optional override if PayPal gives you a regional API domain. |

> The PayPal client ID appears twice on purpose: `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is safe to expose to the browser to bootstrap the PayPal JS SDK, while `PAYPAL_CLIENT_ID` stays on the server (together with `PAYPAL_CLIENT_SECRET`) so we can exchange OAuth tokens without leaking secrets.

## Directory Layout

```text
bespick/
├─ data/                  # SQLite database file (created on first run)
├─ src/
│  ├─ app/                # Next.js App Router routes
│  │  ├─ (landing)/       # Holocron landing page
│  │  ├─ (tools)/
│  │  │  ├─ (morale)/     # Morale tool routes
│  │  │  ├─ hosthub/      # HostHub tool routes
│  │  │  └─ games/        # Games tool routes
│  │  └─ api/             # API routes (rpc, stream, payments, admin)
│  ├─ components/         # Shared UI (forms, modals, headers)
│  ├─ server/             # Server actions, services, auth helpers
│  ├─ lib/                # Client utilities + tool-specific helpers
│  └─ types/              # Global TypeScript definitions
├─ public/                # Static assets
│  └─ uploads/            # User-uploaded images (created at runtime)
└─ README.md              # Tool suite documentation
```

## Authentication & Roles

- **Clerk middleware** (`src/proxy.ts`) forces authentication for every route except `/sign-in` and `/sign-up`, and blocks `/admin/*` unless `sessionClaims.metadata.role === 'admin'`.
- **Role values** are defined in `src/types/globals.d.ts` (`'admin' | ''`). Only admins currently unlock admin routes.
- **Granting roles** can be done via `/admin/roster` (which uses the `updateUserRole` server action) or directly in the Clerk dashboard by editing a user's `publicMetadata.role`.
- **Group, portfolio, and rank** metadata live in `publicMetadata` and power voting and HostHub eligibility.
- **Server enforcement**: mutations call `src/server/auth` helpers to ensure the user is logged in. Client routes rely on Clerk hooks (`useUser`) for conditional rendering.

## Deployment Notes

- **Next.js**: Deploy on Vercel (recommended) or any Node-compatible host. Ensure build environment has the same environment variables listed above.
- **Clerk**: Configure production URLs for sign-in/sign-up. Copy the live publishable + secret keys into your production environment.
- **SQLite storage**: Persist `data/` and `public/uploads` if your host wipes the filesystem on deploy. Use a mounted volume for Docker or a persistent disk on VMs.
- **Node version**: Use Node 20.11.1 in production to avoid native module mismatches with `better-sqlite3`.
- **Automation**: In production, keep the dashboard (or a scheduled job) calling `announcements.publishDue` so scheduled posts, auto-deletes, and auto-archives stay accurate. A simple approach is to configure a Vercel Cron task that hits a lightweight API route invoking the mutation at a fixed cadence.

With these pieces in place, you can onboard admins, run morale events, and keep HostHub schedules current while the next tools come online.
