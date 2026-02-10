import { eq } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type { DetectiveNode, InsertDetectiveNode, DetectiveConnection, InsertDetectiveConnection } from "@shared/schema";
import { randomUUID } from "crypto";

export class DetectiveStorage {

  private rowToDetectiveNode(r: any): DetectiveNode {
    return {
      id: r.id,
      matterId: r.matterId,
      type: r.type as any,
      title: r.title,
      description: r.description || "",
      linkedEvidenceId: r.linkedEvidenceId || undefined,
      linkedContactId: r.linkedContactId || undefined,
      position: r.position as { x: number; y: number },
      color: r.color || "#6366f1",
      icon: r.icon || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async getDetectiveNodes(matterId: string): Promise<DetectiveNode[]> {
    const rows = await db.select().from(tables.detectiveNodes).where(eq(tables.detectiveNodes.matterId, matterId));
    return rows.map(r => this.rowToDetectiveNode(r));
  }

  async createDetectiveNode(data: InsertDetectiveNode): Promise<DetectiveNode> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.detectiveNodes).values({
      id,
      matterId: data.matterId,
      type: data.type,
      title: data.title,
      description: data.description || "",
      linkedEvidenceId: data.linkedEvidenceId,
      linkedContactId: data.linkedContactId,
      position: data.position as any,
      color: data.color || "#6366f1",
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToDetectiveNode(row);
  }

  async updateDetectiveNode(id: string, data: Partial<DetectiveNode>): Promise<DetectiveNode | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.position) updateData.position = data.position as any;
    const [row] = await db.update(tables.detectiveNodes).set(updateData).where(eq(tables.detectiveNodes.id, id)).returning();
    if (!row) return undefined;
    return this.rowToDetectiveNode(row);
  }

  async deleteDetectiveNode(id: string): Promise<boolean> {
    await db.delete(tables.detectiveNodes).where(eq(tables.detectiveNodes.id, id));
    return true;
  }

  async getDetectiveConnections(matterId: string): Promise<DetectiveConnection[]> {
    const rows = await db.select().from(tables.detectiveConnections).where(eq(tables.detectiveConnections.matterId, matterId));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      sourceNodeId: r.sourceNodeId,
      targetNodeId: r.targetNodeId,
      label: r.label || "",
      connectionType: r.connectionType as any,
      strength: r.strength || 3,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createDetectiveConnection(data: InsertDetectiveConnection): Promise<DetectiveConnection> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.detectiveConnections).values({
      id,
      matterId: data.matterId,
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      label: data.label || "",
      connectionType: data.connectionType,
      strength: data.strength || 3,
      notes: data.notes || "",
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      sourceNodeId: row.sourceNodeId,
      targetNodeId: row.targetNodeId,
      label: row.label || "",
      connectionType: row.connectionType as any,
      strength: row.strength || 3,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async updateDetectiveConnection(id: string, data: Partial<DetectiveConnection>): Promise<DetectiveConnection | undefined> {
    const { createdAt, ...updateData } = data as any;
    const [row] = await db.update(tables.detectiveConnections).set(updateData).where(eq(tables.detectiveConnections.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      sourceNodeId: row.sourceNodeId,
      targetNodeId: row.targetNodeId,
      label: row.label || "",
      connectionType: row.connectionType as any,
      strength: row.strength || 3,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }

  async deleteDetectiveConnection(id: string): Promise<boolean> {
    await db.delete(tables.detectiveConnections).where(eq(tables.detectiveConnections.id, id));
    return true;
  }
}
