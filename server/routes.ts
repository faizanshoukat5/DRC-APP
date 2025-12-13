import type { Express, NextFunction, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertScanSchema, upsertProfileSchema, doctorStatusEnum, userRoleEnum, type UserRole, type DoctorStatus } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { supabaseAdmin } from "./supabaseClient";

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
  if (!doctorStatusEnum.options.includes(statusValue)) {
    throw Object.assign(new Error("Invalid status"), { status: 403 });
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    status: statusValue,
    name: profile.name,
    phone: profile.phone ?? undefined,
    licenseNumber: profile.license_number ?? undefined,
    specialty: profile.specialty ?? undefined,
  };
}

function requireAuth(handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void> | void) {
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

  // Authenticated profile for current user
  app.get("/api/auth/me", requireAuth((req, res) => {
    res.json({ user: req.user });
  }));

  // Upsert profile after sign-up
  app.post("/api/auth/profile", requireAuth(async (req, res) => {
    const parsed = upsertProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const validationError = fromZodError(parsed.error);
      return res.status(400).json({ error: validationError.message });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = parsed.data;
    if (payload.role === "admin") {
      return res.status(403).json({ error: "Cannot self-assign admin role" });
    }

    const status = payload.role === "doctor" ? "pending" : "approved";

    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: req.user.id,
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
  }));

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
  
  // Get all scans
  app.get("/api/scans", requireApprovedDoctor, async (_req, res) => {
    try {
      const scans = await storage.getAllScans();
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  // Get recent scans
  app.get("/api/scans/recent", requireApprovedDoctor, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const scans = await storage.getRecentScans(limit);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
      res.status(500).json({ error: "Failed to fetch recent scans" });
    }
  });

  // Get scan by ID
  app.get("/api/scans/:id", requireApprovedDoctor, async (req, res) => {
    try {
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
  });

  // Create new scan
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

  // Get scans by patient ID
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

  return httpServer;
}
