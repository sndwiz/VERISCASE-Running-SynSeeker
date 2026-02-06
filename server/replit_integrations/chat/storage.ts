import { db } from "../../db";
import { conversations, messages } from "@shared/models/chat";
import { eq, desc, asc } from "drizzle-orm";

export interface Conversation {
  id: number;
  title: string;
  model: string;
  matterId?: string;
  systemPrompt?: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  getConversationsByMatter(matterId: string): Promise<Conversation[]>;
  createConversation(title: string, model?: string, matterId?: string, systemPrompt?: string): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Pick<Conversation, 'title' | 'matterId' | 'systemPrompt'>>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

function toConversation(row: typeof conversations.$inferSelect): Conversation {
  return {
    id: row.id,
    title: row.title,
    model: row.model || "claude-sonnet-4-5",
    matterId: row.matterId ?? undefined,
    systemPrompt: row.systemPrompt ?? undefined,
    createdAt: row.createdAt,
  };
}

function toMessage(row: typeof messages.$inferSelect): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
  };
}

class DbChatStorage implements IChatStorage {
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!row) return undefined;
    return toConversation(row);
  }

  async getAllConversations(): Promise<Conversation[]> {
    const rows = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
    return rows.map(toConversation);
  }

  async getConversationsByMatter(matterId: string): Promise<Conversation[]> {
    const rows = await db.select().from(conversations)
      .where(eq(conversations.matterId, matterId))
      .orderBy(desc(conversations.createdAt));
    return rows.map(toConversation);
  }

  async createConversation(
    title: string,
    model: string = "claude-sonnet-4-5",
    matterId?: string,
    systemPrompt?: string
  ): Promise<Conversation> {
    const [row] = await db.insert(conversations).values({
      title,
      model,
      matterId: matterId ?? null,
      systemPrompt: systemPrompt ?? null,
    }).returning();
    return toConversation(row);
  }

  async updateConversation(
    id: number,
    updates: Partial<Pick<Conversation, 'title' | 'matterId' | 'systemPrompt'>>
  ): Promise<Conversation | undefined> {
    const setData: Record<string, any> = {};
    if (updates.title !== undefined) setData.title = updates.title;
    if (updates.matterId !== undefined) setData.matterId = updates.matterId;
    if (updates.systemPrompt !== undefined) setData.systemPrompt = updates.systemPrompt;

    const [row] = await db.update(conversations).set(setData).where(eq(conversations.id, id)).returning();
    if (!row) return undefined;
    return toConversation(row);
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const rows = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
    return rows.map(toMessage);
  }

  async createMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const [row] = await db.insert(messages).values({
      conversationId,
      role,
      content,
    }).returning();
    return toMessage(row);
  }
}

export const chatStorage: IChatStorage = new DbChatStorage();
