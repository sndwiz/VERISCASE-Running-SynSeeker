import { db, toISOString } from "./base";
import { eq, desc, and, sql, or, gte, lte } from "drizzle-orm";
import * as tables from "@shared/models/tables";
import type {
  AIEventLog, InsertAIEventLog,
  Role, InsertRole,
  MatterPermission, InsertMatterPermission,
  DocumentPermission, InsertDocumentPermission,
  PIIPolicy, InsertPIIPolicy,
  CustomFieldDefinition, InsertCustomFieldDefinition,
  CustomFieldValue, InsertCustomFieldValue,
  CourtHoliday, InsertCourtHoliday,
  WorkspaceBilling, InsertWorkspaceBilling,
  TextSnippet, InsertTextSnippet,
} from "@shared/models/tables";
import { randomUUID } from "crypto";

export class AdminStorage {

  // ─── AI Event Logs (immutable) ───

  async createAIEventLog(data: InsertAIEventLog): Promise<AIEventLog> {
    const [row] = await db.insert(tables.aiEventLogs).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as AIEventLog;
  }

  async getAIEventLogs(filters?: {
    userId?: string;
    matterId?: string;
    action?: string;
    modelProvider?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AIEventLog[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(tables.aiEventLogs.userId, filters.userId));
    if (filters?.matterId) conditions.push(eq(tables.aiEventLogs.matterId, filters.matterId));
    if (filters?.action) conditions.push(eq(tables.aiEventLogs.action, filters.action));
    if (filters?.modelProvider) conditions.push(eq(tables.aiEventLogs.modelProvider, filters.modelProvider));
    if (filters?.startDate) conditions.push(gte(tables.aiEventLogs.createdAt, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(tables.aiEventLogs.createdAt, new Date(filters.endDate)));

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let query = db.select().from(tables.aiEventLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await (query as any).orderBy(desc(tables.aiEventLogs.createdAt)).limit(limit).offset(offset);
    return rows as AIEventLog[];
  }

  async getAIEventLogStats(): Promise<{
    totalEvents: number;
    byProvider: Record<string, number>;
    byAction: Record<string, number>;
    totalInputTokens: number;
    totalOutputTokens: number;
  }> {
    const [totals] = await db.select({
      totalEvents: sql<number>`count(*)`,
      totalInputTokens: sql<number>`coalesce(sum(${tables.aiEventLogs.inputTokenCount}), 0)`,
      totalOutputTokens: sql<number>`coalesce(sum(${tables.aiEventLogs.outputTokenCount}), 0)`,
    }).from(tables.aiEventLogs);

    const providerRows = await db.select({
      provider: tables.aiEventLogs.modelProvider,
      count: sql<number>`count(*)`,
    }).from(tables.aiEventLogs).groupBy(tables.aiEventLogs.modelProvider);

    const actionRows = await db.select({
      action: tables.aiEventLogs.action,
      count: sql<number>`count(*)`,
    }).from(tables.aiEventLogs).groupBy(tables.aiEventLogs.action);

    const byProvider: Record<string, number> = {};
    for (const r of providerRows) {
      byProvider[r.provider] = Number(r.count);
    }

    const byAction: Record<string, number> = {};
    for (const r of actionRows) {
      byAction[r.action] = Number(r.count);
    }

    return {
      totalEvents: Number(totals.totalEvents),
      byProvider,
      byAction,
      totalInputTokens: Number(totals.totalInputTokens),
      totalOutputTokens: Number(totals.totalOutputTokens),
    };
  }

  // ─── Roles ───

  async getRoles(): Promise<Role[]> {
    const rows = await db.select().from(tables.roles);
    return rows as Role[];
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [row] = await db.select().from(tables.roles).where(eq(tables.roles.id, id));
    return row as Role | undefined;
  }

  async createRole(data: InsertRole): Promise<Role> {
    const [row] = await db.insert(tables.roles).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as Role;
  }

  async updateRole(id: string, data: Partial<InsertRole>): Promise<Role | undefined> {
    const [row] = await db.update(tables.roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.roles.id, id))
      .returning();
    return row as Role | undefined;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(tables.roles).where(eq(tables.roles.id, id));
  }

  // ─── Matter Permissions ───

  async getMatterPermissions(matterId: string): Promise<MatterPermission[]> {
    const rows = await db.select().from(tables.matterPermissions)
      .where(eq(tables.matterPermissions.matterId, matterId));
    return rows as MatterPermission[];
  }

  async setMatterPermission(data: InsertMatterPermission): Promise<MatterPermission> {
    const [row] = await db.insert(tables.matterPermissions).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as MatterPermission;
  }

  async revokeMatterPermission(id: string): Promise<void> {
    await db.delete(tables.matterPermissions).where(eq(tables.matterPermissions.id, id));
  }

  // ─── Document Permissions ───

  async getDocumentPermissions(documentId: string): Promise<DocumentPermission[]> {
    const rows = await db.select().from(tables.documentPermissions)
      .where(eq(tables.documentPermissions.documentId, documentId));
    return rows as DocumentPermission[];
  }

  async setDocumentPermission(data: InsertDocumentPermission): Promise<DocumentPermission> {
    const [row] = await db.insert(tables.documentPermissions).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as DocumentPermission;
  }

  async revokeDocumentPermission(id: string): Promise<void> {
    await db.delete(tables.documentPermissions).where(eq(tables.documentPermissions.id, id));
  }

  // ─── PII Policies ───

  async getPIIPolicies(workspaceId?: string): Promise<PIIPolicy[]> {
    if (workspaceId) {
      const rows = await db.select().from(tables.piiPolicies)
        .where(eq(tables.piiPolicies.workspaceId, workspaceId));
      return rows as PIIPolicy[];
    }
    const rows = await db.select().from(tables.piiPolicies);
    return rows as PIIPolicy[];
  }

  async getPIIPolicy(id: string): Promise<PIIPolicy | undefined> {
    const [row] = await db.select().from(tables.piiPolicies).where(eq(tables.piiPolicies.id, id));
    return row as PIIPolicy | undefined;
  }

  async createPIIPolicy(data: InsertPIIPolicy): Promise<PIIPolicy> {
    const [row] = await db.insert(tables.piiPolicies).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as PIIPolicy;
  }

  async updatePIIPolicy(id: string, data: Partial<InsertPIIPolicy>): Promise<PIIPolicy | undefined> {
    const [row] = await db.update(tables.piiPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.piiPolicies.id, id))
      .returning();
    return row as PIIPolicy | undefined;
  }

  // ─── Custom Field Definitions ───

  async getCustomFieldDefinitions(entityType?: string): Promise<CustomFieldDefinition[]> {
    if (entityType) {
      const rows = await db.select().from(tables.customFieldDefinitions)
        .where(eq(tables.customFieldDefinitions.entityType, entityType));
      return rows as CustomFieldDefinition[];
    }
    const rows = await db.select().from(tables.customFieldDefinitions);
    return rows as CustomFieldDefinition[];
  }

  async createCustomFieldDefinition(data: InsertCustomFieldDefinition): Promise<CustomFieldDefinition> {
    const [row] = await db.insert(tables.customFieldDefinitions).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as CustomFieldDefinition;
  }

  async updateCustomFieldDefinition(id: string, data: Partial<InsertCustomFieldDefinition>): Promise<CustomFieldDefinition | undefined> {
    const [row] = await db.update(tables.customFieldDefinitions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.customFieldDefinitions.id, id))
      .returning();
    return row as CustomFieldDefinition | undefined;
  }

  async deleteCustomFieldDefinition(id: string): Promise<void> {
    await db.delete(tables.customFieldDefinitions).where(eq(tables.customFieldDefinitions.id, id));
  }

  // ─── Custom Field Values ───

  async getCustomFieldValues(entityId: string): Promise<CustomFieldValue[]> {
    const rows = await db.select().from(tables.customFieldValues)
      .where(eq(tables.customFieldValues.entityId, entityId));
    return rows as CustomFieldValue[];
  }

  async setCustomFieldValue(data: InsertCustomFieldValue): Promise<CustomFieldValue> {
    const [row] = await db.insert(tables.customFieldValues).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as CustomFieldValue;
  }

  // ─── Court Holidays ───

  async getCourtHolidays(jurisdictionId?: string): Promise<CourtHoliday[]> {
    if (jurisdictionId) {
      const rows = await db.select().from(tables.courtHolidays)
        .where(eq(tables.courtHolidays.jurisdictionId, jurisdictionId));
      return rows as CourtHoliday[];
    }
    const rows = await db.select().from(tables.courtHolidays);
    return rows as CourtHoliday[];
  }

  async createCourtHoliday(data: InsertCourtHoliday): Promise<CourtHoliday> {
    const [row] = await db.insert(tables.courtHolidays).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as CourtHoliday;
  }

  async deleteCourtHoliday(id: string): Promise<void> {
    await db.delete(tables.courtHolidays).where(eq(tables.courtHolidays.id, id));
  }

  // ─── Workspace Billing ───

  async getWorkspaceBilling(workspaceId: string): Promise<WorkspaceBilling | undefined> {
    const [row] = await db.select().from(tables.workspaceBilling)
      .where(eq(tables.workspaceBilling.workspaceId, workspaceId));
    return row as WorkspaceBilling | undefined;
  }

  async createWorkspaceBilling(data: InsertWorkspaceBilling): Promise<WorkspaceBilling> {
    const [row] = await db.insert(tables.workspaceBilling).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as WorkspaceBilling;
  }

  async updateWorkspaceBilling(id: string, data: Partial<InsertWorkspaceBilling>): Promise<WorkspaceBilling | undefined> {
    const [row] = await db.update(tables.workspaceBilling)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.workspaceBilling.id, id))
      .returning();
    return row as WorkspaceBilling | undefined;
  }

  // ─── Text Snippets ───

  async getTextSnippets(userId?: string, workspaceId?: string): Promise<TextSnippet[]> {
    const conditions = [];
    const orConditions = [];

    if (userId) orConditions.push(eq(tables.textSnippets.userId, userId));
    orConditions.push(eq(tables.textSnippets.isShared, true));

    if (workspaceId) conditions.push(eq(tables.textSnippets.workspaceId, workspaceId));

    let whereClause;
    if (orConditions.length > 0 && conditions.length > 0) {
      whereClause = and(or(...orConditions), ...conditions);
    } else if (orConditions.length > 0) {
      whereClause = or(...orConditions);
    } else if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    let query = db.select().from(tables.textSnippets);
    if (whereClause) {
      query = query.where(whereClause) as any;
    }
    const rows = await query;
    return rows as TextSnippet[];
  }

  async getTextSnippet(id: string): Promise<TextSnippet | undefined> {
    const [row] = await db.select().from(tables.textSnippets).where(eq(tables.textSnippets.id, id));
    return row as TextSnippet | undefined;
  }

  async createTextSnippet(data: InsertTextSnippet): Promise<TextSnippet> {
    const [row] = await db.insert(tables.textSnippets).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return row as TextSnippet;
  }

  async updateTextSnippet(id: string, data: Partial<InsertTextSnippet>): Promise<TextSnippet | undefined> {
    const [row] = await db.update(tables.textSnippets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.textSnippets.id, id))
      .returning();
    return row as TextSnippet | undefined;
  }

  async deleteTextSnippet(id: string): Promise<void> {
    await db.delete(tables.textSnippets).where(eq(tables.textSnippets.id, id));
  }
}
