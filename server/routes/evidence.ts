import type { Express } from "express";
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

export function registerEvidenceRoutes(app: Express): void {
  app.get("/api/matters/:matterId/evidence", async (req, res) => {
    try {
      const files = await storage.getEvidenceVaultFiles(req.params.matterId);
      res.json(maybePageinate(files, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence files" });
    }
  });

  app.get("/api/evidence/:id", async (req, res) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence file" });
    }
  });

  app.post("/api/matters/:matterId/evidence", async (req, res) => {
    try {
      const data = insertEvidenceVaultFileSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const file = await storage.createEvidenceVaultFile(data);

      try {
        await storage.createDetectiveNode({
          matterId: req.params.matterId,
          type: "evidence",
          title: file.originalName || "Evidence File",
          description: `Auto-linked evidence: ${file.evidenceType || "document"} — ${file.originalMimeType || "unknown type"}`,
          linkedEvidenceId: file.id,
          position: { x: 100 + Math.random() * 600, y: 100 + Math.random() * 400 },
          color: "#10b981",
        });
      } catch (nodeErr) {
        console.error("[evidence] Detective node creation (non-fatal):", nodeErr);
      }

      try {
        const { triggerAutomation } = await import("../automation-engine");
        const boards = await storage.getBoardsByMatter(req.params.matterId);
        if (boards.length > 0) {
          await triggerAutomation({
            type: "document_uploaded",
            boardId: boards[0].id,
            metadata: {
              matterId: req.params.matterId,
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

  app.patch("/api/evidence/:id", async (req, res) => {
    try {
      const data = updateEvidenceVaultFileSchema.parse(req.body);
      const file = await storage.updateEvidenceVaultFile(req.params.id, data);
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

  app.post("/api/evidence/:id/custody", async (req, res) => {
    try {
      const { action, by, notes } = req.body;
      if (!action || !by) {
        return res.status(400).json({ error: "action and by are required" });
      }
      const file = await storage.addChainOfCustodyEntry(req.params.id, action, by, notes);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to add custody entry" });
    }
  });

  app.get("/api/ocr-jobs", async (req, res) => {
    try {
      const matterId = req.query.matterId as string | undefined;
      const jobs = await storage.getOCRJobs(matterId);
      res.json(maybePageinate(jobs, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR jobs" });
    }
  });

  app.get("/api/ocr-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getOCRJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "OCR job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR job" });
    }
  });

  app.post("/api/ocr-jobs", async (req, res) => {
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

  app.get("/api/matters/:matterId/ocr-sessions", async (req, res) => {
    try {
      const sessions = await db.select().from(ocrSessions)
        .where(eq(ocrSessions.matterId, req.params.matterId))
        .orderBy(desc(ocrSessions.startedAt));
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR sessions" });
    }
  });

  app.get("/api/ocr-sessions/:id", async (req, res) => {
    try {
      const [session] = await db.select().from(ocrSessions)
        .where(eq(ocrSessions.id, req.params.id));
      if (!session) {
        return res.status(404).json({ error: "OCR session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR session" });
    }
  });
}
