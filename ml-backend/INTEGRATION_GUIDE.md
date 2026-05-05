# DR Classification — Integration Guide for an Existing Expo + Supabase App

You already have an Expo app with Supabase auth + database. This guide
adds a complete diabetic retinopathy screening flow to it: ML predictions,
image storage, per-user history.

## Architecture (3 pieces)

```
   ┌────────────────┐
   │  Expo App      │ ─────► Supabase (auth + DB + image storage)
   │  (yours)       │
   │                │ ─────► ML Backend on Hugging Face Spaces
   └────────────────┘        (FastAPI + EfficientNet-B4)
```

## Folder layout — where to put the new files

Drop them into your existing project structure. **Adjust import paths
inside the files** if your folders are named differently.

```
your-existing-expo-app/
├── lib/
│   ├── supabase.js              ← your existing Supabase client
│   └── drApi.js                 ← NEW (provided)
├── screens/
│   ├── ... (your existing screens)
│   ├── DRScreeningScreen.js     ← NEW (provided)
│   └── DRHistoryScreen.js       ← NEW (provided)
├── components/
│   └── PredictionResult.js      ← NEW (provided)
└── ...
```

The backend (Python) lives in a **separate folder, completely outside your
Expo project**:

```
~/dr-backend/
├── app.py
├── requirements.txt
├── Dockerfile
├── efficientnet_b4_best.pth     ← from your Google Drive
└── calibration.json             ← from your Google Drive
```

## Files to download from Google Drive

From `MyDrive/Colab Notebooks/2.0/saved_model_efficientnet_v2/`:

| File | Where it goes | Why |
|---|---|---|
| `efficientnet_b4_best.pth` | `~/dr-backend/` | Trained model weights (71 MB) |
| `calibration.json` | `~/dr-backend/` | Temperature for honest probabilities |

**Nothing model-related goes into your Expo app.** The phone never sees
`.pth` files.

---

## Stage 1 — Set up Supabase (10 min)

### 1.1  Run the SQL

In your Supabase dashboard:
1. Go to **SQL Editor** → **New query**
2. Paste the entire contents of `db_setup.sql`
3. Click **Run**

This creates:
- A `predictions` table (one row per screening)
- Row-Level Security so users only see their own data
- A private `fundus-images` storage bucket
- Storage policies (each user owns a folder named by their UUID)

### 1.2  Verify

In **Table Editor** you should now see `predictions` (empty).
In **Storage** you should see `fundus-images` (empty).

---

## Stage 2 — Run ML backend on your laptop (30 min)

Same as the standalone deployment plan. Skim quickly:

```bash
mkdir ~/dr-backend && cd ~/dr-backend
# Copy in: app.py, requirements.txt, efficientnet_b4_best.pth, calibration.json

python3 -m venv venv
source venv/bin/activate           # macOS / Linux
# venv\Scripts\activate            # Windows
pip install -r requirements.txt

uvicorn app:app --host 0.0.0.0 --port 8000
```

Confirm it works at `http://localhost:8000/docs` in your browser. Upload
a fundus image, get a JSON response. Leave it running.

---

## Stage 3 — Wire the new files into your Expo app (1 hour)

### 3.1  Install the image picker (if not already)

```bash
cd your-expo-app
npx expo install expo-image-picker
```

### 3.2  Drop in the new files

- `lib/drApi.js`
- `components/PredictionResult.js`
- `screens/DRScreeningScreen.js`
- `screens/DRHistoryScreen.js`

### 3.3  Fix import paths

Each file imports `../lib/supabase`. If your Supabase client is at a
different path (e.g. `../utils/supabase` or `../services/supabase`),
update those imports. The places to check are at the top of:
- `drApi.js`
- `DRScreeningScreen.js`
- `DRHistoryScreen.js`

### 3.4  Set the ML backend URL

Open `lib/drApi.js`, find this near the top:

```javascript
export const ML_API_URL = 'https://YOUR-USERNAME-dr-classifier.hf.space';
```

For local testing, change it to your laptop's WiFi IP, e.g.:
```javascript
export const ML_API_URL = 'http://192.168.1.42:8000';
```

(Find your IP: `ipconfig` on Windows, or System Settings → Network on
macOS. Phone and laptop must be on the same WiFi.)

### 3.5  Add the screens to your navigator

If you use **React Navigation** (most common):

```javascript
import DRScreeningScreen from './screens/DRScreeningScreen';
import DRHistoryScreen   from './screens/DRHistoryScreen';

// Inside your Stack.Navigator (or Tab.Navigator):
<Stack.Screen name="DRScreening" component={DRScreeningScreen} options={{ title: 'DR Screening' }} />
<Stack.Screen name="DRHistory"   component={DRHistoryScreen}   options={{ title: 'History' }} />
```

If you use **Expo Router** (file-based):
- Move `DRScreeningScreen.js` to `app/dr-screening.js` (and rename the
  default export accordingly)
- Move `DRHistoryScreen.js` to `app/dr-history.js`
- Replace `navigation.navigate('DRHistory')` with `router.push('/dr-history')`

### 3.6  Add a way to open the screening screen

From your home/dashboard screen, add a button:

```javascript
<Button
  title="DR Screening"
  onPress={() => navigation.navigate('DRScreening')}
/>
```

### 3.7  Test the full loop

1. Run `npx expo start`, scan QR with Expo Go
2. Sign in (your existing auth)
3. Tap into the DR Screening screen
4. Pick or capture a fundus image, tap **Analyze**
5. You should see: "Running AI analysis…" → "Saving image…" → "Saving result…" → result card
6. Go to **History** → your prediction should appear with the image thumbnail

---

## Stage 4 — Deploy ML backend to the cloud (1–2 hours)

Same as standalone plan: Hugging Face Spaces with Docker SDK.

### 4.1  Create a Space

1. Sign up at https://huggingface.co (free)
2. New Space → name it (e.g. `dr-classifier`) → SDK: **Docker** → Hardware: CPU basic (free)

### 4.2  Push your backend

```bash
git lfs install
git clone https://huggingface.co/spaces/YOUR_USERNAME/dr-classifier
cd dr-classifier

# Copy these in:
#   app.py, requirements.txt, Dockerfile, efficientnet_b4_best.pth, calibration.json

git lfs track "*.pth"
git add .gitattributes app.py requirements.txt Dockerfile calibration.json efficientnet_b4_best.pth
git commit -m "Deploy DR classifier"
git push
```

(Get Git LFS from https://git-lfs.com if you don't have it.)

### 4.3  Wait for build

5–15 minutes. Watch the **Logs** tab. When status = "Running":

Your backend is live at: `https://YOUR_USERNAME-dr-classifier.hf.space`

### 4.4  Update the app

In `lib/drApi.js`:
```javascript
export const ML_API_URL = 'https://YOUR_USERNAME-dr-classifier.hf.space';
```

Restart `npx expo start`. Your app now works anywhere with internet — no
laptop needed.

---

## Stage 5 — Production polish

The app already works at this point. These are optional improvements:

| Improvement | Effort | Value |
|---|---|---|
| App icon & splash screen via `app.json` | 30 min | High |
| Onboarding screen with disclaimer | 1 hr | High (legal) |
| Push notifications for screening reminders | 4 hr | Medium |
| Image quality preview (warn before upload) | 2 hr | Medium |
| Offline queue (predictions when no internet) | 1 day | Low |
| Build & submit via `eas build` | 1 day + store fees | Required to ship |

---

## Cheat sheet

**Files I provided in this conversation:**

| File | Where |
|---|---|
| `app.py` | `~/dr-backend/` |
| `requirements.txt` | `~/dr-backend/` |
| `Dockerfile` | `~/dr-backend/` |
| `db_setup.sql` | run once in Supabase SQL editor |
| `lib/drApi.js` | your Expo app |
| `components/PredictionResult.js` | your Expo app |
| `screens/DRScreeningScreen.js` | your Expo app |
| `screens/DRHistoryScreen.js` | your Expo app |

**Files from your Drive:**

| File | Where |
|---|---|
| `efficientnet_b4_best.pth` | `~/dr-backend/` |
| `calibration.json` | `~/dr-backend/` |

**Order:** Stage 1 → Stage 2 → Stage 3 → Stage 4 → (Stage 5).
