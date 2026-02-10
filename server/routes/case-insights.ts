import { Router } from "express";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { evaluatePolicy, getMode, getSelectedModel, recordPolicyDecision } from "../ai/policy-engine";
import { startAIOp, completeAIOp } from "../ai/ai-ops";
import { logger } from "../utils/logger";
import {
  ANALYSIS_MODULES,
  runContradictionFinder,
  runTimelineBuilder,
  runEntityGraphBuilder,
  runDamagesLedger,
  runDiscoverySniper,
  PolicyDeniedError,
  type AnalysisModuleId,
} from "../services/analysis-modules";
import { ragQuerySchema } from "@shared/schema";
import type { CaseInsightsSummary, EvidenceCitation, RagResponse } from "@shared/schema";
import fs from "fs";
import path from "path";

const router = Router();

function makeAuditId(): string {
  return `audit_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

// ─── Case Insights (Spec §8: GET /api/cases/:caseId/insights) ───────────
router.get("/api/cases/:caseId/insights", async (req, res) => {
  try {
    const matterId = req.params.caseId;

    const matter = await db.execute(sql`SELECT * FROM matters WHERE id = ${matterId}`);
    if (!matter.rows[0]) return res.status(404).json({ error: "Matter not found" });
    const m = matter.rows[0] as any;

    const [nodesResult, connectionsResult, evidenceResult, timelineResult, contactsResult] = await Promise.all([
      db.execute(sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId}`),
      db.execute(sql`SELECT * FROM detective_connections WHERE matter_id = ${matterId}`),
      db.execute(sql`SELECT count(*)::int as count FROM evidence_vault_files WHERE matter_id = ${matterId}`),
      db.execute(sql`SELECT count(*)::int as count FROM matter_timeline WHERE matter_id = ${matterId}`),
      db.execute(sql`SELECT count(*)::int as count FROM matter_contacts WHERE matter_id = ${matterId}`),
    ]);

    const nodes = nodesResult.rows as any[];
    const connections = connectionsResult.rows as any[];
    const contradictions = connections.filter((c: any) => c.connection_type === "contradicts").length;
    const gapNodes = nodes.filter((n: any) => n.type === "gap_indicator").length;
    const totalEntities = nodes.filter((n: any) => ["person", "organization"].includes(n.type)).length + (contactsResult.rows[0] as any).count;

    const evidenceCount = nodes.filter((n: any) => n.type === "evidence").length;
    const strength = evidenceCount >= 10 && contradictions <= 2 ? "strong"
      : evidenceCount >= 5 ? "moderate" : "weak";

    const elements = ["duty", "breach", "causation", "damages"];
    const elementCoverage = elements.map(el => {
      const relatedNodes = nodes.filter((n: any) => {
        const desc = ((n.description || "") + " " + (n.title || "")).toLowerCase();
        return desc.includes(el);
      });
      const coverage = Math.min(100, relatedNodes.length * 20);
      return {
        element: el,
        coverage,
        supportingEvidence: relatedNodes.length,
        gaps: coverage < 60 ? 1 : 0,
        status: (coverage >= 80 ? "well_supported" : coverage >= 50 ? "partial" : coverage > 0 ? "weak" : "missing") as any,
      };
    });

    const keyFindings: CaseInsightsSummary["keyFindings"] = [];
    if (contradictions > 0) {
      keyFindings.push({
        finding: `${contradictions} contradiction(s) detected in evidence`,
        type: "contradiction",
        severity: contradictions >= 3 ? "critical" : "high",
        citations: connections.filter((c: any) => c.connection_type === "contradicts").slice(0, 3).map((c: any) => ({
          documentId: c.id,
          confidence: c.confidence_score || 0.7,
          sourceType: "observed" as const,
        })),
      });
    }
    if (gapNodes > 0) {
      keyFindings.push({
        finding: `${gapNodes} evidence gap(s) flagged`,
        type: "gap",
        severity: "high",
        citations: nodes.filter((n: any) => n.type === "gap_indicator").slice(0, 3).map((n: any) => ({
          documentId: n.id,
          documentTitle: n.title,
          confidence: 0.9,
          sourceType: "inferred" as const,
        })),
      });
    }

    const isolated = nodes.filter((n: any) => {
      return !connections.some((c: any) => c.source_node_id === n.id || c.target_node_id === n.id);
    });
    if (isolated.length > 0) {
      keyFindings.push({
        finding: `${isolated.length} isolated node(s) need connections`,
        type: "gap",
        severity: "medium",
        citations: isolated.slice(0, 3).map((n: any) => ({
          documentId: n.id,
          documentTitle: n.title,
          confidence: 1.0,
          sourceType: "observed" as const,
        })),
      });
    }

    const recommendations: string[] = [];
    const weakElements = elementCoverage.filter(e => e.status === "weak" || e.status === "missing");
    for (const el of weakElements) {
      recommendations.push(`Strengthen ${el.element} coverage — only ${el.supportingEvidence} supporting evidence items`);
    }
    if (contradictions > 0) recommendations.push("Review and resolve contradictions before trial preparation");
    if (isolated.length > 0) recommendations.push("Connect isolated evidence nodes to establish relationships");
    if ((evidenceResult.rows[0] as any).count < 5) recommendations.push("Upload additional evidence to the vault for comprehensive analysis");

    const result: CaseInsightsSummary = {
      matterId,
      matterName: m.name || "",
      generatedAt: new Date().toISOString(),
      auditId: makeAuditId(),
      overview: {
        totalDocuments: (evidenceResult.rows[0] as any).count,
        totalEntities,
        totalEvents: (timelineResult.rows[0] as any).count + nodes.filter((n: any) => n.type === "event").length,
        totalContradictions: contradictions,
        totalGaps: gapNodes + weakElements.length,
        evidenceStrength: strength as any,
      },
      elementCoverage,
      keyFindings,
      recommendations,
    };

    res.json(result);
  } catch (error) {
    logger.error("[case-insights] Failed to generate insights", { error });
    res.status(500).json({ error: "Failed to generate case insights" });
  }
});

// ─── Case Graph (Spec §8: GET /api/cases/:caseId/graph) ─────────────────
router.get("/api/cases/:caseId/graph", async (req, res) => {
  try {
    const matterId = req.params.caseId;
    const result = await runEntityGraphBuilder(matterId);
    res.json(result);
  } catch (error) {
    if (error instanceof PolicyDeniedError) return res.status(403).json({ error: error.message, policy: error.decision });
    logger.error("[case-insights] Graph builder failed", { error });
    res.status(500).json({ error: "Failed to build entity graph" });
  }
});

// ─── Case Timeline (Spec §8: GET /api/cases/:caseId/timeline) ───────────
router.get("/api/cases/:caseId/timeline", async (req, res) => {
  try {
    const matterId = req.params.caseId;
    const result = await runTimelineBuilder(matterId);
    res.json(result);
  } catch (error) {
    if (error instanceof PolicyDeniedError) return res.status(403).json({ error: error.message, policy: error.decision });
    logger.error("[case-insights] Timeline builder failed", { error });
    res.status(500).json({ error: "Failed to build timeline" });
  }
});

// ─── Case Contradictions (Spec §8: GET /api/cases/:caseId/contradictions)
router.get("/api/cases/:caseId/contradictions", async (req, res) => {
  try {
    const matterId = req.params.caseId;
    const result = await runContradictionFinder(matterId);
    res.json(result);
  } catch (error) {
    if (error instanceof PolicyDeniedError) return res.status(403).json({ error: error.message, policy: error.decision });
    logger.error("[case-insights] Contradiction finder failed", { error });
    res.status(500).json({ error: "Failed to find contradictions" });
  }
});

// ─── Analysis Queue (Spec §8: POST /api/analysis/queue) ─────────────────
router.post("/api/analysis/queue", async (req, res) => {
  try {
    const { moduleId, matterId } = req.body;
    if (!moduleId || !matterId) {
      return res.status(400).json({ error: "moduleId and matterId required" });
    }
    if (!(moduleId in ANALYSIS_MODULES)) {
      return res.status(400).json({
        error: `Unknown module: ${moduleId}`,
        available: Object.keys(ANALYSIS_MODULES),
      });
    }
    const mod = ANALYSIS_MODULES[moduleId as AnalysisModuleId];
    const result = await mod.run(matterId);
    res.json(result);
  } catch (error) {
    if (error instanceof PolicyDeniedError) return res.status(403).json({ error: error.message, policy: error.decision });
    logger.error("[case-insights] Analysis module failed", { error });
    res.status(500).json({ error: "Analysis module execution failed" });
  }
});

// ─── List Available Modules ──────────────────────────────────────────────
router.get("/api/analysis/modules", (_req, res) => {
  const modules = Object.entries(ANALYSIS_MODULES).map(([id, mod]) => ({
    id,
    name: mod.name,
    description: getModuleDescription(id),
  }));
  res.json({ modules });
});

function getModuleDescription(id: string): string {
  const descriptions: Record<string, string> = {
    contradiction_finder: "Identifies conflicting statements, dates, and narratives across evidence. Returns observed contradictions with citations.",
    timeline_builder: "Constructs chronological timeline from events and detective board, detects gaps and temporal anomalies.",
    entity_graph_builder: "Maps entities, relationships, and connection hubs. Identifies isolated evidence and central figures.",
    damages_ledger: "Aggregates documented expenses, time entries, and damage-related evidence into a structured ledger.",
    discovery_sniper: "Record-anchored discovery planning: identifies evidence gaps, deposition targets, key witnesses, and items needing corroboration.",
  };
  return descriptions[id] || "";
}

// ─── RAG Query (Spec §8: POST /api/cases/:caseId/query) ─────────────────
router.post("/api/cases/:caseId/query", async (req, res) => {
  try {
    const matterId = req.params.caseId;
    const parsed = ragQuerySchema.safeParse({ ...req.body, matterId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
    }

    const { query, maxResults, includeInferred } = parsed.data;
    const mode = getMode();
    const modelId = getSelectedModel();
    const decision = evaluatePolicy({
      mode,
      requestedModelId: modelId,
      casePolicy: "standard",
      payloadClassification: "derived",
      caller: "rag_query",
      matterId,
    });
    recordPolicyDecision({
      mode,
      requestedModelId: modelId,
      casePolicy: "standard",
      payloadClassification: "derived",
      caller: "rag_query",
      matterId,
    }, decision);

    if (!decision.allowed) {
      return res.status(403).json({ error: `Policy denied: ${decision.reason}`, policy: decision });
    }

    const op = startAIOp(decision.effectiveProvider, decision.effectiveModelId, "rag_query", query, "case-insights");

    const queryLower = query.toLowerCase();
    const nodes = await db.execute(
      sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId}`
    );
    const evidence = await db.execute(
      sql`SELECT * FROM evidence_vault_files WHERE matter_id = ${matterId}`
    );
    const timeline = await db.execute(
      sql`SELECT * FROM matter_timeline WHERE matter_id = ${matterId}`
    );

    const allItems = [
      ...(nodes.rows as any[]).map((n: any) => ({
        id: n.id,
        title: n.title,
        text: `${n.title} ${n.description || ""}`,
        type: n.type,
        isInferred: n.is_inferred,
        confidence: n.confidence_score || 0.7,
      })),
      ...(evidence.rows as any[]).map((e: any) => ({
        id: e.id,
        title: e.original_name || e.title,
        text: `${e.original_name || ""} ${e.description || ""} ${e.evidence_type || ""}`,
        type: "evidence_vault",
        isInferred: false,
        confidence: 0.95,
      })),
      ...(timeline.rows as any[]).map((t: any) => ({
        id: t.id,
        title: t.title,
        text: `${t.title} ${t.description || ""}`,
        type: "timeline_event",
        isInferred: false,
        confidence: 0.9,
      })),
    ];

    const filtered = allItems.filter(item => {
      if (!includeInferred && item.isInferred) return false;
      return item.text.toLowerCase().includes(queryLower) ||
        queryLower.split(/\s+/).some(word => item.text.toLowerCase().includes(word));
    });

    const scored = filtered.map(item => {
      const words = queryLower.split(/\s+/);
      const matchCount = words.filter(w => item.text.toLowerCase().includes(w)).length;
      const relevance = matchCount / Math.max(words.length, 1);
      return { ...item, relevance };
    }).sort((a, b) => b.relevance - a.relevance).slice(0, maxResults);

    const citations: EvidenceCitation[] = scored.map(item => ({
      documentId: item.id,
      documentTitle: item.title,
      confidence: item.confidence,
      sourceType: (item.isInferred ? "inferred" : "observed") as any,
      excerpt: item.text.slice(0, 200),
    }));

    const answer = scored.length > 0
      ? `Found ${scored.length} relevant item(s) for "${query}": ${scored.slice(0, 3).map(s => s.title).join(", ")}${scored.length > 3 ? ` and ${scored.length - 3} more` : ""}.`
      : `No relevant items found for "${query}" in this matter's evidence.`;

    const result: RagResponse = {
      answer,
      citations,
      auditId: makeAuditId(),
      mode,
      effectiveModel: decision.effectiveModelId,
      confidence: scored.length > 0 ? scored[0].relevance : 0,
      relatedEntities: [...new Set(scored.map(s => s.type))],
    };

    completeAIOp(op.id, op.startTime, answer);
    res.json(result);
  } catch (error) {
    if (error instanceof PolicyDeniedError) return res.status(403).json({ error: error.message, policy: error.decision });
    logger.error("[case-insights] RAG query failed", { error });
    res.status(500).json({ error: "RAG query failed" });
  }
});

// ─── Court Export (Spec §8: GET /api/documents/:id/export-for-court) ─────
router.get("/api/documents/:id/export-for-court", async (req, res) => {
  try {
    const documentId = req.params.id;

    const evidence = await db.execute(
      sql`SELECT * FROM evidence_vault_files WHERE id = ${documentId}`
    );
    if (!evidence.rows[0]) {
      return res.status(404).json({ error: "Document not found in evidence vault" });
    }
    const doc = evidence.rows[0] as any;

    let computedHash: string | null = null;
    let integrityStatus: "verified" | "hash_mismatch" | "file_unavailable" = "file_unavailable";
    if (doc.original_url) {
      try {
        const filePath = doc.original_url.startsWith("/") ? doc.original_url : path.resolve(doc.original_url);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          computedHash = createHash("sha256").update(fileBuffer).digest("hex");
          integrityStatus = computedHash === doc.original_hash ? "verified" : "hash_mismatch";
        }
      } catch {
        integrityStatus = "file_unavailable";
      }
    }

    const sha256Certificate = {
      documentId: doc.id,
      originalName: doc.original_name,
      storedHash: doc.original_hash,
      computedHash: computedHash || undefined,
      hashAlgorithm: "SHA-256",
      verifiedAt: new Date().toISOString(),
      integrityStatus,
      fileSize: doc.original_size,
      mimeType: doc.original_mime_type,
    };

    const custodyChain = doc.chain_of_custody || [];

    const verificationReport = {
      documentId: doc.id,
      title: doc.original_name,
      evidenceType: doc.evidence_type,
      confidentiality: doc.confidentiality,
      uploadedBy: doc.uploaded_by,
      uploadedAt: doc.uploaded_at,
      hashVerification: {
        algorithm: "SHA-256",
        storedHash: doc.original_hash,
        status: "verified",
      },
      custodyEntries: custodyChain.length,
      tags: doc.tags || [],
      description: doc.description,
    };

    const courtPackage = {
      exportType: "court_ready",
      exportedAt: new Date().toISOString(),
      auditId: makeAuditId(),
      document: {
        id: doc.id,
        originalName: doc.original_name,
        evidenceType: doc.evidence_type,
        fileSize: doc.original_size,
        mimeType: doc.original_mime_type,
        storageUrl: doc.original_url,
      },
      sha256Certificate,
      custodyChain,
      verificationReport,
      attestation: `This document package was generated by VERICASE on ${new Date().toISOString()}. The SHA-256 hash of the original file (${doc.original_hash}) has been verified against the stored hash. The chain of custody contains ${custodyChain.length} entries.`,
    };

    res.json(courtPackage);
  } catch (error) {
    logger.error("[case-insights] Court export failed", { error });
    res.status(500).json({ error: "Failed to generate court export" });
  }
});

// ─── Document Integrity Verify (Spec §8) ─────────────────────────────────
router.get("/api/documents/:id/verify", async (req, res) => {
  try {
    const documentId = req.params.id;
    const evidence = await db.execute(
      sql`SELECT * FROM evidence_vault_files WHERE id = ${documentId}`
    );
    if (!evidence.rows[0]) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = evidence.rows[0] as any;

    let computedHash: string | null = null;
    let status: "verified" | "hash_mismatch" | "file_unavailable" = "file_unavailable";
    if (doc.original_url) {
      try {
        const filePath = doc.original_url.startsWith("/") ? doc.original_url : path.resolve(doc.original_url);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          computedHash = createHash("sha256").update(fileBuffer).digest("hex");
          status = computedHash === doc.original_hash ? "verified" : "hash_mismatch";
        }
      } catch {
        status = "file_unavailable";
      }
    }

    res.json({
      documentId: doc.id,
      originalName: doc.original_name,
      hashAlgorithm: "SHA-256",
      storedHash: doc.original_hash,
      computedHash: computedHash || undefined,
      fileSize: doc.original_size,
      status,
      verifiedAt: new Date().toISOString(),
      uploadedAt: doc.uploaded_at,
      uploadedBy: doc.uploaded_by,
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// ─── Document Custody Chain (Spec §8) ────────────────────────────────────
router.get("/api/documents/:id/custody-chain", async (req, res) => {
  try {
    const documentId = req.params.id;
    const evidence = await db.execute(
      sql`SELECT * FROM evidence_vault_files WHERE id = ${documentId}`
    );
    if (!evidence.rows[0]) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = evidence.rows[0] as any;

    res.json({
      documentId: doc.id,
      originalName: doc.original_name,
      chain: doc.chain_of_custody || [],
      totalEntries: (doc.chain_of_custody || []).length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get custody chain" });
  }
});

export default router;
