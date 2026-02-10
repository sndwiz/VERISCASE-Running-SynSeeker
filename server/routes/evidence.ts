import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import {
  insertEvidenceVaultFileSchema,
  updateEvidenceVaultFileSchema,
  insertOCRJobSchema,
} from "@shared/schema";
import { z } from "zod";
import { maybePageinate } from "../utils/pagination";
import { db } from "../db";
import { ocrSessions } from "@shared/models/tables";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const EVIDENCE_DIR = path.resolve("uploads/evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

function sanitizeMatterId(matterId: string): string {
  return matterId.replace(/[^a-zA-Z0-9_-]/g, "");
}

const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const matterId = sanitizeMatterId(_req.params.matterId as string);
      const dir = path.join(EVIDENCE_DIR, matterId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

function computeSHA256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

function getEvidenceTypeFromMime(mime: string): string {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "message/rfc822" || mime.includes("email")) return "email";
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("text")) return "document";
  return "other";
}

export function registerEvidenceRoutes(app: Express): void {

  app.get("/api/matters/:matterId/evidence", async (req: Request, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const files = await storage.getEvidenceVaultFiles(req.params.matterId as string);
      const filtered = includeArchived ? files : files.filter(f => !f.isArchived);
      res.json(maybePageinate(filtered, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence files" });
    }
  });

  app.get("/api/evidence/:id", async (req: Request, res: Response) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id as string);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence file" });
    }
  });

  app.post("/api/matters/:matterId/evidence/upload",
    evidenceUpload.array("files", 20),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files provided" });
        }

        const userName = (req as any).user?.username || (req as any).user?.name || "System";
        const descriptions = req.body.descriptions ? JSON.parse(req.body.descriptions) : {};
        const evidenceTypes = req.body.evidenceTypes ? JSON.parse(req.body.evidenceTypes) : {};
        const confidentiality = req.body.confidentiality || "confidential";
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        const results = [];
        for (const uploadedFile of files) {
          const sha256 = computeSHA256(uploadedFile.path);
          const storageKey = path.relative(process.cwd(), uploadedFile.path);
          const autoType = getEvidenceTypeFromMime(uploadedFile.mimetype);

          const data = insertEvidenceVaultFileSchema.parse({
            matterId: req.params.matterId as string,
            originalName: uploadedFile.originalname,
            originalHash: sha256,
            originalSize: uploadedFile.size,
            originalMimeType: uploadedFile.mimetype,
            storageKey,
            evidenceType: evidenceTypes[uploadedFile.originalname] || autoType,
            confidentiality,
            description: descriptions[uploadedFile.originalname] || "",
            tags,
            uploadedBy: userName,
          });

          const file = await storage.createEvidenceVaultFile(data);

          try {
            await storage.createDetectiveNode({
              matterId: req.params.matterId as string,
              type: "evidence",
              title: file.originalName || "Evidence File",
              description: `Auto-linked evidence: ${file.evidenceType || "document"} — ${file.originalMimeType || "unknown type"}`,
              linkedEvidenceId: file.id,
              position: { x: 100 + Math.random() * 600, y: 100 + Math.random() * 400 },
              color: "#10b981",
              isInferred: false,
            });
          } catch (nodeErr) {
            console.error("[evidence] Detective node creation (non-fatal):", nodeErr);
          }

          results.push(file);
        }

        try {
          const { triggerAutomation } = await import("../automation-engine");
          const boards = await storage.getBoardsByMatter(req.params.matterId as string);
          if (boards.length > 0) {
            for (const file of results) {
              await triggerAutomation({
                type: "document_uploaded",
                boardId: boards[0].id,
                metadata: {
                  matterId: req.params.matterId as string,
                  evidenceId: file.id,
                  fileName: file.originalName,
                  fileType: file.evidenceType,
                },
              });
            }
          }
        } catch (autoErr) {
          console.error("[evidence] Automation trigger (non-fatal):", autoErr);
        }

        res.status(201).json(results);
      } catch (error) {
        console.error("[evidence] Upload error:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Failed to upload evidence files" });
      }
    }
  );

  app.post("/api/matters/:matterId/evidence", async (req: Request, res: Response) => {
    try {
      const data = insertEvidenceVaultFileSchema.parse({
        ...req.body,
        matterId: req.params.matterId as string,
      });
      const file = await storage.createEvidenceVaultFile(data);

      try {
        await storage.createDetectiveNode({
          matterId: req.params.matterId as string,
          type: "evidence",
          title: file.originalName || "Evidence File",
          description: `Auto-linked evidence: ${file.evidenceType || "document"} — ${file.originalMimeType || "unknown type"}`,
          linkedEvidenceId: file.id,
          position: { x: 100 + Math.random() * 600, y: 100 + Math.random() * 400 },
          color: "#10b981",
          isInferred: false,
        });
      } catch (nodeErr) {
        console.error("[evidence] Detective node creation (non-fatal):", nodeErr);
      }

      try {
        const { triggerAutomation } = await import("../automation-engine");
        const boards = await storage.getBoardsByMatter(req.params.matterId as string);
        if (boards.length > 0) {
          await triggerAutomation({
            type: "document_uploaded",
            boardId: boards[0].id,
            metadata: {
              matterId: req.params.matterId as string,
              evidenceId: file.id,
              fileName: file.originalName,
              fileType: file.evidenceType,
            },
          });
        }
      } catch (autoErr) {
        console.error("[evidence] Automation trigger (non-fatal):", autoErr);
      }

      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create evidence file" });
    }
  });

  app.get("/api/evidence/:id/download", async (req: Request, res: Response) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id as string);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      if (!file.storageKey || !fs.existsSync(file.storageKey)) {
        return res.status(404).json({ error: "File not available for download" });
      }

      const userName = (req as any).user?.username || (req as any).user?.name || "System";
      await storage.addChainOfCustodyEntry(req.params.id as string, "downloaded", userName, "File downloaded");

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      res.setHeader("Content-Type", file.originalMimeType);
      const stream = fs.createReadStream(file.storageKey);
      stream.pipe(res);
    } catch (error) {
      res.status(500).json({ error: "Failed to download evidence file" });
    }
  });

  app.get("/api/evidence/:id/preview", async (req: Request, res: Response) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id as string);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      if (!file.storageKey || !fs.existsSync(file.storageKey)) {
        return res.status(404).json({ error: "File not available for preview" });
      }

      const userName = (req as any).user?.username || (req as any).user?.name || "System";
      await storage.addChainOfCustodyEntry(req.params.id as string, "viewed", userName, "File previewed");

      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
      res.setHeader("Content-Type", file.originalMimeType);
      const stream = fs.createReadStream(file.storageKey);
      stream.pipe(res);
    } catch (error) {
      res.status(500).json({ error: "Failed to preview evidence file" });
    }
  });

  app.post("/api/evidence/:id/verify", async (req: Request, res: Response) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id as string);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      if (!file.storageKey || !fs.existsSync(file.storageKey)) {
        return res.status(200).json({
          verified: false,
          reason: "File not found on disk — cannot verify integrity",
          originalHash: file.originalHash,
        });
      }

      const currentHash = computeSHA256(file.storageKey);
      const verified = currentHash === file.originalHash;

      const userName = (req as any).user?.username || (req as any).user?.name || "System";
      await storage.addChainOfCustodyEntry(
        req.params.id as string,
        "integrity_verified",
        userName,
        verified ? "SHA-256 match confirmed" : `INTEGRITY FAILURE: expected ${file.originalHash}, got ${currentHash}`
      );

      res.json({
        verified,
        originalHash: file.originalHash,
        currentHash,
        verifiedAt: new Date().toISOString(),
        verifiedBy: userName,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify evidence integrity" });
    }
  });

  app.post("/api/evidence/:id/archive", async (req: Request, res: Response) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id as string);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }

      const userName = (req as any).user?.username || (req as any).user?.name || "System";
      const now = new Date().toISOString();

      const updated = await storage.updateEvidenceVaultFile(req.params.id as string, {
        isArchived: true,
        archivedAt: now,
        archivedBy: userName,
      });

      await storage.addChainOfCustodyEntry(req.params.id as string, "archived", userName, "Evidence archived (soft-deleted)");

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to archive evidence file" });
    }
  });

  app.post("/api/evidence/:id/restore", async (req: Request, res: Response) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id as string);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }

      const userName = (req as any).user?.username || (req as any).user?.name || "System";

      const updated = await storage.updateEvidenceVaultFile(req.params.id as string, {
        isArchived: false,
      });

      await storage.addChainOfCustodyEntry(req.params.id as string, "restored", userName, "Evidence restored from archive");

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to restore evidence file" });
    }
  });

  app.patch("/api/evidence/:id", async (req: Request, res: Response) => {
    try {
      const data = updateEvidenceVaultFileSchema.parse(req.body);
      const file = await storage.updateEvidenceVaultFile(req.params.id as string, data);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update evidence file" });
    }
  });

  app.post("/api/evidence/:id/custody", async (req: Request, res: Response) => {
    try {
      const { action, by, notes } = req.body;
      if (!action || !by) {
        return res.status(400).json({ error: "action and by are required" });
      }
      const file = await storage.addChainOfCustodyEntry(req.params.id as string, action, by, notes);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to add custody entry" });
    }
  });

  app.get("/api/ocr-jobs", async (req: Request, res: Response) => {
    try {
      const matterId = req.query.matterId as string | undefined;
      const jobs = await storage.getOCRJobs(matterId);
      res.json(maybePageinate(jobs, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR jobs" });
    }
  });

  app.get("/api/ocr-jobs/:id", async (req: Request, res: Response) => {
    try {
      const job = await storage.getOCRJob(req.params.id as string);
      if (!job) {
        return res.status(404).json({ error: "OCR job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR job" });
    }
  });

  app.post("/api/ocr-jobs", async (req: Request, res: Response) => {
    try {
      const data = insertOCRJobSchema.parse(req.body);
      const job = await storage.createOCRJob(data);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create OCR job" });
    }
  });

  app.get("/api/matters/:matterId/ocr-sessions", async (req: Request, res: Response) => {
    try {
      const sessions = await db.select().from(ocrSessions)
        .where(eq(ocrSessions.matterId, req.params.matterId as string))
        .orderBy(desc(ocrSessions.startedAt));
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR sessions" });
    }
  });

  app.get("/api/ocr-sessions/:id", async (req: Request, res: Response) => {
    try {
      const [session] = await db.select().from(ocrSessions)
        .where(eq(ocrSessions.id, req.params.id as string));
      if (!session) {
        return res.status(404).json({ error: "OCR session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR session" });
    }
  });
}
