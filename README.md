# AEYE — AI-Guided Retinal Screening (Mobile App)

AEYE is an Expo / React Native mobile application for diabetic retinopathy (DR) screening. Doctors capture or upload fundus photographs from the device, an EfficientNet-B4 model hosted on Hugging Face Spaces grades severity across five levels (No DR → Proliferative), and the results screen displays Grad-CAM heatmaps with a 5-colormap toggle, progression alerts vs. the patient's prior visit, and downloadable PDF reports.

> The companion web platform lives in a separate repo: **[DRC_web](https://github.com/faizanshoukat5/DRC_web)**.
> The ML inference service is hosted on **[Hugging Face Spaces](https://huggingface.co/spaces/faizan055/dr-classifier)** — no local model setup required.

---

## Features

- **DR grading** — 5-class severity (No DR / Mild / Moderate / Severe / Proliferative) via calibrated EfficientNet-B4
- **Grad-CAM heatmaps** — 5 colormaps (Turbo, Inferno, Jet, Viridis, Magma); Turbo + Inferno pre-rendered at upload, Magma / Viridis / Jet fetched on-demand via `/recolor` and cached client-side
- **Progression alerts** — rule-based red/green banner when DR worsens or improves vs. the patient's previous scan
- **Multi-role auth** — Patient, Doctor, Admin via Supabase magic-link email
- **PDF reports** — generated with `expo-print`, shared via `expo-sharing`
- **Follow-up scheduling** — doctors set follow-up dates; patients see reminders
- **Dual-model support** — AEYE v1 (calibrated) + optional partner model; model picker surfaces when both URLs are configured
- **Camera + gallery uploads** — `expo-image-picker` for capture or library selection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 52, React Native, TypeScript |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| Auth + DB | Supabase JS client (`@supabase/supabase-js`) |
| Storage | Supabase Storage (fundus image bucket) |
| ML backend | FastAPI on Hugging Face Spaces (EfficientNet-B4 + Grad-CAM) |
| PDF | `expo-print` + `expo-sharing` |
| Image picker | `expo-image-picker`, `expo-file-system` |

---

## Project Structure

```
mobile/
├── App.tsx                  # Root component
├── app.json                 # Expo config (name, slug, permissions, icons)
├── eas.json                 # EAS Build profiles
├── index.ts                 # Entry point
├── assets/                  # Icons, splash, intro video
└── src/
    ├── screens/             # ResultsScreen, AnalysisScreen, HistoryScreen, …
    ├── components/          # AppHeader, WelcomeIntro, ui/* primitives
    ├── navigation/          # AppNavigator (role-based stack + tabs)
    ├── contexts/            # AuthContext
    ├── lib/
    │   ├── api.ts           # Supabase data layer (scans, profiles, follow-ups)
    │   ├── mlApi.ts         # ML backend client (/predict, /recolor)
    │   ├── progression.ts   # Rule-based DR progression utility
    │   └── supabase.ts      # Supabase client init
    └── hooks/
```

---

## Prerequisites

- Node.js 20+
- Expo Go app on a physical device, or Android Studio / Xcode for emulators
- A [Supabase](https://supabase.com) project (same project as the web app, if both are deployed)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/faizanshoukat5/DRC-APP.git
cd DRC-APP/mobile
npm install
```

### 2. Environment variables

Create `mobile/.env`:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AEYE ML backend (Hugging Face Space)
EXPO_PUBLIC_DR_API_URL=https://faizan055-dr-classifier.hf.space
EXPO_PUBLIC_DR_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Optional: partner model — leave unset to hide the model picker
EXPO_PUBLIC_DR_API_URL_PARTNER=https://hissanzahir-dr-detection-api.hf.space
```

All Expo-public envs must be prefixed with `EXPO_PUBLIC_` to be inlined into the JS bundle.

### 3. Run on a device or simulator

```bash
npx expo start
```

Then either:
- Scan the QR code with **Expo Go** (iOS / Android)
- Press `a` to launch on Android emulator
- Press `i` to launch on iOS simulator
- Press `w` to open in web (limited compatibility)

For a fully native build on a connected Android device (no Expo Go needed):

```bash
npx expo run:android
```

---

## ML Backend

The mobile app talks to a FastAPI service hosted on Hugging Face Spaces. No local setup is required — the Space is publicly accessible.

**Endpoints used by `mobile/src/lib/mlApi.ts`:**

| Endpoint | Purpose |
|---|---|
| `POST /predict` | Upload multipart `file`; returns `class_id`, `class_name`, `confidence`, `probabilities`, `heatmaps_b64` (Turbo + Inferno pre-rendered) |
| `POST /recolor` | Multipart `file` + `colormap` field; returns `heatmap_b64` for Magma / Viridis / Jet on demand |

**Default Space:** `https://faizan055-dr-classifier.hf.space`
**Source + weights:** [huggingface.co/spaces/faizan055/dr-classifier](https://huggingface.co/spaces/faizan055/dr-classifier)

To point the app at a different deployment, override `EXPO_PUBLIC_DR_API_URL` in `mobile/.env`.

---

## Supabase Configuration

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Project URL** and **anon/public key** into `mobile/.env`.
3. Apply the schema (run from the companion [DRC_web](https://github.com/faizanshoukat5/DRC_web) repo: `npm run db:push`).
4. In **Authentication → URL Configuration**, add `aeye://` as a redirect URL for deep-link magic-link sign-in.

The mobile app shares the same Supabase project as the web app — scans uploaded on either platform appear on both.

---

## User Roles

| Role | Capabilities |
|---|---|
| `patient` | View own scans + follow-ups, download PDFs |
| `doctor` | Capture / upload fundus images, write clinical notes, schedule follow-ups, view assigned patients |
| `admin` | View all scans + profiles, approve doctor registrations |

New accounts default to `patient`. Doctors must be approved by an admin (web Admin Dashboard or directly in the Supabase `profiles` table).

---

## Building for Production

### Android APK / AAB (EAS Build)

```bash
cd mobile
npx eas login
npx eas build --platform android --profile preview     # APK for sideload
npx eas build --platform android --profile production  # AAB for Play Store
```

### iOS (EAS Build — requires Apple Developer account)

```bash
npx eas build --platform ios --profile production
```

Build profiles are configured in `mobile/eas.json`.

---

## Companion Web Platform

The full clinician dashboard, admin tools, and PDF history live on the web. Repo: **[github.com/faizanshoukat5/DRC_web](https://github.com/faizanshoukat5/DRC_web)**.

Both apps share the same Supabase project and ML backend — a scan uploaded on mobile shows up instantly on the web dashboard, and vice versa.

---

## License

MIT
