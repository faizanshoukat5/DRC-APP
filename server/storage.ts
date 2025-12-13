import { type Scan, type InsertScan } from "@shared/schema";
import { supabaseAdmin } from "./supabaseClient";

type DbScan = {
  id: number;
  patient_id: string;
  timestamp: string;
  original_image_url: string;
  heatmap_image_url: string;
  diagnosis: string;
  severity: string;
  confidence: number;
  model_version: string;
  inference_mode: string;
  inference_time: number;
  preprocessing_method: string;
  metadata: Record<string, any> | null;
};

function fromDbScan(record: DbScan): Scan {
  return {
    id: record.id,
    patientId: record.patient_id,
    timestamp: new Date(record.timestamp),
    originalImageUrl: record.original_image_url,
    heatmapImageUrl: record.heatmap_image_url,
    diagnosis: record.diagnosis,
    severity: record.severity,
    confidence: record.confidence,
    modelVersion: record.model_version,
    inferenceMode: record.inference_mode,
    inferenceTime: record.inference_time,
    preprocessingMethod: record.preprocessing_method,
    metadata: record.metadata ?? undefined,
  };
}

function toDbInsert(scan: InsertScan) {
  return {
    patient_id: scan.patientId,
    original_image_url: scan.originalImageUrl,
    heatmap_image_url: scan.heatmapImageUrl,
    diagnosis: scan.diagnosis,
    severity: scan.severity,
    confidence: scan.confidence,
    model_version: scan.modelVersion,
    inference_mode: scan.inferenceMode,
    inference_time: scan.inferenceTime,
    preprocessing_method: scan.preprocessingMethod,
    metadata: scan.metadata ?? null,
  };
}

export interface IStorage {
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  getRecentScans(limit: number): Promise<Scan[]>;
  getScansByPatient(patientId: string): Promise<Scan[]>;
}

export class DatabaseStorage implements IStorage {
  // Scan operations
  async createScan(insertScan: InsertScan): Promise<Scan> {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .insert(toDbInsert(insertScan))
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create scan: ${error.message}`);
    }

    return fromDbScan(data as DbScan);
  }

  async getScan(id: number): Promise<Scan | undefined> {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch scan: ${error.message}`);
    }

    return data ? fromDbScan(data as DbScan) : undefined;
  }

  async getAllScans(): Promise<Scan[]> {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select()
      .order("timestamp", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scans: ${error.message}`);
    }

    const rows = (data as DbScan[] | null) ?? [];
    return rows.map(fromDbScan);
  }

  async getRecentScans(limit: number): Promise<Scan[]> {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select()
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent scans: ${error.message}`);
    }

    const rows = (data as DbScan[] | null) ?? [];
    return rows.map(fromDbScan);
  }

  async getScansByPatient(patientId: string): Promise<Scan[]> {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select()
      .eq("patient_id", patientId)
      .order("timestamp", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scans for patient: ${error.message}`);
    }

    const rows = (data as DbScan[] | null) ?? [];
    return rows.map(fromDbScan);
  }
}

export const storage = new DatabaseStorage();
