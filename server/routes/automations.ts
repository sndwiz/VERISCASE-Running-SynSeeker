import type { Express } from "express";
import { storage } from "../storage";
import { insertAutomationRuleSchema, updateAutomationRuleSchema } from "@shared/schema";
import { z } from "zod";

export function registerAutomationRoutes(app: Express): void {
  app.get("/api/boards/:boardId/automations", async (req, res) => {
    try {
      const rules = await storage.getAutomationRules(req.params.boardId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation rules" });
    }
  });

  app.get("/api/automations/:id", async (req, res) => {
    try {
      const rule = await storage.getAutomationRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation rule" });
    }
  });

  app.post("/api/boards/:boardId/automations", async (req, res) => {
    try {
      const data = insertAutomationRuleSchema.parse({
        ...req.body,
        boardId: req.params.boardId,
      });
      const rule = await storage.createAutomationRule(data);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create automation rule" });
    }
  });

  app.patch("/api/automations/:id", async (req, res) => {
    try {
      const data = updateAutomationRuleSchema.parse(req.body);
      const rule = await storage.updateAutomationRule(req.params.id, data);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update automation rule" });
    }
  });

  app.delete("/api/automations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAutomationRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete automation rule" });
    }
  });
}
