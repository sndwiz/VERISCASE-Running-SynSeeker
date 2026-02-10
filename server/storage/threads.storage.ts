import { eq, desc, asc } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  Thread,
  InsertThread,
  ThreadMessage,
  InsertThreadMessage,
  ThreadDecision,
  InsertThreadDecision,
  Person,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class ThreadsStorage {

  async getThreads(matterId: string): Promise<Thread[]> {
    const rows = await db.select().from(tables.threads).where(eq(tables.threads.matterId, matterId)).orderBy(desc(tables.threads.updatedAt));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      subject: r.subject,
      participants: (r.participants as Person[]) || [],
      status: (r.status as any) || "open",
      priority: (r.priority as any) || "medium",
      linkedFiles: (r.linkedFiles as string[]) || [],
      createdBy: r.createdBy,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getThread(id: string): Promise<Thread | undefined> {
    const [row] = await db.select().from(tables.threads).where(eq(tables.threads.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      subject: row.subject,
      participants: (row.participants as Person[]) || [],
      status: (row.status as any) || "open",
      priority: (row.priority as any) || "medium",
      linkedFiles: (row.linkedFiles as string[]) || [],
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createThread(data: InsertThread): Promise<Thread> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.threads).values({
      id,
      matterId: data.matterId,
      subject: data.subject,
      participants: data.participants as any || [],
      status: "open",
      priority: data.priority || "medium",
      linkedFiles: data.linkedFiles as any || [],
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      subject: row.subject,
      participants: (row.participants as Person[]) || [],
      status: (row.status as any) || "open",
      priority: (row.priority as any) || "medium",
      linkedFiles: (row.linkedFiles as string[]) || [],
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateThread(id: string, data: Partial<Thread>): Promise<Thread | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.participants) updateData.participants = data.participants as any;
    if (data.linkedFiles) updateData.linkedFiles = data.linkedFiles as any;
    const [row] = await db.update(tables.threads).set(updateData).where(eq(tables.threads.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      subject: row.subject,
      participants: (row.participants as Person[]) || [],
      status: (row.status as any) || "open",
      priority: (row.priority as any) || "medium",
      linkedFiles: (row.linkedFiles as string[]) || [],
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    const rows = await db.select().from(tables.threadMessages).where(eq(tables.threadMessages.threadId, threadId)).orderBy(asc(tables.threadMessages.createdAt));
    return rows.map(r => ({
      id: r.id,
      threadId: r.threadId,
      senderId: r.senderId,
      senderName: r.senderName,
      content: r.content,
      attachments: (r.attachments as any[]) || [],
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createThreadMessage(data: InsertThreadMessage): Promise<ThreadMessage> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.threadMessages).values({
      id,
      threadId: data.threadId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      attachments: data.attachments as any || [],
      createdAt: now,
    }).returning();
    // Update thread updatedAt
    await db.update(tables.threads).set({ updatedAt: now }).where(eq(tables.threads.id, data.threadId));
    return {
      id: row.id,
      threadId: row.threadId,
      senderId: row.senderId,
      senderName: row.senderName,
      content: row.content,
      attachments: (row.attachments as any[]) || [],
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async getThreadDecisions(threadId: string): Promise<ThreadDecision[]> {
    const rows = await db.select().from(tables.threadDecisions).where(eq(tables.threadDecisions.threadId, threadId));
    return rows.map(r => ({
      id: r.id,
      threadId: r.threadId,
      messageId: r.messageId,
      decision: r.decision,
      madeBy: r.madeBy,
      madeAt: toISOString(r.madeAt) || new Date().toISOString(),
      status: (r.status as any) || "pending",
      approvals: r.approvals as any,
    }));
  }

  async createThreadDecision(data: InsertThreadDecision): Promise<ThreadDecision> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.threadDecisions).values({
      id,
      threadId: data.threadId,
      messageId: data.messageId,
      decision: data.decision,
      madeBy: data.madeBy,
      madeAt: now,
      status: "pending",
    }).returning();
    return {
      id: row.id,
      threadId: row.threadId,
      messageId: row.messageId,
      decision: row.decision,
      madeBy: row.madeBy,
      madeAt: toISOString(row.madeAt) || now.toISOString(),
      status: (row.status as any) || "pending",
      approvals: row.approvals as any,
    };
  }
}
