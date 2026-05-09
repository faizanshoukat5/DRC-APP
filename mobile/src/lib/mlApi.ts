// ML backend abstraction. We support multiple FastAPI-style backends so doctors
// can compare predictions from different models (e.g. RetinaPilot's calibrated
// EfficientNet-B4 vs a partner's model). Each backend has its own URL, optional
// API key, request shape, and response shape. We normalize everything to a
// single Prediction interface for the rest of the app.

export interface Prediction {
  classId: number;
  className: string;
  /** 0..1, top-class probability. Backends that report 0..100 are scaled here. */
  confidence: number;
  /** 5-class distribution. Backends that don't return this leave it as {}. */
  probabilities: Record<string, number>;
  /** Whether the backend applied temperature scaling. False if unknown. */
  calibrated: boolean;
  /** Calibration T. 1.0 if the backend doesn't calibrate. */
  temperatureUsed: number;
  /** Base64-encoded PNG of the Grad-CAM overlay, when the backend returns one. */
  heatmapBase64?: string;
  /** Which model produced this prediction. Persisted in scan metadata. */
  modelKey: ModelKey;
}

export type SeverityTier = 'normal' | 'mild' | 'moderate' | 'severe';
export type UploadPhase = 'uploading' | 'analyzing';

export type ModelKey = 'rp_v1' | 'partner';

export interface ModelInfo {
  key: ModelKey;
  /** Display name shown in pickers and on results. */
  label: string;
  /** Short tagline shown under the picker. */
  description: string;
  /** Env URL — defined here keeps configuration discoverable. */
  url: string | undefined;
  /** Optional shared-secret header. */
  apiKey: string | undefined;
}

const MODELS: Record<ModelKey, ModelInfo> = {
  rp_v1: {
    key: 'rp_v1',
    label: 'RetinaPilot v1',
    description: 'Calibrated EfficientNet-B4 with Ben-Graham preprocessing',
    url: process.env.EXPO_PUBLIC_DR_API_URL,
    apiKey: process.env.EXPO_PUBLIC_DR_API_KEY,
  },
  partner: {
    key: 'partner',
    label: 'Partner Model',
    description: 'EfficientNet-B4 with median + gamma preprocessing',
    url: process.env.EXPO_PUBLIC_DR_API_URL_PARTNER,
    apiKey: process.env.EXPO_PUBLIC_DR_API_KEY_PARTNER,
  },
};

export const DEFAULT_MODEL: ModelKey = 'rp_v1';

const REQUEST_TIMEOUT_MS = 45_000;

export function getAvailableModels(): ModelInfo[] {
  return Object.values(MODELS).filter((m) => !!m.url);
}

export function getModelInfo(key: ModelKey): ModelInfo {
  return MODELS[key];
}

export function isMlBackendConfigured(): boolean {
  return !!MODELS[DEFAULT_MODEL].url;
}

export function mapClassToSeverity(classId: number): SeverityTier {
  if (classId === 0) return 'normal';
  if (classId === 1) return 'mild';
  if (classId === 2) return 'moderate';
  return 'severe';
}

export function diagnosisFromPrediction(prediction: Prediction): string {
  if (prediction.classId === 0) return 'No DR';
  // Strip a trailing " DR" if the backend already includes it (partner does).
  const name = prediction.className.replace(/\s+DR$/, '');
  return `${name} DR`;
}

export async function predictFundus(
  imageUri: string,
  modelKey: ModelKey = DEFAULT_MODEL,
): Promise<Prediction> {
  const model = MODELS[modelKey];
  if (!model.url) {
    throw new Error(`${model.label} URL not configured`);
  }

  const ext = (imageUri.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  form.append('file', {
    uri: imageUri,
    name: `fundus.${ext}`,
    type: mime,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (model.apiKey) headers['x-api-key'] = model.apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${model.url.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      body: form,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Analysis timed out — the model server may be cold-starting. Try again in a moment.');
    }
    throw new Error(`Could not reach ${model.label}: ${err?.message ?? 'network error'}`);
  } finally {
    clearTimeout(timer);
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${model.label} returned non-JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(body?.detail || `${model.label} failed (HTTP ${response.status})`);
  }

  // Normalize across backend variants. Confidence may come as 0..1 (RetinaPilot)
  // or 0..100 (partner). Heatmap field name varies. Calibration metadata may
  // be absent.
  const rawConfidence = Number(body.confidence);
  const confidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
  const heatmap =
    typeof body.heatmap_b64 === 'string' && body.heatmap_b64.length > 0
      ? body.heatmap_b64
      : typeof body.heatmap === 'string' && body.heatmap.length > 0
        ? body.heatmap
        : undefined;

  return {
    classId: Number(body.class_id),
    className: String(body.class_name),
    confidence,
    probabilities: body.probabilities ?? {},
    calibrated: !!body.calibrated,
    temperatureUsed: Number(body.temperature_used ?? 1),
    heatmapBase64: heatmap,
    modelKey,
  };
}
