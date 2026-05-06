export interface Prediction {
  classId: number;
  className: string;
  confidence: number;
  probabilities: Record<string, number>;
  calibrated: boolean;
  temperatureUsed: number;
  /** Base64-encoded PNG of the Grad-CAM overlay, when the backend returns one. */
  heatmapBase64?: string;
}

export type SeverityTier = 'normal' | 'mild' | 'moderate' | 'severe';

const REQUEST_TIMEOUT_MS = 45_000;

export function isMlBackendConfigured(): boolean {
  return !!process.env.EXPO_PUBLIC_DR_API_URL;
}

export function mapClassToSeverity(classId: number): SeverityTier {
  if (classId === 0) return 'normal';
  if (classId === 1) return 'mild';
  if (classId === 2) return 'moderate';
  return 'severe';
}

export function diagnosisFromPrediction(prediction: Prediction): string {
  return prediction.classId === 0 ? 'No DR' : `${prediction.className} DR`;
}

export async function predictFundus(imageUri: string): Promise<Prediction> {
  const baseUrl = process.env.EXPO_PUBLIC_DR_API_URL;
  if (!baseUrl) {
    throw new Error('DR API URL not configured (EXPO_PUBLIC_DR_API_URL)');
  }

  const ext = (imageUri.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  // React Native multipart shape — type assertion required for the file descriptor
  form.append('file', {
    uri: imageUri,
    name: `fundus.${ext}`,
    type: mime,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  const apiKey = process.env.EXPO_PUBLIC_DR_API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      body: form,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Analysis timed out — the model server may be cold-starting. Try again in a moment.');
    }
    throw new Error(`Could not reach analysis server: ${err?.message ?? 'network error'}`);
  } finally {
    clearTimeout(timer);
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Analysis server returned non-JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(body?.detail || `Analysis failed (HTTP ${response.status})`);
  }

  return {
    classId: Number(body.class_id),
    className: String(body.class_name),
    confidence: Number(body.confidence),
    probabilities: body.probabilities ?? {},
    calibrated: !!body.calibrated,
    temperatureUsed: Number(body.temperature_used ?? 1),
    heatmapBase64: typeof body.heatmap_b64 === 'string' && body.heatmap_b64.length > 0
      ? body.heatmap_b64
      : undefined,
  };
}
