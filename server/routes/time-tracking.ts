import type { Express } from "express";
import { storage } from "../storage";
import { insertTimeEntrySchema, updateTimeEntrySchema } from "@shared/schema";
import { z } from "zod";

export function registerTimeTrackingRoutes(app: Express): void {
  app.get("/api/time-entries", async (req, res) => {
    try {
      const { matterId } = req.query;
      const entries = await storage.getTimeEntries(matterId as string | undefined);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  app.get("/api/time-entries/:id", async (req, res) => {
    try {
      const entry = await storage.getTimeEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time entry" });
    }
  });

  app.post("/api/time-entries", async (req, res) => {
    try {
      const data = insertTimeEntrySchema.parse(req.body);
      const entry = await storage.createTimeEntry(data);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  app.patch("/api/time-entries/:id", async (req, res) => {
    try {
      const data = updateTimeEntrySchema.parse(req.body);
      const entry = await storage.updateTimeEntry(req.params.id, data);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      await storage.deleteTimeEntry(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });
}
