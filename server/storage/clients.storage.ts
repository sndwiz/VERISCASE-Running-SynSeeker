import { eq, desc, asc } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type { Client, InsertClient, Matter, InsertMatter, Person } from "@shared/schema";
import { randomUUID } from "crypto";

export class ClientsStorage {

  async getClients(): Promise<Client[]> {
    const rows = await db.select().from(tables.clients).orderBy(asc(tables.clients.name));
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email || undefined,
      phone: r.phone || undefined,
      company: r.company || undefined,
      address: r.address || undefined,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [row] = await db.select().from(tables.clients).where(eq(tables.clients.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createClient(data: InsertClient): Promise<Client> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.clients).values({
      id,
      name: data.name,
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
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    const [row] = await db.update(tables.clients).set(updateData).where(eq(tables.clients.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteClient(id: string): Promise<boolean> {
    await db.delete(tables.clients).where(eq(tables.clients.id, id));
    return true;
  }

  private rowToMatter(r: any): Matter {
    return {
      id: r.id,
      clientId: r.clientId,
      name: r.name,
      caseNumber: r.caseNumber || undefined,
      matterType: r.matterType,
      status: (r.status as any) || "active",
      description: r.description || "",
      openedDate: r.openedDate,
      closedDate: r.closedDate || undefined,
      assignedAttorneys: (r.assignedAttorneys as Person[]) || [],
      practiceArea: r.practiceArea,
      courtName: r.courtName || undefined,
      judgeAssigned: r.judgeAssigned || undefined,
      opposingCounsel: r.opposingCounsel || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async getMatters(clientId?: string): Promise<Matter[]> {
    let rows;
    if (clientId) {
      rows = await db.select().from(tables.matters).where(eq(tables.matters.clientId, clientId)).orderBy(desc(tables.matters.createdAt));
    } else {
      rows = await db.select().from(tables.matters).orderBy(desc(tables.matters.createdAt));
    }
    return rows.map(r => this.rowToMatter(r));
  }

  async getMatter(id: string): Promise<Matter | undefined> {
    const [row] = await db.select().from(tables.matters).where(eq(tables.matters.id, id));
    if (!row) return undefined;
    return this.rowToMatter(row);
  }

  async createMatter(data: InsertMatter): Promise<Matter> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.matters).values({
      id,
      clientId: data.clientId,
      name: data.name,
      caseNumber: data.caseNumber,
      matterType: data.matterType,
      status: data.status || "active",
      description: data.description || "",
      openedDate: data.openedDate,
      practiceArea: data.practiceArea,
      courtName: data.courtName,
      judgeAssigned: data.judgeAssigned,
      opposingCounsel: data.opposingCounsel,
      assignedAttorneys: [],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToMatter(row);
  }

  async updateMatter(id: string, data: Partial<Matter>): Promise<Matter | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.assignedAttorneys) updateData.assignedAttorneys = data.assignedAttorneys as any;
    const [row] = await db.update(tables.matters).set(updateData).where(eq(tables.matters.id, id)).returning();
    if (!row) return undefined;
    return this.rowToMatter(row);
  }

  async deleteMatter(id: string): Promise<boolean> {
    await db.delete(tables.matters).where(eq(tables.matters.id, id));
    return true;
  }
}
