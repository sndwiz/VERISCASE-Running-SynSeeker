import type { Express, Request, Response } from "express";
import { db } from "../db";
import { timeEntrySupportingDocs } from "@shared/models/tables";
import { analyzedEmails } from "@shared/models/tables";
import { timeEntries } from "@shared/models/tables";
import { eq, desc, and } from "drizzle-orm";
import { insertSupportingDocSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "time-entry-docs");

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const docUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir();
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const hash = crypto.randomBytes(8).toString("hex");
      cb(null, `${Date.now()}-${hash}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function registerTimeEntryDocsRoutes(app: Express): void {

  app.get("/api/time-entries/:timeEntryId/docs", async (req: Request, res: Response) => {
    try {
      const docs = await db.select()
        .from(timeEntrySupportingDocs)
        .where(eq(timeEntrySupportingDocs.timeEntryId, req.params.timeEntryId))
        .orderBy(desc(timeEntrySupportingDocs.createdAt));
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supporting docs" });
    }
  });

  app.post(
    "/api/time-entries/:timeEntryId/docs/upload",
    docUpload.array("files", 10),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files provided" });
        }

        const [entry] = await db.select()
          .from(timeEntries)
          .where(eq(timeEntries.id, req.params.timeEntryId));
        if (!entry) {
          return res.status(404).json({ error: "Time entry not found" });
        }

        const docTypeSchema = z.enum(["phone_bill", "travel", "web_search", "email", "receipt", "screenshot", "other"]);
        const docType = docTypeSchema.catch("other").parse(req.body.docType);
        const notes = typeof req.body.notes === "string" ? req.body.notes : null;
        const dbUser = (req as any).dbUser;
        if (!dbUser) {
          return res.status(401).json({ error: "Authentication required" });
        }
        const uploadedBy = `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email || "Unknown";

        const results = [];
        for (const file of files) {
          const [doc] = await db.insert(timeEntrySupportingDocs).values({
            timeEntryId: req.params.timeEntryId,
            matterId: entry.matterId,
            docType,
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            notes,
            uploadedBy,
          }).returning();
          results.push(doc);
        }

        res.status(201).json(results);
      } catch (error) {
        res.status(500).json({ error: "Failed to upload supporting docs" });
      }
    }
  );

  app.post("/api/time-entries/:timeEntryId/docs/link-email", async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (!dbUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const linkSchema = z.object({
        emailId: z.string().min(1),
        notes: z.string().optional(),
      });
      const { emailId, notes } = linkSchema.parse(req.body);

      const [entry] = await db.select()
        .from(timeEntries)
        .where(eq(timeEntries.id, req.params.timeEntryId));
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      const [email] = await db.select()
        .from(analyzedEmails)
        .where(eq(analyzedEmails.id, emailId));
      if (!email) {
        return res.status(404).json({ error: "Analyzed email not found" });
      }

      const [doc] = await db.insert(timeEntrySupportingDocs).values({
        timeEntryId: req.params.timeEntryId,
        matterId: entry.matterId,
        docType: "email",
        fileName: `Email: ${email.subject || "(No Subject)"}`,
        linkedEmailId: emailId,
        notes: notes || null,
        uploadedBy: dbUser.email || "Unknown",
      }).returning();

      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to link email" });
    }
  });

  app.delete("/api/time-entries/docs/:docId", async (req: Request, res: Response) => {
    try {
      const [doc] = await db.select()
        .from(timeEntrySupportingDocs)
        .where(eq(timeEntrySupportingDocs.id, req.params.docId));
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }

      await db.delete(timeEntrySupportingDocs)
        .where(eq(timeEntrySupportingDocs.id, req.params.docId));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/time-entries/docs/:docId/download", async (req: Request, res: Response) => {
    try {
      const [doc] = await db.select()
        .from(timeEntrySupportingDocs)
        .where(eq(timeEntrySupportingDocs.id, req.params.docId));
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      if (!doc.filePath || !fs.existsSync(doc.filePath)) {
        return res.status(404).json({ error: "File not found on disk" });
      }
      res.download(doc.filePath, doc.fileName);
    } catch (error) {
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  app.get("/api/time-entries/:timeEntryId/linked-emails", async (req: Request, res: Response) => {
    try {
      const docs = await db.select()
        .from(timeEntrySupportingDocs)
        .where(
          and(
            eq(timeEntrySupportingDocs.timeEntryId, req.params.timeEntryId),
            eq(timeEntrySupportingDocs.docType, "email")
          )
        );

      const emailIds = docs
        .map(d => d.linkedEmailId)
        .filter((id): id is string => !!id);

      if (emailIds.length === 0) {
        return res.json([]);
      }

      const emails = [];
      for (const eid of emailIds) {
        const [email] = await db.select()
          .from(analyzedEmails)
          .where(eq(analyzedEmails.id, eid));
        if (email) emails.push(email);
      }

      res.json(emails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch linked emails" });
    }
  });

  app.get("/api/matters/:matterId/emails-for-linking", async (req: Request, res: Response) => {
    try {
      const emails = await db.select()
        .from(analyzedEmails)
        .where(eq(analyzedEmails.matterId, req.params.matterId))
        .orderBy(desc(analyzedEmails.createdAt))
        .limit(50);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter emails" });
    }
  });
}
