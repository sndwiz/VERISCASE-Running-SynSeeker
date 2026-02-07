import type { Express } from "express";
import { storage } from "../storage";
import {
  insertMatterSchema,
  updateMatterSchema,
  insertMatterContactSchema,
  updateMatterContactSchema,
  insertTimelineEventSchema,
  insertThreadSchema,
  updateThreadSchema,
  insertThreadMessageSchema,
  insertThreadDecisionSchema,
  insertResearchResultSchema,
} from "@shared/schema";
import { z } from "zod";
import { maybePageinate } from "../utils/pagination";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { matterDocuments } from "@shared/models/tables";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads", "matter-documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/html",
  "text/rtf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
  "application/xml",
  "message/rfc822",
]);

const matterUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}-${sanitized}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

export function registerMatterRoutes(app: Express): void {
  app.get("/api/team-members", async (_req, res) => {
    try {
      const members = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }).from(users);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/matters", async (req, res) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const matters = await storage.getMatters(clientId);
      res.json(maybePageinate(matters, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matters" });
    }
  });

  app.get("/api/matters/:id", async (req, res) => {
    try {
      const matter = await storage.getMatter(req.params.id);
      if (!matter) {
        return res.status(404).json({ error: "Matter not found" });
      }
      res.json(matter);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter" });
    }
  });

  app.post("/api/matters", async (req, res) => {
    try {
      const data = insertMatterSchema.parse(req.body);
      const matter = await storage.createMatter(data);

      const workspaceId = req.body.workspaceId as string | undefined;
      await storage.createBoard({
        name: matter.name,
        description: `Case board for ${matter.name}`,
        color: "#6366f1",
        icon: "briefcase",
        clientId: matter.clientId,
        matterId: matter.id,
        workspaceId: workspaceId || undefined,
      });

      res.status(201).json(matter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create matter" });
    }
  });

  app.post("/api/matters/:id/duplicate", async (req, res) => {
    try {
      const original = await storage.getMatter(req.params.id);
      if (!original) {
        return res.status(404).json({ error: "Matter not found" });
      }

      const duplicateData = {
        clientId: original.clientId,
        name: `${original.name} (Copy)`,
        caseNumber: `CASE-${Date.now().toString(36).toUpperCase()}`,
        matterType: original.matterType,
        status: "active" as const,
        description: original.description || "",
        openedDate: new Date().toISOString().split("T")[0],
        responsiblePartyId: (original as any).responsiblePartyId || undefined,
        practiceArea: original.practiceArea,
        courtName: original.courtName || undefined,
        judgeAssigned: original.judgeAssigned || undefined,
        opposingCounsel: original.opposingCounsel || undefined,
      };

      const newMatter = await storage.createMatter(duplicateData);

      const workspaceId = req.body.workspaceId as string | undefined;
      await storage.createBoard({
        name: newMatter.name,
        description: `Case board for ${newMatter.name}`,
        color: "#6366f1",
        icon: "briefcase",
        clientId: newMatter.clientId,
        matterId: newMatter.id,
        workspaceId: workspaceId || undefined,
      });

      res.status(201).json(newMatter);
    } catch (error) {
      res.status(500).json({ error: "Failed to duplicate matter" });
    }
  });

  app.patch("/api/matters/:id", async (req, res) => {
    try {
      const data = updateMatterSchema.parse(req.body);
      const matter = await storage.updateMatter(req.params.id, data);
      if (!matter) {
        return res.status(404).json({ error: "Matter not found" });
      }
      res.json(matter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update matter" });
    }
  });

  app.delete("/api/matters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMatter(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Matter not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete matter" });
    }
  });

  app.get("/api/matters/:matterId/contacts", async (req, res) => {
    try {
      const contacts = await storage.getMatterContacts(req.params.matterId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/matters/:matterId/contacts", async (req, res) => {
    try {
      const data = insertMatterContactSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const contact = await storage.createMatterContact(data);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const data = updateMatterContactSchema.parse(req.body);
      const contact = await storage.updateMatterContact(req.params.id, data);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMatterContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/matters/:matterId/timeline", async (req, res) => {
    try {
      const events = await storage.getTimelineEvents(req.params.matterId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch timeline events" });
    }
  });

  app.post("/api/matters/:matterId/timeline", async (req, res) => {
    try {
      const data = insertTimelineEventSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const event = await storage.createTimelineEvent(data);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create timeline event" });
    }
  });

  app.get("/api/matters/:matterId/threads", async (req, res) => {
    try {
      const threads = await storage.getThreads(req.params.matterId);
      res.json(threads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const thread = await storage.getThread(req.params.id);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      res.json(thread);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  app.post("/api/matters/:matterId/threads", async (req, res) => {
    try {
      const data = insertThreadSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const thread = await storage.createThread(data);
      res.status(201).json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  app.patch("/api/threads/:id", async (req, res) => {
    try {
      const data = updateThreadSchema.parse(req.body);
      const thread = await storage.updateThread(req.params.id, data);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      res.json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update thread" });
    }
  });

  app.get("/api/threads/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getThreadMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread messages" });
    }
  });

  app.post("/api/threads/:id/messages", async (req, res) => {
    try {
      const data = insertThreadMessageSchema.parse({
        ...req.body,
        threadId: req.params.id,
      });
      const message = await storage.createThreadMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create thread message" });
    }
  });

  app.get("/api/threads/:id/decisions", async (req, res) => {
    try {
      const decisions = await storage.getThreadDecisions(req.params.id);
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread decisions" });
    }
  });

  app.post("/api/threads/:id/decisions", async (req, res) => {
    try {
      const data = insertThreadDecisionSchema.parse({
        ...req.body,
        threadId: req.params.id,
      });
      const decision = await storage.createThreadDecision(data);
      res.status(201).json(decision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create thread decision" });
    }
  });

  app.get("/api/matters/:matterId/research", async (req, res) => {
    try {
      const results = await storage.getResearchResults(req.params.matterId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch research results" });
    }
  });

  app.post("/api/matters/:matterId/research", async (req, res) => {
    try {
      const data = insertResearchResultSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const result = await storage.createResearchResult(data);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create research result" });
    }
  });

  app.get("/api/matters/:matterId/documents", async (req, res) => {
    try {
      const docs = await db.select({
        id: matterDocuments.id,
        matterId: matterDocuments.matterId,
        fileName: matterDocuments.fileName,
        fileSize: matterDocuments.fileSize,
        mimeType: matterDocuments.mimeType,
        uploadedAt: matterDocuments.uploadedAt,
      }).from(matterDocuments)
        .where(eq(matterDocuments.matterId, req.params.matterId))
        .orderBy(desc(matterDocuments.uploadedAt));
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/matters/:matterId/documents", matterUpload.array("files", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const inserted = [];
      for (const file of files) {
        const [doc] = await db.insert(matterDocuments).values({
          matterId: req.params.matterId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          filePath: file.path,
        }).returning();
        inserted.push(doc);
      }

      res.status(201).json(inserted);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload documents" });
    }
  });

  app.delete("/api/matters/:matterId/documents/:docId", async (req, res) => {
    try {
      const [doc] = await db.select().from(matterDocuments)
        .where(eq(matterDocuments.id, req.params.docId));

      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      try {
        if (fs.existsSync(doc.filePath)) {
          fs.unlinkSync(doc.filePath);
        }
      } catch {
      }

      await db.delete(matterDocuments).where(eq(matterDocuments.id, req.params.docId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
}
