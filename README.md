# AEYE — AI-Guided Retinal Screening Platform

AEYE is a clinical platform for diabetic retinopathy (DR) screening. A calibrated EfficientNet-B4 model grades fundus photographs across five severity levels (No DR → Proliferative). Results include Grad-CAM heatmaps, progression alerts comparing against prior visits, PDF clinical reports, and a multi-role authentication system covering patients, doctors, and administrators.

The repository is a monorepo containing three independently runnable components:

| Component | Path | Purpose |
|---|---|---|
| Web frontend + server | `client/` + `server/` | React/Vite + Express; doctor/patient/admin dashboards |
| Mobile app | `mobile/` | Expo React Native; mirrors web workflows for on-the-go access |
| ML backend | `ml-backend/` | FastAPI; EfficientNet-B4 inference + Grad-CAM |

---

## Features

- **DR grading** — 5-class severity (No DR / Mild / Moderate / Severe / Proliferative) via temperature-calibrated EfficientNet-B4
- **Grad-CAM heatmaps** — 5 colormaps (Turbo, Inferno, Jet, Viridis, Magma); Turbo + Inferno pre-rendered at upload time, rest fetched on-demand
- **Progression alerts** — rule-based red/green banner when DR worsens or improves vs. the patient's previous scan
- **Scan history trend badges** — Worsened / Improved / Stable / New pill per row in history
- **Multi-role auth** — Patient, Doctor, Admin via Supabase magic-link email
- **PDF reports** — downloadable per-scan clinical summary
- **Follow-up scheduling** — doctors set follow-up dates; patients see reminders
- **Dual-model support** — AEYE v1 (calibrated) + optional partner model with side-by-side picker

---

## Tech Stack

**Web**

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter |
| Backend | Node.js 20, Express (ESM), TypeScript |
| Database / Auth | Supabase (Postgres + RLS + Magic-Link) |
| ORM / Migrations | Drizzle ORM |
| PDF | jsPDF |

**Mobile**

| Layer | Technology |
|---|---|
| Framework | Expo SDK 52, React Native, TypeScript |
| Styling | NativeWind (Tailwind for React Native) |
| Navigation | React Navigation v7 (stack + bottom tabs) |
| Auth | Supabase JS client |

**ML Backend**

| | |
|---|---|
| Runtime | Python 3.11, FastAPI, PyTorch |
| Model | EfficientNet-B4, Ben-Graham preprocessing, temperature scaling |
| Explainability | Grad-CAM (pytorch-grad-cam) |
| Hosting | Hugging Face Spaces (or any Docker host) |

---

## Repository Structure

```
├── client/               # React + Vite frontend
│   └── src/
│       ├── pages/        # Route components (dashboards, results, history, …)
│       ├── components/   # Shared UI (web-layout, shadcn/ui primitives)
│       ├── hooks/        # useAuth, …
│       └── lib/          # api.ts, progression.ts, supabaseClient.ts
├── server/               # Express backend
│   ├── index.ts          # Entry point
│   ├── routes.ts         # REST endpoints
│   ├── mlClient.ts       # ML proxy (AEYE v1 + partner)
│   └── supabaseClient.ts # Admin client
├── mobile/               # Expo React Native app
│   └── src/
│       ├── screens/      # ResultsScreen, HistoryScreen, AnalysisScreen, …
│       ├── lib/          # api.ts, mlApi.ts, progression.ts
│       └── navigation/   # Stack + tab navigators
├── ml-backend/           # FastAPI inference service
│   ├── app.py            # /predict + /recolor endpoints
│   └── README.md         # Model setup instructions
├── shared/               # Types shared by client + server
└── supabase/             # Drizzle config + SQL migrations
```

---

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- A [Supabase](https://supabase.com) project
- ML backend URL (Hugging Face Space or local FastAPI)

---

## Web Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

**`.env`** (Vite client vars):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**`.env.server`** (Express server vars):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgres://user:password@host:5432/database
PORT=3000

# AEYE ML backend
DR_API_URL=https://faizan055-dr-classifier.hf.space
DR_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Optional partner model (leave unset to hide model picker)
DR_API_URL_PARTNER=https://hissanzahir-dr-detection-api.hf.space
```

> Never commit your `SUPABASE_SERVICE_ROLE_KEY`. It bypasses RLS.

### 3. Apply database schema

```bash
npm run db:push
```

### 4. Start development server

```bash
npm run dev        # Express + Vite HMR on the same port
```

Open `http://localhost:3000`.

### 5. Production build

```bash
npm run build
npm start
```

---

## Mobile Setup

```bash
cd mobile
npm install
```

### Environment variables

Create `mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ML backend (same endpoints as web)
EXPO_PUBLIC_DR_API_URL=https://faizan055-dr-classifier.hf.space
EXPO_PUBLIC_DR_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Optional partner model
EXPO_PUBLIC_DR_API_URL_PARTNER=https://hissanzahir-dr-detection-api.hf.space
```

### Start Expo dev server

```bash
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android), or press `a` for Android emulator / `i` for iOS simulator.

To run directly on a connected Android device:
```bash
npx expo run:android
```

---

## Supabase Configuration

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** + **service role key** to `.env.server`.
3. Copy **anon/public key** to `.env` and `mobile/.env`.
4. Run `npm run db:push` to apply the schema.
5. In **Authentication → URL Configuration**, add your deployed domain to *Redirect URLs* so magic-link emails work in production (e.g. `https://yourdomain.com/**`).

---

## ML Backend

The server proxies fundus images to a FastAPI service. It must expose:

- `POST /predict` — multipart `file`; returns `class_id`, `class_name`, `confidence`, `probabilities`, `heatmaps_b64` (colormap → base64 PNG dict)
- `POST /recolor` — multipart `file` + `colormap`; returns `heatmap_b64`

Pre-trained weights: [Hugging Face — faizan055/dr-classifier](https://huggingface.co/spaces/faizan055/dr-classifier)

See `ml-backend/` for the full FastAPI implementation.

---

## User Roles

| Role | Capabilities |
|---|---|
| `patient` | View own scans, follow-ups, PDF download |
| `doctor` | Upload scans, write clinical notes, create follow-ups, view assigned patients |
| `admin` | View all scans and user profiles, approve doctor registrations |

New accounts default to `patient`. Doctor approval is managed by an admin via the Admin Dashboard.

---

## Deployment

### Web (cPanel / Node.js Selector)

1. Upload project to cPanel home directory.
2. Open **Node.js Selector**, create app: entry file `dist/index.cjs`, Node 20.
3. Set all environment variables in the Selector UI.
4. Run `npm install && npm run build` in terminal, then restart.

### Web (Railway / Render)

1. Connect GitHub repo.
2. Set environment variables in the dashboard.
3. Build command: `npm run build`
4. Start command: `npm start`

### Mobile (EAS Build)

```bash
cd mobile
npx eas build --platform android --profile preview
```

Configure `mobile/eas.json` with your Expo account and app credentials.

---

## License

MIT
