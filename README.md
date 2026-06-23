# food-logger-api

A conversational food-logging app built on Next.js. Users describe what they ate in free text; an LLM parses it into meals, estimates calories and macros (as ranges, since portions are vague), and the result is persisted per user per day in Postgres.

This repo contains both halves of the product:

- a **JSON API** (route handlers under `app/api`), and
- a **web frontend** (React client pages under `app/`) that consumes that API from the same origin.

The app uses **Gemini** (`gemini-2.0-flash`) as the primary model and **Claude** (`claude-sonnet-4-5`) as an automatic fallback when Gemini is rate-limited.

## Stack

- **Next.js 16** (App Router — route handlers under `app/api`, client pages under `app/`)
- **React 19**
- **Postgres** via `pg`
- **Google Generative AI** + **Anthropic** SDKs
- **JWT** auth (`jsonwebtoken`) with **bcrypt** password hashing

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname
JWT_SECRET=<a long random secret>
GEMINI_API_KEY=<google generative ai key>
ANTHROPIC_API_KEY=<anthropic key>

# Optional: managed-provider CA cert for verified TLS to Postgres.
DATABASE_CA_CERT=
```

| Variable            | Required | Purpose                                    |
| ------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`      | yes      | Postgres connection string                 |
| `JWT_SECRET`        | yes      | Signs/verifies auth tokens (90-day expiry) |
| `GEMINI_API_KEY`    | yes      | Primary LLM                                |
| `ANTHROPIC_API_KEY` | yes      | Fallback LLM when Gemini is rate-limited   |
| `DATABASE_CA_CERT`  | no       | CA cert for verified TLS to Postgres       |

### 3. Initialize the database

Apply the schema in [`lib/schema.sql`](lib/schema.sql):

```bash
psql "$DATABASE_URL" -f lib/schema.sql
```

### 4. Run

```bash
npm run dev      # development server at http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

Then open [http://localhost:3000](http://localhost:3000) for the web app. The
frontend talks to the API on the same origin, so no extra configuration is
needed.

## Web app

The site itself is the food logger — a phone-width UI rendered as React client
pages, persisting auth and preferences in `localStorage`. Unauthenticated
visitors get an anonymous guest identity (sent via `x-user-id`); signing up
migrates their guest logs into the new account.

| Route         | Screen                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `/`           | **Log** — describe your meals in plain text; results show as meal cards with calorie/macro pills, plus the daily free-analysis counter. |
| `/dashboard`  | **Dashboard** — today / week / month views: summary cards, progress-to-goal bar, weekly bar chart, and a navigable month calendar. |
| `/log/[date]` | **Day detail** — review a day's meals, edit fields inline, or propose AI-assisted edits (propose → confirm). Limited to the past 7 days. |
| `/login`      | **Log in** to an existing account.                                                             |
| `/signup`     | **Sign up** (migrates guest logs).                                                             |

A shared shell (header, bottom tab bar, and a slide-in drawer for account
status, the nutrition key, dark mode, and the daily calorie target) wraps the
Log and Dashboard screens. Theme and calorie target are stored locally.

The frontend lives alongside the API:

- `app/page.tsx`, `app/dashboard/`, `app/login/`, `app/signup/`, `app/log/[date]/` — the screens
- `components/web/` — header, tab bar, drawer, app shell, and SVG icons
- `lib/client/` — browser-only API client, auth/guest identity, storage, and the theme/settings/drawer React contexts (kept separate from the server-only `lib/` modules)

## Identity & rate limiting

Requests are attributed to one of:

- **Authenticated users** — `Authorization: Bearer <jwt>`. The identity is the server-verified user account.
- **Guests** — `x-user-id: <id>` header for an unauthenticated session.

LLM calls are capped by a daily free-tier limit. Authenticated users are limited per account; guest usage is limited per client. On signup, a guest's existing logs are migrated to the new account.

Login attempts are rate-limited.

## API

All endpoints accept/return JSON. Authentication is via the `Authorization` or `x-user-id` header described above unless noted.

### Auth

| Method | Path               | Body                            | Notes                                                                                            |
| ------ | ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| POST   | `/api/auth/signup` | `{ email, password, guestId? }` | Password ≥ 8 chars. Returns `{ token, userId, email }`. Migrates guest logs if `guestId` given.  |
| POST   | `/api/auth/login`  | `{ email, password }`           | Returns `{ token, userId, email }`. Rate-limited.                                                |

### Logging & analysis

| Method | Path                    | Body                     | Notes                                                                                                                                   |
| ------ | ----------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/analyze`          | `{ messages, date? }`    | Runs the LLM, upserts the day's log + meals. Counts against the daily limit. `date` must be within the past 7 days (defaults to today). |
| GET    | `/api/logs?days=7`      | —                        | Recent logs with meals. `days` clamped to 1–90 (default 7).                                                                             |
| GET    | `/api/logs/[date]`      | —                        | Single day's log with meals. `404` if none.                                                                                             |
| PATCH  | `/api/logs/[date]`      | `{ meal_id, ...fields }` | Edit one meal; omitted fields are preserved. Recomputes day totals.                                                                     |
| DELETE | `/api/logs/[date]`      | `{ meal_id }`            | Delete one meal. Recomputes day totals.                                                                                                 |
| POST   | `/api/logs/[date]/edit` | `{ messages }`           | LLM proposes an edited day from current state + instructions. Counts against the daily limit. Returns `{ proposed, remaining, limit }`. |
| PUT    | `/api/logs/[date]/edit` | `{ log }`                | Persist a full edited day (replaces all meals).                                                                                         |
| GET    | `/api/usage`            | —                        | Current daily usage `{ count, remaining, limit }`.                                                                                       |

`[date]` is `YYYY-MM-DD`. Edits and analyses are restricted to the past 7 days (`DATE_OUT_OF_RANGE` otherwise). Rate-limit rejections return `429` with code `RATE_LIMIT_EXCEEDED`.

## Data model

See [`lib/schema.sql`](lib/schema.sql). Tables: `users`, `logs` (one per user per day), `meals` (per log, ordered Breakfast → Lunch → Dinner → Snacks), `daily_usage` (rate-limit counter), `login_attempts` (failed-login throttle).

## Project layout

```
app/
  page.tsx                  Log screen (home)
  dashboard/page.tsx        Dashboard (today / week / month)
  login/page.tsx            Log in
  signup/page.tsx           Sign up (+ guest migration)
  log/[date]/page.tsx       Day detail / inline + AI-assisted editing
  layout.tsx                Root layout, fonts, providers
  globals.css               Global styles + phone-width app shell
  api/
    analyze/route.ts          POST  – analyze free text into a logged day
    auth/login/route.ts       POST  – login
    auth/signup/route.ts      POST  – signup (+ guest migration)
    logs/route.ts             GET   – recent logs
    logs/[date]/route.ts      GET/PATCH/DELETE – read/edit/delete a day
    logs/[date]/edit/route.ts POST/PUT – LLM-assisted edit + persist
    usage/route.ts            GET   – current usage
components/web/
  AppProviders.tsx  theme/settings/drawer context providers + shell
  AppChrome.tsx     header + scroll area + tab bar + drawer
  Header.tsx        TabBar.tsx  Drawer.tsx  Spinner.tsx
  icons/            FoodLoggerLogo, DashboardIcon, ProfileIcon
lib/client/         browser-only frontend modules
  apiClient.ts      same-origin API client + shared types
  authClient.ts     JWT token storage / expiry handling
  identity.ts       anonymous guest id (+ 7-day window)
  storage.ts        localStorage wrapper (SSR-safe)
  utils.ts          7-day window check
  ThemeContext.tsx  SettingsContext.tsx  DrawerContext.tsx
lib/                server-only modules
  llm.ts            Gemini-primary / Claude-fallback food analysis
  auth.ts           JWT + bcrypt helpers
  getUser.ts        identity resolution & rate-limit keying
  rateLimit.ts      daily usage counter
  loginRateLimit.ts failed-login throttle
  db.ts             Postgres pool
  dateUtils.ts      7-day window check
  schema.sql        database schema
```
