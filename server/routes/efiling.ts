import { Router, Request, Response, type Express } from "express";
import { db } from "../db";
import {
  caseFilings,
  caseDeadlines,
  caseActions,
  deadlineRules,
  jurisdictionProfiles,
  matters,
  draftDocuments,
  boards,
} from "@shared/models/tables";
import { eq, and, desc, asc } from "drizzle-orm";
import { getUserId } from "../utils/auth";
import { z } from "zod";
import {
  insertJurisdictionProfileSchema,
  insertDeadlineRuleSchema,
  insertCaseFilingSchema,
  updateActionStatusSchema,
  reclassifyFilingSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { classifyDocument, classifyByFileName } from "../services/document-classifier";
import {
  createDeadlinesFromFiling,
  getJurisdictionForMatter,
  seedDefaultDeadlineRules,
} from "../services/deadline-engine";
import {
  generateNextActions,
  createActionsFromDeadlines,
  createBoardTasksFromActions,
  updateActionStatus,
  getCasePhase,
} from "../services/sequencing-engine";
import { extractDatesFromText } from "../services/date-extractor";
import { generateDraftForAction } from "../services/document-builder";
import {
  syncDeadlineToCalendar,
  syncActionToCalendar,
  syncFilingToCalendar,
} from "../services/calendar-sync";

const router = Router();

const upload = multer({
  dest: "uploads/efiling/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ============ JURISDICTION PROFILES ============

router.get("/jurisdictions", async (_req: Request, res: Response) => {
  try {
    const profiles = await db.select().from(jurisdictionProfiles).orderBy(asc(jurisdictionProfiles.name));
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/jurisdictions", async (req: Request, res: Response) => {
  try {
    const data = insertJurisdictionProfileSchema.parse(req.body);
    const [created] = await db.insert(jurisdictionProfiles).values(data as any).returning();
    res.status(201).json(created);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
});

router.patch("/jurisdictions/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const allowed = ["name", "state", "courtType", "ruleSet", "discoveryResponseDays", "motionOppositionDays", "motionReplyDays", "initialDisclosureDays", "answerDays", "mailServiceExtraDays", "electronicServiceExtraDays", "weekendHolidayAdjust", "holidays", "customRules", "isDefault"] as const;
    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const [updated] = await db.update(jurisdictionProfiles)
      .set(updates)
      .where(eq(jurisdictionProfiles.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Jurisdiction not found" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DEADLINE RULES ============

router.get("/rules", async (_req: Request, res: Response) => {
  try {
    const rules = await db.select().from(deadlineRules).orderBy(asc(deadlineRules.name));
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/rules", async (req: Request, res: Response) => {
  try {
    const data = insertDeadlineRuleSchema.parse(req.body);
    const [created] = await db.insert(deadlineRules).values(data as any).returning();
    res.status(201).json(created);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
});

router.patch("/rules/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const allowed = ["name", "triggerDocType", "anchorDateField", "offsetDays", "resultAction", "resultDocType", "criticality", "ruleSource", "isActive", "jurisdictionId"] as const;
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });
    const [updated] = await db.update(deadlineRules)
      .set(updates)
      .where(eq(deadlineRules.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Rule not found" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/rules/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(deadlineRules).where(eq(deadlineRules.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SEED DEFAULT RULES ============

router.post("/seed-rules", async (_req: Request, res: Response) => {
  try {
    await seedDefaultDeadlineRules();
    const rules = await db.select().from(deadlineRules);
    const profiles = await db.select().from(jurisdictionProfiles);
    res.json({ rules: rules.length, jurisdictions: profiles.length, message: "Default rules seeded" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CASE FILINGS ============

router.get("/matters/:matterId/filings", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const filings = await db.select().from(caseFilings)
      .where(eq(caseFilings.matterId, req.params.matterId))
      .orderBy(desc(caseFilings.createdAt));
    res.json(filings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/filings/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [filing] = await db.select().from(caseFilings)
      .where(eq(caseFilings.id, req.params.id));
    if (!filing) return res.status(404).json({ error: "Filing not found" });
    res.json(filing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Document ingestion - upload + classify + compute deadlines + generate actions
router.post("/matters/:matterId/ingest", upload.single("file"), async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const userId = getUserId(req) || "system";
    const matterId = req.params.matterId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const [matter] = await db.select().from(matters).where(eq(matters.id, matterId)).limit(1);
    if (!matter) {
      return res.status(404).json({ error: "Matter not found" });
    }

    // 1. Save original file
    const destDir = path.join("uploads", "efiling", matterId);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, file.originalname);
    fs.renameSync(file.path, destPath);

    // 2. Compute hash
    const fileBuffer = fs.readFileSync(destPath);
    const sha256 = createHash("sha256").update(fileBuffer).digest("hex");

    // 3. Extract text (basic - for PDFs, use OCR from PDF Pro if needed)
    let ocrText = "";
    try {
      ocrText = fileBuffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").substring(0, 20000);
    } catch {
      ocrText = "";
    }

    // 4. Extract dates from text using regex (fast, reliable)
    const regexDates = extractDatesFromText(ocrText);

    // 5. Classify document (AI or filename fallback)
    const matterContext = {
      caseNumber: matter.caseNumber || undefined,
      courtName: matter.courtName || undefined,
      parties: [],
    };

    let classification;
    if (ocrText.length > 100) {
      classification = await classifyDocument(ocrText, file.originalname, matterContext);
    } else {
      const fileNameHint = classifyByFileName(file.originalname);
      classification = {
        docType: fileNameHint.docType || "Other",
        docSubtype: fileNameHint.docSubtype || null,
        docCategory: fileNameHint.docCategory || "admin-operations",
        confidence: 0.4,
        filedDate: null,
        servedDate: null,
        hearingDate: null,
        responseDeadlineAnchor: null,
        partiesInvolved: [],
        extractedFacts: {},
        relatedDocReference: null,
      };
    }

    // Merge dates: request body > AI classification > regex extraction > fallback
    const filedDate = req.body.filedDate || classification.filedDate || regexDates.filedDate?.value || null;
    const servedDate = req.body.servedDate || classification.servedDate || regexDates.servedDate?.value || null;
    const hearingDate = req.body.hearingDate || classification.hearingDate || regexDates.hearingDate?.value || null;

    const dateExtractionMeta = {
      regexDates: {
        filed: regexDates.filedDate,
        served: regexDates.servedDate,
        hearing: regexDates.hearingDate,
      },
      aiDates: {
        filed: classification.filedDate,
        served: classification.servedDate,
        hearing: classification.hearingDate,
      },
    };

    // 5. Create case filing record
    const [filing] = await db.insert(caseFilings).values({
      matterId,
      originalFileName: file.originalname,
      filePath: destPath,
      ocrText,
      docType: classification.docType,
      docSubtype: classification.docSubtype,
      docCategory: classification.docCategory,
      classificationConfidence: classification.confidence,
      filedDate,
      servedDate,
      hearingDate,
      responseDeadlineAnchor: classification.responseDeadlineAnchor || servedDate,
      partiesInvolved: classification.partiesInvolved,
      extractedFacts: { ...classification.extractedFacts, dateExtraction: dateExtractionMeta },
      relatedFilingId: null,
      filingProof: (classification.extractedFacts as any)?.filedTimestamp
        ? { filedTimestamp: (classification.extractedFacts as any).filedTimestamp, documentTitle: (classification.extractedFacts as any).documentTitleAsFiled }
        : {},
      sourceType: req.body.sourceType || "manual",
      sha256Hash: sha256,
      classifiedBy: ocrText.length > 100 ? "ai" : "filename",
      createdBy: userId,
    }).returning();

    // 7. Compute and create deadlines
    const jurisdiction = await getJurisdictionForMatter(matterId);
    const deadlineIds = await createDeadlinesFromFiling(filing, jurisdiction?.id);

    // 8. Generate and create actions
    const actionIds = await createActionsFromDeadlines(matterId, undefined);

    // 9. Route tasks to correct sub-boards (Discovery, Motions, Filings)
    const category = classification.docCategory || "admin-operations";
    const subBoardSuffix = category === "discovery" ? "Discovery"
      : category === "motion" ? "Motions"
      : "Filings";
    const matterBoards = await db.select().from(boards)
      .where(eq(boards.matterId, matterId));
    const targetBoard = matterBoards.find(b => b.name.includes(subBoardSuffix))
      || matterBoards[0];
    if (targetBoard) {
      await createBoardTasksFromActions(matterId, targetBoard.id);
    }

    // 10. Generate draft document shell for next required action
    let draftsCreated = 0;
    const createdActions = await db.select().from(caseActions)
      .where(and(eq(caseActions.matterId, matterId), eq(caseActions.status, "draft")));
    for (const action of createdActions) {
      const existingDraft = await db.select().from(draftDocuments)
        .where(eq(draftDocuments.linkedActionId, action.id)).limit(1);
      if (existingDraft.length > 0) continue;

      const draft = await generateDraftForAction(
        matterId, action.actionType, action.requiredDocType, action.filingId, action.deadlineId
      );
      if (draft) {
        await db.insert(draftDocuments).values({
          matterId,
          title: draft.title,
          templateType: draft.templateType,
          content: draft.content,
          linkedFilingId: draft.linkedFilingId,
          linkedDeadlineId: draft.linkedDeadlineId,
          linkedActionId: action.id,
          createdBy: userId,
          status: "draft",
        });
        draftsCreated++;
      }
    }

    // 11. Sync to calendar
    try {
      await syncFilingToCalendar(filing.id, userId);
      for (const dlId of deadlineIds) {
        await syncDeadlineToCalendar(dlId, userId);
      }
      for (const aId of actionIds) {
        await syncActionToCalendar(aId, userId);
      }
    } catch (syncErr) {
      console.error("[efiling] Calendar sync error (non-fatal):", syncErr);
    }

    try {
      if (targetBoard) {
        const { triggerAutomation } = await import("../automation-engine");
        await triggerAutomation({
          type: "file_classified",
          boardId: targetBoard.id,
          taskId: undefined,
          field: "docType",
          newValue: classification.docType,
          metadata: {
            filingId: filing.id,
            matterId,
            docType: classification.docType,
            docSubtype: classification.docSubtype,
            docCategory: classification.docCategory,
            confidence: classification.confidence,
            fileName: file.originalname,
            sha256,
          },
        });
      }
    } catch (autoErr) {
      console.error("[efiling] Automation trigger error (non-fatal):", autoErr);
    }

    // 14. Determine case phase
    const allFilings = await db.select().from(caseFilings)
      .where(eq(caseFilings.matterId, matterId));
    const casePhase = getCasePhase(allFilings);

    // 15. Build warnings
    const warnings: string[] = [];
    if (!filedDate && !servedDate) warnings.push("No filed or served date found - dates may need manual entry");
    if (!jurisdiction) warnings.push("Unknown jurisdiction - deadline rules may be incomplete");
    if (classification.confidence < 0.5) warnings.push("Low classification confidence - verify document type");

    res.status(201).json({
      filing,
      classification: {
        docType: classification.docType,
        docSubtype: classification.docSubtype,
        confidence: classification.confidence,
      },
      dateExtraction: dateExtractionMeta,
      deadlinesCreated: deadlineIds.length,
      actionsCreated: actionIds.length,
      draftsCreated,
      casePhase,
      warnings,
    });
  } catch (error: any) {
    console.error("[efiling] Ingestion error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/matters/:matterId/filings", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const userId = getUserId(req) || "system";
    const data = insertCaseFilingSchema.omit({ matterId: true, createdBy: true, classifiedBy: true }).parse(req.body);
    const [filing] = await db.insert(caseFilings).values({
      ...data,
      matterId: req.params.matterId,
      createdBy: userId,
      classifiedBy: "manual",
    } as any).returning();

    const jurisdiction = await getJurisdictionForMatter(req.params.matterId);
    const deadlineIds = await createDeadlinesFromFiling(filing, jurisdiction?.id);
    await createActionsFromDeadlines(req.params.matterId);

    res.status(201).json({ filing, deadlinesCreated: deadlineIds.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
});

router.post("/filings/:id/reclassify", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const data = reclassifyFilingSchema.parse(req.body);
    const [filing] = await db.select().from(caseFilings)
      .where(eq(caseFilings.id, req.params.id));
    if (!filing) return res.status(404).json({ error: "Filing not found" });

    const [updated] = await db.update(caseFilings)
      .set({
        docType: data.docType || filing.docType,
        docSubtype: data.docSubtype !== undefined ? data.docSubtype : filing.docSubtype,
        docCategory: data.docCategory || filing.docCategory,
        filedDate: data.filedDate !== undefined ? data.filedDate : filing.filedDate,
        servedDate: data.servedDate !== undefined ? data.servedDate : filing.servedDate,
        hearingDate: data.hearingDate !== undefined ? data.hearingDate : filing.hearingDate,
        classifiedBy: "manual",
        updatedAt: new Date(),
      })
      .where(eq(caseFilings.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
});

router.delete("/filings/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(caseFilings).where(eq(caseFilings.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CASE DEADLINES ============

router.get("/matters/:matterId/deadlines", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const deadlines = await db.select().from(caseDeadlines)
      .where(eq(caseDeadlines.matterId, req.params.matterId))
      .orderBy(asc(caseDeadlines.dueDate));
    res.json(deadlines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/deadlines/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const allowed = ["title", "dueDate", "dueTime", "anchorEvent", "anchorDate", "ruleSource", "criticality", "status", "requiredAction", "resultDocType", "assignedTo", "notes"] as const;
    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const [updated] = await db.update(caseDeadlines)
      .set(updates)
      .where(eq(caseDeadlines.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Deadline not found" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/deadlines/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(caseDeadlines).where(eq(caseDeadlines.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CASE ACTIONS ============

router.get("/matters/:matterId/actions", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const actions = await db.select().from(caseActions)
      .where(eq(caseActions.matterId, req.params.matterId))
      .orderBy(asc(caseActions.dueDate));
    res.json(actions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/matters/:matterId/next-actions", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const actions = await generateNextActions(req.params.matterId);
    const allFilings = await db.select().from(caseFilings)
      .where(eq(caseFilings.matterId, req.params.matterId));
    const phase = getCasePhase(allFilings);
    res.json({ phase, actions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/actions/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    if (req.body.status) {
      const parsed = updateActionStatusSchema.parse({ status: req.body.status });
      const userId = getUserId(req) || "system";
      await updateActionStatus(req.params.id, parsed.status, userId);
    }
    const allowed = ["title", "description", "actionType", "requiredDocType", "priority", "dueDate", "assignedTo", "generatedDocPath"] as const;
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(caseActions)
        .set(updates)
        .where(eq(caseActions.id, req.params.id));
    }
    const [action] = await db.select().from(caseActions)
      .where(eq(caseActions.id, req.params.id));
    if (!action) return res.status(404).json({ error: "Action not found" });
    res.json(action);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
});

router.delete("/actions/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(caseActions).where(eq(caseActions.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DEADLINE OVERRIDES ============

router.patch("/deadlines/:id/override", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = getUserId(req) || "system";
    const { dueDate, anchorDate, status, notes } = req.body;

    const [existing] = await db.select().from(caseDeadlines)
      .where(eq(caseDeadlines.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Deadline not found" });

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (dueDate) updates.dueDate = dueDate;
    if (anchorDate) updates.anchorDate = anchorDate;
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (status === "confirmed") {
      updates.confirmedAt = new Date();
      updates.confirmedBy = userId;
    }

    const [updated] = await db.update(caseDeadlines)
      .set(updates)
      .where(eq(caseDeadlines.id, req.params.id))
      .returning();

    try {
      await syncDeadlineToCalendar(req.params.id, userId);
    } catch (syncErr) {
      console.error("[efiling] Calendar sync on override (non-fatal):", syncErr);
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DRAFT DOCUMENTS ============

router.get("/matters/:matterId/drafts", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const drafts = await db.select().from(draftDocuments)
      .where(eq(draftDocuments.matterId, req.params.matterId))
      .orderBy(desc(draftDocuments.createdAt));
    res.json(drafts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/drafts/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [draft] = await db.select().from(draftDocuments)
      .where(eq(draftDocuments.id, req.params.id));
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json(draft);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/drafts/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { content, title, status } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (content !== undefined) updates.content = content;
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(draftDocuments)
      .set(updates)
      .where(eq(draftDocuments.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/drafts/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(draftDocuments).where(eq(draftDocuments.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MATTER DASHBOARD SUMMARY ============

router.get("/matters/:matterId/dashboard", async (req: Request<{ matterId: string }>, res: Response) => {
  try {
    const matterId = req.params.matterId;

    const filings = await db.select().from(caseFilings)
      .where(eq(caseFilings.matterId, matterId))
      .orderBy(desc(caseFilings.createdAt));

    const deadlines = await db.select().from(caseDeadlines)
      .where(eq(caseDeadlines.matterId, matterId))
      .orderBy(asc(caseDeadlines.dueDate));

    const actions = await db.select().from(caseActions)
      .where(eq(caseActions.matterId, matterId))
      .orderBy(asc(caseActions.dueDate));

    const drafts = await db.select().from(draftDocuments)
      .where(eq(draftDocuments.matterId, matterId))
      .orderBy(desc(draftDocuments.createdAt));

    const phase = getCasePhase(filings);

    const now = new Date().toISOString().split("T")[0];
    const overdueDeadlines = deadlines.filter(
      (d) => d.status === "pending" && d.dueDate < now
    );
    const upcomingDeadlines = deadlines.filter(
      (d) => d.status === "pending" && d.dueDate >= now
    ).slice(0, 10);

    const pendingActions = actions.filter(
      (a) => a.status !== "served" && a.status !== "confirmed"
    );

    const jurisdiction = await getJurisdictionForMatter(matterId);

    const warnings: string[] = [];
    const filingsWithoutDates = filings.filter(f => !f.filedDate && !f.servedDate);
    if (filingsWithoutDates.length > 0) {
      warnings.push(`${filingsWithoutDates.length} filing(s) have no filed or served date`);
    }
    if (!jurisdiction) {
      warnings.push("No jurisdiction profile matched - verify court/jurisdiction settings");
    }
    const unconfirmedDeadlines = deadlines.filter(d => d.status === "pending" && !d.confirmedAt);
    if (unconfirmedDeadlines.length > 0) {
      warnings.push(`${unconfirmedDeadlines.length} deadline(s) need verification/confirmation`);
    }

    res.json({
      casePhase: phase,
      totalFilings: filings.length,
      totalDeadlines: deadlines.length,
      totalActions: actions.length,
      totalDrafts: drafts.length,
      overdueCount: overdueDeadlines.length,
      upcomingDeadlines,
      overdueDeadlines,
      pendingActions,
      recentFilings: filings.slice(0, 5),
      recentDrafts: drafts.slice(0, 5),
      filingsByType: filings.reduce((acc: Record<string, number>, f) => {
        acc[f.docType] = (acc[f.docType] || 0) + 1;
        return acc;
      }, {}),
      jurisdiction: jurisdiction ? { id: jurisdiction.id, name: jurisdiction.name, state: jurisdiction.state } : null,
      warnings,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export function registerEfilingRoutes(app: Express) { app.use('/api/efiling', router); }

export default router;
