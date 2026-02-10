import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { teamMembers, matterDocuments, boards, groups, tasks } from "@shared/models/tables";
import { eq, desc, inArray } from "drizzle-orm";
import { seedDefaultDeadlineRules } from "../services/deadline-engine";
import {
  insertMatterSchema,
  updateMatterSchema,
  insertMatterContactSchema,
  updateMatterContactSchema,
  insertTimelineEventSchema,
  insertTimeEntrySchema,
  insertExpenseSchema,
  insertThreadSchema,
  updateThreadSchema,
  insertThreadMessageSchema,
  insertThreadDecisionSchema,
  insertResearchResultSchema,
} from "@shared/schema";
import { z } from "zod";
import { maybePageinate } from "../utils/pagination";
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
      const teamNames: string[] = [];
      const allAssignedIds = [
        ...(req.body.assignedAttorneys || []),
        ...(req.body.assignedParalegals || []),
      ].filter(Boolean);
      if (allAssignedIds.length > 0) {
        const members = await db.select().from(teamMembers).where(inArray(teamMembers.id, allAssignedIds));
        for (const m of members) {
          teamNames.push(`${m.firstName} ${m.lastName}`);
        }
      }
      const boardDesc = `Case board for ${matter.name} | Opened: ${matter.openedDate}${teamNames.length ? ` | Team: ${teamNames.join(", ")}` : ""}`;

      const masterBoard = await storage.createBoard({
        name: matter.name,
        description: boardDesc,
        color: "#6366f1",
        icon: "briefcase",
        clientId: matter.clientId,
        matterId: matter.id,
        workspaceId: workspaceId || undefined,
      });

      const linkedBoards = [
        { name: `${matter.name} - Filings`, color: "#3b82f6", icon: "file-text" },
        { name: `${matter.name} - Discovery`, color: "#8b5cf6", icon: "search" },
        { name: `${matter.name} - Motions`, color: "#ef4444", icon: "gavel" },
        { name: `${matter.name} - Deadlines`, color: "#f59e0b", icon: "calendar-clock" },
        { name: `${matter.name} - Evidence/Docs`, color: "#10b981", icon: "folder-archive" },
      ];

      for (const lb of linkedBoards) {
        await storage.createBoard({
          name: lb.name,
          description: `${lb.name} board for ${matter.name}`,
          color: lb.color,
          icon: lb.icon,
          clientId: matter.clientId,
          matterId: matter.id,
          workspaceId: workspaceId || undefined,
        });
      }

      const presetGroups = [
        { title: "Waiting", color: "#f59e0b", order: 0 },
        { title: "Tasks", color: "#6366f1", order: 1 },
        { title: "Motions", color: "#ef4444", order: 2 },
        { title: "Filings", color: "#3b82f6", order: 3 },
        { title: "Files", color: "#10b981", order: 4 },
        { title: "In Progress", color: "#8b5cf6", order: 5 },
        { title: "Stuck", color: "#dc2626", order: 6 },
        { title: "Finished", color: "#22c55e", order: 7 },
      ];

      const createdGroups: Record<string, string> = {};
      for (const pg of presetGroups) {
        const [g] = await db.insert(groups).values({
          title: pg.title,
          color: pg.color,
          boardId: masterBoard.id,
          order: pg.order,
        }).returning();
        createdGroups[pg.title] = g.id;
      }

      const baselineTasks = [
        { title: "Confirm service date", group: "Tasks", priority: "high" as const },
        { title: "Check for scheduling order", group: "Tasks", priority: "high" as const },
        { title: "Set discovery plan / disclosures deadline", group: "Tasks", priority: "medium" as const },
        { title: "Review opposing counsel filings", group: "Tasks", priority: "medium" as const },
        { title: "Upload initial case documents", group: "Tasks", priority: "medium" as const },
      ];

      for (const t of baselineTasks) {
        await db.insert(tasks).values({
          title: t.title,
          status: "not-started",
          priority: t.priority,
          boardId: masterBoard.id,
          groupId: createdGroups[t.group],
        });
      }

      const { automationRules: automationRulesTable } = await import("@shared/models/tables");
      const statusAutomations = [
        {
          name: "Move to In Progress on status change",
          triggerType: "task.updated",
          triggerField: "status",
          triggerValue: "working-on-it",
          actionType: "move_to_group",
          actionConfig: { groupId: createdGroups["In Progress"] },
        },
        {
          name: "Move to Stuck on status change",
          triggerType: "task.updated",
          triggerField: "status",
          triggerValue: "stuck",
          actionType: "move_to_group",
          actionConfig: { groupId: createdGroups["Stuck"] },
        },
        {
          name: "Move to Finished on completion",
          triggerType: "task.updated",
          triggerField: "status",
          triggerValue: "done",
          actionType: "move_to_group",
          actionConfig: { groupId: createdGroups["Finished"] },
        },
        {
          name: "Move to Waiting on pending review",
          triggerType: "task.updated",
          triggerField: "status",
          triggerValue: "pending-review",
          actionType: "move_to_group",
          actionConfig: { groupId: createdGroups["Waiting"] },
        },
      ];

      for (const auto of statusAutomations) {
        await db.insert(automationRulesTable).values({
          boardId: masterBoard.id,
          name: auto.name,
          triggerType: auto.triggerType,
          triggerField: auto.triggerField,
          triggerValue: auto.triggerValue,
          actionType: auto.actionType,
          actionConfig: auto.actionConfig,
          isActive: true,
        });
      }

      seedDefaultDeadlineRules().catch(() => {});

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
        assignedAttorneys: (original as any).assignedAttorneys || [],
        assignedParalegals: (original as any).assignedParalegals || [],
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
      const originalMatter = await storage.getMatter(req.params.id);
      const data = updateMatterSchema.parse(req.body);
      const matter = await storage.updateMatter(req.params.id, data as any);
      if (!matter) {
        return res.status(404).json({ error: "Matter not found" });
      }

      if (originalMatter && data.status && data.status !== originalMatter.status) {
        try {
          const boards = await storage.getBoardsByMatter(matter.id);
          for (const board of boards) {
            await storage.updateBoard(board.id, {
              description: board.description?.replace(
                /Status: \w+/,
                `Status: ${matter.status}`
              ) || `Status: ${matter.status}`,
            });

            const { triggerAutomation } = await import("../automation-engine");
            await triggerAutomation({
              type: "status_changed",
              boardId: board.id,
              previousValue: originalMatter.status,
              newValue: matter.status,
              metadata: {
                source: "matter_update",
                matterId: matter.id,
                clientId: matter.clientId,
              },
            });
          }

          await storage.createTimelineEvent({
            matterId: matter.id,
            eventType: "status_changed",
            title: `Matter status changed to ${matter.status}`,
            description: `Status changed from "${originalMatter.status}" to "${matter.status}"`,
            createdBy: (req as any).dbUser?.id || "system",
            eventDate: new Date().toISOString(),
            metadata: {
              previousStatus: originalMatter.status,
              newStatus: matter.status,
              autoGenerated: true,
              sourceEntity: "matter",
            },
          });
        } catch (_e) {}
      }

      res.json(matter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update matter" });
    }
  });

  app.post("/api/matters/:matterId/log-call", async (req, res) => {
    try {
      const { matterId } = req.params;
      const matter = await storage.getMatter(matterId);
      if (!matter) return res.status(404).json({ error: "Matter not found" });

      const callSchema = z.object({
        contactName: z.string().min(1, "Contact name is required"),
        contactPhone: z.string().optional(),
        duration: z.number().min(1, "Duration must be at least 1 minute").optional().default(15),
        notes: z.string().optional(),
        callType: z.enum(["inbound", "outbound"]).optional().default("outbound"),
        billable: z.boolean().optional().default(true),
        hourlyRate: z.number().min(0).optional().default(350),
      });

      const callData = callSchema.parse(req.body);
      const client = await storage.getClient(matter.clientId);
      const dbUser = (req as any).dbUser;

      const hours = callData.duration / 60;
      const userName = dbUser ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email : "Unknown User";
      const userId = dbUser?.id || "unknown";
      const today = new Date().toISOString().split("T")[0];
      const amount = callData.billable ? hours * callData.hourlyRate : 0;

      const timeEntryData = insertTimeEntrySchema.parse({
        matterId,
        userId,
        userName,
        date: today,
        hours,
        description: `Phone call (${callData.callType}) with ${callData.contactName}${callData.notes ? ": " + callData.notes : ""}`,
        billableStatus: callData.billable ? "billable" : "non-billable",
        hourlyRate: callData.billable ? callData.hourlyRate : undefined,
        activityCode: "CALL",
      });
      const timeEntry = await storage.createTimeEntry(timeEntryData);

      const timelineData = insertTimelineEventSchema.parse({
        matterId,
        eventType: "custom",
        title: `Phone Call: ${callData.contactName}`,
        description: `${callData.callType} call | ${callData.duration}min | ${callData.billable ? "Billable" : "Non-billable"}${callData.notes ? " | " + callData.notes : ""}`,
        createdBy: userId,
        eventDate: new Date().toISOString(),
        metadata: {
          contactName: callData.contactName,
          contactPhone: callData.contactPhone,
          callType: callData.callType,
          durationMinutes: callData.duration,
          billable: callData.billable,
          hourlyRate: callData.billable ? callData.hourlyRate : null,
          amount,
          timeEntryId: timeEntry.id,
          clientId: matter.clientId,
          clientName: client?.name,
          autoGenerated: true,
          sourceEntity: "phone_call",
        },
      });
      const timelineEvent = await storage.createTimelineEvent(timelineData);

      let expense = null;
      if (callData.billable && amount > 0) {
        try {
          const expenseData = insertExpenseSchema.parse({
            matterId,
            clientId: matter.clientId,
            date: today,
            amount,
            description: `Phone call with ${callData.contactName} (${callData.duration}min @ $${callData.hourlyRate}/hr)`,
            category: "other",
            billable: true,
            reimbursable: false,
            createdBy: userId,
          });
          expense = await storage.createExpense(expenseData);
        } catch (_e) {}
      }

      const cascadeErrors: string[] = [];
      try {
        const boards = await storage.getBoardsByMatter(matterId);
        for (const board of boards) {
          try {
            const { triggerAutomation } = await import("../automation-engine");
            await triggerAutomation({
              type: "item_created",
              boardId: board.id,
              metadata: {
                source: "phone_call",
                timeEntryId: timeEntry.id,
                matterId,
                clientId: matter.clientId,
                hours,
                amount,
                contactName: callData.contactName,
              },
            });
          } catch (e: any) {
            cascadeErrors.push(`Board automation: ${e.message || "unknown"}`);
          }
        }
      } catch (e: any) {
        cascadeErrors.push(`Board lookup: ${e.message || "unknown"}`);
      }

      res.status(201).json({
        timeEntry,
        timelineEvent,
        expense,
        billing: {
          hours,
          rate: callData.billable ? callData.hourlyRate : 0,
          amount,
          clientId: matter.clientId,
          clientName: client?.name,
          matterId: matter.id,
          matterName: matter.name,
        },
        cascadeStatus: cascadeErrors.length === 0 ? "complete" : "partial",
        cascadeErrors: cascadeErrors.length > 0 ? cascadeErrors : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to log phone call" });
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
        } as any).returning();
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
