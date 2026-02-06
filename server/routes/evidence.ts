import type { Express } from "express";
import { storage } from "../storage";
import {
  insertEvidenceVaultFileSchema,
  updateEvidenceVaultFileSchema,
  insertOCRJobSchema,
} from "@shared/schema";
import { z } from "zod";
import { maybePageinate } from "../utils/pagination";

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
}
