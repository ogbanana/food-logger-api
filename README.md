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
