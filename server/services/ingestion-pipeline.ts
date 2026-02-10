import * as fs from "fs";
import { createReadStream } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { insightsStorage } from "./insights-storage";
import type { MatterAsset } from "./insights-storage";
import { logger } from "../utils/logger";
import { INSIGHTS_CONFIG } from "../config/insights";
import { DOCTRINE_OCR_PROMPT } from "../config/core-doctrine";
import { db } from "../db";
import { ocrSessions, boards, groups, tasks } from "@shared/models/tables";
import { eq, and } from "drizzle-orm";

const UPLOAD_DIR = path.resolve("uploads/matter-assets");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function detectFileType(ext: string, mimeType?: string): string {
  const e = ext.toLowerCase().replace(".", "");
  if (["pdf"].includes(e)) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "bmp", "tiff", "tif", "heic", "webp"].includes(e)) return "image";
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(e)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(e)) return "video";
  if (["doc", "docx"].includes(e)) return "doc";
  if (["txt", "rtf", "csv"].includes(e)) return "text";
  if (["eml", "msg"].includes(e)) return "email";
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("video/")) return "video";
  return "other";
}

function chunkText(text: string): string[] {
  const chunkSize = INSIGHTS_CONFIG.chunking.chunkSize;
  const chunkOverlap = INSIGHTS_CONFIG.chunking.chunkOverlap;
  if (!text || text.length <= chunkSize) return text ? [text] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      const lastPeriod = text.lastIndexOf(". ", end);
      const breakPoint = Math.max(lastNewline, lastPeriod);
      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    const nextStart = end - chunkOverlap;
    if (nextStart <= start) {
      start = end;
    } else {
      start = nextStart;
    }
  }
  return chunks;
}

async function extractTextFromPdf(filePath: string): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const text = data.text?.trim() || "";
  const isScanned = text.length < INSIGHTS_CONFIG.processing.scannedPdfTextThreshold;
  return { text, pageCount: data.numpages || 1, isScanned };
}

async function extractTextFromDoc(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value?.trim() || "";
}

function extractTextFromPlain(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8").trim();
}

export interface DocumentProfile {
  documentType: string;
  language: string;
  textQuality: string;
  containsHandwriting: boolean;
  containsSignatures: boolean;
  containsStamps: boolean;
  containsRedactions: boolean;
  visibleDates: string[];
  keyEntities: string[];
  structuralSections: string[];
}

function parseDocumentProfile(fullText: string): { extractedText: string; profile: DocumentProfile | null } {
  const profileMarker = "[DOCUMENT PROFILE]";
  const textMarker = "[EXTRACTED TEXT]";
  let extractedText = fullText;
  let profile: DocumentProfile | null = null;

  const profileIdx = fullText.indexOf(profileMarker);
  if (profileIdx !== -1) {
    const textIdx = fullText.indexOf(textMarker);
    extractedText = textIdx !== -1
      ? fullText.substring(textIdx + textMarker.length, profileIdx).trim()
      : fullText.substring(0, profileIdx).trim();

    const profileSection = fullText.substring(profileIdx + profileMarker.length).trim();
    const getField = (label: string): string => {
      const regex = new RegExp(`-\\s*${label}:\\s*(.+)`, "i");
      const match = profileSection.match(regex);
      return match ? match[1].trim() : "";
    };
    const getBool = (label: string): boolean => {
      const val = getField(label).toLowerCase();
      return val === "yes" || val === "true";
    };
    const getList = (label: string): string[] => {
      const val = getField(label);
      if (!val || val.toLowerCase() === "none" || val.toLowerCase() === "n/a") return [];
      return val.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    };

    profile = {
      documentType: getField("Document Type") || "other",
      language: getField("Language") || "English",
      textQuality: getField("Text Quality") || "clear",
      containsHandwriting: getBool("Contains Handwriting"),
      containsSignatures: getBool("Contains Signatures"),
      containsStamps: getBool("Contains Stamps/Seals"),
      containsRedactions: getBool("Contains Redactions"),
      visibleDates: getList("Visible Dates"),
      keyEntities: getList("Key Entities Spotted"),
      structuralSections: getList("Structural Sections"),
    };
  }

  return { extractedText, profile };
}

async function ocrImage(filePath: string): Promise<{ text: string; confidence: number; profile: DocumentProfile | null }> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    if (!apiKey) {
      return { text: "[OCR unavailable: no Gemini API key configured]", confidence: 0.0, profile: null };
    }
    const genAI = new GoogleGenAI({ apiKey });

    const imageData = fs.readFileSync(filePath);
    const base64 = imageData.toString("base64");
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mimeMap: Record<string, string> = {
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
      gif: "image/gif", bmp: "image/bmp", tiff: "image/tiff",
      tif: "image/tiff", webp: "image/webp", heic: "image/heic",
    };
    const mimeType = mimeMap[ext] || "image/png";

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: DOCTRINE_OCR_PROMPT },
          ],
        },
      ],
    });

    const rawText = result.text?.trim() || "";
    if (rawText === "[NO TEXT FOUND]" || rawText.length < 5) {
      return { text: "", confidence: 0.1, profile: null };
    }

    const { extractedText, profile } = parseDocumentProfile(rawText);
    const qualityConfidence = profile?.textQuality === "clear" ? 0.9 : profile?.textQuality === "partially legible" ? 0.7 : 0.5;
    return { text: extractedText || rawText, confidence: qualityConfidence, profile };
  } catch (err: any) {
    logger.error("OCR failed", { error: err.message });
    return { text: "", confidence: 0.0, profile: null };
  }
}

let activeJobs = 0;
const MAX_CONCURRENT = INSIGHTS_CONFIG.processing.maxConcurrentJobs;
const pendingQueue: string[] = [];

async function enqueueProcessing(assetId: string): Promise<void> {
  if (activeJobs >= MAX_CONCURRENT) {
    pendingQueue.push(assetId);
    return;
  }
  activeJobs++;
  try {
    await processAsset(assetId);
  } finally {
    activeJobs--;
    if (pendingQueue.length > 0) {
      const next = pendingQueue.shift()!;
      enqueueProcessing(next);
    }
  }
}

export async function processAsset(assetId: string): Promise<void> {
  const asset = await insightsStorage.getMatterAsset(assetId);
  if (!asset) {
    logger.error("Asset not found for processing", { assetId });
    return;
  }

  await insightsStorage.updateMatterAsset(assetId, { status: "processing" });
  logger.info("Processing asset", { assetId, fileType: asset.fileType, filename: asset.originalFilename });

  const startTime = Date.now();
  let ocrSessionId: string | null = null;

  try {
    const filePath = asset.storageUrl;
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileSizeBytes = fs.statSync(filePath).size;
    let extractedText = "";
    let method = "extracted_text";
    let confidence: number | null = null;
    let pageCount: number | null = null;
    let provider = "local";
    let docProfile: DocumentProfile | null = null;

    const [sessionRow] = await db.insert(ocrSessions).values({
      matterId: asset.matterId,
      assetId: asset.id,
      originalFilename: asset.originalFilename,
      fileType: asset.fileType,
      fileSizeBytes,
      method: "pending",
      provider: "pending",
      status: "processing",
      hashSha256: asset.hashSha256 || null,
      startedAt: new Date(),
      createdBy: (asset as any).uploadedBy || "system",
    }).returning();
    ocrSessionId = sessionRow.id;

    switch (asset.fileType) {
      case "pdf": {
        const pdf = await extractTextFromPdf(filePath);
        pageCount = pdf.pageCount;
        if (pdf.isScanned) {
          const ocr = await ocrImage(filePath);
          extractedText = ocr.text;
          method = "ocr";
          confidence = ocr.confidence;
          provider = "gemini-vision";
          docProfile = ocr.profile;
        } else {
          extractedText = pdf.text;
          method = "extracted_text";
          confidence = 0.95;
          provider = "pdf-parse";
        }
        break;
      }
      case "image": {
        const ocr = await ocrImage(filePath);
        extractedText = ocr.text;
        method = "ocr";
        confidence = ocr.confidence;
        pageCount = 1;
        provider = "gemini-vision";
        docProfile = ocr.profile;
        break;
      }
      case "doc": {
        extractedText = await extractTextFromDoc(filePath);
        method = "extracted_text";
        confidence = 0.95;
        provider = "mammoth";
        break;
      }
      case "text":
      case "email": {
        extractedText = extractTextFromPlain(filePath);
        method = "extracted_text";
        confidence = 1.0;
        provider = "plaintext";
        break;
      }
      default: {
        extractedText = "[Unsupported file type]";
        method = "extracted_text";
        confidence = 0.0;
        provider = "none";
      }
    }

    const assetTextRecord = await insightsStorage.createAssetText({
      assetId: asset.id,
      method,
      fullText: extractedText,
      confidenceOverall: confidence,
      language: docProfile?.language || "en",
    });

    if (docProfile) {
      const existing = (asset as Record<string, any>).metadata || {};
      await insightsStorage.updateMatterAsset(assetId, {
        docType: docProfile.documentType,
        metadata: {
          ...existing,
          documentProfile: docProfile,
        },
      } as any);
    }

    const lines = extractedText.split("\n");
    const anchors: any[] = [];
    let lineIdx = 0;
    const linesPerPage = pageCount ? Math.ceil(lines.length / pageCount) : lines.length;

    for (let page = 1; page <= (pageCount || 1); page++) {
      const pageStart = lineIdx;
      const pageEnd = Math.min(lineIdx + linesPerPage, lines.length);
      const pageText = lines.slice(pageStart, pageEnd).join("\n");
      if (pageText.trim()) {
        anchors.push({
          assetTextId: assetTextRecord.id,
          anchorType: "page_line",
          pageNumber: page,
          lineStart: pageStart + 1,
          lineEnd: pageEnd,
          snippet: pageText.slice(0, 200),
          confidence,
        });
      }
      lineIdx = pageEnd;
    }

    if (anchors.length > 0) {
      await insightsStorage.createTextAnchors(anchors);
    }

    const chunks = chunkText(extractedText);
    if (chunks.length > 0) {
      await insightsStorage.createTextChunks(
        chunks.map((c, idx) => ({
          matterId: asset.matterId,
          assetId: asset.id,
          assetTextId: assetTextRecord.id,
          chunkText: c,
          chunkIndex: idx,
        }))
      );
    }

    await insightsStorage.updateMatterAsset(assetId, {
      status: "ready",
      pageCount,
    });

    const processingTimeMs = Date.now() - startTime;

    if (ocrSessionId) {
      await db.update(ocrSessions)
        .set({
          method,
          provider,
          status: "completed",
          confidence,
          pageCount,
          extractedTextLength: extractedText.length,
          chunkCount: chunks.length,
          anchorCount: anchors.length,
          processingTimeMs,
          completedAt: new Date(),
          ocrMetadata: {
            textRecordId: assetTextRecord.id,
            lineCount: lines.length,
            avgChunkSize: chunks.length > 0 ? Math.round(extractedText.length / chunks.length) : 0,
            ...(docProfile ? { documentProfile: docProfile } : {}),
          },
        })
        .where(eq(ocrSessions.id, ocrSessionId));
    }

    await addDocumentToBoard(asset.matterId, asset.originalFilename, method, confidence, pageCount);

    logger.info("Asset processed successfully", {
      assetId,
      method,
      confidence,
      textLength: extractedText.length,
      chunks: chunks.length,
      processingTimeMs,
    });
  } catch (err: any) {
    const processingTimeMs = Date.now() - startTime;
    logger.error("Asset processing failed", { assetId, error: err.message });

    if (ocrSessionId) {
      await db.update(ocrSessions)
        .set({
          status: "failed",
          errorMessage: err.message,
          processingTimeMs,
          completedAt: new Date(),
        })
        .where(eq(ocrSessions.id, ocrSessionId))
        .catch(() => {});
    }

    await insightsStorage.updateMatterAsset(assetId, {
      status: "failed",
      errorMessage: err.message,
    });
  }
}

export async function handleFileUpload(
  matterId: string,
  file: { originalname: string; path: string; size: number; mimetype: string },
  userId?: string,
  metadata?: { docType?: string; custodian?: string; confidentiality?: string },
): Promise<MatterAsset> {
  ensureUploadDir();

  const ext = path.extname(file.originalname);
  const fileType = detectFileType(ext, file.mimetype);
  const destPath = path.join(UPLOAD_DIR, matterId);
  let finalPath = "";

  try {
    const hash = await computeSha256(file.path);
    const destFilename = `${hash}${ext}`;

    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    finalPath = path.join(destPath, destFilename);
    fs.copyFileSync(file.path, finalPath);

    try {
      fs.unlinkSync(file.path);
    } catch {}

    const asset = await insightsStorage.createMatterAsset({
      matterId,
      originalFilename: file.originalname,
      storageUrl: finalPath,
      fileType,
      sizeBytes: file.size,
      hashSha256: hash,
      uploadedByUserId: userId || null,
      docType: metadata?.docType || null,
      custodian: metadata?.custodian || null,
      confidentiality: metadata?.confidentiality || "normal",
      status: "queued",
    });

    setTimeout(() => enqueueProcessing(asset.id), INSIGHTS_CONFIG.processing.processingDelayMs);

    return asset;
  } catch (err: any) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupErr: any) {
      logger.warn("Failed to clean up temp file", { path: file.path, error: cleanupErr.message });
    }
    try {
      if (finalPath && fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }
    } catch (cleanupErr: any) {
      logger.warn("Failed to clean up destination file", { path: finalPath, error: cleanupErr.message });
    }
    throw err;
  }
}

async function addDocumentToBoard(
  matterId: string,
  filename: string,
  method: string,
  confidence: number | null,
  pageCount: number | null,
): Promise<void> {
  try {
    const matterBoards = await db.select().from(boards)
      .where(eq(boards.matterId, matterId));

    const masterBoard = matterBoards.find(b => !b.name.includes(" - "));
    if (!masterBoard) return;

    const boardGroups = await db.select().from(groups)
      .where(eq(groups.boardId, masterBoard.id));

    let filesGroup = boardGroups.find(g => g.title === "Files");
    if (!filesGroup) {
      const [newGroup] = await db.insert(groups).values({
        title: "Files",
        color: "#10b981",
        boardId: masterBoard.id,
        order: boardGroups.length,
      }).returning();
      filesGroup = newGroup;
    }

    const confidenceStr = confidence !== null ? `${Math.round(confidence * 100)}%` : "N/A";
    const pagesStr = pageCount ? `${pageCount} page${pageCount > 1 ? "s" : ""}` : "";
    const methodLabel = method === "ocr" ? "OCR" : "Text Extract";

    await db.insert(tasks).values({
      title: filename,
      description: `[${methodLabel}] Confidence: ${confidenceStr}${pagesStr ? ` | ${pagesStr}` : ""} | Processed: ${new Date().toISOString().split("T")[0]}`,
      status: "done",
      priority: "low",
      boardId: masterBoard.id,
      groupId: filesGroup.id,
    });

    logger.info("Document added to board Files group", { matterId, filename });
  } catch (err: any) {
    logger.warn("Failed to add document to board", { matterId, filename, error: err.message });
  }
}

export function validateMimeType(ext: string, mimeType: string): boolean {
  const normalizedExt = ext.toLowerCase().replace(".", "");
  const expectedMimes: Record<string, string[]> = {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    gif: ["image/gif"],
    bmp: ["image/bmp"],
    tiff: ["image/tiff"],
    tif: ["image/tiff"],
    webp: ["image/webp"],
    heic: ["image/heic"],
    doc: ["application/msword"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    txt: ["text/plain"],
    rtf: ["text/rtf", "application/rtf"],
    csv: ["text/csv", "application/csv"],
    mp3: ["audio/mpeg"],
    wav: ["audio/wav", "audio/wave", "audio/x-wav"],
    ogg: ["audio/ogg"],
    m4a: ["audio/mp4", "audio/x-m4a"],
    eml: ["message/rfc822"],
    msg: ["application/vnd.ms-outlook"],
  };
  const allowed = expectedMimes[normalizedExt];
  if (!allowed) return false;
  return allowed.includes(mimeType) || mimeType === "application/octet-stream";
}
