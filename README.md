# LibraryM

LibraryM is a small **online library management** demo. Librarians maintain a book catalog, members borrow and return titles, and administrators manage users. The app uses **role-based access**, **password authentication** with an **HttpOnly session cookie**, and **TOTP MFA** for members before they can borrow. Loans are **15 days**; inventory (`copiesAvailable`) stays consistent when books are borrowed or returned.

The codebase is split into a **Next.js** UI (`frontend/`), an **Express** API with **Prisma** (`backend/`), and **MongoDB** for persistence. Everything can be run with **Docker Compose** using three services: `frontend`, `backend`, and `database`.

---

## Features

- **Roles:** Admin (user management), Librarian (catalog and loan desk), Member (browse, MFA, borrow/return).
- **Auth:** Sign-up for Member and Librarian; Admin accounts are created by an admin only. Optional MFA step at login when MFA is enabled.
- **MFA:** Members set up TOTP in the dashboard before borrowing (enforced by the API).
- **Catalog:** Books with categories, optional ISBN, and Open Library cover URLs when applicable.
- **Loans:** Borrow/return flows with due dates; librarians and admins see active loans across members.

---

## Tech stack

| Area | Technology |
|------|----------------|
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Backend | Express, Zod, Prisma |
| Database | MongoDB 7 (single-node replica set `rs0` for Prisma transactions) |
| Security (demo) | `bcryptjs` passwords, `jose` HS256 session JWT in HttpOnly cookie |

The browser only talks to the **Next.js origin**; `/api/*` is **rewritten** to the backend so cookies stay first-party (see `frontend/next.config.ts` and `BACKEND_INTERNAL_URL`).

---

## Repository layout

```
├── docker-compose.yml    # frontend + backend + MongoDB
├── .env.example          # copy to .env; set AUTH_SECRET (32+ chars) in production
├── frontend/             # Next.js app (port 3000 in Compose)
│   ├── Dockerfile
│   └── src/              # pages, components, middleware
├── backend/              # Express API (port 4000 inside the network)
│   ├── Dockerfile
│   ├── prisma/           # schema, seed, seed data
│   └── src/              # HTTP server and /api routes
```

---

## Requirements

- **Docker:** Docker Engine 24+ and Docker Compose V2 (for the recommended workflow), **or**
- **Local:** Node.js 22+, npm, and a reachable MongoDB instance that supports a replica set (same URL shape as in the examples below).

---

## How to run (Docker Compose)

This is the simplest way to run the full stack.

### 1. Environment

From the repository root:

```bash
cp .env.example .env
```

Edit `.env` and set a long random **`AUTH_SECRET`** (at least 32 characters) for anything beyond local tinkering. Compose loads this file automatically.

Optional variables (see `.env.example`):

- **`BACKEND_PUBLISH`** — host port mapped to the API (default **14000**). The API inside Docker still listens on **4000**; only the published host port changes.

### 2. Start the stack

```bash
docker compose up --build -d
```

On first start (and after empty volumes), the **backend** container:

1. Ensures the MongoDB replica set is initialized.
2. Runs **`prisma db push`**.
3. Runs **`prisma db seed`** (demo users and sample books; idempotent enough for demos).

### 3. Open the app

| What | URL |
|------|-----|
| **Web app (main UI)** | [http://localhost:3000](http://localhost:3000) |
| **API health check** | [http://localhost:14000/health](http://localhost:14000/health) (default host port; change if you set `BACKEND_PUBLISH`) |

### 4. Useful commands

```bash
docker compose logs -f frontend   # follow UI logs
docker compose logs -f backend      # follow API logs
docker compose down                 # stop containers
docker compose down -v              # stop and remove Mongo data volume
```

### Port conflicts

- **3000** in use: change the `frontend` service `ports` mapping in `docker-compose.yml` (e.g. `"3001:3000"`).
- **14000** in use: set `BACKEND_PUBLISH` in `.env` to another free port.
- **27018** in use: change the `database` service `ports` mapping if you need host access to MongoDB.

---

## How to run (local development, no full stack in Docker)

Use this when you want hot reload in `frontend/` and `backend/` while Mongo runs in a container or elsewhere.

### Terminal 1 — MongoDB only (example)

```bash
docker compose up -d database
```

Ensure `DATABASE_URL` matches your host port (Compose publishes Mongo on **27018** by default).

### Terminal 2 — Backend

```bash
cd backend
npm install
export AUTH_SECRET="your-32-char-minimum-secret-here!!!!"
export DATABASE_URL="mongodb://127.0.0.1:27018/library?replicaSet=rs0"
node scripts/init-replica.mjs    # first time or after wiping the volume
npx prisma db push
npx prisma db seed
npm run dev
```

API listens at **http://127.0.0.1:4000** by default.

### Terminal 3 — Frontend

```bash
cd frontend
npm install
export AUTH_SECRET="same-value-as-backend"
npm run dev
```

UI: **http://localhost:3000**. By default, Next rewrites `/api/*` to **http://127.0.0.1:4000** (see `frontend/next.config.ts`). Override with **`BACKEND_INTERNAL_URL`** if your API runs elsewhere.

---

## Demo accounts (after seed)

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@library.local` | `Demo12345!` |
| Librarian | `librarian@library.local` | `Demo12345!` |
| Member | `member@library.local` | `Demo12345!` |

Members must complete **Member desk → MFA setup** before borrowing.

---

## Publishing images to Docker Hub

Build locally, then tag with your Docker Hub username and push (example user `myuser`):

```bash
docker compose build
docker tag frontend:latest myuser/frontend:latest
docker tag backend:latest  myuser/backend:latest
docker push myuser/frontend:latest
docker push myuser/backend:latest
```

Log in with `docker login` first. Use a **personal access token** instead of your account password when possible.

---

## Production hardening (checklist)

- Use a strong **`AUTH_SECRET`**; never commit `.env`.
- Serve over HTTPS and set **`COOKIE_SECURE=true`** on the backend (and align your reverse proxy / frontend) so session cookies use the `Secure` flag.
- Treat **`User.mfaSecret`** as sensitive; this demo stores it in plaintext—encrypt at rest for real deployments.
- Enable MongoDB authentication, restrict network access, and plan backups.
- Add rate limiting on auth routes, structured logging, and monitoring.
