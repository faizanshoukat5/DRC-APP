# DRC-APP

DRC-APP is a full-stack diabetic retinopathy screening platform. It includes:

- A web frontend (Vite + React) for administrators, doctors and patients.
- An Express/Node backend that performs admin-level operations and uses the Supabase service role for privileged DB access.
- An Expo React Native mobile app (in `mobile/`) which mirrors the web UI and is intended for on-device viewing and lightweight workflows.
- Supabase PostgreSQL backend with Row Level Security (RLS) protecting patient data.

This README documents the repository layout, local setup, running instructions, migration notes, and troubleshooting tips.

---

## Repository layout (important files)

- `mobile/` — Expo React Native app (mobile client).
- `client/` — Vite React web application (web client).
- `server/` — Node/Express backend routes and API wrappers used by the web frontend.
- `supabase/` — Supabase config and SQL migrations. See `supabase/migrations/`.
- `shared/` — Shared types and DB schema definitions.

Key files to note:

- `mobile/src/lib/api.ts` — Mobile Supabase API wrapper and helper mappings (fixes for `timestamp` and `id` casting).
- `supabase/migrations/20260128000000_add_admin_rls_policies.sql` — Migration that adds an `is_admin()` helper and policies to allow admins to SELECT/UPDATE `profiles`.
- `client/src/pages/patient-dashboard.tsx` — Reference web patient dashboard used as a basis for the mobile patient dashboard.
- `mobile/src/screens/FAQScreen.tsx` — Mobile FAQ screen (recently synced to match the web FAQ content).

---

## Quick Start (development)

Prerequisites

- Node.js (16+ recommended)
- npm (or pnpm/yarn)
- Git
- For mobile: Expo CLI (optional, we use `npx expo` so global install is not required)
- Supabase CLI if you plan to run migrations from CLI: `npm install -g supabase` or use `npx supabase`

1) Clone the repo (if not already):

```bash
git clone https://github.com/faizanshoukat5/DRC-APP.git
cd DRC-APP
```

2) Install dependencies

Root (installs server + client tools):

```bash
npm install
```

Mobile app (separate folder):

```bash
cd mobile
npm install
```

3) Environment variables

This project uses Supabase. Create a `.env` file (or set env vars in your shell) for each component.

- For the mobile client (in `mobile/.env` or environment):

  - `EXPO_PUBLIC_SUPABASE_URL` = your Supabase URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon public key

- For the server (in `server/.env`):

  - `SUPABASE_URL` = your Supabase URL
  - `SUPABASE_SERVICE_ROLE_KEY` = **service_role** key (keep secret)
  - `PORT` = optional server port (default 3000)

Never commit your service role key to source control.

4) Apply Supabase migrations

The repo contains SQL migrations under `supabase/migrations/`. The most important migration to be aware of is:

`supabase/migrations/20260128000000_add_admin_rls_policies.sql`

It creates an `is_admin()` helper and adds RLS policies enabling admins to SELECT and UPDATE the `profiles` table from the client (when appropriate).

You can apply migrations via the Supabase CLI (recommended) or paste the SQL into the Supabase SQL editor (UI).

Using the Supabase CLI (example):

```bash
# from the repo root (ensure supabase CLI is installed and you're logged in/linked to the project)
npx supabase db push
```

Or open the Supabase dashboard → SQL Editor and run the SQL file content.

Important: If you prefer to keep strict RLS, you can instead call admin endpoints on the server which use the service role and bypass RLS. The server has endpoints under `server/routes.ts` that use the `supabaseAdmin` client.

5) Run the backend server

```bash
cd server
npm install
npm run dev
```

The server uses the service role key to perform admin actions (e.g., listing pending doctors). Keep the server protected; do not expose your service role key in client bundles.

6) Run the web client (Vite)

```bash
# from repo root
npm run dev
```

7) Run the mobile Expo app

```bash
cd mobile
npx expo start --tunnel --clear
```

Scan the QR code with Expo Go or open in a simulator/emulator. If you have an Android device connected, press `a` to open directly.

---

## Notes about RLS and admin visibility

- The mobile app uses the Supabase anon client and is therefore subject to Row Level Security. Previously, admins could not list pending doctors from the mobile client because RLS only allowed owners to select their own `profiles` rows.
- To allow admin reads/updates from the mobile client we added the migration `supabase/migrations/20260128000000_add_admin_rls_policies.sql`. Apply it to your Supabase project to enable admin view in the mobile client.
- If you do not want to open admin-level RLS to the anon client, use the server endpoints (they use the `supabaseAdmin` service role client) to fetch admin-only data and proxy it to the client.

---

## Project architecture and important behaviors

- Mobile `api.ts` mappings: the `scans` table uses a `timestamp` column (not `created_at`), and `id` values are stored as bigint — we cast them to strings when returning to the client.
- Patients cannot upload fundus images from the patient dashboard; upload and analysis features are restricted to the `doctor` role. The mobile navigator registers the `Analysis` route only for doctors.
- The server contains endpoints that require the service role (privileged) — avoid calling `supabaseAdmin` from browser/mobile clients.

---

## Troubleshooting

- Expo errors about SDK: make sure you're in the `mobile/` folder when running `npx expo start`.
- If `npx supabase db push` opens a different process, ensure your current working directory is the repo root and the `supabase` folder exists.
- If RLS blocks admin reads on mobile, either apply the admin RLS migration or use the backend admin endpoints.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Implement changes and add tests where possible.
3. Open a Pull Request describing the change and link any related issues.

If you're adding DB migrations, include them under `supabase/migrations/` and document the reasoning.

---

Last updated: 2026-01-28
# RetinaAI — Diabetic Retinopathy Screening Platform

🔬 RetinaAI is a compact, clinician-first application for diabetic retinopathy (DR) screening. It includes a React + Vite frontend, an Express server API that integrates with Supabase for storage and auth, and a simple scan storage and retrieval system with a stubbed inference flow (replaceable by a real model).

---

## Table of Contents

- 🚀 Quick start
- 🧩 Architecture
- ⚙️ Prerequisites & Environment
- 💻 Local development
- 📦 Build & Production
- 🗂 Data model & API reference
- 🧪 Testing & QA (recommendations)
- 🔒 Security & privacy
- 🛠 Extending the inference/model pipeline
- 🧭 Project layout & key files
- 🤝 Contributing
- 📄 Additional docs

---

## 🚀 Quick start

1. Clone the repo:

```bash
git clone <repo-url>
cd DRC-APP
```

2. Install dependencies (npm):

```bash
npm install
# or your package manager of choice (pnpm, yarn)
```

3. Create environment variables (see `.env.example` guidance below).

4. Start development servers (run server + client in two terminals):

PowerShell (Windows):

```powershell
$env:NODE_ENV = 'development'
npm run dev     # starts the Express server (server/index.ts)
npm run dev:client  # in another terminal starts Vite client (port 5173)
```

Note: `npm run dev` sets NODE_ENV directly inline in package.json; using PowerShell, prefixing with `$env:NODE_ENV = 'development'` ensures it works on Windows.

---

## 🧩 Architecture (High level)

- Client: Vite + React + TypeScript, Tailwind CSS, TanStack Query and shadcn-style UI primitives.
- Server: Express.js TypeScript API (server/), uses Supabase admin client for DB/storage.
- Shared: Zod schemas and Drizzle table definitions under `shared/schema.ts`.
- Storage: Supabase buckets for images and a `scans` table for results.

Key design goals:
- Clinician-first UI (mobile container layout), role-based routing (patient, doctor, admin).
- Simple server-side API for image upload, scan creation, and user/profile management.
- Replaceable inference pipeline; currently uses a placeholder (server/routes.ts).

---

## ⚙️ Prerequisites & Environment Variables

Required global tools (recommended):
- Node.js (>=18 LTS)
- npm (or pnpm / yarn)
- A Supabase project (or a local Supabase setup)

Important environment variables:

For client (Vite):
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

For server (Express):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY for lower privileges)
- PORT (optional, defaults to 5000)

Example `.env` values (do NOT commit secrets):

```
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
PORT=5000
```

Notes:
- Client uses Vite env vars prefixed with `VITE_`.
- The server expects a service role key for admin operations (create/read scans, manage profiles).

---

## 💻 Local development

Recommended workflow:

1. Ensure env vars are configured.
2. Start the server (PowerShell):

```powershell
$env:NODE_ENV = 'development'
npm run dev
```

3. Start the client in a separate terminal:

```powershell
npm run dev:client
```

4. Open the client at http://localhost:5173 and the server on the port shown (default 5000).

Helpful scripts (from package.json):
- `npm run dev:client` — run the front-end (Vite).
- `npm run dev` — run the server in dev mode using `tsx`.
- `npm run build` — runs server build script (`script/build.ts`) which builds production bundles.
- `npm run start` — run the built server bundle.
- `npm run check` — TypeScript type check.
- `npm run db:push` — push Drizzle migrations to the DB.

---

## 📦 Build & Production

1. Build (single command):

```bash
npm run build
```

2. Start production server (after build):

```bash
NODE_ENV=production npm start
# or on PowerShell
$env:NODE_ENV = 'production'; npm start
```

Deployment recommendations:
- Client: Vercel, Netlify, or static hosting from the built assets.
- Server: Host on Railway, Fly.io, Render, or a VPS. Ensure your Supabase keys and DB are provided as environment variables in the host.
- For a single-host deployment, `script/build.ts` helps bundle and produce runnable server artifacts.

---

## 🗂 Data Model & API Reference

Shared schema: `shared/schema.ts` (Zod + Drizzle definitions)

Scans table (key fields):
- id, patient_id, timestamp
- original_image_url, heatmap_image_url
- diagnosis, severity, confidence
- model_version, inference_mode, inference_time, preprocessing_method
- metadata (JSON)

Server API highlights (prefix `/api`):

- Auth & Profiles
  - `GET /api/auth/me` — authenticated profile
  - `POST /api/auth/profile` — create/update profile after sign-up

- Admin
  - `GET /api/admin/doctors/pending` — pending doctors (admin only)
  - `POST /api/admin/doctors/:id/approve` — approve doctor (admin)
  - `POST /api/admin/doctors/:id/reject` — reject doctor (admin)

- Doctor/Patient relationships
  - `GET /api/doctors/approved` — list approved doctors
  - `POST /api/patient/select-doctor` — patient selects a doctor (patient only)
  - `GET /api/patient/my-doctor` — get assigned doctor (patient only)
  - `GET /api/doctor/my-patients` — get patients assigned to a doctor (doctor only)

- Scans
  - `GET /api/scans` — list scans (filter by role)
  - `GET /api/scans/recent?limit=n` — recent scans
  - `GET /api/scans/:id` — single scan
  - `POST /api/scans` — create scan (approved doctor)
  - `POST /api/doctor/upload` — image upload (multer) + placeholder inference
  - `GET /api/patients/:patientId/scans` — patient scans (approved doctor)

Auth: protected endpoints expect an Authorization header `Bearer <access_token>` (client uses a Supabase session token).

---

## 🧪 Testing & QA (Recommendations)

Current project does not include automated tests. Suggested additions:
- Unit tests: Jest + ts-jest for server-side logic and React component tests.
- Integration: Supertest for API routes, testing auth flows and DB interactions (against a test DB).
- E2E: Playwright or Cypress for user flows (login, upload, results export).

Add CI (GitHub Actions) to run type checks, lint, tests, and optional build.

---

## 🔒 Security & Privacy

- Use Supabase policies and restricted service role keys only on the server.
- Never commit `.env` with keys; store secrets in the host's secret manager.
- Ensure HTTPS in production. Consider logging and audit trails for patient data access.

---

## 🛠 Extending the inference/model pipeline

Current behavior: `/api/doctor/upload` performs a placeholder inference and stores a stubbed `scan` record. To integrate a real model:

1. Implement an inference service:
   - Option A: Containerized model server (FastAPI / Flask) with GPU access.
   - Option B: Cloud endpoint (GCP, AWS SageMaker) with a REST API.
   - Option C: On-device TFLite for local/edge inference (then send results to server).

2. Replace the placeholder inference in `server/routes.ts` with a call to your model service. Steps:
   - Upload image to Supabase storage (already present in route).
   - Call model endpoint with image or storage URL.
   - Retrieve prediction (diagnosis, severity, confidence) and heatmap image.
   - Persist to `scans` table via `storage.createScan()` including `heatmapImageUrl`.

3. Considerations:
   - Performance: async model calls, queueing (e.g., RabbitMQ) for high throughput.
   - Security: validate model responses, sanitize image URLs.
   - Explainability: save and surface heatmap overlays as images/URLs.

---

## 🧭 Project layout & key files

Top-level layout (important files & folders):

- client/ — React front-end (Vite)
  - src/
    - App.tsx — role-based routing and providers
    - pages/ — screens (landing, home, dashboards, results, analysis, faq, etc.)
    - components/ — `mobile-layout` and UI primitives
    - lib/ — `api.ts`, `supabaseClient.ts`, `queryClient.ts`
    - hooks/ — `useAuth.ts`, `use-mobile.tsx`
    - index.css — theme tokens & CSS variables

- server/ — Express API
  - index.ts — server bootstrap
  - routes.ts — main API route handlers
  - storage.ts — DB wrapper for scans
  - supabaseClient.ts — admin client & config

- shared/
  - schema.ts — Zod + Drizzle schema (source-of-truth)

- supabase/ — migrations & config (if using Supabase migrations locally)
- docs/design-implementation.md — design & component documentation
- docs/design-implementation.doc — Word-compatible doc (auto-generated)

---

## 🤝 Contributing

- Fork & branch from `main`.
- Add unit tests and update docs when changing behavior.
- Follow TypeScript strictness & run `npm run check` before PR.

Suggested PR checklist:
- [ ] Type checks pass (`npm run check`).
- [ ] New features include tests.
- [ ] Update `docs/design-implementation.md` when changing UI, API, or data shape.

---

## 📄 Additional docs
- Design and component documentation: `docs/design-implementation.md` and `docs/design-implementation.doc` 📁
- Database migrations: `supabase/migrations/`
