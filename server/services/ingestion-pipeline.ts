import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { insightsStorage } from "./insights-storage";
import type { MatterAsset } from "./insights-storage";
import { logger } from "../utils/logger";

const UPLOAD_DIR = path.resolve("uploads/matter-assets");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function computeSha256(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
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

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  if (!text || text.length <= CHUNK_SIZE) return text ? [text] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      const lastPeriod = text.lastIndexOf(". ", end);
      const breakPoint = Math.max(lastNewline, lastPeriod);
      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    const nextStart = end - CHUNK_OVERLAP;
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
  const isScanned = text.length < 50;
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

async function ocrImage(filePath: string): Promise<{ text: string; confidence: number }> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    if (!apiKey) {
      return { text: "[OCR unavailable: no Gemini API key configured]", confidence: 0.0 };
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
            { text: "Extract ALL text from this image/document. Return the text exactly as it appears. If there are multiple columns, read left to right, top to bottom. Include all headers, footers, and page numbers. If no text is found, respond with '[NO TEXT FOUND]'." },
          ],
        },
      ],
    });

    const text = result.text?.trim() || "";
    if (text === "[NO TEXT FOUND]" || text.length < 5) {
      return { text: "", confidence: 0.1 };
    }
    return { text, confidence: 0.85 };
  } catch (err: any) {
    logger.error("OCR failed", { error: err.message });
    return { text: "", confidence: 0.0 };
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

  try {
    const filePath = asset.storageUrl;
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    let extractedText = "";
    let method = "extracted_text";
    let confidence: number | null = null;
    let pageCount: number | null = null;

    switch (asset.fileType) {
      case "pdf": {
        const pdf = await extractTextFromPdf(filePath);
        pageCount = pdf.pageCount;
        if (pdf.isScanned) {
          const ocr = await ocrImage(filePath);
          extractedText = ocr.text;
          method = "ocr";
          confidence = ocr.confidence;
        } else {
          extractedText = pdf.text;
          method = "extracted_text";
          confidence = 0.95;
        }
        break;
      }
      case "image": {
        const ocr = await ocrImage(filePath);
        extractedText = ocr.text;
        method = "ocr";
        confidence = ocr.confidence;
        pageCount = 1;
        break;
      }
      case "doc": {
        extractedText = await extractTextFromDoc(filePath);
        method = "extracted_text";
        confidence = 0.95;
        break;
      }
      case "text":
      case "email": {
        extractedText = extractTextFromPlain(filePath);
        method = "extracted_text";
        confidence = 1.0;
        break;
      }
      default: {
        extractedText = "[Unsupported file type]";
        method = "extracted_text";
        confidence = 0.0;
      }
    }

    const assetTextRecord = await insightsStorage.createAssetText({
      assetId: asset.id,
      method,
      fullText: extractedText,
      confidenceOverall: confidence,
      language: "en",
    });

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

    logger.info("Asset processed successfully", {
      assetId,
      method,
      confidence,
      textLength: extractedText.length,
      chunks: chunks.length,
    });
  } catch (err: any) {
    logger.error("Asset processing failed", { assetId, error: err.message });
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
  const hash = computeSha256(file.path);
  const destFilename = `${hash}${ext}`;
  const destPath = path.join(UPLOAD_DIR, matterId);

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  const finalPath = path.join(destPath, destFilename);
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

  setTimeout(() => processAsset(asset.id), 100);

  return asset;
}
