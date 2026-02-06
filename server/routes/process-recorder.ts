import type { Express } from "express";
import { db } from "../db";
import { processRecordings, processEvents, processConversions } from "@shared/models/tables";
import { insertProcessRecordingSchema, insertProcessEventSchema, insertProcessConversionSchema } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getUserId } from "../utils/auth";

async function verifyOwnership(recordingId: string, userId: string) {
  const [recording] = await db.select().from(processRecordings)
    .where(and(eq(processRecordings.id, recordingId), eq(processRecordings.createdByUserId, userId)));
  return recording || null;
}

export function registerProcessRecorderRoutes(app: Express): void {
  app.get("/api/recordings", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recordings = await db.select().from(processRecordings)
        .where(eq(processRecordings.createdByUserId, userId))
        .orderBy(desc(processRecordings.createdAt));

      res.json(recordings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  app.get("/api/recordings/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recording = await verifyOwnership(req.params.id, userId);
      if (!recording) return res.status(404).json({ error: "Recording not found" });

      const events = await db.select().from(processEvents)
        .where(eq(processEvents.recordingId, req.params.id))
        .orderBy(processEvents.ts);

      const conversions = await db.select().from(processConversions)
        .where(eq(processConversions.recordingId, req.params.id))
        .orderBy(desc(processConversions.createdAt));

      res.json({ ...recording, events, conversions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recording" });
    }
  });

  app.post("/api/recordings", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertProcessRecordingSchema.parse(req.body);

      const [recording] = await db.insert(processRecordings).values({
        ...parsed,
        createdByUserId: userId,
        status: "recording",
      }).returning();

      res.status(201).json(recording);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: "Invalid data", details: error.errors });
      res.status(500).json({ error: "Failed to create recording" });
    }
  });

  app.patch("/api/recordings/:id/stop", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recording = await verifyOwnership(req.params.id, userId);
      if (!recording) return res.status(404).json({ error: "Recording not found" });
      if (recording.status !== "recording") return res.status(400).json({ error: "Recording is not active" });

      const eventCount = await db.select({ count: sql<number>`count(*)` })
        .from(processEvents)
        .where(eq(processEvents.recordingId, req.params.id));

      const [updated] = await db.update(processRecordings).set({
        status: "draft",
        endedAt: new Date(),
        eventCount: Number(eventCount[0]?.count || 0),
      }).where(eq(processRecordings.id, req.params.id)).returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to stop recording" });
    }
  });

  app.patch("/api/recordings/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recording = await verifyOwnership(req.params.id, userId);
      if (!recording) return res.status(404).json({ error: "Recording not found" });

      const updates: any = {};
      if (req.body.title) updates.title = req.body.title;

      const [updated] = await db.update(processRecordings).set(updates)
        .where(eq(processRecordings.id, req.params.id)).returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update recording" });
    }
  });

  app.post("/api/recordings/:id/events", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recording = await verifyOwnership(req.params.id, userId);
      if (!recording) return res.status(404).json({ error: "Recording not found" });

      const events = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];

      for (const evt of events) {
        const parsed = insertProcessEventSchema.parse({ ...evt, recordingId: req.params.id });
        const [event] = await db.insert(processEvents).values(parsed).returning();
        results.push(event);
      }

      res.status(201).json(results);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: "Invalid event data", details: error.errors });
      res.status(500).json({ error: "Failed to add events" });
    }
  });

  app.post("/api/recordings/:id/convert", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recording = await verifyOwnership(req.params.id, userId);
      if (!recording) return res.status(404).json({ error: "Recording not found" });
      if (recording.status !== "draft") return res.status(400).json({ error: "Recording must be in draft status to convert" });

      const parsed = insertProcessConversionSchema.parse({ ...req.body, recordingId: req.params.id });

      const events = await db.select().from(processEvents)
        .where(eq(processEvents.recordingId, req.params.id))
        .orderBy(processEvents.ts);

      const generatedJson = generateConversion(parsed.outputType, events);

      const [conversion] = await db.insert(processConversions).values({
        ...parsed,
        generatedJson,
      }).returning();

      await db.update(processRecordings).set({ status: "converted" })
        .where(eq(processRecordings.id, req.params.id));

      res.status(201).json(conversion);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: "Invalid conversion data", details: error.errors });
      res.status(500).json({ error: "Failed to convert recording" });
    }
  });

  app.delete("/api/recordings/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const recording = await verifyOwnership(req.params.id, userId);
      if (!recording) return res.status(404).json({ error: "Recording not found" });

      await db.delete(processConversions).where(eq(processConversions.recordingId, req.params.id));
      await db.delete(processEvents).where(eq(processEvents.recordingId, req.params.id));
      await db.delete(processRecordings).where(eq(processRecordings.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });
}

function generateConversion(outputType: string, events: any[]) {
  const steps = events.map((e, i) => ({
    step: i + 1,
    action: e.eventType,
    details: e.payloadJson,
    timestamp: e.ts,
  }));

  switch (outputType) {
    case "automation_rule":
      return {
        type: "automation_rule",
        trigger: events.length > 0 ? { event: events[0].eventType, scope: events[0].payloadJson } : { event: "manual.run" },
        conditions: [],
        actions: steps.slice(1).map(s => ({ action: s.action, params: s.details })),
      };
    case "macro":
      return {
        type: "macro",
        steps: steps.map(s => ({ action: s.action, params: s.details })),
        runMode: "sequential",
      };
    case "sop":
      return {
        type: "sop",
        title: "Standard Operating Procedure",
        steps: steps.map(s => ({
          instruction: describeEvent(s.action, s.details),
          action: s.action,
        })),
      };
    default:
      return { steps };
  }
}

function describeEvent(eventType: string, payload: any): string {
  const descriptions: Record<string, string> = {
    "navigation.open": `Navigate to ${payload?.target || "page"}`,
    "item.create": `Create new ${payload?.itemType || "item"}: ${payload?.title || ""}`,
    "item.update": `Update ${payload?.field || "field"} to "${payload?.newValue || ""}"`,
    "item.move": `Move item to ${payload?.destination || "new location"}`,
    "file.upload": `Upload file: ${payload?.fileName || ""}`,
    "comment.post": `Post comment`,
    "status.change": `Change status to "${payload?.newValue || ""}"`,
    "column.create": `Add column: ${payload?.columnName || ""}`,
    "group.create": `Create group: ${payload?.groupName || ""}`,
    "task.create": `Create task: ${payload?.title || ""}`,
    "calendar.create": `Create calendar event`,
    "email.link": `Link email to matter`,
  };
  return descriptions[eventType] || `Perform: ${eventType}`;
}
