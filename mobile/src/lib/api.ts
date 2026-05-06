import { supabase } from './supabaseClient';
// Use the legacy module since SDK 54 turned the old top-level methods
// (getInfoAsync, readAsStringAsync) into thrown errors. Migration to the
// new File/Directory API can come later — this keeps behavior identical.
import * as FileSystem from 'expo-file-system/legacy';
import {
  diagnosisFromPrediction,
  isMlBackendConfigured,
  mapClassToSeverity,
  predictFundus,
} from './mlApi';

export type InferenceMode = 'remote' | 'failed' | 'pending' | 'stub';
export type UploadPhase = 'uploading' | 'analyzing';

export interface Scan {
  id: string;
  patientId: string;
  createdAt: string;
  imageUrl: string;
  heatmapUrl?: string;
  diagnosis: string;
  severity: string;
  confidence: number;
  analysisDetails?: string;
  doctorNotes?: string;
  modelVersion?: string;
  probabilities?: Record<string, number>;
  temperatureUsed?: number;
  inferenceMode?: InferenceMode;
}

function scanFromRecord(record: any): Scan {
  const metadata = record.metadata ?? {};
  return {
    id: String(record.id),
    patientId: record.patient_id,
    createdAt: record.timestamp,
    imageUrl: record.original_image_url || record.image_url,
    heatmapUrl: record.heatmap_image_url,
    diagnosis: record.diagnosis,
    severity: record.severity,
    confidence: record.confidence,
    analysisDetails: record.analysis_details,
    doctorNotes: record.doctor_notes,
    modelVersion: record.model_version,
    probabilities: metadata.probabilities,
    temperatureUsed: metadata.temperatureUsed ?? metadata.temperature_used,
    inferenceMode: record.inference_mode,
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

export interface UploadScanOptions {
  onPhase?: (phase: UploadPhase) => void;
  doctorNotes?: string;
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
  const { onPhase, doctorNotes } = options;
  const trimmedNotes = doctorNotes?.trim();

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
    prediction = await predictFundus(imageUri);
  } catch (err: any) {
    inferenceError = err?.message ?? 'Analysis failed';
  }
  const inferenceTime = Date.now() - start;

  const insertPayload = prediction
    ? {
        patient_id: patientId,
        original_image_url: urlData.publicUrl,
        heatmap_image_url: urlData.publicUrl,
        diagnosis: diagnosisFromPrediction(prediction),
        severity: mapClassToSeverity(prediction.classId),
        confidence: Math.round(prediction.confidence * 100),
        model_version: 'efficientnet_b4_v1',
        inference_mode: 'remote',
        inference_time: inferenceTime,
        preprocessing_method: 'ben_graham',
        metadata: {
          probabilities: prediction.probabilities,
          temperatureUsed: prediction.temperatureUsed,
          className: prediction.className,
          calibrated: prediction.calibrated,
          rawClassId: prediction.classId,
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
        model_version: 'efficientnet_b4_v1',
        inference_mode: 'failed',
        inference_time: inferenceTime,
        preprocessing_method: 'ben_graham',
        metadata: { error: inferenceError ?? 'unknown error' },
        ...(trimmedNotes ? { doctor_notes: trimmedNotes } : {}),
      };

  const { data: scan, error: insertError } = await supabase
    .from('scans')
    .insert(insertPayload)
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
