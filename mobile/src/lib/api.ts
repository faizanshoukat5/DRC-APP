import { supabase } from './supabaseClient';
import * as FileSystem from 'expo-file-system';

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
}

export async function getScans(patientId: string): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  return (data || []).map((record: any) => ({
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
  }));
}

export async function getScan(id: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw new Error(error.message);
  if (!data) return null;
  
  return {
    id: String(data.id),
    patientId: data.patient_id,
    createdAt: data.timestamp,
    imageUrl: data.original_image_url || data.image_url,
    heatmapUrl: data.heatmap_image_url,
    diagnosis: data.diagnosis,
    severity: data.severity,
    confidence: data.confidence,
    analysisDetails: data.analysis_details,
    doctorNotes: data.doctor_notes,
    modelVersion: data.model_version,
  };
}

export async function uploadScan(patientId: string, imageUri: string): Promise<Scan> {
  // Read the image file
  const fileInfo = await FileSystem.getInfoAsync(imageUri);
  if (!fileInfo.exists) throw new Error('Image file not found');

  // Get the file extension
  const ext = imageUri.split('.').pop() || 'jpg';
  const fileName = `${patientId}/${Date.now()}.${ext}`;

  // Read the file as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64' as const,
  });

  // Convert to blob
  const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('scans')
    .upload(fileName, arrayBuffer, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  // Get public URL
  const { data: urlData } = supabase.storage.from('scans').getPublicUrl(fileName);

  // Create scan record (AI analysis would happen on backend)
  // For now, create a pending scan with all required fields
  const { data: scan, error: insertError } = await supabase
    .from('scans')
    .insert({
      patient_id: patientId,
      original_image_url: urlData.publicUrl,
      heatmap_image_url: urlData.publicUrl, // Placeholder until AI generates heatmap
      diagnosis: 'Pending Analysis',
      severity: 'unknown',
      confidence: 0,
      model_version: '1.0.0',
      inference_mode: 'pending',
      inference_time: 0,
      preprocessing_method: 'none',
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  return {
    id: String(scan.id),
    patientId: scan.patient_id,
    createdAt: scan.timestamp,
    imageUrl: scan.original_image_url,
    diagnosis: scan.diagnosis,
    severity: scan.severity,
    confidence: scan.confidence,
  };
}

// Alias for doctors uploading scans for their patients
export const uploadScanForPatient = uploadScan;

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
