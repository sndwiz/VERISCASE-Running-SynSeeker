import { eq } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  PeopleOrg,
  InsertPeopleOrg,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class PeopleStorage {

  async getPeopleOrgs(matterId?: string): Promise<PeopleOrg[]> {
    const rows = matterId 
      ? await db.select().from(tables.peopleOrgs).where(eq(tables.peopleOrgs.matterId, matterId))
      : await db.select().from(tables.peopleOrgs);
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId || undefined,
      name: r.name,
      entityType: r.entityType as any,
      role: r.role as any || undefined,
      email: r.email || undefined,
      phone: r.phone || undefined,
      company: r.company || undefined,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async createPeopleOrg(data: InsertPeopleOrg): Promise<PeopleOrg> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.peopleOrgs).values({
      id,
      matterId: data.matterId,
      name: data.name,
      entityType: data.entityType,
      role: data.role,
      email: data.email,
      phone: data.phone,
      company: data.company,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      name: row.name,
      entityType: row.entityType as any,
      role: row.role as any || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updatePeopleOrg(id: string, data: Partial<PeopleOrg>): Promise<PeopleOrg | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.peopleOrgs).set(updateWithTime).where(eq(tables.peopleOrgs.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      name: row.name,
      entityType: row.entityType as any,
      role: row.role as any || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deletePeopleOrg(id: string): Promise<boolean> {
    await db.delete(tables.peopleOrgs).where(eq(tables.peopleOrgs.id, id));
    return true;
  }
}
