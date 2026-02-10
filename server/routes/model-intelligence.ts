import type { Express, Request, Response } from "express";
import {
  seedModelIntelligence,
  getRecommendations,
  getActiveAlerts,
  dismissAlert,
  getAllIntelligenceEntries,
  getIntelligenceForTask,
  getLastRefreshTime,
  getTaskTypes,
  refreshModelIntelligence,
} from "../services/model-intelligence";
import { getUserId } from "../utils/auth";
import { logger } from "../utils/logger";

export function registerModelIntelligenceRoutes(app: Express): void {
  app.get("/api/model-intel/entries", async (_req: Request, res: Response) => {
    try {
      const entries = await getAllIntelligenceEntries();
      res.json({ entries, count: entries.length });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to get entries", { error: error.message });
      res.status(500).json({ error: "Failed to fetch model intelligence entries" });
    }
  });

  app.get("/api/model-intel/recommendations", async (req: Request, res: Response) => {
    try {
      const taskType = req.query.task as string | undefined;
      if (taskType) {
        const enriched = await getIntelligenceForTask(taskType);
        return res.json({ taskType, recommendations: enriched });
      }
      const recs = await getRecommendations();
      res.json({ recommendations: recs });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to get recommendations", { error: error.message });
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.get("/api/model-intel/tasks", async (_req: Request, res: Response) => {
    try {
      const tasks = getTaskTypes();
      res.json({ tasks });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch task types" });
    }
  });

  app.get("/api/model-intel/alerts", async (_req: Request, res: Response) => {
    try {
      const alerts = await getActiveAlerts();
      res.json({ alerts, count: alerts.length });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to get alerts", { error: error.message });
      res.status(500).json({ error: "Failed to fetch model alerts" });
    }
  });

  app.post("/api/model-intel/alerts/:id/dismiss", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      await dismissAlert(req.params.id, String(userId));
      res.json({ success: true });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to dismiss alert", { error: error.message });
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  app.post("/api/model-intel/refresh", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const result = await refreshModelIntelligence();
      res.json({ success: true, ...result, refreshedAt: new Date().toISOString() });
    } catch (error: any) {
      logger.error("[ModelIntel] Refresh failed", { error: error.message });
      res.status(500).json({ error: "Failed to refresh model intelligence" });
    }
  });

  app.get("/api/model-intel/status", async (_req: Request, res: Response) => {
    try {
      const lastRefresh = getLastRefreshTime();
      const entries = await getAllIntelligenceEntries();
      const alerts = await getActiveAlerts();
      const tasks = getTaskTypes();
      res.json({
        lastRefresh: lastRefresh?.toISOString() || null,
        totalEntries: entries.length,
        activeAlerts: alerts.length,
        taskTypes: tasks.length,
        isSeeded: entries.length > 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  seedModelIntelligence().catch(err => {
    logger.warn("[ModelIntel] Initial seed failed (tables may not exist yet)", { error: err.message });
  });
}
