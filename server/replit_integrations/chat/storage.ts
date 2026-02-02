import { randomUUID } from "crypto";

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

class MemoryChatStorage implements IChatStorage {
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  private conversationIdCounter = 1;
  private messageIdCounter = 1;

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getConversationsByMatter(matterId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.matterId === matterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createConversation(
    title: string, 
    model: string = "claude-sonnet-4-5",
    matterId?: string,
    systemPrompt?: string
  ): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const conversation: Conversation = {
      id,
      title,
      model,
      matterId,
      systemPrompt,
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(
    id: number,
    updates: Partial<Pick<Conversation, 'title' | 'matterId' | 'systemPrompt'>>
  ): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated = { ...conversation, ...updates };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    this.conversations.delete(id);
    // Delete associated messages
    const messageIds = Array.from(this.messages.keys());
    for (const msgId of messageIds) {
      const msg = this.messages.get(msgId);
      if (msg && msg.conversationId === id) {
        this.messages.delete(msgId);
      }
    }
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      id,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }
}

export const chatStorage: IChatStorage = new MemoryChatStorage();
