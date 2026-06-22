# food-logger-api

A conversational food-logging API built on Next.js. Users describe what they ate in free text; an LLM parses it into meals, estimates calories and macros (as ranges, since portions are vague), and the result is persisted per user per day in Postgres.

The app uses **Gemini** (`gemini-2.0-flash`) as the primary model and **Claude** (`claude-sonnet-4-5`) as an automatic fallback when Gemini is rate-limited.

## Stack

- **Next.js 16** (App Router, route handlers under `app/api`)
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
app/api/
  analyze/route.ts          POST  – analyze free text into a logged day
  auth/login/route.ts       POST  – login
  auth/signup/route.ts      POST  – signup (+ guest migration)
  logs/route.ts             GET   – recent logs
  logs/[date]/route.ts      GET/PATCH/DELETE – read/edit/delete a day
  logs/[date]/edit/route.ts POST/PUT – LLM-assisted edit + persist
  usage/route.ts            GET   – current usage
lib/
  llm.ts            Gemini-primary / Claude-fallback food analysis
  auth.ts           JWT + bcrypt helpers
  getUser.ts        identity resolution & rate-limit keying
  rateLimit.ts      daily usage counter
  loginRateLimit.ts failed-login throttle
  db.ts             Postgres pool
  dateUtils.ts      7-day window check
  schema.sql        database schema
```
