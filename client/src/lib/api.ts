import { Scan, InsertScan } from "@shared/schema";
import { supabase } from "./supabaseClient";

const API_BASE = "/api";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getScans(): Promise<Scan[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/scans`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch scans");
  }
  return response.json();
}

export async function getRecentScans(limit: number = 10): Promise<Scan[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/scans/recent?limit=${limit}`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch recent scans");
  }
  return response.json();
}

export async function getScan(id: number): Promise<Scan> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/scans/${id}`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch scan");
  }
  return response.json();
}

export async function createScan(scan: InsertScan): Promise<Scan> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/scans`, {
    method: "POST",
    headers,
    body: JSON.stringify(scan),
  });
  if (!response.ok) {
    throw new Error("Failed to create scan");
  }
  return response.json();
}

export async function getPatientScans(patientId: string): Promise<Scan[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/patients/${patientId}/scans`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch patient scans");
  }
  return response.json();
}

// Doctor-Patient Relationships

export interface ApprovedDoctor {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  license_number?: string;
}

export interface PatientInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  assignedAt: string;
}

export async function getApprovedDoctors(): Promise<ApprovedDoctor[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/doctors/approved`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch approved doctors");
  }
  return response.json();
}

export async function selectDoctor(doctorId: string): Promise<{ ok: boolean; doctor: { id: string; name: string } }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/patient/select-doctor`, {
    method: "POST",
    headers,
    body: JSON.stringify({ doctorId }),
  });
  if (!response.ok) {
    throw new Error("Failed to select doctor");
  }
  return response.json();
}

export async function getMyDoctor(): Promise<{ doctor: ApprovedDoctor | null }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/patient/my-doctor`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch your doctor");
  }
  return response.json();
}

export async function getMyPatients(): Promise<PatientInfo[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/doctor/my-patients`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch patients");
  }
  return response.json();
}
