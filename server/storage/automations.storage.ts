import { eq } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type { AutomationRule, InsertAutomationRule } from "@shared/schema";
import { randomUUID } from "crypto";

export class AutomationsStorage {

  private rowToAutomationRule(r: any): AutomationRule {
    return {
      id: r.id,
      boardId: r.boardId,
      name: r.name,
      description: r.description || "",
      isActive: r.isActive ?? true,
      triggerType: r.triggerType as any,
      triggerField: r.triggerField || undefined,
      triggerValue: r.triggerValue || undefined,
      conditions: (r.conditions as any[]) || [],
      actionType: r.actionType as any,
      actionConfig: (r.actionConfig as Record<string, any>) || {},
      runCount: r.runCount || 0,
      lastRun: r.lastRun ? toISOString(r.lastRun) || undefined : undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async getAutomationRules(boardId: string): Promise<AutomationRule[]> {
    const rows = await db.select().from(tables.automationRules).where(eq(tables.automationRules.boardId, boardId));
    return rows.map(r => this.rowToAutomationRule(r));
  }

  async getAutomationRule(id: string): Promise<AutomationRule | undefined> {
    const [row] = await db.select().from(tables.automationRules).where(eq(tables.automationRules.id, id));
    if (!row) return undefined;
    return this.rowToAutomationRule(row);
  }

  async createAutomationRule(data: InsertAutomationRule): Promise<AutomationRule> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.automationRules).values({
      id,
      boardId: data.boardId,
      name: data.name,
      description: data.description || "",
      isActive: data.isActive ?? true,
      triggerType: data.triggerType,
      triggerField: data.triggerField,
      triggerValue: data.triggerValue,
      conditions: data.conditions as any || [],
      actionType: data.actionType,
      actionConfig: data.actionConfig as any || {},
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToAutomationRule(row);
  }

  async updateAutomationRule(id: string, data: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.conditions) updateData.conditions = data.conditions as any;
    if (data.actionConfig) updateData.actionConfig = data.actionConfig as any;
    const [row] = await db.update(tables.automationRules).set(updateData).where(eq(tables.automationRules.id, id)).returning();
    if (!row) return undefined;
    return this.rowToAutomationRule(row);
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    await db.delete(tables.automationRules).where(eq(tables.automationRules.id, id));
    return true;
  }
}
