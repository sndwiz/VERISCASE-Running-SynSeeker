import type { Express } from "express";
import { storage } from "../storage";
import { insertTextSnippetSchema } from "@shared/schema";
import { z } from "zod";

export function registerTextSnippetRoutes(app: Express): void {
  app.get("/api/text-snippets", async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const snippets = await storage.getTextSnippets(userId);
      res.json(snippets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch text snippets" });
    }
  });

  app.get("/api/text-snippets/:id", async (req, res) => {
    try {
      const snippet = await storage.getTextSnippet(req.params.id);
      if (!snippet) return res.status(404).json({ error: "Text snippet not found" });
      res.json(snippet);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch text snippet" });
    }
  });

  app.post("/api/text-snippets", async (req, res) => {
    try {
      if (!(req as any).user?.claims?.sub) return res.status(401).json({ error: "Not authenticated" });
      const data = insertTextSnippetSchema.parse(req.body);
      const snippet = await storage.createTextSnippet(data);
      res.status(201).json(snippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create text snippet" });
    }
  });

  app.patch("/api/text-snippets/:id", async (req, res) => {
    try {
      if (!(req as any).user?.claims?.sub) return res.status(401).json({ error: "Not authenticated" });
      const data = insertTextSnippetSchema.partial().parse(req.body);
      const snippet = await storage.updateTextSnippet(req.params.id, data);
      if (!snippet) return res.status(404).json({ error: "Text snippet not found" });
      res.json(snippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update text snippet" });
    }
  });

  app.delete("/api/text-snippets/:id", async (req, res) => {
    try {
      if (!(req as any).user?.claims?.sub) return res.status(401).json({ error: "Not authenticated" });
      await storage.deleteTextSnippet(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete text snippet" });
    }
  });
}
