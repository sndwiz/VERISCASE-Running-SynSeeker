import type { Express } from "express";
import { storage } from "../storage";
import { insertAIConversationSchema, insertAIMessageSchema } from "@shared/schema";
import { z } from "zod";
import { registerChatRoutes } from "../replit_integrations/chat/routes";

export function registerAIRoutes(app: Express): void {
  app.get("/api/ai/conversations", async (_req, res) => {
    try {
      const conversations = await storage.getAIConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI conversations" });
    }
  });

  app.get("/api/ai/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getAIConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getAIMessages(req.params.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/ai/conversations", async (req, res) => {
    try {
      const data = insertAIConversationSchema.parse(req.body);
      const conversation = await storage.createAIConversation(data);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/ai/conversations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAIConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/ai/conversations/:id/messages", async (req, res) => {
    try {
      const data = insertAIMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
      });
      const message = await storage.createAIMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  registerChatRoutes(app);
}
