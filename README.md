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

---

If you'd like, I can:
- generate a PDF of this README for distribution, or
- add a `CONTRIBUTING.md` and a GitHub Actions workflow to run type checks and tests on PRs.

Need me to create a PDF or add CI next? 🚀