import { eq, desc } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  TimelineEvent,
  InsertTimelineEvent,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class TimelineStorage {

  async getTimelineEvents(matterId: string): Promise<TimelineEvent[]> {
    const rows = await db.select().from(tables.timelineEvents).where(eq(tables.timelineEvents.matterId, matterId)).orderBy(desc(tables.timelineEvents.eventDate));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      eventType: r.eventType as any,
      title: r.title,
      description: r.description || "",
      linkedFileId: r.linkedFileId || undefined,
      linkedTaskId: r.linkedTaskId || undefined,
      linkedThreadId: r.linkedThreadId || undefined,
      createdBy: r.createdBy,
      eventDate: r.eventDate,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      metadata: (r.metadata as Record<string, any>) || {},
    }));
  }

  async createTimelineEvent(data: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.timelineEvents).values({
      id,
      matterId: data.matterId,
      eventType: data.eventType,
      title: data.title,
      description: data.description || "",
      linkedFileId: data.linkedFileId,
      linkedTaskId: data.linkedTaskId,
      linkedThreadId: data.linkedThreadId,
      createdBy: data.createdBy,
      eventDate: data.eventDate,
      createdAt: now,
      metadata: data.metadata as any || {},
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      eventType: row.eventType as any,
      title: row.title,
      description: row.description || "",
      linkedFileId: row.linkedFileId || undefined,
      linkedTaskId: row.linkedTaskId || undefined,
      linkedThreadId: row.linkedThreadId || undefined,
      createdBy: row.createdBy,
      eventDate: row.eventDate,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      metadata: (row.metadata as Record<string, any>) || {},
    };
  }
}
