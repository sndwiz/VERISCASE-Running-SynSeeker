import type { Express } from "express";
import { db } from "../db";
import { evidenceViews } from "@shared/models/tables";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

function getUserId(req: any): string | null {
  return (req as any).user?.id || null;
}

const VIEW_TYPES = ["by_actor", "by_role", "by_event", "by_money_flow", "by_absence", "by_conflict"] as const;

const insertViewSchema = z.object({
  matterId: z.string().min(1),
  viewType: z.enum(VIEW_TYPES),
  label: z.string().min(1).max(255),
  description: z.string().default(""),
  entries: z.array(z.object({
    id: z.string(),
    label: z.string(),
    documentIds: z.array(z.string()).default([]),
    notes: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })).default([]),
  metadata: z.record(z.any()).default({}),
  epistemicStatus: z.enum(["descriptive", "interpretive", "contested"]).default("descriptive"),
});

const updateViewSchema = insertViewSchema.partial().omit({ matterId: true, viewType: true });

export function registerEvidenceViewRoutes(app: Express): void {
  app.get("/api/matters/:matterId/evidence-views", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const views = await db.select().from(evidenceViews)
        .where(eq(evidenceViews.matterId, req.params.matterId))
        .orderBy(desc(evidenceViews.createdAt));

      res.json(views);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/matters/:matterId/evidence-views/:viewType", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const views = await db.select().from(evidenceViews)
        .where(and(
          eq(evidenceViews.matterId, req.params.matterId),
          eq(evidenceViews.viewType, req.params.viewType),
        ))
        .orderBy(desc(evidenceViews.createdAt));

      res.json(views);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/matters/:matterId/evidence-views", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = insertViewSchema.safeParse({ ...req.body, matterId: req.params.matterId });
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [view] = await db.insert(evidenceViews).values({
        ...parsed.data,
        createdBy: userId,
      }).returning();

      res.status(201).json(view);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/matters/:matterId/evidence-views/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = updateViewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [updated] = await db.update(evidenceViews)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(evidenceViews.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "View not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/matters/:matterId/evidence-views/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      await db.delete(evidenceViews).where(eq(evidenceViews.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/matters/:matterId/evidence-views-summary", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const views = await db.select().from(evidenceViews)
        .where(eq(evidenceViews.matterId, req.params.matterId));

      const summary: Record<string, { count: number; labels: string[] }> = {};
      for (const vt of VIEW_TYPES) {
        const vtViews = views.filter(v => v.viewType === vt);
        summary[vt] = {
          count: vtViews.length,
          labels: vtViews.map(v => v.label),
        };
      }

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
