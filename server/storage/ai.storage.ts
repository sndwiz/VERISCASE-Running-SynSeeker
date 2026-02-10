import { eq, desc, asc } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  AIConversation,
  AIMessage,
  InsertAIConversation,
  InsertAIMessage,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class AIStorage {

  async getAIConversations(): Promise<AIConversation[]> {
    const rows = await db.select().from(tables.aiConversations).orderBy(desc(tables.aiConversations.updatedAt));
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      provider: (r.provider as any) || "anthropic",
      model: r.model || "claude-sonnet-4-5",
      matterId: r.matterId || undefined,
      boardId: r.boardId || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getAIConversation(id: string): Promise<AIConversation | undefined> {
    const [row] = await db.select().from(tables.aiConversations).where(eq(tables.aiConversations.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      provider: (row.provider as any) || "anthropic",
      model: row.model || "claude-sonnet-4-5",
      matterId: row.matterId || undefined,
      boardId: row.boardId || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createAIConversation(data: InsertAIConversation): Promise<AIConversation> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.aiConversations).values({
      id,
      title: data.title,
      provider: data.provider || "anthropic",
      model: data.model || "claude-sonnet-4-5",
      matterId: data.matterId,
      boardId: data.boardId,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      title: row.title,
      provider: (row.provider as any) || "anthropic",
      model: row.model || "claude-sonnet-4-5",
      matterId: row.matterId || undefined,
      boardId: row.boardId || undefined,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async deleteAIConversation(id: string): Promise<boolean> {
    await db.delete(tables.aiConversations).where(eq(tables.aiConversations.id, id));
    return true;
  }

  async getAIMessages(conversationId: string): Promise<AIMessage[]> {
    const rows = await db.select().from(tables.aiMessages).where(eq(tables.aiMessages.conversationId, conversationId)).orderBy(asc(tables.aiMessages.createdAt));
    return rows.map(r => ({
      id: r.id,
      conversationId: r.conversationId,
      role: r.role as any,
      content: r.content,
      attachments: r.attachments as any,
      metadata: r.metadata as any,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createAIMessage(data: InsertAIMessage): Promise<AIMessage> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.aiMessages).values({
      id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      attachments: data.attachments as any,
      metadata: data.metadata as any,
      createdAt: now,
    }).returning();
    // Update conversation updatedAt
    await db.update(tables.aiConversations).set({ updatedAt: now }).where(eq(tables.aiConversations.id, data.conversationId));
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as any,
      content: row.content,
      attachments: row.attachments as any,
      metadata: row.metadata as any,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }
}
