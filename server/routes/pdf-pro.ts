import { Router } from "express";
import { db } from "../db";
import * as tables from "@shared/models/tables";
import { eq, and, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { getUserId } from "../utils/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({
  dest: "uploads/pdf-pro/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

router.post("/matters/:matterId/documents/upload", upload.single("file"), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const matterId = req.params.matterId as string;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const fileBuffer = fs.readFileSync(file.path);
    const sha256Hash = createHash("sha256").update(fileBuffer).digest("hex");

    const id = randomUUID();

    const targetDir = path.join("uploads", "pdf-pro", matterId, id);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, file.originalname);
    fs.renameSync(file.path, targetPath);

    const [doc] = await db.insert(tables.pdfDocuments).values({
      id,
      workspaceId: req.body.workspaceId || null,
      matterId,
      title: req.body.title || file.originalname,
      originalFilename: file.originalname,
      storageKey: targetPath,
      mimeType: file.mimetype,
      fileSize: file.size,
      sha256Hash,
      pageCount: null,
      createdBy: userId,
    }).returning();

    res.status(201).json(doc);
  } catch (error: any) {
    console.error("PDF upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

router.get("/matters/:matterId/documents", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { matterId } = req.params;
    const docs = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.matterId, matterId))
      .orderBy(desc(tables.pdfDocuments.createdAt));

    const enriched = await Promise.all(docs.map(async (doc) => {
      const versions = await db.select().from(tables.documentVersions)
        .where(eq(tables.documentVersions.documentId, doc.id))
        .orderBy(desc(tables.documentVersions.versionNumber))
        .limit(1);

      const ocrText = await db.select().from(tables.documentOcrText)
        .where(eq(tables.documentOcrText.documentId, doc.id))
        .limit(1);

      const activeJobs = await db.select().from(tables.documentJobs)
        .where(and(
          eq(tables.documentJobs.documentId, doc.id),
          eq(tables.documentJobs.status, "running")
        ));

      return {
        ...doc,
        latestVersion: versions[0] || null,
        hasOcrText: ocrText.length > 0,
        activeJobs: activeJobs.length,
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/documents/:docId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const versions = await db.select().from(tables.documentVersions)
      .where(eq(tables.documentVersions.documentId, doc.id))
      .orderBy(asc(tables.documentVersions.versionNumber));

    const jobs = await db.select().from(tables.documentJobs)
      .where(eq(tables.documentJobs.documentId, doc.id))
      .orderBy(desc(tables.documentJobs.createdAt));

    const ocrText = await db.select().from(tables.documentOcrText)
      .where(eq(tables.documentOcrText.documentId, doc.id));

    const washReports = await db.select().from(tables.pdfWashReports)
      .where(eq(tables.pdfWashReports.documentId, doc.id))
      .orderBy(desc(tables.pdfWashReports.createdAt));

    res.json({ document: doc, versions, jobs, ocrText: ocrText[0] || null, washReports });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.get("/documents/:docId/download", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!fs.existsSync(doc.storageKey)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.originalFilename}"`);
    fs.createReadStream(doc.storageKey).pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Failed to download document" });
  }
});

router.get("/versions/:versionId/download", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [version] = await db.select().from(tables.documentVersions)
      .where(eq(tables.documentVersions.id, req.params.versionId));
    if (!version) return res.status(404).json({ error: "Version not found" });

    if (!fs.existsSync(version.storageKey)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="v${version.versionNumber}.pdf"`);
    fs.createReadStream(version.storageKey).pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Failed to download version" });
  }
});

router.post("/documents/:docId/jobs/ocr", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const id = randomUUID();
    const [job] = await db.insert(tables.documentJobs).values({
      id,
      workspaceId: doc.workspaceId,
      matterId: doc.matterId,
      documentId: doc.id,
      jobType: "ocr",
      status: "queued",
      progressPercent: 0,
      jobParams: req.body.params || {},
      createdBy: userId,
    }).returning();

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: "Failed to create OCR job" });
  }
});

router.post("/documents/:docId/jobs/bates", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { batesSetId, prefix, padding, startNumber, placement, fontSize } = req.body;

    const id = randomUUID();
    const [job] = await db.insert(tables.documentJobs).values({
      id,
      workspaceId: doc.workspaceId,
      matterId: doc.matterId,
      documentId: doc.id,
      jobType: "bates",
      status: "queued",
      progressPercent: 0,
      jobParams: { batesSetId, prefix, padding, startNumber, placement, fontSize },
      createdBy: userId,
    }).returning();

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: "Failed to create Bates job" });
  }
});

router.post("/documents/:docId/jobs/stamp", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { stampType, placement, fontSize } = req.body;
    if (!stampType) return res.status(400).json({ error: "stampType is required" });

    const id = randomUUID();
    const [job] = await db.insert(tables.documentJobs).values({
      id,
      workspaceId: doc.workspaceId,
      matterId: doc.matterId,
      documentId: doc.id,
      jobType: "stamp",
      status: "queued",
      progressPercent: 0,
      jobParams: { stampType, placement: placement || "top-right", fontSize: fontSize || 12 },
      createdBy: userId,
    }).returning();

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: "Failed to create stamp job" });
  }
});

router.post("/documents/:docId/jobs/wash", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { policy, detectionMode, preserveFormat } = req.body;

    const id = randomUUID();
    const [job] = await db.insert(tables.documentJobs).values({
      id,
      workspaceId: doc.workspaceId,
      matterId: doc.matterId,
      documentId: doc.id,
      jobType: "wash",
      status: "queued",
      progressPercent: 0,
      jobParams: {
        policy: policy || "medium",
        detectionMode: detectionMode || "regex",
        preserveFormat: preserveFormat ?? true
      },
      createdBy: userId,
    }).returning();

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: "Failed to create wash job" });
  }
});

router.get("/jobs/:jobId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [job] = await db.select().from(tables.documentJobs)
      .where(eq(tables.documentJobs.id, req.params.jobId));
    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

router.get("/matters/:matterId/bates-sets", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const sets = await db.select().from(tables.batesSets)
      .where(eq(tables.batesSets.matterId, req.params.matterId))
      .orderBy(desc(tables.batesSets.createdAt));

    const enriched = await Promise.all(sets.map(async (s) => {
      const ranges = await db.select().from(tables.batesRanges)
        .where(eq(tables.batesRanges.batesSetId, s.id))
        .orderBy(asc(tables.batesRanges.startNumber));
      return { ...s, ranges };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Bates sets" });
  }
});

router.post("/matters/:matterId/bates-sets", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, prefix, padding, nextNumber, placement, fontSize, workspaceId } = req.body;
    if (!name || !prefix) return res.status(400).json({ error: "name and prefix are required" });

    const id = randomUUID();
    const [set] = await db.insert(tables.batesSets).values({
      id,
      workspaceId: workspaceId || null,
      matterId: req.params.matterId,
      name,
      prefix,
      padding: padding || 6,
      nextNumber: nextNumber || 1,
      placement: placement || "bottom-right",
      fontSize: fontSize || 10,
      createdBy: userId,
    }).returning();

    res.status(201).json(set);
  } catch (error) {
    res.status(500).json({ error: "Failed to create Bates set" });
  }
});

router.get("/documents/:docId/wash-reports", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const reports = await db.select().from(tables.pdfWashReports)
      .where(eq(tables.pdfWashReports.documentId, req.params.docId))
      .orderBy(desc(tables.pdfWashReports.createdAt));

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wash reports" });
  }
});

router.delete("/documents/:docId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [doc] = await db.select().from(tables.pdfDocuments)
      .where(eq(tables.pdfDocuments.id, req.params.docId));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    await db.delete(tables.pdfDocuments).where(eq(tables.pdfDocuments.id, req.params.docId));

    try {
      const dir = path.dirname(doc.storageKey);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
