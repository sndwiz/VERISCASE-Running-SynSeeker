import { eq } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type { MatterContact, InsertMatterContact } from "@shared/schema";
import { randomUUID } from "crypto";

export class ContactsStorage {

  async getMatterContacts(matterId: string): Promise<MatterContact[]> {
    const rows = await db.select().from(tables.matterContacts).where(eq(tables.matterContacts.matterId, matterId));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      name: r.name,
      role: r.role as any,
      email: r.email || undefined,
      phone: r.phone || undefined,
      company: r.company || undefined,
      address: r.address || undefined,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async createMatterContact(data: InsertMatterContact): Promise<MatterContact> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.matterContacts).values({
      id,
      matterId: data.matterId,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      name: row.name,
      role: row.role as any,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateMatterContact(id: string, data: Partial<MatterContact>): Promise<MatterContact | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    const [row] = await db.update(tables.matterContacts).set(updateData).where(eq(tables.matterContacts.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      name: row.name,
      role: row.role as any,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteMatterContact(id: string): Promise<boolean> {
    await db.delete(tables.matterContacts).where(eq(tables.matterContacts.id, id));
    return true;
  }
}
