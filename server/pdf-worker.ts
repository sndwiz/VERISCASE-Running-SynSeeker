import { db } from "./db";
import * as tables from "@shared/models/tables";
import { eq, asc } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createHash, randomUUID } from "crypto";
import fs from "fs";
import path from "path";

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

async function updateJobProgress(jobId: string, percent: number) {
  await db.update(tables.documentJobs)
    .set({ progressPercent: percent })
    .where(eq(tables.documentJobs.id, jobId));
}

async function markJobRunning(jobId: string) {
  await db.update(tables.documentJobs)
    .set({ status: "running", startedAt: new Date(), progressPercent: 0 })
    .where(eq(tables.documentJobs.id, jobId));
}

async function markJobComplete(jobId: string, resultVersionId?: string) {
  await db.update(tables.documentJobs)
    .set({
      status: "complete",
      progressPercent: 100,
      finishedAt: new Date(),
      resultVersionId: resultVersionId || null,
    })
    .where(eq(tables.documentJobs.id, jobId));
}

async function markJobFailed(jobId: string, errorMessage: string) {
  await db.update(tables.documentJobs)
    .set({
      status: "failed",
      errorMessage,
      finishedAt: new Date(),
    })
    .where(eq(tables.documentJobs.id, jobId));
}

function getPlacementCoords(
  placement: string,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number
): { x: number; y: number } {
  const margin = 30;
  switch (placement) {
    case "top-left":
      return { x: margin, y: pageHeight - margin - fontSize };
    case "top-center":
      return { x: (pageWidth - textWidth) / 2, y: pageHeight - margin - fontSize };
    case "top-right":
      return { x: pageWidth - margin - textWidth, y: pageHeight - margin - fontSize };
    case "bottom-left":
      return { x: margin, y: margin };
    case "bottom-center":
      return { x: (pageWidth - textWidth) / 2, y: margin };
    case "bottom-right":
    default:
      return { x: pageWidth - margin - textWidth, y: margin };
    case "center":
      return { x: (pageWidth - textWidth) / 2, y: (pageHeight - fontSize) / 2 };
  }
}

async function getNextVersionNumber(documentId: string): Promise<number> {
  const existing = await db.select()
    .from(tables.documentVersions)
    .where(eq(tables.documentVersions.documentId, documentId))
    .orderBy(asc(tables.documentVersions.versionNumber));
  return existing.length > 0
    ? existing[existing.length - 1].versionNumber + 1
    : 1;
}

async function processBatesJob(job: tables.DocumentJob) {
  const params = job.jobParams as any;
  const batesSetId = params.batesSetId;

  const [doc] = await db.select().from(tables.pdfDocuments)
    .where(eq(tables.pdfDocuments.id, job.documentId));
  if (!doc) throw new Error("Document not found");

  const [batesSet] = await db.select().from(tables.batesSets)
    .where(eq(tables.batesSets.id, batesSetId));
  if (!batesSet) throw new Error("Bates set not found");

  const prefix = batesSet.prefix;
  const padding = batesSet.padding || 6;
  const placement = batesSet.placement || "bottom-right";
  const fontSize = batesSet.fontSize || 10;

  if (!fs.existsSync(doc.storageKey)) throw new Error("Source PDF file not found on disk");

  const pdfBytes = fs.readFileSync(doc.storageKey);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  await updateJobProgress(job.id, 10);

  let currentNumber = batesSet.nextNumber || 1;
  const startNumber = currentNumber;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const batesLabel = `${prefix}-${String(currentNumber).padStart(padding, "0")}`;
    const textWidth = font.widthOfTextAtSize(batesLabel, fontSize);
    const coords = getPlacementCoords(placement, width, height, textWidth, fontSize);

    page.drawText(batesLabel, {
      x: coords.x,
      y: coords.y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    currentNumber++;
  }

  await updateJobProgress(job.id, 50);

  const endNumber = currentNumber - 1;
  const modifiedPdfBytes = await pdfDoc.save();
  const sha256 = createHash("sha256").update(Buffer.from(modifiedPdfBytes)).digest("hex");

  const targetDir = path.join("uploads", "pdf-pro", doc.matterId || "no-matter", doc.id);
  fs.mkdirSync(targetDir, { recursive: true });

  const versionNum = await getNextVersionNumber(doc.id);
  const targetPath = path.join(targetDir, `v${versionNum}-bates.pdf`);
  fs.writeFileSync(targetPath, Buffer.from(modifiedPdfBytes));

  const versionId = randomUUID();
  await db.insert(tables.documentVersions).values({
    id: versionId,
    documentId: doc.id,
    versionNumber: versionNum,
    operationType: "bates",
    operationParams: { batesSetId, prefix, startNumber, endNumber, placement, fontSize },
    storageKey: targetPath,
    sha256Hash: sha256,
    createdBy: job.createdBy,
  });

  await db.update(tables.batesSets)
    .set({ nextNumber: currentNumber })
    .where(eq(tables.batesSets.id, batesSetId));

  const rangeId = randomUUID();
  await db.insert(tables.batesRanges).values({
    id: rangeId,
    batesSetId,
    documentId: doc.id,
    versionId,
    startNumber,
    endNumber,
  });

  await updateJobProgress(job.id, 90);

  return versionId;
}

async function processStampJob(job: tables.DocumentJob) {
  const params = job.jobParams as any;
  const stampType: string = params.stampType || "CONFIDENTIAL";
  const placement: string = params.placement || "top-right";
  const fontSize: number = params.fontSize || 24;

  const [doc] = await db.select().from(tables.pdfDocuments)
    .where(eq(tables.pdfDocuments.id, job.documentId));
  if (!doc) throw new Error("Document not found");

  if (!fs.existsSync(doc.storageKey)) throw new Error("Source PDF file not found on disk");

  const pdfBytes = fs.readFileSync(doc.storageKey);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  await updateJobProgress(job.id, 10);

  const stampText = stampType.replace(/_/g, " ");

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(stampText, fontSize);
    const coords = getPlacementCoords(placement, width, height, textWidth, fontSize);

    page.drawText(stampText, {
      x: coords.x,
      y: coords.y,
      size: fontSize,
      font,
      color: rgb(1, 0, 0),
      opacity: 0.4,
    });
  }

  await updateJobProgress(job.id, 50);

  const modifiedPdfBytes = await pdfDoc.save();
  const sha256 = createHash("sha256").update(Buffer.from(modifiedPdfBytes)).digest("hex");

  const targetDir = path.join("uploads", "pdf-pro", doc.matterId || "no-matter", doc.id);
  fs.mkdirSync(targetDir, { recursive: true });

  const versionNum = await getNextVersionNumber(doc.id);
  const targetPath = path.join(targetDir, `v${versionNum}-stamp-${stampType.toLowerCase()}.pdf`);
  fs.writeFileSync(targetPath, Buffer.from(modifiedPdfBytes));

  const versionId = randomUUID();
  await db.insert(tables.documentVersions).values({
    id: versionId,
    documentId: doc.id,
    versionNumber: versionNum,
    operationType: "stamp",
    operationParams: { stampType, placement, fontSize },
    storageKey: targetPath,
    sha256Hash: sha256,
    createdBy: job.createdBy,
  });

  await updateJobProgress(job.id, 90);

  return versionId;
}

function extractTextFromPage(page: any): string {
  try {
    if (typeof page.getTextContent === "function") {
      return page.getTextContent();
    }
  } catch {}
  return "";
}

async function processWashJob(job: tables.DocumentJob) {
  const params = job.jobParams as any;
  const policy = params.policy || "medium";

  const [doc] = await db.select().from(tables.pdfDocuments)
    .where(eq(tables.pdfDocuments.id, job.documentId));
  if (!doc) throw new Error("Document not found");

  if (!fs.existsSync(doc.storageKey)) throw new Error("Source PDF file not found on disk");

  const pdfBytes = fs.readFileSync(doc.storageKey);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  await updateJobProgress(job.id, 10);

  const piiPatterns: { type: string; pattern: RegExp; label: string }[] = [
    { type: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: "Social Security Number" },
    { type: "ssn_no_dash", pattern: /\b\d{9}\b/g, label: "SSN (no dashes)" },
    { type: "phone", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: "Phone Number" },
    { type: "email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "Email Address" },
    { type: "dob", pattern: /\b(?:DOB|Date of Birth|Born|Birthday)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, label: "Date of Birth" },
    { type: "date", pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, label: "Date Pattern" },
    { type: "credit_card", pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, label: "Credit Card Number" },
    { type: "credit_card_amex", pattern: /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g, label: "Credit Card (Amex)" },
  ];

  const detections: Array<{
    type: string;
    label: string;
    value: string;
    page: number;
    index: number;
  }> = [];

  let fullText = "";

  for (let i = 0; i < pages.length; i++) {
    const pageText = extractTextFromPage(pages[i]);
    fullText += pageText + "\n";

    for (const { type, pattern, label } of piiPatterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(pageText)) !== null) {
        detections.push({
          type,
          label,
          value: match[0],
          page: i + 1,
          index: match.index,
        });
      }
    }
  }

  await updateJobProgress(job.id, 50);

  const summary: Record<string, number> = {};
  for (const d of detections) {
    summary[d.type] = (summary[d.type] || 0) + 1;
  }

  const reportId = randomUUID();
  await db.insert(tables.pdfWashReports).values({
    id: reportId,
    workspaceId: doc.workspaceId,
    matterId: doc.matterId,
    documentId: doc.id,
    policy,
    detections,
    summary: { totalDetections: detections.length, byType: summary },
    createdBy: job.createdBy,
  });

  await updateJobProgress(job.id, 90);

  return undefined;
}

async function processOcrJob(job: tables.DocumentJob) {
  const [doc] = await db.select().from(tables.pdfDocuments)
    .where(eq(tables.pdfDocuments.id, job.documentId));
  if (!doc) throw new Error("Document not found");

  if (!fs.existsSync(doc.storageKey)) throw new Error("Source PDF file not found on disk");

  const pdfBytes = fs.readFileSync(doc.storageKey);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  await updateJobProgress(job.id, 10);

  let fullText = "";
  for (let i = 0; i < pages.length; i++) {
    const pageText = extractTextFromPage(pages[i]);
    fullText += `--- Page ${i + 1} ---\n${pageText}\n\n`;
  }

  await updateJobProgress(job.id, 50);

  if (!fullText.trim()) {
    fullText = "[No extractable text found - document may contain scanned images. Full OCR with Tesseract is not yet available.]";
  }

  const existing = await db.select().from(tables.documentOcrText)
    .where(eq(tables.documentOcrText.documentId, doc.id));

  if (existing.length > 0) {
    await db.update(tables.documentOcrText)
      .set({ fullText, confidenceSummary: { method: "pdf-lib-extraction", pageCount: pages.length } })
      .where(eq(tables.documentOcrText.documentId, doc.id));
  } else {
    await db.insert(tables.documentOcrText).values({
      id: randomUUID(),
      documentId: doc.id,
      fullText,
      confidenceSummary: { method: "pdf-lib-extraction", pageCount: pages.length },
    });
  }

  await updateJobProgress(job.id, 90);

  return undefined;
}

async function pollAndProcess() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const [nextJob] = await db.select()
      .from(tables.documentJobs)
      .where(eq(tables.documentJobs.status, "queued"))
      .orderBy(asc(tables.documentJobs.createdAt))
      .limit(1);

    if (!nextJob) {
      isProcessing = false;
      return;
    }

    await markJobRunning(nextJob.id);
    console.log(`[pdf-worker] Processing job ${nextJob.id} (type: ${nextJob.jobType})`);

    let resultVersionId: string | undefined;

    try {
      switch (nextJob.jobType) {
        case "bates":
          resultVersionId = await processBatesJob(nextJob);
          break;
        case "stamp":
          resultVersionId = await processStampJob(nextJob);
          break;
        case "wash":
          await processWashJob(nextJob);
          break;
        case "ocr":
          await processOcrJob(nextJob);
          break;
        default:
          throw new Error(`Unknown job type: ${nextJob.jobType}`);
      }

      await markJobComplete(nextJob.id, resultVersionId);
      console.log(`[pdf-worker] Job ${nextJob.id} completed successfully`);
    } catch (err: any) {
      const errorMsg = err?.message || "Unknown error during processing";
      console.error(`[pdf-worker] Job ${nextJob.id} failed:`, errorMsg);
      await markJobFailed(nextJob.id, errorMsg);
    }
  } catch (err: any) {
    console.error("[pdf-worker] Poll error:", err?.message);
  } finally {
    isProcessing = false;
  }
}

export function startPdfWorker() {
  if (pollingInterval) return;
  console.log("[pdf-worker] Starting PDF processing worker (polling every 3s)");
  pollingInterval = setInterval(pollAndProcess, 3000);
  pollAndProcess();
}

export function stopPdfWorker() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("[pdf-worker] Stopped PDF processing worker");
  }
}
