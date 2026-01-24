# Design Implementation & Component Documentation

## 1) Scope
This document covers the full RetinaAI project: UI design system, layout patterns, page components, shared UI primitives, data flows, and backend endpoints.

## 2) Project Architecture (High-Level)
- Client: Vite + React + TypeScript, Tailwind CSS, shadcn/ui-style primitives, Wouter routing, TanStack Query.
- Server: Express API with Supabase admin client and storage adapter.
- Shared: Zod schemas and Drizzle table definitions.

Key files:
- App routing + providers: [client/src/App.tsx](client/src/App.tsx)
- Global styles + tokens: [client/src/index.css](client/src/index.css)
- UI layout shell: [client/src/components/mobile-layout.tsx](client/src/components/mobile-layout.tsx)
- API client helpers: [client/src/lib/api.ts](client/src/lib/api.ts)
- Auth hook: [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts)
- Server routes: [server/routes.ts](server/routes.ts)
- Storage layer: [server/storage.ts](server/storage.ts)
- Schema: [shared/schema.ts](shared/schema.ts)

## 3) Design System Implementation
### 3.1 Color, typography, and radius tokens
Defined in [client/src/index.css](client/src/index.css). Highlights:
- Clean clinical palette (primary medical blue), slate backgrounds, semantic severity colors.
- Font stack: `Plus Jakarta Sans` and `JetBrains Mono`.
- Corner radius scale driven by the `--radius` token.

### 3.2 Layout strategy
- Primary UX is mobile-first with a centered, device-like container on desktop.
- `MobileLayout` provides header, scroll container, and bottom nav for authenticated users.
- Bottom nav is suppressed on analysis screens.

Reference: [client/src/components/mobile-layout.tsx](client/src/components/mobile-layout.tsx)

### 3.3 Animation
- Subtle transitions and reveal effects via `framer-motion` in landing and dashboard pages.

## 4) Routing & Access Control
Routing is role-based inside `Router()`:
- Unauthenticated: Landing, FAQ.
- Patient: Dashboard, select doctor, results, settings, FAQ.
- Doctor: Pending approval gate, dashboard, results, settings, FAQ.
- Admin: Pending doctor approvals, results, settings, FAQ.

Reference: [client/src/App.tsx](client/src/App.tsx)

## 5) Core Layout Component
### `MobileLayout`
Responsibilities:
- App header with title/logo, user menu, and optional back button.
- Content container with scroll handling.
- Authenticated bottom navigation (Home, History, Settings).

Reference: [client/src/components/mobile-layout.tsx](client/src/components/mobile-layout.tsx)

## 6) Page Components (Feature Screens)
### Landing / Auth
- Hero, feature cards, patient & doctor flow summaries.
- Combined sign-in/sign-up form.
- Uses `useAuth()` for auth flows.

Reference: [client/src/pages/landing.tsx](client/src/pages/landing.tsx)

### Home
- Main “New Diagnosis” CTA with recent scans list.
- Uses `getRecentScans` via TanStack Query.

Reference: [client/src/pages/home.tsx](client/src/pages/home.tsx)

### Patient Dashboard
- Doctor assignment card, stats, latest scan summary, and scan list.
- Redirects to doctor selection if no doctor is assigned.

Reference: [client/src/pages/patient-dashboard.tsx](client/src/pages/patient-dashboard.tsx)

### Doctor Dashboard
- Patient list, upload workflow, recent reports.
- Upload calls `/api/doctor/upload` with FormData and Supabase token.

Reference: [client/src/pages/doctor-dashboard.tsx](client/src/pages/doctor-dashboard.tsx)

### Admin Dashboard
- Pending doctor approvals with approve/reject actions.

Reference: [client/src/pages/admin-dashboard.tsx](client/src/pages/admin-dashboard.tsx)

### Analysis
- Animated “analysis” steps, simulated progress, and scan creation.
- Uses `createScan()` (note: currently stubbed data in client).

Reference: [client/src/pages/analysis.tsx](client/src/pages/analysis.tsx)

### Results
- Shows original and heatmap overlays (static assets), diagnosis, confidence.
- Export to PDF and PNG (html2canvas + jsPDF).

Reference: [client/src/pages/results.tsx](client/src/pages/results.tsx)

### History
- List of scans with severity chips.

Reference: [client/src/pages/history.tsx](client/src/pages/history.tsx)

### Select Doctor
- Search and select approved doctors.
- Uses `getApprovedDoctors`, `selectDoctor`, and `getMyDoctor`.

Reference: [client/src/pages/select-doctor.tsx](client/src/pages/select-doctor.tsx)

### Settings
- UI controls for inference mode, sync preferences, dark mode toggle.

Reference: [client/src/pages/settings.tsx](client/src/pages/settings.tsx)

### FAQ
- Category accordion with common questions.

Reference: [client/src/pages/faq.tsx](client/src/pages/faq.tsx)

### Pending Doctor
- Waiting screen until admin approval.

Reference: [client/src/pages/pending-doctor.tsx](client/src/pages/pending-doctor.tsx)

### Not Found
- 404 friendly screen and return action.

Reference: [client/src/pages/not-found.tsx](client/src/pages/not-found.tsx)

## 7) Shared UI Components (Design Primitives)
Located in [client/src/components/ui](client/src/components/ui). These are shadcn-style primitives with Tailwind styling:

### Inputs & Forms
- `Button`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Switch`, `Slider`, `Label`, `Form`, `Field`, `InputGroup`, `InputOtp`.

### Layout & Surfaces
- `Card`, `Separator`, `Sheet`, `Drawer`, `Popover`, `HoverCard`, `Tooltip`, `ScrollArea`, `Resizable`, `Skeleton`, `Spinner`.

### Navigation
- `Tabs`, `Accordion`, `Menubar`, `NavigationMenu`, `Pagination`, `Breadcrumb`, `Sidebar`.

### Feedback & Status
- `Badge`, `Alert`, `Toast`, `Toaster`, `Progress`, `Sonner`.

### Data Display
- `Table`, `Chart`, `Avatar`, `Carousel`, `AspectRatio`.

### Menus
- `DropdownMenu`, `ContextMenu`, `Command`.

Note: Not every primitive is used yet, but they form the UI toolkit.

## 8) Hooks & Client Utilities
- `useAuth()` manages Supabase auth and profile resolution.
- `useIsMobile()` for responsive behavior.
- `queryClient` and `defaultQueryFn` configure TanStack Query.

References:
- [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts)
- [client/src/hooks/use-mobile.tsx](client/src/hooks/use-mobile.tsx)
- [client/src/lib/queryClient.ts](client/src/lib/queryClient.ts)

## 9) API Layer (Client)
- `getScans`, `getScan`, `getRecentScans`, `createScan`.
- Doctor-patient relationships: `getApprovedDoctors`, `selectDoctor`, `getMyDoctor`, `getMyPatients`.
- Adds Supabase Bearer token for protected endpoints.

Reference: [client/src/lib/api.ts](client/src/lib/api.ts)

## 10) Backend API (Server)
### Authentication & Profiles
- `GET /api/auth/me`
- `POST /api/auth/profile` (post-sign-up profile creation)

### Admin
- `GET /api/admin/doctors/pending`
- `POST /api/admin/doctors/:id/approve`
- `POST /api/admin/doctors/:id/reject`

### Doctor–Patient Relationships
- `GET /api/doctors/approved`
- `POST /api/patient/select-doctor`
- `GET /api/patient/my-doctor`
- `GET /api/doctor/my-patients`

### Scans
- `GET /api/scans`
- `GET /api/scans/recent`
- `GET /api/scans/:id`
- `POST /api/scans`
- `GET /api/patients/:patientId/scans`
- `POST /api/doctor/upload` (image upload + placeholder inference)

Reference: [server/routes.ts](server/routes.ts)

## 11) Data Model & Storage
- `profiles` table: id, role, status, name, contact, medical license.
- `scans` table: image URLs, diagnosis, severity, confidence, inference metadata.

Reference: [shared/schema.ts](shared/schema.ts)

Storage uses a Supabase admin client and maps DB rows to API shape.
Reference: [server/storage.ts](server/storage.ts)

## 12) Supabase Integration
- Client: uses anon key for auth + profile fetch.
- Server: uses service role (or anon as fallback) for privileged queries.

References:
- [client/src/lib/supabaseClient.ts](client/src/lib/supabaseClient.ts)
- [server/supabaseClient.ts](server/supabaseClient.ts)

## 13) Design Notes & Implementation Gaps
- `Analysis` page currently generates a stub scan; real inference should replace client-side mock and move to server inference flow.
- `Results` uses static assets for images; production should load actual scan image URLs.

## 14) Component Usage Map (Quick Index)
- Layout: `MobileLayout` → all screens.
- Auth: `LandingPage` + `useAuth()`.
- Patient: `PatientDashboard`, `SelectDoctor`, `History`, `Results`.
- Doctor: `DoctorDashboard`, `Results`, `History`.
- Admin: `AdminDashboard`.

## 15) Where to Extend
- Add real inference pipeline in `POST /api/doctor/upload` and replace placeholder logic.
- Connect `Results` images to scan URLs.
- Add clinician notes and review workflows (both API and UI).
