import { Router } from "express";
import type { Request, Response, Express } from "express";
import { db } from "../db";
import { incomingFiles, organizeRuns, organizePlanItems, fileChangeLog } from "../../shared/models/tables";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  insertIncomingFileSchema,
  createOrganizeRunSchema,
  approvePlanSchema,
} from "../../shared/schema";
import {
  getScanSummary,
  createOrganizeRun,
  getRunPlan,
  approvePlan,
  executePreviewBatch,
  undoFileChange,
} from "../services/upload-organizer";
import crypto from "crypto";
import { getUserId } from "../utils/auth";

const router = Router();

function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
  if (["png", "jpg", "jpeg", "heic", "webp", "gif", "bmp", "tiff"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  return "other";
}

function detectSubtype(filename: string, mimeType?: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("screenshot") || lower.includes("screen shot") || lower.match(/^img_\d+/)) {
    return "screenshot";
  }
  if (lower.match(/^(dsc|img|photo|pic)_?\d+/i) || lower.match(/\.(heic|heif)$/i)) {
    return "photo";
  }
  return "unknown";
}

router.post("/upload", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const multer = (await import("multer")).default;
    const upload = multer({
      dest: "/tmp/incoming-uploads/",
      limits: { fileSize: 50 * 1024 * 1024 },
    });

    upload.array("files", 20)(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const results = [];
      for (const file of files) {
        const fileType = getFileType(file.originalname);
        const subtype = detectSubtype(file.originalname, file.mimetype);

        const fs = await import("fs");
        const fileBuffer = fs.readFileSync(file.path);
        const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        const [record] = await db.insert(incomingFiles).values({
          userId,
          matterId: req.body.matterId || null,
          originalFilename: file.originalname,
          currentPath: "/Incoming",
          fileType,
          subtype,
          sizeBytes: file.size,
          hashSha256: hash,
          mimeType: file.mimetype,
          status: "new",
        }).returning();

        results.push(record);
      }

      res.json({ uploaded: results.length, files: results });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/upload-metadata", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = insertIncomingFileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid file data", details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const fileType = getFileType(data.originalFilename);
    const subtype = detectSubtype(data.originalFilename, data.mimeType);

    const [record] = await db.insert(incomingFiles).values({
      userId,
      matterId: data.matterId || null,
      originalFilename: data.originalFilename,
      currentPath: data.currentPath || "/Incoming",
      fileType,
      subtype,
      sizeBytes: data.sizeBytes || 0,
      hashSha256: data.hashSha256 || null,
      mimeType: data.mimeType || null,
      ocrText: data.ocrText || null,
      ocrConfidence: data.ocrConfidence || null,
      metadataJson: data.metadataJson || null,
      status: "new",
    }).returning();

    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/scan-summary", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const matterId = req.query.matterId as string | undefined;
    const summary = await getScanSummary(userId, matterId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/files", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const status = req.query.status as string | undefined;
    const conditions = [eq(incomingFiles.userId, userId)];
    if (status) {
      conditions.push(eq(incomingFiles.status, status));
    }

    const files = await db.select().from(incomingFiles)
      .where(and(...conditions))
      .orderBy(desc(incomingFiles.uploadedAt));

    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/runs", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = createOrganizeRunSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid run parameters", details: parsed.error.flatten() });
    }

    const { scope, matterId, daysFilter } = parsed.data;
    const result = await createOrganizeRun(userId, scope, matterId, daysFilter);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/runs", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const runs = await db.select().from(organizeRuns)
      .where(eq(organizeRuns.userId, userId))
      .orderBy(desc(organizeRuns.createdAt));

    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/runs/:runId/plan", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const plan = await getRunPlan(req.params.runId as string);
    if (!plan) return res.status(404).json({ error: "Run not found" });

    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/runs/:runId/approve", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = approvePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid approval data", details: parsed.error.flatten() });
    }

    await approvePlan(req.params.runId as string, userId, parsed.data.approvals);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/runs/:runId/execute-preview", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await executePreviewBatch(req.params.runId as string, userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/runs/:runId/continue", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await executePreviewBatch(req.params.runId as string, userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/undo/:changeLogId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await undoFileChange(req.params.changeLogId as string, userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/change-log", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const runId = req.query.runId as string | undefined;
    const conditions = [eq(fileChangeLog.changedByUserId, userId)];
    if (runId) {
      conditions.push(eq(fileChangeLog.runId, runId));
    }

    const logs = await db.select().from(fileChangeLog)
      .where(and(...conditions))
      .orderBy(desc(fileChangeLog.createdAt));

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export function registerOrganizerRoutes(app: Express) { app.use('/api/organizer', router); }

export default router;
