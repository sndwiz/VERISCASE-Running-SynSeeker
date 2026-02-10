import { db } from "./base";
import { eq, desc } from "drizzle-orm";
import * as tables from "@shared/models/tables";
import type { Meeting, InsertMeeting } from "@shared/schema";
import { randomUUID } from "crypto";

export class MeetingsStorage {
  async getMeetings(): Promise<Meeting[]> {
    const rows = await db.select().from(tables.meetings).orderBy(desc(tables.meetings.createdAt));
    return rows as Meeting[];
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [row] = await db.select().from(tables.meetings).where(eq(tables.meetings.id, id));
    return row as Meeting | undefined;
  }

  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const [row] = await db.insert(tables.meetings).values({
      id: randomUUID(),
      title: data.title,
      matterId: data.matterId || null,
      date: data.date,
      duration: data.duration || 0,
      status: data.status || "recorded",
      participants: data.participants || [],
      summary: data.summary || "",
      mainPoints: data.mainPoints || [],
      topics: data.topics || [],
      transcript: data.transcript || [],
      actionItems: data.actionItems || [],
      tags: data.tags || [],
      createdBy: data.createdBy,
    }).returning();
    return row as Meeting;
  }

  async updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | undefined> {
    const [row] = await db.update(tables.meetings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.meetings.id, id))
      .returning();
    return row as Meeting | undefined;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    const result = await db.delete(tables.meetings).where(eq(tables.meetings.id, id));
    return true;
  }
}
