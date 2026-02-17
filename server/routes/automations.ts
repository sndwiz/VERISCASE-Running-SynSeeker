import type { Express } from "express";
import { storage } from "../storage";
import { insertAutomationRuleSchema, updateAutomationRuleSchema, type AutomationRule } from "@shared/schema";
import { z } from "zod";
import { triggerAutomation, getAutomationLog, automationEngine, type AutomationEvent } from "../automation-engine";
import { logger } from "../utils/logger";
import { db } from "../db";
import { automationRuns } from "@shared/models/tables";
import { eq, desc, and, sql } from "drizzle-orm";

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
      const data = updateAutomationRuleSchema.parse(req.body) as Partial<AutomationRule>;
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

  app.get("/api/boards/:boardId/automation-runs", async (req, res) => {
    try {
      const { boardId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const ruleId = req.query.ruleId as string | undefined;

      let conditions = [eq(automationRuns.boardId, boardId)];
      if (ruleId) {
        conditions.push(eq(automationRuns.ruleId, ruleId));
      }

      const runs = await db
        .select()
        .from(automationRuns)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(automationRuns.executedAt))
        .limit(limit);

      res.json(runs);
    } catch (error) {
      logger.error("[Automation] Failed to fetch board runs:", { error: String(error) });
      res.status(500).json({ error: "Failed to fetch automation runs" });
    }
  });

  app.get("/api/tasks/:taskId/automation-runs", async (req, res) => {
    try {
      const { taskId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const runs = await db
        .select()
        .from(automationRuns)
        .where(eq(automationRuns.taskId, taskId))
        .orderBy(desc(automationRuns.executedAt))
        .limit(limit);

      res.json(runs);
    } catch (error) {
      logger.error("[Automation] Failed to fetch task runs:", { error: String(error) });
      res.status(500).json({ error: "Failed to fetch task automation runs" });
    }
  });

  app.post("/api/boards/:boardId/automations/dry-run", async (req, res) => {
    try {
      const { boardId } = req.params;
      const ruleData = req.body;

      const rule: AutomationRule = {
        id: ruleData.id || "dry-run-temp",
        boardId,
        name: ruleData.name || "Dry Run Test",
        description: ruleData.description || "",
        isActive: true,
        triggerType: ruleData.triggerType,
        triggerField: ruleData.triggerField || null,
        triggerValue: ruleData.triggerValue || null,
        conditions: ruleData.conditions || [],
        actionType: ruleData.actionType,
        actionConfig: ruleData.actionConfig || {},
        runCount: 0,
        lastRun: null as any,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };

      const result = await automationEngine.dryRunRule(rule, boardId);
      res.json(result);
    } catch (error) {
      logger.error("[Automation] Dry run failed:", { error: String(error) });
      res.status(500).json({ error: "Dry run simulation failed" });
    }
  });

  app.get("/api/boards/:boardId/hygiene", async (req, res) => {
    try {
      const { boardId } = req.params;
      const tasks = await storage.getTasks(boardId);
      const board = await storage.getBoard(boardId);
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const isComplete = (s: string) => s === "done" || (s as string) === "completed";

      const unassignedWithDeadline = tasks.filter(t => {
        const noOwner = !t.assignees || (t.assignees as any[]).length === 0;
        const hasDueDate = t.dueDate && new Date(t.dueDate) <= threeDaysFromNow && new Date(t.dueDate) >= now;
        return noOwner && hasDueDate && !isComplete(t.status);
      }).map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, severity: "high" as const }));

      const overdueTasks = tasks.filter(t => {
        const overdue = t.dueDate && new Date(t.dueDate) < now;
        return overdue && !isComplete(t.status);
      }).map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, severity: "critical" as const }));

      const stuckItems = tasks.filter(t => {
        const inProgress = !isComplete(t.status) && t.status !== "not-started";
        const updatedLongAgo = t.updatedAt && new Date(t.updatedAt as any) < tenDaysAgo;
        return inProgress && updatedLongAgo;
      }).map(t => ({ id: t.id, title: t.title, status: t.status, lastUpdated: t.updatedAt, severity: "medium" as const }));

      const noDescription = tasks.filter(t => {
        return !isComplete(t.status) && (!t.description || t.description.trim() === "");
      }).length;

      const totalIssues = unassignedWithDeadline.length + overdueTasks.length + stuckItems.length;
      const healthScore = tasks.length > 0
        ? Math.max(0, Math.round(100 - (totalIssues / tasks.length) * 100))
        : 100;

      res.json({
        healthScore,
        totalTasks: tasks.length,
        totalIssues,
        checks: {
          unassignedWithDeadline,
          overdueTasks,
          stuckItems,
          noDescriptionCount: noDescription,
        },
      });
    } catch (error) {
      logger.error("[Hygiene] Failed to compute board hygiene:", { error: String(error) });
      res.status(500).json({ error: "Failed to compute board hygiene" });
    }
  });
}
