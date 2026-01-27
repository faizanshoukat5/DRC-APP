import type { Express, NextFunction, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertScanSchema, upsertProfileSchema, doctorStatusEnum, userRoleEnum, type UserRole, type DoctorStatus } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { supabaseAdmin } from "./supabaseClient";
import multer from "multer";
import path from "path";

type RequestUser = {
  id: string;
  email: string;
  role: UserRole;
  status: DoctorStatus;
  name: string;
  phone?: string;
  licenseNumber?: string;
  specialty?: string;
};

interface AuthedRequest extends Request {
  user?: RequestUser;
}

async function resolveUser(req: Request): Promise<RequestUser> {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw Object.assign(new Error("Profile not found"), { status: 403 });
  }

  if (!userRoleEnum.options.includes(profile.role)) {
    throw Object.assign(new Error("Invalid role"), { status: 403 });
  }

  const statusValue = (profile.status as string) ?? "pending";
  const statusParse = doctorStatusEnum.safeParse(statusValue);
  if (!statusParse.success) {
    throw Object.assign(new Error("Invalid status"), { status: 403 });
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    status: statusParse.data,
    name: profile.name,
    phone: profile.phone ?? undefined,
    licenseNumber: profile.license_number ?? undefined,
    specialty: profile.specialty ?? undefined,
  };
}

async function resolveAuthUser(req: Request): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return {
    id: userData.user.id,
    email: userData.user.email!,
  };
}

type AuthHandlerResult = void | Response | Promise<void | Response>;

function requireAuth(handler: (req: AuthedRequest, res: Response, next: NextFunction) => AuthHandlerResult) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveUser(req);
      (req as AuthedRequest).user = user;
      await handler(req as AuthedRequest, res, next);
    } catch (error: any) {
      const status = error?.status ?? 500;
      const message = error?.message ?? "Internal Server Error";
      res.status(status).json({ error: message });
    }
  };
}

const requireRole = (roles: typeof userRoleEnum._type[]) =>
  requireAuth((req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  });

const requireApprovedDoctor = requireAuth((req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role === "doctor" && req.user.status !== "approved") {
    return res.status(403).json({ error: "Doctor account pending approval" });
  }
  return next();
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  // Authenticated profile for current user
  app.get("/api/auth/me", requireAuth((req, res) => {
    res.json({ user: req.user });
  }));

  // Upsert profile after sign-up (only needs auth token, not existing profile)
  app.post("/api/auth/profile", async (req, res) => {
    try {
      const authUser = await resolveAuthUser(req);
      
      const parsed = upsertProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const validationError = fromZodError(parsed.error);
        return res.status(400).json({ error: validationError.message });
      }

      const payload = parsed.data;
      if (payload.role === "admin") {
        return res.status(403).json({ error: "Cannot self-assign admin role" });
      }

      const status = payload.role === "doctor" ? "pending" : "approved";

      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authUser.id,
          email: payload.email,
          role: payload.role,
          status,
          name: payload.name,
          phone: payload.phone ?? null,
          date_of_birth: payload.dateOfBirth ?? null,
          gender: payload.gender ?? null,
          address: payload.address ?? null,
          license_number: payload.licenseNumber ?? null,
          specialty: payload.specialty ?? null,
        });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ ok: true, status });
    } catch (error: any) {
      const status = error?.status ?? 500;
      const message = error?.message ?? "Internal Server Error";
      res.status(status).json({ error: message });
    }
  });

  // Admin: pending doctors
  app.get("/api/admin/doctors/pending", requireRole(["admin"]), async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, license_number, specialty, status")
      .eq("role", "doctor")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  });

  const changeDoctorStatus = async (req: AuthedRequest, res: Response, status: DoctorStatus) => {
    const doctorId = req.params.id;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status })
      .eq("id", doctorId)
      .eq("role", "doctor");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, status });
  };

  app.post("/api/admin/doctors/:id/approve", requireRole(["admin"]), async (req, res) => {
    await changeDoctorStatus(req as AuthedRequest, res, "approved");
  });

  app.post("/api/admin/doctors/:id/reject", requireRole(["admin"]), async (req, res) => {
    await changeDoctorStatus(req as AuthedRequest, res, "rejected");
  });

  // =====================
  // Doctor-Patient Relationships
  // =====================

  // Get all approved doctors (for patients to choose from)
  app.get("/api/doctors/approved", requireAuth(async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, specialty, license_number")
        .eq("role", "doctor")
        .eq("status", "approved")
        .order("name", { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data ?? []);
    } catch (error) {
      console.error("Error fetching approved doctors:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  }));

  // Patient selects a doctor
  app.post("/api/patient/select-doctor", requireRole(["patient"]), async (req: AuthedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { doctorId } = req.body;
      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      // Verify the doctor exists and is approved
      const { data: doctor, error: doctorError } = await supabaseAdmin
        .from("profiles")
        .select("id, name")
        .eq("id", doctorId)
        .eq("role", "doctor")
        .eq("status", "approved")
        .maybeSingle();

      if (doctorError || !doctor) {
        return res.status(404).json({ error: "Doctor not found or not approved" });
      }

      // Remove any existing doctor relationship for this patient
      await supabaseAdmin
        .from("doctor_patients")
        .delete()
        .eq("patient_id", req.user.id);

      // Create new relationship
      const { error: insertError } = await supabaseAdmin
        .from("doctor_patients")
        .insert({
          doctor_id: doctorId,
          patient_id: req.user.id,
        });

      if (insertError) {
        console.error("Error creating doctor-patient relationship:", insertError);
        return res.status(500).json({ error: "Failed to select doctor" });
      }

      res.json({ ok: true, doctor: { id: doctor.id, name: doctor.name } });
    } catch (error) {
      console.error("Error selecting doctor:", error);
      res.status(500).json({ error: "Failed to select doctor" });
    }
  });

  // Get patient's selected doctor
  app.get("/api/patient/my-doctor", requireRole(["patient"]), async (req: AuthedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabaseAdmin
        .from("doctor_patients")
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
        .eq("patient_id", req.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching patient's doctor:", error);
        return res.status(500).json({ error: error.message });
      }

      if (!data || !data.profiles) {
        return res.json({ doctor: null });
      }

      res.json({ doctor: data.profiles });
    } catch (error) {
      console.error("Error fetching patient's doctor:", error);
      res.status(500).json({ error: "Failed to fetch doctor" });
    }
  });

  // Doctor: get assigned patients
  app.get("/api/doctor/my-patients", requireRole(["doctor"]), async (req: AuthedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      if (req.user.status !== "approved") {
        return res.status(403).json({ error: "Doctor account pending approval" });
      }

      const { data, error } = await supabaseAdmin
        .from("doctor_patients")
        .select(`
          patient_id,
          created_at,
          profiles!doctor_patients_patient_id_fkey (
            id,
            name,
            email,
            phone,
            date_of_birth,
            gender
          )
        `)
        .eq("doctor_id", req.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching doctor's patients:", error);
        return res.status(500).json({ error: error.message });
      }

      const patients = (data ?? []).map((d: any) => ({
        ...d.profiles,
        assignedAt: d.created_at,
      }));

      res.json(patients);
    } catch (error) {
      console.error("Error fetching doctor's patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  
  // Get all scans (patients see their own, doctors see assigned patients' scans)
  app.get("/api/scans", requireAuth(async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if doctor needs approval
      if (req.user.role === "doctor" && req.user.status !== "approved") {
        return res.status(403).json({ error: "Doctor account pending approval" });
      }

      if (req.user.role === "patient") {
        // Patients only see their own scans
        const scans = await storage.getScansByPatient(req.user.id);
        return res.json(scans);
      }

      if (req.user.role === "doctor") {
        // Doctors see scans for their assigned patients
        const { data: relationships, error: relError } = await supabaseAdmin
          .from("doctor_patients")
          .select("patient_id")
          .eq("doctor_id", req.user.id);

        if (relError) {
          return res.status(500).json({ error: relError.message });
        }

        const patientIds = (relationships ?? []).map((r: any) => r.patient_id);
        
        if (patientIds.length === 0) {
          return res.json([]);
        }

        const { data, error } = await supabaseAdmin
          .from("scans")
          .select("*")
          .in("patient_id", patientIds)
          .order("timestamp", { ascending: false });

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        // Transform to camelCase
        const scans = (data ?? []).map((record: any) => ({
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
        }));

        return res.json(scans);
      }
      
      // Admin sees all
      const scans = await storage.getAllScans();
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  }));

  // Get recent scans (patients and approved doctors)
  app.get("/api/scans/recent", requireAuth(async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if doctor needs approval
      if (req.user.role === "doctor" && req.user.status !== "approved") {
        return res.status(403).json({ error: "Doctor account pending approval" });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const scans = await storage.getRecentScans(limit);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
      res.status(500).json({ error: "Failed to fetch recent scans" });
    }
  }));

  // Get scan by ID (patients and approved doctors)
  app.get("/api/scans/:id", requireAuth(async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if doctor needs approval
      if (req.user.role === "doctor" && req.user.status !== "approved") {
        return res.status(403).json({ error: "Doctor account pending approval" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scan ID" });
      }
      
      const scan = await storage.getScan(id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      
      res.json(scan);
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ error: "Failed to fetch scan" });
    }
  }));

  // Create new scan (approved doctors only)
  app.post("/api/scans", requireApprovedDoctor, async (req, res) => {
    try {
      const validation = insertScanSchema.safeParse(req.body);
      
      if (!validation.success) {
        const validationError = fromZodError(validation.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const scan = await storage.createScan(validation.data);
      res.status(201).json(scan);
    } catch (error) {
      console.error("Error creating scan:", error);
      res.status(500).json({ error: "Failed to create scan" });
    }
  });

  // Get scans by patient ID (approved doctors only)
  app.get("/api/patients/:patientId/scans", requireApprovedDoctor, async (req, res) => {
    try {
      const { patientId } = req.params;
      const scans = await storage.getScansByPatient(patientId);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching patient scans:", error);
      res.status(500).json({ error: "Failed to fetch patient scans" });
    }
  });

  // Doctor: upload fundus image, run inference, and create scan
  app.post(
    "/api/doctor/upload",
    requireRole(["doctor"]),
    upload.single("file"),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });

        const file = req.file as Express.Multer.File | undefined;
        const patientId = (req.body?.patientId as string) ?? req.user.id;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        const ext = path.extname(file.originalname) || ".jpg";
        const key = `images/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

        // Upload to Supabase storage (bucket must exist: 'images')
        const { error: uploadError } = await supabaseAdmin.storage
          .from("images")
          .upload(key, file.buffer, { contentType: file.mimetype });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          return res.status(500).json({ error: "Failed to upload image" });
        }

        const { data: publicData } = supabaseAdmin.storage.from("images").getPublicUrl(key);
        const imageUrl = publicData.publicUrl;

        // Placeholder inference - replace with real model call
        const start = Date.now();
        const severities = ["mild", "moderate", "severe"];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const diagnosis = severity === "severe" ? "Severe DR" : severity === "moderate" ? "Moderate DR" : "Mild DR";
        const confidence = Math.floor(80 + Math.random() * 20);
        const inferenceTime = Date.now() - start;

        const insertPayload = {
          patientId,
          originalImageUrl: imageUrl,
          heatmapImageUrl: imageUrl,
          diagnosis,
          severity,
          confidence,
          modelVersion: "stub-v1",
          inferenceMode: "stub",
          inferenceTime,
          preprocessingMethod: "none",
          metadata: { uploadedBy: req.user.id },
        };

        const scan = await storage.createScan(insertPayload as any);

        res.status(201).json({ ok: true, scan });
      } catch (error) {
        console.error("Error handling upload:", error);
        res.status(500).json({ error: "Failed to process upload" });
      }
    },
  );

  return httpServer;
}
