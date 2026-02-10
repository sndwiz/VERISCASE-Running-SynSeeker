import { eq, asc } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  CalendarEvent,
  InsertCalendarEvent,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class CalendarStorage {

  async getCalendarEvents(matterId?: string): Promise<CalendarEvent[]> {
    const rows = matterId
      ? await db.select().from(tables.calendarEvents).where(eq(tables.calendarEvents.matterId, matterId)).orderBy(asc(tables.calendarEvents.startDate))
      : await db.select().from(tables.calendarEvents).orderBy(asc(tables.calendarEvents.startDate));
    return rows.map(row => ({
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
      sourceType: row.sourceType || undefined,
      sourceId: row.sourceId || undefined,
      autoSynced: row.autoSynced || false,
    }));
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    const [row] = await db.select().from(tables.calendarEvents).where(eq(tables.calendarEvents.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const now = new Date();
    const [row] = await db.insert(tables.calendarEvents).values({
      matterId: data.matterId,
      taskId: data.taskId,
      title: data.title,
      description: data.description || "",
      eventType: data.eventType,
      startDate: data.startDate,
      endDate: data.endDate,
      allDay: data.allDay || false,
      location: data.location,
      attendees: data.attendees || [],
      reminderMinutes: data.reminderMinutes,
      color: data.color,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.calendarEvents).set(updateWithTime).where(eq(tables.calendarEvents.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    await db.delete(tables.calendarEvents).where(eq(tables.calendarEvents.id, id));
    return true;
  }
}
