// Blueprint reference: javascript_log_in_with_replit
import { users, scans, type User, type UpsertUser, type Scan, type InsertScan } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  getRecentScans(limit: number): Promise<Scan[]>;
  getScansByPatient(patientId: string): Promise<Scan[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations - Required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Scan operations
  async createScan(insertScan: InsertScan): Promise<Scan> {
    const [scan] = await db
      .insert(scans)
      .values(insertScan)
      .returning();
    return scan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan || undefined;
  }

  async getAllScans(): Promise<Scan[]> {
    return db.select().from(scans).orderBy(desc(scans.timestamp));
  }

  async getRecentScans(limit: number): Promise<Scan[]> {
    return db.select().from(scans).orderBy(desc(scans.timestamp)).limit(limit);
  }

  async getScansByPatient(patientId: string): Promise<Scan[]> {
    return db.select().from(scans).where(eq(scans.patientId, patientId)).orderBy(desc(scans.timestamp));
  }
}

export const storage = new DatabaseStorage();
