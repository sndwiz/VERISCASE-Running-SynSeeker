import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insightsStorage } from "../services/insights-storage";
import { handleFileUpload } from "../services/ingestion-pipeline";
import { runInsightAnalysis } from "../services/insights-analysis";
import { storage } from "../storage";

const router = Router();

const tmpDir = path.resolve("uploads/tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".heic",
      ".doc", ".docx", ".txt", ".rtf", ".csv",
      ".mp3", ".wav", ".ogg", ".m4a",
      ".eml", ".msg",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

interface ActionItem {
  title: string;
  suggestedOwner?: string;
  suggestedDueDate?: string;
  confidence: number;
  citations: Array<{ assetId: string; filename: string; snippet: string }>;
}

router.post("/api/matters/:matterId/assets", upload.array("files", 50), async (req: Request, res: Response) => {
  try {
    const matterId = req.params.matterId as string;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
    const { docType, custodian, confidentiality } = req.body || {};

    const assets = [];
    for (const file of files) {
      const asset = await handleFileUpload(matterId, {
        originalname: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      }, userId, { docType, custodian, confidentiality });
      assets.push(asset);
    }

    res.status(201).json(assets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/matters/:matterId/assets", async (req: Request, res: Response) => {
  try {
    const matterId = req.params.matterId as string;
    const assets = await insightsStorage.getMatterAssets(matterId);
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/matters/:matterId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const assetId = req.params.assetId as string;
    const asset = await insightsStorage.getMatterAsset(assetId);
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    if (asset.storageUrl && fs.existsSync(asset.storageUrl)) {
      try { fs.unlinkSync(asset.storageUrl); } catch {}
    }
    await insightsStorage.deleteMatterAsset(assetId);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/matters/:matterId/scan-summary", async (req: Request, res: Response) => {
  try {
    const matterId = req.params.matterId as string;
    const summary = await insightsStorage.getScanSummary(matterId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/matters/:matterId/insights/run", async (req: Request, res: Response) => {
  try {
    const matterId = req.params.matterId as string;
    const { intentType, priorityRules, outputFormat, scope } = req.body;

    if (!intentType) {
      return res.status(400).json({ error: "intentType is required" });
    }

    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;

    const run = await insightsStorage.createInsightRun({
      matterId,
      requestedByUserId: userId || null,
      intentType,
      priorityRules: priorityRules || null,
      outputFormat: outputFormat || null,
      scope: scope || null,
      status: "queued",
    });

    setTimeout(() => runInsightAnalysis(run.id), 100);

    res.status(201).json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/matters/:matterId/insights/runs", async (req: Request, res: Response) => {
  try {
    const matterId = req.params.matterId as string;
    const runs = await insightsStorage.getInsightRuns(matterId);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/insights/:insightRunId", async (req: Request, res: Response) => {
  try {
    const insightRunId = req.params.insightRunId as string;
    const run = await insightsStorage.getInsightRun(insightRunId);
    if (!run) return res.status(404).json({ error: "Insight run not found" });

    const outputs = await insightsStorage.getInsightOutputs(run.id);

    const sections: Record<string, any> = {};
    for (const o of outputs) {
      sections[o.section] = o.contentJson;
    }

    res.json({ run, sections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/insights/:insightRunId/create-tasks", async (req: Request, res: Response) => {
  try {
    const insightRunId = req.params.insightRunId as string;
    const run = await insightsStorage.getInsightRun(insightRunId);
    if (!run) return res.status(404).json({ error: "Insight run not found" });

    const outputs = await insightsStorage.getInsightOutputs(run.id);
    const actionItemsOutput = outputs.find(o => o.section === "action_items");
    if (!actionItemsOutput) {
      return res.status(404).json({ error: "No action items found in this insight run" });
    }

    const actionItems = actionItemsOutput.contentJson as ActionItem[];
    if (!Array.isArray(actionItems) || actionItems.length === 0) {
      return res.status(404).json({ error: "No action items to create" });
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
          item.citations?.map((c: any) => `- ${c.filename}: "${c.snippet}"`).join("\n") || "None"
        }`,
        status: "not-started",
        priority: item.confidence >= 0.8 ? "high" : item.confidence >= 0.5 ? "medium" : "low",
        dueDate: item.suggestedDueDate || undefined,
      } as any);
      createdTasks.push(task);
    }

    res.status(201).json({ created: createdTasks.length, tasks: createdTasks, boardId: board.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
