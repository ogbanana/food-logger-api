# Food Logger

**AI-powered food and calorie logging via natural language.** Describe what you
ate in plain English — _"two eggs on toast and a latte"_ — and an LLM parses it
into structured meals, estimates calories and macros (as ranges, since portions
are vague), organizes them into a day, and tracks your totals against a daily
target.

It's a single [Next.js](https://nextjs.org) app that serves both the web UI and
the JSON API it talks to (same origin), backed by Postgres. It's also an
installable, offline-capable **PWA**. The npm package is named `food-logger-api`
for historical reasons.

## Features

- **Natural-language logging** — type a free-form description of everything you
  ate; the backend's LLM returns meals with calorie ranges and macros (protein,
  carbs, fat, fiber), an intro, and a closing note.
- **Dashboard** — today / week / month views with summary cards, a daily
  progress bar toward your calorie goal, a weekly bar chart, and a navigable
  month calendar heatmap.
- **Editable day logs** — open any day to edit meal fields inline, or propose
  AI-assisted edits via chat with a propose → confirm flow. Editing is limited to
  a rolling 7-day window.
- **Guest mode** — start immediately with an anonymous guest identity (valid for
  7 days, with a daily free-analysis cap). Sign up to keep your history.
- **Email / password accounts** — JWT auth; a guest's existing logs are migrated
  into the account on signup.
- **Light / dark / auto theme** and a configurable daily calorie target, both
  persisted locally.
- **Installable PWA** — add to home screen, with an offline app shell and an
  in-app install button.

## Screens

The UI is a phone-width web app. A shared shell (header, bottom tab bar, and a
slide-in drawer for account status, the nutrition key, theme, and the calorie
target) wraps the Log and Dashboard screens.

| Route         | Screen                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/`           | **Log** — describe your meals; results render as meal cards with calorie/macro pills, plus the daily free-analysis counter.        |
| `/dashboard`  | **Dashboard** — today / week / month: summary cards, progress-to-goal bar, weekly bar chart, and a month calendar.                 |
| `/log/[date]` | **Day detail** — review a day's meals, edit fields inline, or propose AI-assisted edits (propose → confirm). Past 7 days only.     |
| `/login`      | **Log in** to an existing account.                                                                                                |
| `/signup`     | **Sign up** (migrates guest logs).                                                                                                |
| `/offline`    | Offline fallback served by the service worker.                                                                                    |

## Tech stack

- **Next.js 16** (App Router) — client pages under `app/`, route handlers under `app/api`
- **React 19**
- **Postgres** via `pg`
- **Google Generative AI** + **Anthropic** SDKs — **Gemini** (`gemini-2.0-flash`)
  is the primary model, **Claude** (`claude-sonnet-4-5`) the automatic fallback
  when Gemini is rate-limited
- **JWT** auth (`jsonwebtoken`) with **bcrypt** password hashing
- **PWA**: web manifest, a service worker, and icons generated with `next/og`

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

Then open [http://localhost:3000](http://localhost:3000). The UI talks to the API
on the same origin, so no extra configuration is needed.

> **PWA note:** installability and the service worker require HTTPS in
> production (automatic on most hosts). For local testing use
> `next dev --experimental-https`.

## How it works

The frontend is a set of React client pages that call the same-origin API,
persisting auth (JWT) and preferences (theme, calorie target) in `localStorage`.

**Identity & rate limiting.** Requests are attributed to one of:

- **Authenticated users** — `Authorization: Bearer <jwt>`, a server-verified account.
- **Guests** — an `x-user-id: <id>` header for an unauthenticated session.

LLM calls are capped by a daily free-tier limit (20 analyses/day). Authenticated
users are limited per account; guests per client. On signup, a guest's logs are
migrated to the new account. Failed logins are throttled.

**Dates.** The day is the user's **local** date: the client sends its local date
with each analysis, and the server's 7-day window check allows a one-day
timezone tolerance (the server, e.g. on Vercel, runs in UTC).
