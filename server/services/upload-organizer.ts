import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import {
  incomingFiles,
  organizeRuns,
  organizePlanItems,
  fileChangeLog,
  matters,
  clients,
} from "../../shared/models/tables";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import type {
  ScanSummary,
  OrganizePlanGroup,
  ConfidenceLevel,
  OrganizeAction,
} from "../../shared/schema";

const FOLDER_MAP = {
  invoice: "/Operations/Receipts",
  receipt: "/Operations/Receipts",
  billing: "/Operations/Billing",
  contract: "/Unsorted",
  lease: "/Unsorted",
  legal: "/Unsorted",
  screenshot: "/Operations/Systems",
  marketing: "/Operations/Marketing",
  photo: "/Unsorted",
  unknown: "/Unsorted",
} as const;

export async function getScanSummary(userId: string, matterId?: string): Promise<ScanSummary> {
  const conditions = [eq(incomingFiles.userId, userId)];
  if (matterId) {
    conditions.push(eq(incomingFiles.matterId, matterId));
  }

  const allFiles = await db
    .select()
    .from(incomingFiles)
    .where(and(...conditions))
    .orderBy(incomingFiles.uploadedAt);

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const countsByType: Record<string, number> = {};
  const countsBySubtype: Record<string, number> = {};
  let derivedTextCount = 0;
  let last14DaysCount = 0;

  for (const f of allFiles) {
    countsByType[f.fileType] = (countsByType[f.fileType] || 0) + 1;
    if (f.subtype) {
      countsBySubtype[f.subtype] = (countsBySubtype[f.subtype] || 0) + 1;
    }
    if (f.ocrText) derivedTextCount++;
    if (f.uploadedAt && new Date(f.uploadedAt) >= fourteenDaysAgo) {
      last14DaysCount++;
    }
  }

  return {
    totalCount: allFiles.length,
    dateRangeOldest: allFiles.length > 0 ? allFiles[0].uploadedAt?.toISOString() ?? null : null,
    dateRangeNewest: allFiles.length > 0 ? allFiles[allFiles.length - 1].uploadedAt?.toISOString() ?? null : null,
    countsByType,
    countsBySubtype,
    derivedTextCount,
    last14DaysCount,
  };
}

export async function createOrganizeRun(
  userId: string,
  scope: string = "incoming",
  matterId?: string,
  daysFilter: number = 14,
): Promise<{ runId: string; planGroups: OrganizePlanGroup[] }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysFilter * 24 * 60 * 60 * 1000);

  const conditions = [
    eq(incomingFiles.userId, userId),
    eq(incomingFiles.status, "new"),
    gte(incomingFiles.uploadedAt, cutoff),
  ];
  if (matterId) {
    conditions.push(eq(incomingFiles.matterId, matterId));
  }

  const files = await db
    .select()
    .from(incomingFiles)
    .where(and(...conditions))
    .orderBy(desc(incomingFiles.uploadedAt));

  if (files.length === 0) {
    const [run] = await db.insert(organizeRuns).values({
      userId,
      scope,
      matterId,
      daysFilter,
      totalFiles: 0,
      status: "complete",
    }).returning();
    return { runId: run.id, planGroups: [] };
  }

  const mattersList = await db.select({
    id: matters.id,
    name: matters.name,
    clientName: clients.name,
  }).from(matters).leftJoin(clients, eq(matters.clientId, clients.id));

  const matterContext = mattersList.map(m =>
    `Matter: "${m.name}" (ID: ${m.id}, Client: ${m.clientName || "N/A"})`
  ).join("\n");

  const pastDecisions = await db
    .select({
      suggestedAction: organizePlanItems.suggestedAction,
      approvedAction: organizePlanItems.approvedAction,
      suggestedFolder: organizePlanItems.suggestedFolder,
      approvedFolder: organizePlanItems.approvedFolder,
      suggestedFilename: organizePlanItems.suggestedFilename,
      approvedFilename: organizePlanItems.approvedFilename,
      detectedSummary: organizePlanItems.detectedSummary,
      groupLabel: organizePlanItems.groupLabel,
    })
    .from(organizePlanItems)
    .where(eq(organizePlanItems.executionStatus, "executed"))
    .orderBy(desc(organizePlanItems.executedAt))
    .limit(30);

  let learningContext = "";
  if (pastDecisions.length > 0) {
    learningContext = `\n\nLEARNING FROM PAST DECISIONS (${pastDecisions.length} recent approved actions):
The user has previously approved these classifications. Use these patterns to improve your suggestions:
${pastDecisions.map((d, i) => `${i + 1}. Summary: "${d.detectedSummary}" → Action: ${d.approvedAction || d.suggestedAction}, Folder: ${d.approvedFolder || d.suggestedFolder}, Name: ${d.approvedFilename || d.suggestedFilename}, Group: ${d.groupLabel}`).join("\n")}`;
  }

  const fileDescriptions = files.map((f, i) => {
    let desc = `File ${i + 1}:
- ID: ${f.id}
- Original name: ${f.originalFilename}
- Type: ${f.fileType} (subtype: ${f.subtype || "unknown"})
- Size: ${f.sizeBytes} bytes
- MIME: ${f.mimeType || "unknown"}
- Uploaded: ${f.uploadedAt?.toISOString() || "unknown"}`;
    if (f.matterId) desc += `\n- Linked to matter ID: ${f.matterId}`;
    if (f.ocrText) desc += `\n- OCR text (first 500 chars): ${f.ocrText.slice(0, 500)}`;
    if (f.metadataJson) desc += `\n- Metadata: ${JSON.stringify(f.metadataJson).slice(0, 200)}`;
    return desc;
  }).join("\n\n");

  const prompt = `You are a legal file organization assistant for a law firm. Analyze the following ${files.length} files and suggest how to organize them.

AVAILABLE MATTERS:
${matterContext || "No matters exist yet."}

AVAILABLE FOLDERS:
- /Incoming (staging - current location)
- /Matters/<matterId>/Documents (legal documents for a specific matter)
- /Matters/<matterId>/Evidence (evidence for a specific matter)
- /Matters/<matterId>/Client-Provided (client-uploaded files)
- /Operations/Billing (invoices, billing records)
- /Operations/Receipts (receipts, expense records)
- /Operations/Marketing (marketing materials)
- /Operations/Systems (tech/app screenshots, system files)
- /Trash (soft delete candidates)
- /Unsorted (low confidence, needs manual review)

FILE NAMING CONVENTION:
Format: YYYY-MM-DD__<category>__<short-description>__<source>.<ext>
Rules: lowercase, hyphens not spaces, remove weird characters, keep under 80 chars
Categories: screenshot, pdf, image, doc, sheet, receipt, invoice, contract, letter, evidence, photo, other
Sources: incoming, client-upload, scan, camera, system, unknown

${learningContext}

FILES TO ORGANIZE:
${fileDescriptions}

For each file, respond with a JSON array. Each element:
{
  "fileId": "the file ID",
  "detectedSummary": "1-2 sentence description of what the file likely contains",
  "suggestedFilename": "new-filename-following-convention.ext",
  "suggestedFolder": "/path/to/destination",
  "suggestedAction": "rename_move" | "keep" | "trash_candidate",
  "confidence": "high" | "medium" | "low",
  "rationale": "brief reason for this suggestion",
  "groupLabel": "group category like 'Screenshots: UI / App', 'PDFs: Legal Documents', 'Images: Receipts', etc."
}

ROUTING RULES:
1. If file is linked to a Matter → propose that matter's folder first
2. If OCR text mentions invoice/receipt/billing → /Operations/Receipts or /Operations/Billing
3. If it looks like a legal doc/contract → link to matching matter if possible, else /Unsorted
4. If it's an app screenshot → /Operations/Systems
5. Duplicates/near-duplicates → mark as trash_candidate (keep newest)
6. Low-value files → trash_candidate with explanation

Respond ONLY with a valid JSON array, no markdown fences.`;

  let aiSuggestions: Array<{
    fileId: string;
    detectedSummary: string;
    suggestedFilename: string;
    suggestedFolder: string;
    suggestedAction: string;
    confidence: string;
    rationale: string;
    groupLabel: string;
  }> = [];

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b: any) => b.type === "text");
    const text = (textBlock as any)?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      aiSuggestions = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("AI classification error, using fallback rules:", err);
  }

  if (aiSuggestions.length === 0) {
    aiSuggestions = files.map(f => ({
      fileId: f.id,
      detectedSummary: `File: ${f.originalFilename} (${f.fileType})`,
      suggestedFilename: generateFallbackFilename(f),
      suggestedFolder: guessFolderFromType(f.fileType, f.subtype || "unknown", f.ocrText),
      suggestedAction: "rename_move",
      confidence: "low",
      rationale: "Auto-classified based on file type (AI unavailable)",
      groupLabel: `${capitalize(f.fileType)}s: General`,
    }));
  }

  const [run] = await db.insert(organizeRuns).values({
    userId,
    scope,
    matterId,
    daysFilter,
    totalFiles: files.length,
    filesToMove: aiSuggestions.filter(s => s.suggestedAction === "rename_move").length,
    filesToKeep: aiSuggestions.filter(s => s.suggestedAction === "keep").length,
    filesToTrash: aiSuggestions.filter(s => s.suggestedAction === "trash_candidate").length,
    status: "awaiting_approval",
    aiProvider: "anthropic",
    aiModel: "claude-sonnet-4-5-20250514",
  }).returning();

  for (const suggestion of aiSuggestions) {
    await db.insert(organizePlanItems).values({
      runId: run.id,
      incomingFileId: suggestion.fileId,
      detectedSummary: suggestion.detectedSummary,
      suggestedFilename: suggestion.suggestedFilename,
      suggestedFolder: suggestion.suggestedFolder,
      suggestedAction: suggestion.suggestedAction as OrganizeAction,
      confidence: suggestion.confidence as ConfidenceLevel,
      rationale: suggestion.rationale,
      groupLabel: suggestion.groupLabel,
    });
  }

  for (const f of files) {
    await db.update(incomingFiles)
      .set({ status: "planned" })
      .where(eq(incomingFiles.id, f.id));
  }

  const planItems = await db
    .select()
    .from(organizePlanItems)
    .where(eq(organizePlanItems.runId, run.id));

  const fileMap = new Map(files.map(f => [f.id, f]));
  const groups = groupPlanItems(planItems, fileMap);

  return { runId: run.id, planGroups: groups };
}

export async function getRunPlan(runId: string) {
  const [run] = await db.select().from(organizeRuns).where(eq(organizeRuns.id, runId));
  if (!run) return null;

  const planItems = await db
    .select()
    .from(organizePlanItems)
    .where(eq(organizePlanItems.runId, runId));

  const fileIds = planItems.map(p => p.incomingFileId);
  const files = fileIds.length > 0
    ? await db.select().from(incomingFiles).where(
        sql`${incomingFiles.id} IN (${sql.join(fileIds.map(id => sql`${id}`), sql`, `)})`
      )
    : [];

  const fileMap = new Map(files.map(f => [f.id, f]));
  const groups = groupPlanItems(planItems, fileMap);

  return { run, planGroups: groups };
}

export async function approvePlan(
  runId: string,
  userId: string,
  approvals: Array<{ planItemId: string; action: string; filename?: string; folder?: string }>,
) {
  for (const approval of approvals) {
    await db.update(organizePlanItems)
      .set({
        approvedAction: approval.action,
        approvedFilename: approval.filename || null,
        approvedFolder: approval.folder || null,
        executionStatus: "approved",
      })
      .where(eq(organizePlanItems.id, approval.planItemId));

    const [planItem] = await db.select().from(organizePlanItems)
      .where(eq(organizePlanItems.id, approval.planItemId));
    if (planItem) {
      await db.insert(fileChangeLog).values({
        incomingFileId: planItem.incomingFileId,
        planItemId: approval.planItemId,
        runId,
        changedByUserId: userId,
        action: "approved",
        oldFilename: null,
        newFilename: approval.filename || planItem.suggestedFilename,
        oldPath: null,
        newPath: approval.folder || planItem.suggestedFolder,
        reversible: false,
      });
    }
  }

  const unapprovedItems = await db
    .select()
    .from(organizePlanItems)
    .where(and(
      eq(organizePlanItems.runId, runId),
      eq(organizePlanItems.executionStatus, "pending"),
    ));

  for (const item of unapprovedItems) {
    await db.update(organizePlanItems)
      .set({ executionStatus: "rejected" })
      .where(eq(organizePlanItems.id, item.id));
  }

  await db.update(organizeRuns)
    .set({ status: "approved" })
    .where(eq(organizeRuns.id, runId));
}

export async function executePreviewBatch(runId: string, userId: string, batchSize: number = 10) {
  const approvedItems = await db
    .select()
    .from(organizePlanItems)
    .where(and(
      eq(organizePlanItems.runId, runId),
      eq(organizePlanItems.executionStatus, "approved"),
    ))
    .limit(batchSize);

  if (approvedItems.length === 0) {
    await db.update(organizeRuns)
      .set({ status: "complete", completedAt: new Date() })
      .where(eq(organizeRuns.id, runId));
    return { executed: 0, remaining: 0, results: [] };
  }

  await db.update(organizeRuns)
    .set({ status: "executing_preview" })
    .where(eq(organizeRuns.id, runId));

  const results: Array<{ itemId: string; success: boolean; error?: string }> = [];

  for (const item of approvedItems) {
    try {
      const [file] = await db.select().from(incomingFiles)
        .where(eq(incomingFiles.id, item.incomingFileId));
      if (!file) {
        results.push({ itemId: item.id, success: false, error: "File not found" });
        continue;
      }

      const newFilename = item.approvedFilename || item.suggestedFilename || file.originalFilename;
      const newPath = item.approvedFolder || item.suggestedFolder || file.currentPath;
      const action = item.approvedAction || item.suggestedAction;

      await db.insert(fileChangeLog).values({
        incomingFileId: file.id,
        planItemId: item.id,
        runId,
        changedByUserId: userId,
        action: action,
        oldFilename: file.originalFilename,
        newFilename: action === "trash_candidate" ? file.originalFilename : newFilename,
        oldPath: file.currentPath,
        newPath: action === "trash_candidate" ? "/Trash" : newPath,
      });

      await db.update(incomingFiles)
        .set({
          currentPath: action === "trash_candidate" ? "/Trash" : newPath,
          originalFilename: action === "trash_candidate" ? file.originalFilename : newFilename,
          status: action === "trash_candidate" ? "executed" : "executed",
        })
        .where(eq(incomingFiles.id, file.id));

      await db.update(organizePlanItems)
        .set({ executionStatus: "executed", executedAt: new Date() })
        .where(eq(organizePlanItems.id, item.id));

      results.push({ itemId: item.id, success: true });
    } catch (err: any) {
      await db.update(organizePlanItems)
        .set({ executionStatus: "failed", errorMessage: err.message })
        .where(eq(organizePlanItems.id, item.id));
      results.push({ itemId: item.id, success: false, error: err.message });
    }
  }

  const remainingCount = await db
    .select({ count: count() })
    .from(organizePlanItems)
    .where(and(
      eq(organizePlanItems.runId, runId),
      eq(organizePlanItems.executionStatus, "approved"),
    ));

  const remaining = remainingCount[0]?.count || 0;

  await db.update(organizeRuns)
    .set({
      status: remaining > 0 ? "paused" : "complete",
      executedCount: sql`${organizeRuns.executedCount} + ${results.filter(r => r.success).length}`,
      completedAt: remaining === 0 ? new Date() : null,
    })
    .where(eq(organizeRuns.id, runId));

  return { executed: results.filter(r => r.success).length, remaining, results };
}

export async function undoFileChange(changeLogId: string, userId: string) {
  const [logEntry] = await db.select().from(fileChangeLog)
    .where(eq(fileChangeLog.id, changeLogId));

  if (!logEntry) throw new Error("Change log entry not found");
  if (logEntry.reversedAt) throw new Error("This change has already been reversed");
  if (!logEntry.reversible) throw new Error("This change is not reversible");

  await db.update(incomingFiles)
    .set({
      originalFilename: logEntry.oldFilename || undefined,
      currentPath: logEntry.oldPath || "",
      status: "reverted",
    })
    .where(eq(incomingFiles.id, logEntry.incomingFileId));

  await db.update(fileChangeLog)
    .set({ reversedAt: new Date() })
    .where(eq(fileChangeLog.id, changeLogId));

  if (logEntry.planItemId) {
    await db.update(organizePlanItems)
      .set({ executionStatus: "reverted" })
      .where(eq(organizePlanItems.id, logEntry.planItemId));
  }

  await db.insert(fileChangeLog).values({
    incomingFileId: logEntry.incomingFileId,
    planItemId: logEntry.planItemId,
    runId: logEntry.runId,
    changedByUserId: userId,
    action: "undo",
    oldFilename: logEntry.newFilename,
    newFilename: logEntry.oldFilename,
    oldPath: logEntry.newPath,
    newPath: logEntry.oldPath,
    reversible: false,
  });

  return { success: true };
}

function groupPlanItems(
  planItems: any[],
  fileMap: Map<string, any>,
): OrganizePlanGroup[] {
  const groups: Map<string, OrganizePlanGroup> = new Map();

  for (const item of planItems) {
    const label = item.groupLabel || "Uncategorized";
    if (!groups.has(label)) {
      groups.set(label, { label, items: [] });
    }

    const file = fileMap.get(item.incomingFileId);
    groups.get(label)!.items.push({
      id: item.id,
      fileId: item.incomingFileId,
      originalFilename: file?.originalFilename || "Unknown",
      fileType: file?.fileType || "other",
      sizeBytes: file?.sizeBytes || 0,
      detectedSummary: item.detectedSummary || "",
      suggestedFilename: item.suggestedFilename || "",
      suggestedFolder: item.suggestedFolder || "/Unsorted",
      suggestedAction: item.suggestedAction,
      confidence: item.confidence || "medium",
      rationale: item.rationale || "",
      approvedAction: item.approvedAction,
      approvedFilename: item.approvedFilename,
      approvedFolder: item.approvedFolder,
      executionStatus: item.executionStatus,
    });
  }

  return Array.from(groups.values());
}

function generateFallbackFilename(file: any): string {
  const date = file.uploadedAt ? new Date(file.uploadedAt).toISOString().slice(0, 10) : "unknown-date";
  const ext = file.originalFilename.includes(".")
    ? file.originalFilename.split(".").pop()?.toLowerCase() || "bin"
    : "bin";
  const category = file.fileType || "other";
  const desc = file.originalFilename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .slice(0, 40);
  return `${date}__${category}__${desc}__incoming.${ext}`;
}

function guessFolderFromType(fileType: string, subtype: string, ocrText?: string | null): string {
  if (subtype === "screenshot") return "/Operations/Systems";
  if (subtype === "photo") return "/Unsorted";

  if (ocrText) {
    const lower = ocrText.toLowerCase();
    if (lower.includes("invoice") || lower.includes("receipt") || lower.includes("total due")) {
      return "/Operations/Receipts";
    }
    if (lower.includes("contract") || lower.includes("agreement") || lower.includes("hereby")) {
      return "/Unsorted";
    }
  }

  return FOLDER_MAP[fileType as keyof typeof FOLDER_MAP] || "/Unsorted";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
