import type { Express } from "express";
import { db } from "../db";
import { caseJournals } from "@shared/models/tables";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

function getUserId(req: any): string | null {
  return (req as any).user?.id || null;
}

function getUserName(req: any): string {
  return (req as any).user?.username || (req as any).user?.firstName || "Unknown";
}

const insertJournalSchema = z.object({
  matterId: z.string().min(1),
  entryType: z.enum(["observation", "strategy", "client_communication", "annotation", "flag", "research"]),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  privacyLevel: z.enum(["case_team", "attorney_only", "exportable"]).default("case_team"),
  tags: z.array(z.string()).default([]),
  linkedDocIds: z.array(z.string()).default([]),
  linkedEntityIds: z.array(z.string()).default([]),
  epistemicStatus: z.enum(["provisional", "verified", "contested"]).default("provisional"),
  confidenceScore: z.number().min(0).max(1).default(0.5),
  flagged: z.boolean().default(false),
});

const updateJournalSchema = insertJournalSchema.partial().omit({ matterId: true });

export function registerCaseJournalRoutes(app: Express): void {
  app.get("/api/matters/:matterId/journal", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const entries = await db.select().from(caseJournals)
        .where(eq(caseJournals.matterId, req.params.matterId))
        .orderBy(desc(caseJournals.createdAt));

      const filtered = entries.filter(e => {
        if (e.privacyLevel === "attorney_only" && e.authorId !== userId) return false;
        return true;
      });

      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/matters/:matterId/journal", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = insertJournalSchema.safeParse({ ...req.body, matterId: req.params.matterId });
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [entry] = await db.insert(caseJournals).values({
        ...parsed.data,
        authorId: userId,
        authorName: getUserName(req),
      }).returning();

      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/matters/:matterId/journal/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [existing] = await db.select().from(caseJournals)
        .where(and(eq(caseJournals.id, req.params.id), eq(caseJournals.matterId, req.params.matterId)));
      if (!existing) return res.status(404).json({ error: "Entry not found" });
      if (existing.authorId !== userId) return res.status(403).json({ error: "Can only edit your own entries" });

      const parsed = updateJournalSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [updated] = await db.update(caseJournals)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(caseJournals.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/matters/:matterId/journal/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [existing] = await db.select().from(caseJournals)
        .where(and(eq(caseJournals.id, req.params.id), eq(caseJournals.matterId, req.params.matterId)));
      if (!existing) return res.status(404).json({ error: "Entry not found" });
      if (existing.authorId !== userId) return res.status(403).json({ error: "Can only delete your own entries" });

      await db.delete(caseJournals).where(eq(caseJournals.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
