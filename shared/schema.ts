import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
