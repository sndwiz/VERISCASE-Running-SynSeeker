import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { insightsStorage } from "../services/insights-storage";
import { handleFileUpload } from "../services/ingestion-pipeline";
import { runInsightAnalysis } from "../services/insights-analysis";
import { storage } from "../storage";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { INSIGHTS_CONFIG } from "../config/insights";
import { getClientIp } from "../security/audit";
import type { ActionItemResult } from "@shared/insights-types";
import { INSIGHT_INTENT_TYPES } from "@shared/insights-types";

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const tmpDir = path.resolve("uploads/tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".bmp": ["image/bmp"],
  ".tiff": ["image/tiff"],
  ".tif": ["image/tiff"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic", "image/heif"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".txt": ["text/plain"],
  ".rtf": ["text/rtf", "application/rtf"],
  ".csv": ["text/csv", "application/csv"],
  ".mp3": ["audio/mpeg"],
  ".wav": ["audio/wav", "audio/x-wav"],
  ".ogg": ["audio/ogg"],
  ".m4a": ["audio/mp4", "audio/x-m4a"],
  ".eml": ["message/rfc822"],
  ".msg": ["application/vnd.ms-outlook", "application/octet-stream"],
};

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: INSIGHTS_CONFIG.upload.maxFileSizeBytes },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!(INSIGHTS_CONFIG.upload.allowedExtensions as readonly string[]).includes(ext)) {
      return cb(new Error("Unsupported file type"));
    }
    const allowedMimes = EXTENSION_MIME_MAP[ext];
    if (allowedMimes && !allowedMimes.includes(file.mimetype)) {
      return cb(new Error("File MIME type does not match extension"));
    }
    cb(null, true);
  },
});

async function verifyMatterAccess(req: Request, _res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return next(new AppError(401, "Authentication required"));
  }
  const matterId = req.params.matterId;
  if (!matterId || typeof matterId !== "string" || matterId.trim().length === 0) {
    return next(new AppError(400, "Matter ID is required"));
  }
  const matter = await storage.getMatter(matterId);
  if (!matter) {
    return next(new AppError(404, "Matter not found"));
  }
  next();
}

async function verifyInsightRunAccess(req: Request, _res: Response, next: NextFunction) {
  const insightRunId = req.params.insightRunId;
  if (!insightRunId || typeof insightRunId !== "string" || insightRunId.trim().length === 0) {
    return next(new AppError(400, "Insight run ID is required"));
  }
  const run = await insightsStorage.getInsightRun(insightRunId);
  if (!run) {
    return next(new AppError(404, "Insight run not found"));
  }
  const matter = await storage.getMatter(run.matterId);
  if (!matter) {
    return next(new AppError(404, "Associated matter not found"));
  }
  (req as any)._insightRun = run;
  next();
}

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: INSIGHTS_CONFIG.rateLimiting.uploadsPerMinute,
  keyGenerator: (req: Request) => getClientIp(req),
  message: { error: "Too many upload requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: INSIGHTS_CONFIG.rateLimiting.analysisRunsPerMinute,
  keyGenerator: (req: Request) => getClientIp(req),
  message: { error: "Too many analysis requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const startAnalysisSchema = z.object({
  intentType: z.string().min(1),
  priorityRules: z.object({
    dateWindow: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
    docTypes: z.array(z.string()).optional(),
    custodians: z.array(z.string()).optional(),
    mostRecentFirst: z.boolean().optional(),
  }).optional(),
  outputFormat: z.enum(["executive_brief", "timeline_table", "issue_map", "task_list", "board_update"]).optional(),
  scope: z.string().optional(),
});

function cleanupTempFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      logger.warn("Failed to clean up temp file", { path: file.path });
    }
  }
}

function parsePage(val: unknown, defaultVal: number): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) || n < 1 ? defaultVal : n;
}

function parseLimit(val: unknown, defaultVal: number, maxVal: number): number {
  const n = parseInt(String(val), 10);
  if (isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, maxVal);
}

router.post(
  "/api/matters/:matterId/assets",
  verifyMatterAccess,
  uploadLimiter,
  upload.array("files", INSIGHTS_CONFIG.upload.maxFilesPerUpload),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const matterId = req.params.matterId as string;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError(400, "No files uploaded");
    }

    const existingAssets = await insightsStorage.getMatterAssets(matterId);
    if (existingAssets.length + files.length > INSIGHTS_CONFIG.upload.maxFilesPerMatter) {
      cleanupTempFiles(files);
      throw new AppError(400, `Uploading these files would exceed the maximum of ${INSIGHTS_CONFIG.upload.maxFilesPerMatter} files per matter`);
    }

    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
    const { docType, custodian, confidentiality } = req.body || {};

    const assets = [];
    try {
      for (const file of files) {
        const asset = await handleFileUpload(matterId, {
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
        }, userId, { docType, custodian, confidentiality });
        assets.push(asset);
      }
    } catch (err: any) {
      cleanupTempFiles(files);
      logger.error("File upload processing failed", { error: err.message, matterId });
      throw new AppError(500, "Failed to process uploaded files");
    }

    cleanupTempFiles(files);
    res.status(201).json(assets);
  }),
);

router.get(
  "/api/matters/:matterId/assets",
  verifyMatterAccess,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const matterId = req.params.matterId as string;
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 50, 200);

    const allAssets = await insightsStorage.getMatterAssets(matterId);
    const total = allAssets.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const data = allAssets.slice(offset, offset + limit);

    res.json({
      data,
      pagination: { page, limit, total, totalPages },
    });
  }),
);

router.delete(
  "/api/matters/:matterId/assets/:assetId",
  verifyMatterAccess,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const assetId = req.params.assetId as string;
    const asset = await insightsStorage.getMatterAsset(assetId);
    if (!asset) {
      throw new AppError(404, "Asset not found");
    }
    if (asset.storageUrl && fs.existsSync(asset.storageUrl)) {
      try {
        fs.unlinkSync(asset.storageUrl);
      } catch (e) {
        logger.warn("Failed to delete asset file", { assetId, path: asset.storageUrl });
      }
    }
    await insightsStorage.deleteMatterAsset(assetId);
    res.status(204).send();
  }),
);

router.get(
  "/api/matters/:matterId/scan-summary",
  verifyMatterAccess,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const matterId = req.params.matterId as string;
    const summary = await insightsStorage.getScanSummary(matterId);
    res.json(summary);
  }),
);

router.post(
  "/api/matters/:matterId/insights/run",
  verifyMatterAccess,
  analysisLimiter,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const matterId = req.params.matterId as string;
    const parsed = startAnalysisSchema.parse(req.body);

    const intents = parsed.intentType.split(",").map(s => s.trim());
    for (const intent of intents) {
      if (!(INSIGHT_INTENT_TYPES as readonly string[]).includes(intent)) {
        throw new AppError(400, `Invalid intent type: "${intent}". Allowed: ${INSIGHT_INTENT_TYPES.join(", ")}`);
      }
    }

    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;

    const run = await insightsStorage.createInsightRun({
      matterId,
      requestedByUserId: userId || null,
      intentType: parsed.intentType,
      priorityRules: parsed.priorityRules || null,
      outputFormat: parsed.outputFormat || null,
      scope: parsed.scope || null,
      status: "queued",
    });

    setTimeout(() => runInsightAnalysis(run.id), 100);

    res.status(201).json(run);
  }),
);

router.get(
  "/api/matters/:matterId/insights/runs",
  verifyMatterAccess,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const matterId = req.params.matterId as string;
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 50);

    const allRuns = await insightsStorage.getInsightRuns(matterId);
    const total = allRuns.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const data = allRuns.slice(offset, offset + limit);

    res.json({
      data,
      pagination: { page, limit, total, totalPages },
    });
  }),
);

router.get(
  "/api/insights/:insightRunId",
  verifyInsightRunAccess,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const run = (req as any)._insightRun;
    const outputs = await insightsStorage.getInsightOutputs(run.id);

    const sections: Record<string, any> = {};
    for (const o of outputs) {
      sections[o.section] = o.contentJson;
    }

    res.json({ run, sections });
  }),
);

router.post(
  "/api/insights/:insightRunId/create-tasks",
  verifyInsightRunAccess,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const run = (req as any)._insightRun;

    const outputs = await insightsStorage.getInsightOutputs(run.id);
    const actionItemsOutput = outputs.find(o => o.section === "action_items");
    if (!actionItemsOutput) {
      throw new AppError(404, "No action items found in this insight run");
    }

    const actionItems = actionItemsOutput.contentJson as ActionItemResult[];
    if (!Array.isArray(actionItems) || actionItems.length === 0) {
      throw new AppError(404, "No action items to create");
    }

    let boards = await storage.getBoardsByMatter(run.matterId);
    let board = boards[0];
    if (!board) {
      board = await storage.createBoard({
        name: "Insights Board",
        description: "Auto-created board for matter insights",
        color: "#6366f1",
        icon: "lightbulb",
        matterId: run.matterId,
      });
    }

    let groups = await storage.getGroups(board.id);
    let group = groups.find(g => g.title === "Insight Action Items");
    if (!group) {
      group = await storage.createGroup({
        boardId: board.id,
        title: "Insight Action Items",
        color: "#10b981",
        order: groups.length,
        collapsed: false,
      });
    }

    const createdTasks = [];
    for (const item of actionItems) {
      const task = await storage.createTask({
        boardId: board.id,
        groupId: group.id,
        title: item.title,
        description: `From insight run: ${run.id}\n\nCitations:\n${
          item.citations?.map((c) => `- ${c.filename}: "${c.snippet}"`).join("\n") || "None"
        }`,
        status: "not-started",
        priority: item.confidence >= 0.8 ? "high" : item.confidence >= 0.5 ? "medium" : "low",
        dueDate: item.suggestedDueDate || undefined,
      } as any);
      createdTasks.push(task);
    }

    res.status(201).json({ created: createdTasks.length, tasks: createdTasks, boardId: board.id });
  }),
);

export default router;
