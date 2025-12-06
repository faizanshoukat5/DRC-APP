import { users, scans, type User, type InsertUser, type Scan, type InsertScan } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  getRecentScans(limit: number): Promise<Scan[]>;
  getScansByPatient(patientId: string): Promise<Scan[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

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
