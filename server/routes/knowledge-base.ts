import type { Express } from "express";
import { db } from "../db";
import { knowledgeBaseEntries } from "@shared/models/tables";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

function getUserId(req: any): string | null {
  return (req as any).user?.id || null;
}

const insertKBSchema = z.object({
  category: z.enum(["winning_arguments", "losing_arguments", "judge_profiles", "opposition_tactics", "lessons_learned"]),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  practiceArea: z.string().optional(),
  sourceMatterId: z.string().optional(),
  successRate: z.number().min(0).max(1).optional(),
});

const updateKBSchema = insertKBSchema.partial();

export function registerKnowledgeBaseRoutes(app: Express): void {
  app.get("/api/knowledge-base", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { category, status, search } = req.query;

      let entries = await db.select().from(knowledgeBaseEntries)
        .orderBy(desc(knowledgeBaseEntries.createdAt));

      if (category && typeof category === "string") {
        entries = entries.filter(e => e.category === category);
      }
      if (status && typeof status === "string") {
        entries = entries.filter(e => e.status === status);
      }
      if (search && typeof search === "string") {
        const s = search.toLowerCase();
        entries = entries.filter(e =>
          e.title.toLowerCase().includes(s) ||
          e.content.toLowerCase().includes(s)
        );
      }

      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/knowledge-base/stats", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const entries = await db.select().from(knowledgeBaseEntries);

      const stats = {
        total: entries.length,
        byCategory: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        pendingReview: 0,
      };

      for (const e of entries) {
        stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
        stats.byStatus[e.status] = (stats.byStatus[e.status] || 0) + 1;
        if (e.status === "pending_review") stats.pendingReview++;
      }

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/knowledge-base", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = insertKBSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [entry] = await db.insert(knowledgeBaseEntries).values({
        ...parsed.data,
        status: "pending_review",
        createdBy: userId,
      }).returning();

      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/knowledge-base/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = updateKBSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [updated] = await db.update(knowledgeBaseEntries)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(knowledgeBaseEntries.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Entry not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/knowledge-base/:id/approve", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [updated] = await db.update(knowledgeBaseEntries)
        .set({
          status: "approved",
          curatedBy: userId,
          curatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(knowledgeBaseEntries.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Entry not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/knowledge-base/:id/reject", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [updated] = await db.update(knowledgeBaseEntries)
        .set({
          status: "rejected",
          curatedBy: userId,
          curatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(knowledgeBaseEntries.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Entry not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/knowledge-base/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      await db.delete(knowledgeBaseEntries).where(eq(knowledgeBaseEntries.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
