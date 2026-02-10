import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { db } from "../db";
import { videoPipelineJobs } from "../../shared/models/tables";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { synseekrClient } from "./synseekr-client";

const PIPELINE_TEMP = "/tmp/vericase-video-pipeline";

export type PipelineStage = "validate" | "extract" | "deduplicate" | "ocr" | "stitch" | "entities" | "output";
export type PipelineStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface PipelineConfig {
  fps: number;
  dedupThreshold: number;
  ocrModel: string;
  stitchModel: string;
  entityModel: string;
}

const DEFAULT_CONFIG: PipelineConfig = {
  fps: 2,
  dedupThreshold: 12,
  ocrModel: "Qwen/Qwen2.5-VL-72B-Instruct",
  stitchModel: "Qwen/Qwen2.5-72B-Instruct",
  entityModel: "Qwen/Qwen2.5-72B-Instruct",
};

const STAGES: PipelineStage[] = ["validate", "extract", "deduplicate", "ocr", "stitch", "entities", "output"];
const STAGE_PROGRESS: Record<PipelineStage, number> = {
  validate: 5,
  extract: 15,
  deduplicate: 25,
  ocr: 60,
  stitch: 75,
  entities: 85,
  output: 100,
};

type ProgressCallback = (stage: PipelineStage, progress: number, message: string) => void;

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  codec: string;
  fileSize: number;
}

interface OCRFragment {
  frameIndex: number;
  framePath: string;
  text: string;
  confidence: number;
}

interface ExtractedEntity {
  entityType: string;
  value: string;
  confidence: number;
  context: string;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileHash(filePath: string): string {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function runCommand(cmd: string, args: string[], timeout = 120000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { timeout });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr}`));
    });
    proc.on("error", reject);
  });
}

async function updateJob(jobId: string, updates: Record<string, any>) {
  await db.update(videoPipelineJobs).set(updates).where(eq(videoPipelineJobs.id, jobId));
}

// ========== STAGE 1: VALIDATE ==========
async function stageValidate(filePath: string): Promise<VideoMetadata> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  const supported = [".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm"];
  if (!supported.includes(ext)) throw new Error(`Unsupported format: ${ext}`);

  const stats = fs.statSync(filePath);
  if (stats.size < 50 * 1024) throw new Error("File too small (< 50KB)");
  if (stats.size > 10 * 1024 * 1024 * 1024) throw new Error("File too large (> 10GB)");

  const { stdout } = await runCommand("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath
  ]);

  const probe = JSON.parse(stdout);
  const videoStreams = (probe.streams || []).filter((s: any) => s.codec_type === "video");
  if (!videoStreams.length) throw new Error("No video stream found");

  const vs = videoStreams[0];
  const duration = parseFloat(probe.format?.duration || vs.duration || "0");
  if (duration < 0.5) throw new Error(`Video too short (${duration.toFixed(1)}s)`);

  return {
    width: parseInt(vs.width || "0"),
    height: parseInt(vs.height || "0"),
    duration,
    codec: vs.codec_name || "unknown",
    fileSize: stats.size,
  };
}

// ========== STAGE 2: EXTRACT FRAMES ==========
async function stageExtract(filePath: string, jobDir: string, fps: number, duration: number): Promise<string[]> {
  const framesDir = path.join(jobDir, "frames_raw");
  ensureDir(framesDir);

  let effectiveFps = fps;
  if (duration > 180) effectiveFps = Math.max(1, fps * 0.5);
  else if (duration < 30) effectiveFps = Math.min(5, fps * 1.5);

  const pattern = path.join(framesDir, "frame_%06d.png");
  await runCommand("ffmpeg", [
    "-i", filePath, "-vf", `fps=${effectiveFps}`, "-q:v", "2", "-y",
    "-hide_banner", "-loglevel", "warning", pattern
  ], 300000);

  const files = fs.readdirSync(framesDir)
    .filter(f => f.endsWith(".png"))
    .sort()
    .map(f => path.join(framesDir, f));

  if (files.length === 0) throw new Error("FFmpeg produced zero frames");
  return files;
}

// ========== STAGE 3: DEDUPLICATE ==========
async function stageDeduplicate(framePaths: string[], threshold: number): Promise<string[]> {
  if (framePaths.length <= 3) return framePaths;

  const unique: string[] = [framePaths[0]];
  let prevHash = await simpleImageHash(framePaths[0]);

  for (let i = 1; i < framePaths.length; i++) {
    const currentHash = await simpleImageHash(framePaths[i]);
    const distance = hammingDistance(prevHash, currentHash);
    if (distance > threshold) {
      unique.push(framePaths[i]);
      prevHash = currentHash;
    }
  }

  const lastFrame = framePaths[framePaths.length - 1];
  if (!unique.includes(lastFrame)) unique.push(lastFrame);

  if (unique.length < 3) return framePaths.slice(0, Math.min(framePaths.length, 10));

  return unique;
}

async function simpleImageHash(filePath: string): Promise<string> {
  const { stdout } = await runCommand("ffmpeg", [
    "-i", filePath, "-vf", "scale=8:8,format=gray", "-f", "rawvideo", "-y", "/dev/stdout"
  ], 10000);

  const bytes = Buffer.from(stdout, "binary");
  const avg = bytes.reduce((sum, b) => sum + b, 0) / bytes.length;
  let hash = "";
  for (let i = 0; i < bytes.length; i++) {
    hash += bytes[i] >= avg ? "1" : "0";
  }
  return hash;
}

function hammingDistance(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

// ========== STAGE 4: OCR ==========
const OCR_SYSTEM_PROMPT = `You are a legal document OCR specialist. Extract ALL text from this screenshot of a legal document exactly as it appears.

PRESERVE:
- Exact paragraph structure and indentation
- Case citations (format: Party v. Party, Vol. Reporter Page (Court Year))
- Page numbers, headers, and footers
- Numbered lists and lettered sub-sections

OUTPUT RULES:
- Use [PAGE HEADER] and [FOOTER] tags for headers/footers
- Use [HANDWRITTEN: description] for handwritten content
- Use [UNCLEAR: best guess] for text you cannot read with confidence
- Preserve line breaks as they appear
- Do NOT add any commentary or interpretation`;

async function stageOCR(
  framePaths: string[],
  config: PipelineConfig,
  onProgress?: (current: number, total: number) => void
): Promise<OCRFragment[]> {
  const fragments: OCRFragment[] = [];

  const synseekrConfig = synseekrClient.getConfig();
  if (!synseekrConfig.enabled || !synseekrConfig.baseUrl) {
    throw new Error("SynSeekr is not configured. OCR requires local vision model access.");
  }

  for (let i = 0; i < framePaths.length; i++) {
    onProgress?.(i + 1, framePaths.length);
    try {
      const imageData = fs.readFileSync(framePaths[i]);
      const b64 = imageData.toString("base64");

      const payload = {
        model: config.ocrModel,
        messages: [
          { role: "system", content: OCR_SYSTEM_PROMPT },
          { role: "user", content: [
            { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
            { type: "text", text: "Extract ALL text from this legal document screenshot. Preserve exact formatting." }
          ]}
        ],
        max_tokens: 4096,
        temperature: 0.1,
      };

      const result = await synseekrClient.proxy("POST", "/v1/chat/completions", payload);
      if (result.success && result.data?.choices?.[0]?.message?.content) {
        const text = result.data.choices[0].message.content.trim();
        if (text) {
          fragments.push({
            frameIndex: i,
            framePath: framePaths[i],
            text,
            confidence: 1.0,
          });
        }
      }
    } catch (err: any) {
      logger.warn(`[video-pipeline] OCR failed for frame ${i}: ${err.message}`);
    }
  }

  if (fragments.length === 0) throw new Error("OCR failed on all frames");
  return fragments;
}

// ========== STAGE 5: STITCH ==========
const STITCH_SYSTEM_PROMPT = `You are a legal document reconstruction specialist. You receive overlapping text fragments extracted via OCR from a scrolling screen recording of a legal document. Merge them into one clean, continuous document.

RULES:
1. MERGE overlapping content - do NOT duplicate paragraphs or sentences
2. PRESERVE exact legal language - do NOT paraphrase, summarize, or correct
3. MAINTAIN document structure (headings, numbered paragraphs, citations)
4. Flag gaps with [POSSIBLE GAP]
5. Preserve [HEADER], [FOOTER], [HANDWRITTEN] tags from OCR
6. Output ONLY the reconstructed document - no commentary
7. When fragments overlap, keep the version with better text quality`;

async function stageStitch(fragments: OCRFragment[], config: PipelineConfig): Promise<string> {
  if (fragments.length === 1) return fragments[0].text;

  const sorted = [...fragments].sort((a, b) => a.frameIndex - b.frameIndex);
  const chunkSize = 5;
  let accumulated = "";

  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    const fragmentBlock = chunk.map((f, idx) => `--- FRAGMENT ${idx + 1} ---\n${f.text}`).join("\n\n");

    let userPrompt: string;
    if (!accumulated) {
      userPrompt = `Here are overlapping OCR fragments from a scrolling screen recording of a legal document. Merge them into one clean, continuous document:\n\n${fragmentBlock}`;
    } else {
      const tail = accumulated.length > 2000 ? accumulated.slice(-2000) : accumulated;
      userPrompt = `Here is the END of the document reconstructed so far:\n--- PREVIOUS DOCUMENT TAIL ---\n${tail}\n--- END PREVIOUS ---\n\nHere are the next overlapping OCR fragments. Output ONLY the NEW content that should be appended:\n\n${fragmentBlock}`;
    }

    const payload = {
      model: config.stitchModel,
      messages: [
        { role: "system", content: STITCH_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    };

    try {
      const result = await synseekrClient.proxy("POST", "/v1/chat/completions", payload);
      if (result.success && result.data?.choices?.[0]?.message?.content) {
        const merged = result.data.choices[0].message.content.trim();
        accumulated = accumulated ? `${accumulated}\n\n${merged}` : merged;
      }
    } catch (err: any) {
      logger.warn(`[video-pipeline] Stitch chunk failed: ${err.message}`);
      const fallback = chunk.map(f => f.text).join("\n\n---\n\n");
      accumulated = accumulated ? `${accumulated}\n\n${fallback}` : fallback;
    }
  }

  return accumulated.trim();
}

// ========== STAGE 6: ENTITIES ==========
const ENTITY_PROMPT = `Extract structured metadata from this legal document. Return ONLY valid JSON with the following fields (use null if not found):
{
  "case_number": "string or null",
  "court": "string or null",
  "judge": "string or null",
  "filing_date": "YYYY-MM-DD or null",
  "filing_type": "string or null",
  "parties": { "plaintiff": [], "defendant": [], "other": [] },
  "attorneys": [{ "name": "string", "bar_number": "string or null", "firm": "string or null" }],
  "citations": { "case_citations": [], "statute_citations": [] },
  "dollar_amounts": [{ "amount": "string", "context": "string" }],
  "deadlines": [{ "date": "string", "action": "string" }]
}`;

async function stageEntities(text: string, config: PipelineConfig): Promise<ExtractedEntity[]> {
  const entities: ExtractedEntity[] = [];

  const regexEntities = extractRegexEntities(text);
  entities.push(...regexEntities);

  try {
    const docText = text.length > 30000 ? text.slice(0, 30000) : text;
    const payload = {
      model: config.entityModel,
      messages: [
        { role: "system", content: ENTITY_PROMPT },
        { role: "user", content: `DOCUMENT:\n\n${docText}` },
      ],
      max_tokens: 4096,
      temperature: 0.0,
    };

    const result = await synseekrClient.proxy("POST", "/v1/chat/completions", payload);
    if (result.success && result.data?.choices?.[0]?.message?.content) {
      const raw = result.data.choices[0].message.content.trim();
      const llmEntities = parseLLMEntities(raw);
      entities.push(...llmEntities);
    }
  } catch (err: any) {
    logger.warn(`[video-pipeline] LLM entity extraction failed: ${err.message}`);
  }

  const seen = new Set<string>();
  return entities.filter(e => {
    const key = `${e.entityType}:${e.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractRegexEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const patterns: [string, RegExp][] = [
    ["case_number", /\b\d{1,2}:\d{2}-[a-z]{2,4}-\d{3,6}(?:-[A-Z]+)?\b/gi],
    ["statute_citation", /\b\d+\s+U\.?S\.?C\.?\s*§\s*\d+[a-z]?\b/gi],
    ["case_citation", /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+v\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+\d+\s+\w+\.?\s*(?:\d+d?\s+)?\d+/g],
    ["dollar_amount", /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand))?/gi],
    ["date", /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi],
  ];

  for (const [type, regex] of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      entities.push({
        entityType: type,
        value: match[0],
        confidence: 0.9,
        context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
      });
    }
  }
  return entities;
}

function parseLLMEntities(raw: string): ExtractedEntity[] {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    text = lines.slice(1).join("\n");
    if (text.endsWith("```")) text = text.slice(0, -3);
    text = text.trim();
  }

  try {
    const data = JSON.parse(text);
    const entities: ExtractedEntity[] = [];

    if (data.case_number) entities.push({ entityType: "case_number", value: data.case_number, confidence: 1.0, context: "" });
    if (data.court) entities.push({ entityType: "court", value: data.court, confidence: 1.0, context: "" });
    if (data.judge) entities.push({ entityType: "judge", value: data.judge, confidence: 1.0, context: "" });
    if (data.filing_date) entities.push({ entityType: "filing_date", value: data.filing_date, confidence: 1.0, context: "" });
    if (data.filing_type) entities.push({ entityType: "filing_type", value: data.filing_type, confidence: 1.0, context: "" });

    if (data.parties) {
      for (const p of data.parties.plaintiff || []) {
        entities.push({ entityType: "party_plaintiff", value: p, confidence: 1.0, context: "" });
      }
      for (const d of data.parties.defendant || []) {
        entities.push({ entityType: "party_defendant", value: d, confidence: 1.0, context: "" });
      }
    }

    if (data.attorneys) {
      for (const a of data.attorneys) {
        if (a.name) entities.push({ entityType: "attorney", value: `${a.name}${a.bar_number ? ` (${a.bar_number})` : ""}`, confidence: 1.0, context: a.firm || "" });
      }
    }

    if (data.citations) {
      for (const c of data.citations.case_citations || []) {
        entities.push({ entityType: "case_citation", value: c, confidence: 1.0, context: "" });
      }
      for (const s of data.citations.statute_citations || []) {
        entities.push({ entityType: "statute_citation", value: s, confidence: 1.0, context: "" });
      }
    }

    if (data.dollar_amounts) {
      for (const d of data.dollar_amounts) {
        entities.push({ entityType: "dollar_amount", value: d.amount, confidence: 1.0, context: d.context || "" });
      }
    }

    if (data.deadlines) {
      for (const dl of data.deadlines) {
        entities.push({ entityType: "deadline", value: `${dl.date}: ${dl.action}`, confidence: 1.0, context: "" });
      }
    }

    return entities;
  } catch {
    return [];
  }
}

// ========== STAGE 7: OUTPUT ==========
function stageOutput(jobId: string, text: string, entities: ExtractedEntity[], metadata: any): Record<string, string> {
  const outputDir = path.join(PIPELINE_TEMP, jobId, "output");
  ensureDir(outputDir);

  const jsonOutput = {
    metadata,
    document: { fullText: text, charCount: text.length, wordCount: text.split(/\s+/).length },
    entities: entities.map(e => ({ type: e.entityType, value: e.value, confidence: e.confidence, context: e.context })),
  };

  const jsonPath = path.join(outputDir, `${jobId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));

  const txtPath = path.join(outputDir, `${jobId}.txt`);
  fs.writeFileSync(txtPath, text);

  return { json: jsonPath, txt: txtPath };
}

// ========== ORCHESTRATOR ==========
export async function runPipeline(jobId: string, onProgress?: ProgressCallback): Promise<void> {
  const startTime = Date.now();

  const [job] = await db.select().from(videoPipelineJobs).where(eq(videoPipelineJobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} not found`);

  const config: PipelineConfig = { ...DEFAULT_CONFIG, ...(job.config as any || {}) };
  const jobDir = path.join(PIPELINE_TEMP, jobId);
  ensureDir(jobDir);

  const stageResults: Record<string, any> = {};
  const warnings: string[] = [];

  try {
    // STAGE 1: VALIDATE
    await updateJob(jobId, { status: "processing", currentStage: "validate", progress: 0 });
    onProgress?.("validate", 0, "Validating video file...");

    const stageStart = Date.now();
    const meta = await stageValidate(job.filePath);
    stageResults.validate = { status: "completed", stageDuration: Date.now() - stageStart, ...meta };
    await updateJob(jobId, { progress: STAGE_PROGRESS.validate, stageResults });
    onProgress?.("validate", STAGE_PROGRESS.validate, `Validated: ${meta.width}x${meta.height}, ${meta.duration.toFixed(1)}s`);

    // STAGE 2: EXTRACT
    await updateJob(jobId, { currentStage: "extract" });
    onProgress?.("extract", STAGE_PROGRESS.validate, "Extracting frames...");

    const extractStart = Date.now();
    const rawFrames = await stageExtract(job.filePath, jobDir, config.fps, meta.duration);
    stageResults.extract = { status: "completed", duration: Date.now() - extractStart, frameCount: rawFrames.length };
    await updateJob(jobId, { rawFrameCount: rawFrames.length, progress: STAGE_PROGRESS.extract, stageResults });
    onProgress?.("extract", STAGE_PROGRESS.extract, `Extracted ${rawFrames.length} frames`);

    // STAGE 3: DEDUPLICATE
    await updateJob(jobId, { currentStage: "deduplicate" });
    onProgress?.("deduplicate", STAGE_PROGRESS.extract, "Deduplicating frames...");

    const dedupStart = Date.now();
    const uniqueFrames = await stageDeduplicate(rawFrames, config.dedupThreshold);
    const reduction = ((1 - uniqueFrames.length / rawFrames.length) * 100).toFixed(0);
    stageResults.deduplicate = { status: "completed", duration: Date.now() - dedupStart, input: rawFrames.length, unique: uniqueFrames.length, reduction: `${reduction}%` };
    await updateJob(jobId, { uniqueFrameCount: uniqueFrames.length, progress: STAGE_PROGRESS.deduplicate, stageResults });
    onProgress?.("deduplicate", STAGE_PROGRESS.deduplicate, `${rawFrames.length} -> ${uniqueFrames.length} unique frames (${reduction}% reduction)`);

    // STAGE 4: OCR
    await updateJob(jobId, { currentStage: "ocr" });
    onProgress?.("ocr", STAGE_PROGRESS.deduplicate, `Running OCR on ${uniqueFrames.length} frames...`);

    const ocrStart = Date.now();
    const fragments = await stageOCR(uniqueFrames, config, (current, total) => {
      const baseProgress = STAGE_PROGRESS.deduplicate;
      const ocrRange = STAGE_PROGRESS.ocr - baseProgress;
      const p = Math.round(baseProgress + (current / total) * ocrRange);
      onProgress?.("ocr", p, `OCR frame ${current}/${total}`);
    });
    stageResults.ocr = { status: "completed", duration: Date.now() - ocrStart, fragmentCount: fragments.length, totalChars: fragments.reduce((s, f) => s + f.text.length, 0) };
    await updateJob(jobId, { ocrFragments: fragments as any, progress: STAGE_PROGRESS.ocr, stageResults });
    onProgress?.("ocr", STAGE_PROGRESS.ocr, `OCR complete: ${fragments.length} fragments`);

    // STAGE 5: STITCH
    await updateJob(jobId, { currentStage: "stitch" });
    onProgress?.("stitch", STAGE_PROGRESS.ocr, "Stitching document...");

    const stitchStart = Date.now();
    const stitchedText = await stageStitch(fragments, config);
    stageResults.stitch = { status: "completed", duration: Date.now() - stitchStart, charCount: stitchedText.length, wordCount: stitchedText.split(/\s+/).length };
    await updateJob(jobId, { stitchedText, progress: STAGE_PROGRESS.stitch, stageResults });
    onProgress?.("stitch", STAGE_PROGRESS.stitch, `Document stitched: ${stitchedText.split(/\s+/).length} words`);

    // STAGE 6: ENTITIES (non-critical)
    await updateJob(jobId, { currentStage: "entities" });
    onProgress?.("entities", STAGE_PROGRESS.stitch, "Extracting legal entities...");

    let entities: ExtractedEntity[] = [];
    try {
      const entityStart = Date.now();
      entities = await stageEntities(stitchedText, config);
      stageResults.entities = { status: "completed", duration: Date.now() - entityStart, count: entities.length };
    } catch (err: any) {
      logger.warn(`[video-pipeline] Entity extraction failed (non-critical): ${err.message}`);
      stageResults.entities = { status: "failed", error: err.message };
      warnings.push("Entity extraction failed - regex results only");
    }
    await updateJob(jobId, { entities: entities as any, progress: STAGE_PROGRESS.entities, stageResults, warnings: warnings as any });
    onProgress?.("entities", STAGE_PROGRESS.entities, `Extracted ${entities.length} entities`);

    // STAGE 7: OUTPUT
    await updateJob(jobId, { currentStage: "output" });
    onProgress?.("output", STAGE_PROGRESS.entities, "Generating outputs...");

    const totalDuration = (Date.now() - startTime) / 1000;
    const outputMeta = {
      jobId, source: job.fileName, fileHash: fileHash(job.filePath),
      processedAt: new Date().toISOString(), totalDuration,
      rawFrames: rawFrames.length, uniqueFrames: uniqueFrames.length,
      ocrFragments: fragments.length,
    };
    const outputs = stageOutput(jobId, stitchedText, entities, outputMeta);
    stageResults.output = { status: "completed" };

    await updateJob(jobId, {
      status: "completed", currentStage: "output", progress: 100,
      outputPaths: outputs, stageResults, totalDuration, completedAt: new Date(),
    });
    onProgress?.("output", 100, `Pipeline complete in ${totalDuration.toFixed(1)}s`);

    // Cleanup raw frames to save disk
    try {
      const framesDir = path.join(jobDir, "frames_raw");
      if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
    } catch {}

  } catch (err: any) {
    const totalDuration = (Date.now() - startTime) / 1000;
    logger.error(`[video-pipeline] Pipeline failed: ${err.message}`);
    await updateJob(jobId, {
      status: "failed", error: err.message, totalDuration,
      stageResults, warnings: warnings as any,
    });
    onProgress?.("validate", -1, `Pipeline failed: ${err.message}`);
  }
}
