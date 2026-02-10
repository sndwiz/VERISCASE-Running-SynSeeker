import { db } from "./base";
import { eq, desc, and, sql } from "drizzle-orm";
import * as tables from "@shared/models/tables";
import type { AuditLog, InsertAuditLog, SecurityEvent, InsertSecurityEvent } from "@shared/schema";
import { randomUUID } from "crypto";

export class SecurityStorage {
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    try {
      const [row] = await db.insert(tables.auditLogs).values({
        id: randomUUID(),
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        method: data.method || null,
        path: data.path || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        statusCode: data.statusCode || null,
        metadata: data.metadata || {},
        severity: data.severity || "info",
      }).returning();
      return row as AuditLog;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      return {
        id: randomUUID(),
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        method: data.method || null,
        path: data.path || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        statusCode: data.statusCode || null,
        metadata: data.metadata || {},
        severity: data.severity || "info",
        createdAt: new Date(),
      };
    }
  }

  async getAuditLogs(options?: { userId?: string; action?: string; resourceType?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const conditions = [];
    if (options?.userId) conditions.push(eq(tables.auditLogs.userId, options.userId));
    if (options?.action) conditions.push(eq(tables.auditLogs.action, options.action));
    if (options?.resourceType) conditions.push(eq(tables.auditLogs.resourceType, options.resourceType));

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    let query = db.select().from(tables.auditLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await (query as any).orderBy(desc(tables.auditLogs.createdAt)).limit(limit).offset(offset);
    return rows as AuditLog[];
  }

  async getAuditLogCount(options?: { userId?: string; action?: string; resourceType?: string }): Promise<number> {
    const conditions = [];
    if (options?.userId) conditions.push(eq(tables.auditLogs.userId, options.userId));
    if (options?.action) conditions.push(eq(tables.auditLogs.action, options.action));
    if (options?.resourceType) conditions.push(eq(tables.auditLogs.resourceType, options.resourceType));

    let query = db.select({ count: sql<number>`count(*)` }).from(tables.auditLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const [result] = await query;
    return Number(result.count);
  }

  async createSecurityEvent(data: InsertSecurityEvent): Promise<SecurityEvent> {
    try {
      const [row] = await db.insert(tables.securityEvents).values({
        id: randomUUID(),
        eventType: data.eventType,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: data.details || {},
        severity: data.severity || "warning",
      }).returning();
      return row as SecurityEvent;
    } catch (error) {
      console.error("Failed to create security event:", error);
      return {
        id: randomUUID(),
        eventType: data.eventType,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: data.details || {},
        severity: data.severity || "warning",
        resolved: false,
        createdAt: new Date(),
      };
    }
  }

  async getSecurityEvents(options?: { eventType?: string; severity?: string; resolved?: boolean; limit?: number }): Promise<SecurityEvent[]> {
    const conditions = [];
    if (options?.eventType) conditions.push(eq(tables.securityEvents.eventType, options.eventType));
    if (options?.severity) conditions.push(eq(tables.securityEvents.severity, options.severity));
    if (options?.resolved !== undefined) conditions.push(eq(tables.securityEvents.resolved, options.resolved));

    let query = db.select().from(tables.securityEvents);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await (query as any).orderBy(desc(tables.securityEvents.createdAt)).limit(options?.limit || 100);
    return rows as SecurityEvent[];
  }

  async resolveSecurityEvent(id: string): Promise<SecurityEvent | undefined> {
    const [row] = await db.update(tables.securityEvents)
      .set({ resolved: true })
      .where(eq(tables.securityEvents.id, id))
      .returning();
    return row as SecurityEvent | undefined;
  }
}
