import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../security/rbac";

export function registerAIEventLogRoutes(app: Express): void {
  app.get("/api/ai-events", requireAdmin(), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const filters = {
        userId: req.query.userId as string | undefined,
        matterId: req.query.matterId as string | undefined,
        action: req.query.action as string | undefined,
        modelProvider: req.query.modelProvider as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        limit,
        offset,
      };
      const events = await storage.getAIEventLogs(filters);
      res.json({ events, total: events.length, limit, offset });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI event logs" });
    }
  });

  app.get("/api/ai-events/stats", requireAdmin(), async (_req, res) => {
    try {
      const stats = await storage.getAIEventLogStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI event log stats" });
    }
  });
}
