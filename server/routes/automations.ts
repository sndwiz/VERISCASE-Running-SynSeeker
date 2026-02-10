import type { Express } from "express";
import { storage } from "../storage";
import { insertAutomationRuleSchema, updateAutomationRuleSchema } from "@shared/schema";
import { z } from "zod";
import { triggerAutomation, getAutomationLog, type AutomationEvent } from "../automation-engine";
import { logger } from "../utils/logger";

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

  app.post("/api/automations/trigger", async (req, res) => {
    try {
      const eventSchema = z.object({
        type: z.string(),
        boardId: z.string(),
        taskId: z.string().optional(),
        previousValue: z.any().optional(),
        newValue: z.any().optional(),
        field: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      });

      const event = eventSchema.parse(req.body) as AutomationEvent;
      const results = await triggerAutomation(event);
      res.json({ results, triggered: results.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error("[Automation] Trigger error:", { error: String(error) });
      res.status(500).json({ error: "Failed to trigger automation" });
    }
  });

  app.get("/api/automations/log", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const log = getAutomationLog(limit);
      res.json(log);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation log" });
    }
  });
}
