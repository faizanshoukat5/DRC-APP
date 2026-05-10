import { supabase } from './supabaseClient';
// Use the legacy module since SDK 54 turned the old top-level methods
// (getInfoAsync, readAsStringAsync) into thrown errors. Migration to the
// new File/Directory API can come later — this keeps behavior identical.
import * as FileSystem from 'expo-file-system/legacy';
import {
  DEFAULT_MODEL,
  diagnosisFromPrediction,
  getModelInfo,
  isMlBackendConfigured,
  mapClassToSeverity,
  predictFundus,
  type ModelKey,
} from './mlApi';

export type InferenceMode = 'remote' | 'failed' | 'pending' | 'stub';
export type UploadPhase = 'uploading' | 'analyzing';

export interface Scan {
  id: string;
  patientId: string;
  createdAt: string;
  imageUrl: string;
  heatmapUrl?: string;
  /** Multiple Grad-CAM URLs keyed by colormap name (turbo, inferno, ...).
   *  Newer scans store this in metadata so the Results screen can offer
   *  a Turbo/Inferno toggle without re-running inference. */
  heatmapUrls?: Record<string, string>;
  /** Which colormap the canonical heatmapUrl was rendered with. */
  colormap?: string;
  diagnosis: string;
  severity: string;
  confidence: number;
  analysisDetails?: string;
  doctorNotes?: string;
  modelVersion?: string;
  probabilities?: Record<string, number>;
  temperatureUsed?: number;
  inferenceMode?: InferenceMode;
  rawClassId?: number;
  modelKey?: string;
  modelLabel?: string;
  followUpDueDate?: string;
  followUpNotes?: string;
  followUpStatus?: 'needed' | 'scheduled' | 'completed';
}

function scanFromRecord(record: any): Scan {
  const metadata = record.metadata ?? {};
  const followUp = metadata.followUp ?? {};
  return {
    id: String(record.id),
    patientId: record.patient_id,
    createdAt: record.timestamp,
    imageUrl: record.original_image_url || record.image_url,
    heatmapUrl: record.heatmap_image_url,
    heatmapUrls: metadata.heatmapUrls,
    colormap: metadata.colormap,
    diagnosis: record.diagnosis,
    severity: record.severity,
    confidence: record.confidence,
    analysisDetails: record.analysis_details,
    doctorNotes: record.doctor_notes,
    modelVersion: record.model_version,
    probabilities: metadata.probabilities,
    temperatureUsed: metadata.temperatureUsed ?? metadata.temperature_used,
    inferenceMode: record.inference_mode,
    rawClassId: typeof metadata.rawClassId === 'number' ? metadata.rawClassId : undefined,
    modelKey: metadata.modelKey,
    modelLabel: metadata.modelLabel,
    followUpDueDate: followUp.dueDate ?? undefined,
    followUpNotes: followUp.notes ?? undefined,
    followUpStatus: followUp.status ?? undefined,
  };
}

export async function getScans(patientId: string): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(scanFromRecord);
}

export async function getScan(id: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return scanFromRecord(data);
}

/** Lightweight profile lookup for things like PDF report headers/filenames.
 *  Returns null on missing row or RLS denial — callers should fall back to
 *  a placeholder rather than blocking the UI on this. */
export async function getProfileName(userId: string): Promise<string | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.name as string) || null;
}

export interface UploadScanOptions {
  onPhase?: (phase: UploadPhase) => void;
  doctorNotes?: string;
  /** Which model to call for inference. Defaults to AEYE v1. */
  model?: ModelKey;
}

export async function uploadScan(
  patientId: string,
  imageUri: string,
  optionsOrCallback?: UploadScanOptions | ((phase: UploadPhase) => void),
): Promise<Scan> {
  // Backward-compat: third arg used to be a phase callback only.
  const options: UploadScanOptions =
    typeof optionsOrCallback === 'function'
      ? { onPhase: optionsOrCallback }
      : optionsOrCallback ?? {};
  const { onPhase, doctorNotes, model = DEFAULT_MODEL } = options;
  const trimmedNotes = doctorNotes?.trim();
  const modelInfo = getModelInfo(model);

  onPhase?.('uploading');

  const fileInfo = await FileSystem.getInfoAsync(imageUri);
  if (!fileInfo.exists) throw new Error('Image file not found');

  const ext = (imageUri.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${patientId}/${Date.now()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64' as const,
  });
  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error: uploadError } = await supabase.storage
    .from('scans')
    .upload(fileName, arrayBuffer, {
      contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from('scans').getPublicUrl(fileName);

  // If the ML backend isn't configured, preserve the legacy "pending" stub flow
  // so the existing UI remains usable until the FastAPI backend is deployed.
  if (!isMlBackendConfigured()) {
    const { data: stub, error: stubError } = await supabase
      .from('scans')
      .insert({
        patient_id: patientId,
        original_image_url: urlData.publicUrl,
        heatmap_image_url: urlData.publicUrl,
        diagnosis: 'Pending Analysis',
        severity: 'unknown',
        confidence: 0,
        model_version: '1.0.0',
        inference_mode: 'pending',
        inference_time: 0,
        preprocessing_method: 'none',
        ...(trimmedNotes ? { doctor_notes: trimmedNotes } : {}),
      })
      .select()
      .single();
    if (stubError) throw new Error(stubError.message);
    return scanFromRecord(stub);
  }

  // Real ML inference path
  onPhase?.('analyzing');
  const start = Date.now();
  let prediction;
  let inferenceError: string | null = null;
  try {
    prediction = await predictFundus(imageUri, model);
  } catch (err: any) {
    inferenceError = err?.message ?? 'Analysis failed';
  }
  const inferenceTime = Date.now() - start;

  // The backend now returns multiple Grad-CAM renderings (one per colormap)
  // so the Results screen can offer a Turbo/Inferno toggle without re-running
  // inference. Upload each variant separately and collect their public URLs
  // into heatmapUrls keyed by colormap name. The legacy heatmapUrl stays the
  // user's chosen colormap so the scans table column + older clients still work.
  let heatmapUrl = urlData.publicUrl;
  const heatmapUrls: Record<string, string> = {};
  const variants =
    prediction?.heatmapsBase64 ??
    (prediction?.heatmapBase64
      ? { [prediction.colormap || 'turbo']: prediction.heatmapBase64 }
      : {});
  const primaryColormap = prediction?.colormap || 'turbo';

  for (const [cm, b64] of Object.entries(variants)) {
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const name = `${patientId}/heatmap_${cm}_${Date.now()}.png`;
      const { error: e } = await supabase.storage
        .from('scans')
        .upload(name, bytes, { contentType: 'image/png', upsert: false });
      if (!e) {
        heatmapUrls[cm] = supabase.storage.from('scans').getPublicUrl(name).data.publicUrl;
      } else {
        console.warn(`Heatmap upload (${cm}) failed:`, e.message);
      }
    } catch (err) {
      console.warn(`Heatmap decode/upload (${cm}) threw:`, err);
    }
  }
  if (heatmapUrls[primaryColormap]) heatmapUrl = heatmapUrls[primaryColormap];
  else if (Object.values(heatmapUrls)[0]) heatmapUrl = Object.values(heatmapUrls)[0];

  const versionForModel = model === 'partner' ? 'partner_efficientnet_b4' : 'efficientnet_b4_v1';
  const preprocForModel = model === 'partner' ? 'median_gamma' : 'ben_graham';

  const insertPayload = prediction
    ? {
        patient_id: patientId,
        original_image_url: urlData.publicUrl,
        heatmap_image_url: heatmapUrl,
        diagnosis: diagnosisFromPrediction(prediction),
        severity: mapClassToSeverity(prediction.classId),
        confidence: Math.round(prediction.confidence * 100),
        model_version: versionForModel,
        inference_mode: 'remote',
        inference_time: inferenceTime,
        preprocessing_method: preprocForModel,
        metadata: {
          probabilities: prediction.probabilities,
          temperatureUsed: prediction.temperatureUsed,
          className: prediction.className,
          calibrated: prediction.calibrated,
          rawClassId: prediction.classId,
          modelKey: prediction.modelKey,
          modelLabel: modelInfo.label,
          colormap: prediction.colormap ?? primaryColormap,
          heatmapUrls,
        },
        ...(trimmedNotes ? { doctor_notes: trimmedNotes } : {}),
      }
    : {
        patient_id: patientId,
        original_image_url: urlData.publicUrl,
        heatmap_image_url: urlData.publicUrl,
        diagnosis: 'Analysis failed',
        severity: 'unknown',
        confidence: 0,
        model_version: versionForModel,
        inference_mode: 'failed',
        inference_time: inferenceTime,
        preprocessing_method: preprocForModel,
        metadata: {
          error: inferenceError ?? 'unknown error',
          modelKey: model,
          modelLabel: modelInfo.label,
        },
        ...(trimmedNotes ? { doctor_notes: trimmedNotes } : {}),
      };

  const { data: scan, error: insertError } = await supabase
    .from('scans')
    // Newer Supabase generics narrow `severity` to a literal union; our
    // failed branch uses 'unknown' which the client schema doesn't list.
    // Casting to any here — runtime schema is the source of truth.
    .insert(insertPayload as any)
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);

  // Surface the inference error to the caller AFTER persisting the failed row
  // so the user sees a meaningful Alert but the upload isn't lost.
  if (inferenceError) throw new Error(inferenceError);

  return scanFromRecord(scan);
}

// Alias for doctors uploading scans for their patients
export const uploadScanForPatient = uploadScan;

export async function updateScanDoctorNotes(scanId: string, notes: string): Promise<void> {
  const trimmed = notes.trim();
  const { error } = await supabase
    .from('scans')
    .update({ doctor_notes: trimmed.length > 0 ? trimmed : null })
    .eq('id', scanId);
  if (error) throw new Error(error.message);
}

export interface FollowUpInput {
  dueDate?: string;
  notes?: string;
  status?: 'needed' | 'scheduled' | 'completed';
}

export async function updateScanFollowUp(scanId: string, followUp: FollowUpInput): Promise<void> {
  const { data, error: readError } = await supabase
    .from('scans')
    .select('metadata')
    .eq('id', scanId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const currentMetadata =
    data?.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? data.metadata
      : {};

  const nextMetadata = {
    ...currentMetadata,
    followUp: {
      dueDate: followUp.dueDate?.trim() || null,
      notes: followUp.notes?.trim() || null,
      status: followUp.status ?? 'needed',
      updatedAt: new Date().toISOString(),
    },
  };

  const { error } = await supabase
    .from('scans')
    .update({ metadata: nextMetadata })
    .eq('id', scanId);

  if (error) throw new Error(error.message);
}

export interface ProfileUpdateInput {
  name?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
}

export async function updateProfile(userId: string, profile: ProfileUpdateInput): Promise<void> {
  const payload: Record<string, string | null> = {};

  if (profile.name !== undefined) payload.name = profile.name.trim();
  if (profile.phone !== undefined) payload.phone = profile.phone?.trim() || null;
  if (profile.dateOfBirth !== undefined) payload.date_of_birth = profile.dateOfBirth?.trim() || null;
  if (profile.gender !== undefined) payload.gender = profile.gender?.trim() || null;
  if (profile.address !== undefined) payload.address = profile.address?.trim() || null;
  if (profile.licenseNumber !== undefined) payload.license_number = profile.licenseNumber?.trim() || null;
  if (profile.specialty !== undefined) payload.specialty = profile.specialty?.trim() || null;

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw new Error(error.message);
}

export interface ApprovedDoctor {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  licenseNumber?: string;
}

export interface PatientWithScans {
  id: string;
  name: string;
  email: string;
  phone?: string;
  scans?: Scan[];
}

export interface PendingDoctor {
  id: string;
  name: string;
  email: string;
  licenseNumber?: string;
  specialty?: string;
  createdAt: string;
}

export interface DoctorDirectoryItem extends PendingDoctor {
  status: 'pending' | 'approved' | 'rejected';
}

export async function getApprovedDoctors(): Promise<ApprovedDoctor[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, specialty, license_number')
    .eq('role', 'doctor')
    .eq('status', 'approved')
    .order('name', { ascending: true });
  
  if (error) throw new Error(error.message);
  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    specialty: d.specialty,
    licenseNumber: d.license_number,
  }));
}

export async function getDoctorDirectory(): Promise<DoctorDirectoryItem[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, license_number, specialty, status, created_at')
    .eq('role', 'doctor')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    licenseNumber: d.license_number,
    specialty: d.specialty,
    status: d.status,
    createdAt: d.created_at,
  }));
}

export async function selectDoctor(patientId: string, doctorId: string): Promise<void> {
  // Remove existing relationship
  await supabase
    .from('doctor_patients')
    .delete()
    .eq('patient_id', patientId);

  // Create new relationship
  const { error } = await supabase
    .from('doctor_patients')
    .insert({ doctor_id: doctorId, patient_id: patientId });

  if (error) throw new Error(error.message);
}

export async function getMyDoctor(patientId: string): Promise<ApprovedDoctor | null> {
  const { data, error } = await supabase
    .from('doctor_patients')
    .select(`
      doctor_id,
      profiles!doctor_patients_doctor_id_fkey (
        id,
        name,
        email,
        specialty,
        license_number
      )
    `)
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error || !data?.profiles) return null;
  
  const profile = data.profiles as any;
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    specialty: profile.specialty,
    licenseNumber: profile.license_number,
  };
}

export async function getMyPatients(doctorId: string): Promise<PatientWithScans[]> {
  const { data, error } = await supabase
    .from('doctor_patients')
    .select(`
      patient_id,
      created_at,
      profiles!doctor_patients_patient_id_fkey (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Get scans for each patient
  const patients = await Promise.all(
    (data || []).map(async (d: any) => {
      const scans = await getScans(d.profiles.id);
      return {
        id: d.profiles.id,
        name: d.profiles.name,
        email: d.profiles.email,
        phone: d.profiles.phone,
        scans,
      };
    })
  );

  return patients;
}

export async function getPendingDoctors(): Promise<PendingDoctor[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, license_number, specialty, created_at')
    .eq('role', 'doctor')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    licenseNumber: d.license_number,
    specialty: d.specialty,
    createdAt: d.created_at,
  }));
}

export async function approveDoctor(doctorId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'approved' })
    .eq('id', doctorId)
    .eq('role', 'doctor');

  if (error) throw new Error(error.message);
}

export async function rejectDoctor(doctorId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', doctorId)
    .eq('role', 'doctor');

  if (error) throw new Error(error.message);
}

export async function updateDoctorStatus(
  doctorId: string,
  status: 'pending' | 'approved' | 'rejected',
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', doctorId)
    .eq('role', 'doctor');

  if (error) throw new Error(error.message);
}
