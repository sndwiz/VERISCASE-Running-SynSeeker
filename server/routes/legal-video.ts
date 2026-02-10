import { Router } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { z } from "zod";
import { db } from "../db";
import { videoPipelineJobs, boards, groups, tasks } from "../../shared/models/tables";
import { eq, desc, and } from "drizzle-orm";
import { runPipeline, type PipelineStage } from "../services/legal-video-pipeline";
import { logger } from "../utils/logger";

const router = Router();

const UPLOAD_DIR = "/tmp/vericase-video-pipeline/uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm"];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file format: ${ext}`));
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  next();
}

const activeStreams = new Map<string, Set<(stage: PipelineStage, progress: number, message: string) => void>>();

function notifyProgress(jobId: string, stage: PipelineStage, progress: number, message: string) {
  const listeners = activeStreams.get(jobId);
  if (listeners) {
    for (const cb of listeners) {
      try { cb(stage, progress, message); } catch {}
    }
  }
}

const uploadConfigSchema = z.object({
  matterId: z.string().optional(),
  boardId: z.string().optional(),
  fps: z.number().min(0.5).max(10).optional(),
  dedupThreshold: z.number().min(1).max(50).optional(),
});

router.post("/upload", requireAuth, upload.single("video"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file provided" });

    let configRaw = {};
    try {
      configRaw = req.body.config ? JSON.parse(req.body.config) : {};
    } catch { configRaw = {}; }
    const parsed = uploadConfigSchema.safeParse(configRaw);
    const config = parsed.success ? parsed.data : {};

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    const [job] = await db.insert(videoPipelineJobs).values({
      fileName,
      fileSize,
      filePath,
      matterId: config.matterId || null,
      boardId: config.boardId || null,
      status: "pending",
      currentStage: "validate",
      progress: 0,
      config: { fps: config.fps || 2, dedupThreshold: config.dedupThreshold || 12 },
      createdBy: req.user.claims?.sub || "unknown",
    }).returning();

    res.json({ jobId: job.id, status: "pending" });

    setImmediate(async () => {
      try {
        await runPipeline(job.id, (stage, progress, message) => {
          notifyProgress(job.id, stage, progress, message);
        });

        const [completed] = await db.select().from(videoPipelineJobs).where(eq(videoPipelineJobs.id, job.id));
        if (completed?.status === "completed" && completed.boardId) {
          await linkToBoard(completed);
        }
      } catch (err: any) {
        logger.error(`[video-pipeline] Background job failed: ${err.message}`);
      }
    });

  } catch (err: any) {
    logger.error(`[video-pipeline] Upload failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

function getUserId(req: any): string {
  return req.user?.claims?.sub || "unknown";
}

router.get("/jobs", requireAuth, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const jobs = await db.select().from(videoPipelineJobs)
      .where(eq(videoPipelineJobs.createdBy, userId))
      .orderBy(desc(videoPipelineJobs.createdAt)).limit(50);
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/jobs/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const [job] = await db.select().from(videoPipelineJobs)
      .where(and(eq(videoPipelineJobs.id, req.params.id), eq(videoPipelineJobs.createdBy, userId)));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/jobs/:id/stream", requireAuth, (req: any, res) => {
  const jobId = req.params.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const listener = (stage: PipelineStage, progress: number, message: string) => {
    const data = JSON.stringify({ stage, progress, message });
    res.write(`data: ${data}\n\n`);
    if (progress === 100 || progress === -1) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      setTimeout(() => res.end(), 100);
    }
  };

  if (!activeStreams.has(jobId)) activeStreams.set(jobId, new Set());
  activeStreams.get(jobId)!.add(listener);

  req.on("close", () => {
    const listeners = activeStreams.get(jobId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) activeStreams.delete(jobId);
    }
  });
});

router.post("/jobs/:id/link-board", requireAuth, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const { boardId } = req.body;
    if (!boardId) return res.status(400).json({ error: "boardId required" });

    const [job] = await db.select().from(videoPipelineJobs)
      .where(and(eq(videoPipelineJobs.id, req.params.id), eq(videoPipelineJobs.createdBy, userId)));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "completed") return res.status(400).json({ error: "Job not completed yet" });

    const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
    if (!board) return res.status(404).json({ error: "Board not found" });

    await db.update(videoPipelineJobs).set({ boardId }).where(eq(videoPipelineJobs.id, req.params.id));

    const updated = { ...job, boardId };
    await linkToBoard(updated);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function linkToBoard(job: any) {
  try {
    const [board] = await db.select().from(boards).where(eq(boards.id, job.boardId));
    if (!board) return;

    let [group] = await db.select().from(groups).where(eq(groups.boardId, board.id)).limit(1);
    if (!group) {
      [group] = await db.insert(groups).values({
        title: "Video Pipeline Outputs",
        boardId: board.id,
        color: "#6366f1",
        order: 0,
      }).returning();
    }

    const entities = (job.entities || []) as any[];
    const caseNumber = entities.find((e: any) => e.entityType === "case_number")?.value || "";
    const filingType = entities.find((e: any) => e.entityType === "filing_type")?.value || "";
    const title = filingType
      ? `${filingType}${caseNumber ? ` (${caseNumber})` : ""}`
      : `Video Pipeline: ${job.fileName}`;

    const wordCount = job.stitchedText ? job.stitchedText.split(/\s+/).length : 0;
    const entitySummary = entities.map((e: any) => `${e.entityType}: ${e.value}`).join("\n");

    await db.insert(tasks).values({
      title,
      description: `Extracted from video: ${job.fileName}\nWords: ${wordCount}\nEntities: ${entities.length}\n\n${entitySummary}`,
      status: "completed",
      boardId: board.id,
      groupId: group.id,
      files: [{ name: job.fileName, type: "video", pipelineJobId: job.id }] as any,
      customFields: {
        pipelineJobId: job.id,
        wordCount,
        entityCount: entities.length,
        processedAt: job.completedAt,
      } as any,
    });

    logger.info(`[video-pipeline] Linked job ${job.id} to board ${board.id}`);
  } catch (err: any) {
    logger.warn(`[video-pipeline] Board linking failed: ${err.message}`);
  }
}

export default router;
