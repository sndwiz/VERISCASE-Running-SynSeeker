import { Router } from "express";
import multer from "multer";
import { createHash } from "crypto";
import fs from "fs";
import { PDFDocument } from "pdf-lib";

const router = Router();

const upload = multer({
  dest: "uploads/pdf-forensics/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

interface Finding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  detail: string;
  evidence: string[];
}

interface ForensicReport {
  id: string;
  filename: string;
  fileSize: number;
  md5: string;
  sha256: string;
  analyzedAt: string;
  pageCount: number;
  findings: Finding[];
  metadata: Record<string, string>;
  severityCounts: Record<string, number>;
  revisionCount: number;
  pageAnalysis: { totalPages: number; inconsistentPages: string[] };
}

const reportsStore: Map<string, ForensicReport> = new Map();
const matterReports: Map<string, string[]> = new Map();

const KNOWN_TOOLS = [
  { name: "pdftk", desc: "PDF toolkit that can modify structure, flatten layers, or alter metadata" },
  { name: "itext", desc: "Java library for programmatic PDF modification" },
  { name: "ghostscript", desc: "PostScript interpreter that can rebuild and modify PDFs" },
  { name: "pikepdf", desc: "Python library for PDF manipulation" },
  { name: "qpdf", desc: "PDF transformation tool" },
  { name: "nitro", desc: "PDF editor with full document modification capabilities" },
  { name: "foxit", desc: "PDF editor" },
  { name: "libreoffice", desc: "Office suite with PDF export" },
];

function analyzeMetadataTools(metadata: Record<string, string>): Finding[] {
  const findings: Finding[] = [];
  const toolsFound: string[] = [];
  const allValues = Object.entries(metadata).map(([k, v]) => ({ field: k, value: String(v).toLowerCase() }));

  for (const tool of KNOWN_TOOLS) {
    for (const { field, value } of allValues) {
      if (value.includes(tool.name)) {
        toolsFound.push(tool.name);
        findings.push({
          severity: "medium",
          category: "Metadata",
          title: `PDF manipulation tool detected: ${tool.name}`,
          detail: `Field '${field}' contains reference to '${tool.name}'. ${tool.desc}.`,
          evidence: [`${field}: ${metadata[field] || ""}`.substring(0, 500)],
        });
      }
    }
  }

  const uniqueTools = Array.from(new Set(toolsFound));
  if (uniqueTools.length > 1) {
    findings.unshift({
      severity: "high",
      category: "Metadata",
      title: "Multiple PDF creation tools detected",
      detail: "Document was processed by multiple tools, suggesting re-processing or manipulation.",
      evidence: uniqueTools.map(t => t),
    });
  }

  const creatorField = metadata["/Creator"] || metadata["pypdf_/Creator"] || "";
  const producerField = metadata["/Producer"] || metadata["pypdf_/Producer"] || "";
  if (creatorField && producerField && creatorField !== producerField) {
    const creatorLower = creatorField.toLowerCase();
    const producerLower = producerField.toLowerCase();
    if (!creatorLower.includes(producerLower) && !producerLower.includes(creatorLower)) {
      findings.push({
        severity: "medium",
        category: "Metadata",
        title: "Creator and Producer mismatch",
        detail: "The document creator and producer fields differ, which may indicate the document was re-processed after initial creation.",
        evidence: [`Creator: ${creatorField}`, `Producer: ${producerField}`],
      });
    }
  }

  return findings;
}

function analyzeStructure(buffer: Buffer): Finding[] {
  const findings: Finding[] = [];
  const raw = buffer.toString("binary");

  const eofMatches = raw.match(/%%EOF/g);
  const eofCount = eofMatches ? eofMatches.length : 0;

  if (eofCount > 1) {
    findings.push({
      severity: "medium",
      category: "Structure",
      title: `Multiple cross-reference tables (${eofCount})`,
      detail: "Multiple xref tables indicate the document was modified and saved incrementally. Each xref represents a modification session.",
      evidence: [`%%EOF markers found: ${eofCount}`],
    });
  }

  const lastEof = raw.lastIndexOf("%%EOF");
  if (lastEof >= 0) {
    const trailingBytes = buffer.length - (lastEof + 5);
    const trailingContent = buffer.slice(lastEof + 5);
    const trimmed = trailingContent.toString("utf-8").trim();
    if (trailingBytes > 10 && trimmed.length > 5) {
      findings.push({
        severity: "high",
        category: "Structure",
        title: "DATA FOUND AFTER FINAL %%EOF",
        detail: `There are ${trailingBytes} bytes of data after the document end marker. This data is not part of the PDF but could contain hidden information, original document fragments, or steganographic content.`,
        evidence: [
          `Trailing bytes: ${trailingBytes}`,
          `Preview: ${trimmed.substring(0, 300)}`,
        ],
      });
    }
  }

  const jsPattern = /\/JavaScript|\/JS\s/g;
  const jsMatches = raw.match(jsPattern);
  if (jsMatches && jsMatches.length > 0) {
    findings.push({
      severity: "high",
      category: "Security",
      title: `JavaScript detected (${jsMatches.length} reference(s))`,
      detail: "JavaScript code found in the PDF. This could be used for malicious purposes or to auto-execute actions when the document is opened.",
      evidence: [`JavaScript references: ${jsMatches.length}`],
    });
  }

  const embeddedPattern = /\/EmbeddedFile/g;
  const embeddedMatches = raw.match(embeddedPattern);
  if (embeddedMatches && embeddedMatches.length > 0) {
    findings.push({
      severity: "medium",
      category: "Security",
      title: `Embedded files detected (${embeddedMatches.length})`,
      detail: "Files embedded within the PDF. These are not visible in normal viewing but exist in the file structure and could contain hidden documents or scripts.",
      evidence: [`Embedded file references: ${embeddedMatches.length}`],
    });
  }

  return findings;
}

function analyzeContentStreams(buffer: Buffer): Finding[] {
  const findings: Finding[] = [];
  const raw = buffer.toString("binary");

  const whiteTextPattern = /1\s+1\s+1\s+rg|1\.0+\s+1\.0+\s+1\.0+\s+rg/g;
  const whiteMatches = raw.match(whiteTextPattern);
  if (whiteMatches && whiteMatches.length > 0) {
    findings.push({
      severity: "critical",
      category: "Hidden Text",
      title: `WHITE TEXT color commands detected (${whiteMatches.length} occurrence(s))`,
      detail: "Text rendered in white (RGB 1,1,1) found in content streams. This text is invisible on white backgrounds but contains readable content. Common technique for hiding information in plain sight.",
      evidence: [`White color (rg) commands found: ${whiteMatches.length}`],
    });
  }

  const tinyFontPattern = /(\d*\.?\d+)\s+Tf/g;
  let tinyFontMatch;
  const tinyFonts: string[] = [];
  while ((tinyFontMatch = tinyFontPattern.exec(raw)) !== null) {
    const size = parseFloat(tinyFontMatch[1]);
    if (size > 0 && size < 1) {
      tinyFonts.push(`${size}pt`);
    }
  }
  if (tinyFonts.length > 0) {
    findings.push({
      severity: "high",
      category: "Hidden Text",
      title: `MICROSCOPIC TEXT detected (${tinyFonts.length} occurrence(s))`,
      detail: "Text smaller than 1 point found. This is too small to read and may be used to hide content while keeping it technically 'present' in the document.",
      evidence: tinyFonts.slice(0, 10).map(s => `Font size: ${s}`),
    });
  }

  const blackRectPattern = /0\s+0\s+0\s+rg[^]*?re\s+f/g;
  const blackRects = raw.match(blackRectPattern);
  if (blackRects && blackRects.length > 0) {
    findings.push({
      severity: "critical",
      category: "Redactions",
      title: `Possible FAKE REDACTIONS detected - ${blackRects.length} found`,
      detail: "Black-filled rectangles found in content streams. These may overlay readable text that is still extractable. True redactions permanently remove text. Verify if underlying text is accessible.",
      evidence: [`Black rectangle fill patterns: ${blackRects.length}`],
    });
  }

  return findings;
}

async function analyzePages(pdfDoc: PDFDocument): Promise<{ findings: Finding[]; pageAnalysis: { totalPages: number; inconsistentPages: string[] } }> {
  const findings: Finding[] = [];
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const inconsistentPages: string[] = [];

  if (totalPages === 0) {
    return { findings, pageAnalysis: { totalPages, inconsistentPages } };
  }

  const standardWidth = pages[0].getWidth();
  const standardHeight = pages[0].getHeight();

  for (let i = 1; i < pages.length; i++) {
    const w = pages[i].getWidth();
    const h = pages[i].getHeight();
    if (Math.abs(w - standardWidth) > 1 || Math.abs(h - standardHeight) > 1) {
      inconsistentPages.push(`Page ${i + 1}: ${w}x${h} differs from standard ${standardWidth}x${standardHeight}`);
    }
  }

  if (inconsistentPages.length > 0) {
    findings.push({
      severity: "high",
      category: "Pages",
      title: `Inconsistent page sizes on ${inconsistentPages.length} page(s)`,
      detail: "Some pages have different dimensions than the majority. All pages should typically be the same size. Different sizes suggest pages were inserted from a different document.",
      evidence: inconsistentPages,
    });
  }

  return { findings, pageAnalysis: { totalPages, inconsistentPages } };
}

function analyzeSignatures(buffer: Buffer): Finding[] {
  const findings: Finding[] = [];
  const raw = buffer.toString("binary");

  const sigPattern = /\/Type\s*\/Sig|\/SubFilter\s*\/adbe/g;
  const sigMatches = raw.match(sigPattern);

  if (!sigMatches || sigMatches.length === 0) {
    findings.push({
      severity: "info",
      category: "Signatures",
      title: "No digital signatures found",
      detail: "Court-approved documents should typically be digitally signed. Absence of signatures on court documents is notable.",
      evidence: [],
    });
  } else {
    findings.push({
      severity: "info",
      category: "Signatures",
      title: `Digital signature(s) found (${sigMatches.length})`,
      detail: "Document contains digital signature references. Signature validity should be verified with the signing certificate authority.",
      evidence: [`Signature references: ${sigMatches.length}`],
    });
  }

  return findings;
}

function countObjects(buffer: Buffer): Finding {
  const raw = buffer.toString("binary");
  const objPattern = /\d+\s+\d+\s+obj/g;
  const objMatches = raw.match(objPattern);
  const total = objMatches ? objMatches.length : 0;

  const streamCount = (raw.match(/stream\r?\n/g) || []).length;
  const imagePattern = /\/Subtype\s*\/Image/g;
  const imageCount = (raw.match(imagePattern) || []).length;
  const fontCount = (raw.match(/\/Type\s*\/Font/g) || []).length;
  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;

  return {
    severity: "info",
    category: "Objects",
    title: `Object census: ${total} total, ${streamCount} streams, ${imageCount} images`,
    detail: "Object breakdown for reference.",
    evidence: [
      `/Page: ${pageCount}`,
      `/Font: ${fontCount}`,
      `Streams: ${streamCount}`,
      `Images: ${imageCount}`,
    ],
  };
}

router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const matterId = req.body.matterId || null;
    const buffer = fs.readFileSync(file.path);

    const md5 = createHash("md5").update(buffer).digest("hex");
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const allFindings: Finding[] = [];

    let pdfText = "";
    let pdfNumPages = 0;
    let pdfInfo: any = {};
    try {
      const { PDFParse } = await import("pdf-parse") as any;
      const parser = new PDFParse(new Uint8Array(buffer));
      await parser.load();
      const textResult = await parser.getText();
      pdfText = textResult?.text || "";
      pdfNumPages = textResult?.total || 0;
      pdfInfo = await parser.getInfo();
    } catch (e) {
      allFindings.push({
        severity: "medium",
        category: "Structure",
        title: "PDF text extraction incomplete",
        detail: "The PDF text layer could not be fully parsed. Metadata and structural analysis are still available. The document may use non-standard fonts or encoding.",
        evidence: [String(e).substring(0, 300)],
      });
    }

    const metadata: Record<string, string> = {};
    if (pdfInfo?.info) {
      for (const [k, v] of Object.entries(pdfInfo.info)) {
        if (typeof v === "string" || typeof v === "number") {
          metadata[`/${k}`] = String(v);
        }
      }
    }
    if (pdfInfo?.metadata) {
      try {
        const raw = typeof pdfInfo.metadata === "object" ? pdfInfo.metadata : {};
        for (const [k, v] of Object.entries(raw)) {
          if (typeof v === "string") metadata[`_xmp_${k}`] = v;
        }
      } catch (_) {}
    }

    allFindings.push(...analyzeMetadataTools(metadata));

    allFindings.push(...analyzeStructure(buffer));

    allFindings.push(...analyzeContentStreams(buffer));

    allFindings.push(...analyzeSignatures(buffer));

    let pageCount = pdfNumPages || 0;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageResult = await analyzePages(pdfDoc);
      allFindings.push(...pageResult.findings);
      pageCount = pageResult.pageAnalysis.totalPages || pageCount;
    } catch (e) {
      allFindings.push({
        severity: "medium",
        category: "Structure",
        title: "Could not load PDF for page analysis",
        detail: "pdf-lib could not parse the document. Page-level analysis is unavailable.",
        evidence: [String(e).substring(0, 200)],
      });
    }

    allFindings.push(countObjects(buffer));

    allFindings.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return order[a.severity] - order[b.severity];
    });

    const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of allFindings) {
      severityCounts[f.severity]++;
    }

    const eofCount = (buffer.toString("binary").match(/%%EOF/g) || []).length;

    const reportId = `fr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const report: ForensicReport = {
      id: reportId,
      filename: file.originalname,
      fileSize: file.size,
      md5,
      sha256,
      analyzedAt: new Date().toISOString(),
      pageCount,
      findings: allFindings,
      metadata,
      severityCounts,
      revisionCount: Math.max(1, eofCount),
      pageAnalysis: {
        totalPages: pageCount,
        inconsistentPages: allFindings
          .filter(f => f.category === "Pages")
          .flatMap(f => f.evidence),
      },
    };

    reportsStore.set(reportId, report);

    if (matterId) {
      const existing = matterReports.get(matterId) || [];
      existing.push(reportId);
      matterReports.set(matterId, existing);
    }

    try { fs.unlinkSync(file.path); } catch (_) {}

    res.json(report);
  } catch (error: any) {
    console.error("PDF forensic analysis error:", error);
    res.status(500).json({ error: error.message || "Analysis failed" });
  }
});

router.get("/reports/:id", (req, res) => {
  const report = reportsStore.get(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

router.get("/matters/:matterId/reports", (req, res) => {
  const reportIds = matterReports.get(req.params.matterId) || [];
  const reports = reportIds.map(id => reportsStore.get(id)).filter(Boolean);
  res.json(reports);
});

export default router;
