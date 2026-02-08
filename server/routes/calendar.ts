import type { Express } from "express";
import { storage } from "../storage";
import { insertCalendarEventSchema, updateCalendarEventSchema } from "@shared/schema";
import { z } from "zod";
import { fullCalendarSync } from "../services/calendar-sync";
import { getUserId } from "../utils/auth";

export function registerCalendarRoutes(app: Express): void {
  app.get("/api/calendar-events", async (req, res) => {
    try {
      const { matterId } = req.query;
      const events = await storage.getCalendarEvents(matterId as string | undefined);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar-events/:id", async (req, res) => {
    try {
      if (req.params.id === "sync") return;
      const event = await storage.getCalendarEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar event" });
    }
  });

  app.post("/api/calendar-events/sync", async (req, res) => {
    try {
      const userId = getUserId(req) || "system";
      const result = await fullCalendarSync(userId);
      res.json({
        message: "Calendar sync complete",
        ...result,
      });
    } catch (error: any) {
      console.error("[calendar-sync] Error:", error);
      res.status(500).json({ error: error.message || "Sync failed" });
    }
  });

  app.post("/api/calendar-events", async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const body = {
        ...req.body,
        createdBy: req.body.createdBy || (dbUser ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email : "Unknown User"),
      };
      const data = insertCalendarEventSchema.parse(body);
      const event = await storage.createCalendarEvent(data);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  app.patch("/api/calendar-events/:id", async (req, res) => {
    try {
      const data = updateCalendarEventSchema.parse(req.body);
      const event = await storage.updateCalendarEvent(req.params.id, data);
      if (!event) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  app.delete("/api/calendar-events/:id", async (req, res) => {
    try {
      const event = await storage.getCalendarEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      if ((event as any).autoSynced) {
        return res.status(403).json({ error: "Auto-synced events cannot be deleted manually. Modify the source entity instead." });
      }
      await storage.deleteCalendarEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });
}
