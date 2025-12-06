import { Scan, InsertScan } from "@shared/schema";

const API_BASE = "/api";

export async function getScans(): Promise<Scan[]> {
  const response = await fetch(`${API_BASE}/scans`);
  if (!response.ok) {
    throw new Error("Failed to fetch scans");
  }
  return response.json();
}

export async function getRecentScans(limit: number = 10): Promise<Scan[]> {
  const response = await fetch(`${API_BASE}/scans/recent?limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to fetch recent scans");
  }
  return response.json();
}

export async function getScan(id: number): Promise<Scan> {
  const response = await fetch(`${API_BASE}/scans/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch scan");
  }
  return response.json();
}

export async function createScan(scan: InsertScan): Promise<Scan> {
  const response = await fetch(`${API_BASE}/scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(scan),
  });
  if (!response.ok) {
    throw new Error("Failed to create scan");
  }
  return response.json();
}

export async function getPatientScans(patientId: string): Promise<Scan[]> {
  const response = await fetch(`${API_BASE}/patients/${patientId}/scans`);
  if (!response.ok) {
    throw new Error("Failed to fetch patient scans");
  }
  return response.json();
}
