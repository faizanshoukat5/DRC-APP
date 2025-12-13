import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = z.enum(["patient", "doctor", "admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const doctorStatusEnum = z.enum(["pending", "approved", "rejected"]);
export type DoctorStatus = z.infer<typeof doctorStatusEnum>;

export const profileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: userRoleEnum,
  status: doctorStatusEnum,
  name: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  specialty: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const upsertProfileSchema = profileSchema.pick({
  email: true,
  role: true,
  name: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  address: true,
  licenseNumber: true,
  specialty: true,
}).extend({
  id: z.string().optional(),
  status: doctorStatusEnum.optional(),
});

export type Profile = z.infer<typeof profileSchema>;

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Image data
  originalImageUrl: text("original_image_url").notNull(),
  heatmapImageUrl: text("heatmap_image_url").notNull(),
  
  // Analysis results
  diagnosis: text("diagnosis").notNull(),
  severity: text("severity").notNull(),
  confidence: integer("confidence").notNull(),
  
  // Technical metadata
  modelVersion: text("model_version").notNull(),
  inferenceMode: text("inference_mode").notNull(),
  inferenceTime: integer("inference_time").notNull(),
  preprocessingMethod: text("preprocessing_method").notNull(),
  
  // Optional additional metadata
  metadata: jsonb("metadata"),
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true,
  timestamp: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
