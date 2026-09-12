# Job Tracker

An app to track progress, labour, expenses, and site photos across multiple
construction jobs — giving a transparent, live view of what's happening day to
day on each project versus what was budgeted.

## Architecture

Three pieces share one backend as the single source of truth:

- **`backend/`** — Node + Express + Postgres (Prisma). REST API for jobs,
  scheduling, time entries, expenses, photos, purchase orders, and the live
  budget-vs-actual report. Sends push notification reminders (clock-out
  nudges, missing-data nudges, approval alerts, job deadlines).
- **`mobile/`** — Expo (React Native) app for field workers and
  subcontractors. Geofenced clock in/out, expense + photo capture, schedule
  view. Fully offline-first: actions queue locally in SQLite and sync once
  back online.
- **`admin-web/`** — React (Vite) manager dashboard for owner/admin/office
  roles. Live budget-vs-actual per job, approvals queue, scheduling, purchase
  orders, team management, and per-job weather.
- **`packages/shared/`** — small set of TypeScript types shared conceptually
  across the three apps (mobile and admin-web keep their own local copies to
  avoid Metro/pnpm monorepo bundler friction — see comments in each
  `src/types/index.ts`).

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, etc.
pnpm install            # from repo root: pnpm install
pnpm prisma:migrate     # creates tables
pnpm seed                # optional: seeds a demo owner + worker + job
pnpm dev                 # starts the API on :4000
```

Or run everything (Postgres + backend + a Caddy reverse proxy for HTTPS) via
Docker Compose — this is also how you'd deploy it to a real server, see
**Production deployment** below:

```bash
cp .env.example .env   # set JWT_SECRET and POSTGRES_PASSWORD, see comments
docker compose up --build -d
docker compose exec backend pnpm seed   # optional: demo owner + worker + job
```

Demo login after seeding: `owner@example.com` / `changeme123` (manager) and
`worker@example.com` / `changeme123` (field worker).

### 2. Admin web dashboard

```bash
cd admin-web
cp .env.example .env   # VITE_API_BASE_URL
pnpm dev
```

### 3. Mobile app

```bash
cd mobile
pnpm start
```

Update `mobile/app.json` → `expo.extra.apiBaseUrl` to point at your backend
(use your machine's LAN IP, not `localhost`, when testing on a physical
device). Requires Expo Go or a dev client to run on an actual iPhone/Android
device — see `mobile/WIDGETS.md` for the plan and current limitations around
true home-screen widgets, which need native iOS/Android builds this
environment can't produce or test.

## Production deployment

The backend is designed to run on any small VPS (Hetzner, DigitalOcean, etc.)
via Docker Compose — Postgres and the API are not exposed publicly; only a
bundled Caddy reverse proxy is, and it gets you automatic HTTPS for free once
you have a domain.

1. **Provision a server**: Ubuntu 24.04, smallest shared-vCPU size is plenty
   to start (Hetzner CX22 / DigitalOcean's $6/mo droplet). Add your SSH key
   during creation.
2. **(Optional) Point a domain at it** — an A record for something like
   `api.yourcompany.com` → the server's IP. You can skip this and use plain
   HTTP on the IP for initial internal testing, but real field use over the
   internet should go through HTTPS.
3. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   apt install -y docker-compose-plugin git
   ```
4. **Clone and configure**:
   ```bash
   git clone <this-repo-url>
   cd JOB-TRACKER-APP
   cp .env.example .env
   ```
   Edit `.env`:
   - `JWT_SECRET` — generate with `openssl rand -hex 32`
   - `POSTGRES_PASSWORD` — generate with `openssl rand -hex 20`
   - `DOMAIN` — your domain from step 2, if you have one (leave blank to
     serve plain HTTP on port 80 for now)
   - `OPENWEATHER_API_KEY` — optional, for the per-job weather forecast
5. **Start it up** (the backend container runs pending migrations
   automatically on boot):
   ```bash
   docker compose up --build -d
   docker compose exec backend pnpm seed   # optional demo data
   ```
6. **Point the apps at it**: set `VITE_API_BASE_URL` (admin-web) and
   `expo.extra.apiBaseUrl` (mobile's `app.json`) to `https://<your-domain>`
   (or `http://<server-ip>` if you skipped the domain).

Add a domain and set `DOMAIN` in `.env` any time later, then
`docker compose up -d` again — Caddy will pick it up and request a
certificate automatically.

## Data model

See `backend/prisma/schema.prisma` for the full schema: users/roles, jobs,
job assignments, shifts (schedule), time entries (with geofence source
tracking), expenses, photos, suppliers, purchase orders, budget lines, and a
per-job weather cache.

## Roles

- **owner / admin / office** — manager tier: full admin web dashboard access,
  approve time entries and expenses, manage budgets, purchase orders,
  scheduling, and the team.
- **field_worker / subcontractor** — mobile app only: clock in/out, log
  expenses and photos against their assigned jobs, view their schedule.

## What's next

- Native home-screen widgets (iOS WidgetKit, Android via
  `react-native-android-widget`) — see `mobile/WIDGETS.md`.
- Xero (or similar) export for approved timesheets/expenses.
- Client-facing read-only progress portal.
- Quoting/estimating that seeds a job's budget baseline.
