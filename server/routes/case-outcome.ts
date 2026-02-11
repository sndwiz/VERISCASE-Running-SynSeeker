import type { Express } from "express";
import { db } from "../db";
import { caseOutcomes, knowledgeBaseEntries } from "@shared/models/tables";
import { eq } from "drizzle-orm";
import { z } from "zod";

function getUserId(req: any): string | null {
  return (req as any).user?.id || null;
}

const insertOutcomeSchema = z.object({
  matterId: z.string().min(1),
  resolution: z.enum(["won", "lost", "settled", "dismissed", "withdrawn", "ongoing"]),
  resolutionDate: z.string().optional(),
  summary: z.string().min(1),
  winningArguments: z.array(z.object({
    argument: z.string(),
    effectiveness: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
  })).default([]),
  losingArguments: z.array(z.object({
    argument: z.string(),
    reason: z.string().optional(),
    notes: z.string().optional(),
  })).default([]),
  oppositionTactics: z.array(z.object({
    tactic: z.string(),
    counter: z.string().optional(),
    effective: z.boolean().optional(),
  })).default([]),
  judgeNotes: z.string().default(""),
  judgeTendencies: z.array(z.object({
    tendency: z.string(),
    impact: z.string().optional(),
  })).default([]),
  lessonsLearned: z.array(z.object({
    lesson: z.string(),
    category: z.string().optional(),
  })).default([]),
  keyDocuments: z.array(z.string()).default([]),
  settlementAmount: z.number().optional(),
  awardedAmount: z.number().optional(),
});

const updateOutcomeSchema = insertOutcomeSchema.partial().omit({ matterId: true });

export function registerCaseOutcomeRoutes(app: Express): void {
  app.get("/api/matters/:matterId/outcome", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const outcomes = await db.select().from(caseOutcomes)
        .where(eq(caseOutcomes.matterId, req.params.matterId));

      res.json(outcomes[0] || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/matters/:matterId/outcome", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await db.select().from(caseOutcomes)
        .where(eq(caseOutcomes.matterId, req.params.matterId));
      if (existing.length > 0) {
        return res.status(409).json({ error: "Outcome already exists for this matter. Use PATCH to update." });
      }

      const parsed = insertOutcomeSchema.safeParse({ ...req.body, matterId: req.params.matterId });
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [outcome] = await db.insert(caseOutcomes).values({
        ...parsed.data,
        createdBy: userId,
      }).returning();

      res.status(201).json(outcome);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/matters/:matterId/outcome/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = updateOutcomeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });

      const [updated] = await db.update(caseOutcomes)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(caseOutcomes.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Outcome not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/matters/:matterId/outcome/:id/submit-to-kb", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [outcome] = await db.select().from(caseOutcomes)
        .where(eq(caseOutcomes.id, req.params.id));
      if (!outcome) return res.status(404).json({ error: "Outcome not found" });

      const entriesToCreate: any[] = [];

      const winArgs = (outcome.winningArguments as any[]) || [];
      for (const arg of winArgs) {
        entriesToCreate.push({
          category: "winning_arguments",
          title: arg.argument,
          content: arg.notes || arg.argument,
          practiceArea: null,
          sourceMatterId: outcome.matterId,
          sourceCaseOutcomeId: outcome.id,
          successRate: arg.effectiveness || null,
          status: "pending_review",
          createdBy: userId,
        });
      }

      const loseArgs = (outcome.losingArguments as any[]) || [];
      for (const arg of loseArgs) {
        entriesToCreate.push({
          category: "losing_arguments",
          title: arg.argument,
          content: arg.reason || arg.argument,
          sourceMatterId: outcome.matterId,
          sourceCaseOutcomeId: outcome.id,
          status: "pending_review",
          createdBy: userId,
        });
      }

      const tactics = (outcome.oppositionTactics as any[]) || [];
      for (const t of tactics) {
        entriesToCreate.push({
          category: "opposition_tactics",
          title: t.tactic,
          content: t.counter || t.tactic,
          sourceMatterId: outcome.matterId,
          sourceCaseOutcomeId: outcome.id,
          status: "pending_review",
          createdBy: userId,
        });
      }

      const lessons = (outcome.lessonsLearned as any[]) || [];
      for (const l of lessons) {
        entriesToCreate.push({
          category: "lessons_learned",
          title: l.lesson,
          content: l.lesson,
          tags: l.category ? [l.category] : [],
          sourceMatterId: outcome.matterId,
          sourceCaseOutcomeId: outcome.id,
          status: "pending_review",
          createdBy: userId,
        });
      }

      if (outcome.judgeNotes || ((outcome.judgeTendencies as any[]) || []).length > 0) {
        const tendencies = (outcome.judgeTendencies as any[]) || [];
        entriesToCreate.push({
          category: "judge_profiles",
          title: `Judge Notes - Matter ${outcome.matterId}`,
          content: [
            outcome.judgeNotes,
            ...tendencies.map((t: any) => `Tendency: ${t.tendency}${t.impact ? ` (Impact: ${t.impact})` : ""}`),
          ].filter(Boolean).join("\n\n"),
          sourceMatterId: outcome.matterId,
          sourceCaseOutcomeId: outcome.id,
          status: "pending_review",
          createdBy: userId,
        });
      }

      if (entriesToCreate.length > 0) {
        await db.insert(knowledgeBaseEntries).values(entriesToCreate);
      }

      await db.update(caseOutcomes)
        .set({ submittedToKb: true, updatedAt: new Date() })
        .where(eq(caseOutcomes.id, req.params.id));

      res.json({ success: true, entriesCreated: entriesToCreate.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
