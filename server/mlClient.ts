export interface Prediction {
  classId: number;
  className: string;
  confidence: number;
  probabilities: Record<string, number>;
  calibrated: boolean;
  temperatureUsed: number;
}

export type SeverityTier = 'normal' | 'mild' | 'moderate' | 'severe';

const REQUEST_TIMEOUT_MS = 45_000;

export function isMlBackendConfigured(): boolean {
  return !!process.env.DR_API_URL;
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

export async function predictFundus(
  buffer: Buffer,
  mimetype: string,
  filename: string,
): Promise<Prediction> {
  const baseUrl = process.env.DR_API_URL;
  if (!baseUrl) {
    throw new Error('DR API URL not configured (DR_API_URL)');
  }

  const fd = new FormData();
  fd.append(
    'file',
    new Blob([buffer], { type: mimetype || 'image/jpeg' }),
    filename || 'fundus.jpg',
  );

  const headers: Record<string, string> = {};
  if (process.env.DR_API_KEY) headers['x-api-key'] = process.env.DR_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      body: fd,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Analysis timed out — model server may be cold-starting');
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
  };
}
