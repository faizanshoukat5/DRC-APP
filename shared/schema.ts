import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
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
