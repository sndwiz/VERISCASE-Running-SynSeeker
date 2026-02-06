import { Router, Request, Response } from "express";
import { db } from "../db";
import { washJobs, washEntities } from "@shared/models/tables";
import { insertWashJobSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { runDocumentWash } from "../services/document-wash";
import { getUserId } from "../utils/auth";

const router = Router();

router.post("/api/wash/jobs", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = insertWashJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }

    const { title, originalText, matterId, policy, reversible } = parsed.data;

    const [job] = await db
      .insert(washJobs)
      .values({
        userId,
        title,
        originalText,
        matterId: matterId || null,
        policy,
        reversible,
        status: "pending",
      })
      .returning();

    runDocumentWash(job.id).catch((err) => {
      console.error("Background wash failed:", err);
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("Create wash job error:", error);
    res.status(500).json({ error: "Failed to create wash job" });
  }
});

router.get("/api/wash/jobs", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const jobs = await db
      .select({
        id: washJobs.id,
        matterId: washJobs.matterId,
        userId: washJobs.userId,
        title: washJobs.title,
        policy: washJobs.policy,
        reversible: washJobs.reversible,
        status: washJobs.status,
        entityCount: washJobs.entityCount,
        createdAt: washJobs.createdAt,
        updatedAt: washJobs.updatedAt,
      })
      .from(washJobs)
      .where(eq(washJobs.userId, userId))
      .orderBy(desc(washJobs.createdAt))
      .limit(50);

    res.json(jobs);
  } catch (error) {
    console.error("List wash jobs error:", error);
    res.status(500).json({ error: "Failed to list wash jobs" });
  }
});

async function findJobById(jobId: string) {
  const [job] = await db.select().from(washJobs).where(eq(washJobs.id, jobId)).limit(1);
  return job || null;
}

router.get("/api/wash/jobs/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const job = await findJobById(req.params.id as string);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    res.json(job);
  } catch (error) {
    console.error("Get wash job error:", error);
    res.status(500).json({ error: "Failed to get wash job" });
  }
});

router.get("/api/wash/jobs/:id/entities", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const job = await findJobById(req.params.id as string);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    const entities = await db
      .select()
      .from(washEntities)
      .where(eq(washEntities.jobId, job.id));

    res.json(entities);
  } catch (error) {
    console.error("Get wash entities error:", error);
    res.status(500).json({ error: "Failed to get entities" });
  }
});

router.delete("/api/wash/jobs/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const job = await findJobById(req.params.id as string);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(washJobs).where(eq(washJobs.id, job.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete wash job error:", error);
    res.status(500).json({ error: "Failed to delete wash job" });
  }
});

export default router;
