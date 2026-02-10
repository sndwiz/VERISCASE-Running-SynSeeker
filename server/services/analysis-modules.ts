import { randomUUID } from "crypto";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { evaluatePolicy, getMode, getSelectedModel, recordPolicyDecision } from "../ai/policy-engine";
import { startAIOp, completeAIOp } from "../ai/ai-ops";
import { logger } from "../utils/logger";
import type { AnalysisResult, EvidenceCitation } from "@shared/schema";

function makeAuditId(): string {
  return `audit_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function getPolicyContext(matterId: string, caller: string) {
  const mode = getMode();
  const modelId = getSelectedModel();
  const decision = evaluatePolicy({
    mode,
    requestedModelId: modelId,
    casePolicy: "standard",
    payloadClassification: "derived",
    caller,
    matterId,
  });
  recordPolicyDecision({
    mode,
    requestedModelId: modelId,
    casePolicy: "standard",
    payloadClassification: "derived",
    caller,
    matterId,
  }, decision);
  if (!decision.allowed) {
    throw new PolicyDeniedError(decision.reason, decision);
  }
  return { mode, decision };
}

export class PolicyDeniedError extends Error {
  public decision: any;
  constructor(reason: string, decision: any) {
    super(`Policy denied: ${reason}`);
    this.name = "PolicyDeniedError";
    this.decision = decision;
  }
}

function buildResult(
  moduleId: string,
  moduleName: string,
  matterId: string,
  items: AnalysisResult["items"],
  summary: string,
  ctx: ReturnType<typeof getPolicyContext>
): AnalysisResult {
  return {
    moduleId,
    moduleName,
    matterId,
    runAt: new Date().toISOString(),
    auditId: makeAuditId(),
    mode: ctx.mode,
    effectiveModel: ctx.decision.effectiveModelId,
    items,
    summary,
    totalItems: items.length,
  };
}

export async function runContradictionFinder(matterId: string): Promise<AnalysisResult> {
  const ctx = getPolicyContext(matterId, "contradiction_finder");
  const op = startAIOp(ctx.decision.effectiveProvider, ctx.decision.effectiveModelId, "contradiction_finder", matterId, "analysis-modules");

  try {
    const connections = await db.execute(
      sql`SELECT dc.*, 
        sn.title as source_title, sn.description as source_desc, sn.type as source_type,
        tn.title as target_title, tn.description as target_desc, tn.type as target_type
      FROM detective_connections dc
      JOIN detective_nodes sn ON dc.source_node_id = sn.id
      JOIN detective_nodes tn ON dc.target_node_id = tn.id
      WHERE dc.matter_id = ${matterId} AND dc.connection_type = 'contradicts'`
    );

    const items: AnalysisResult["items"] = (connections.rows as any[]).map((c, i) => ({
      id: `contradiction_${i}`,
      type: "contradiction",
      title: `${c.source_title} contradicts ${c.target_title}`,
      description: `Statement: "${(c.source_desc || "").slice(0, 200)}" conflicts with: "${(c.target_desc || "").slice(0, 200)}"`,
      severity: (c.strength >= 4 ? "critical" : c.strength >= 3 ? "high" : "medium") as any,
      confidence: c.confidence_score || 0.7,
      sourceType: c.is_inferred ? "inferred" as const : "observed" as const,
      citations: [
        { documentId: c.source_node_id, documentTitle: c.source_title, confidence: c.confidence_score || 0.7, sourceType: "observed" as const },
        { documentId: c.target_node_id, documentTitle: c.target_title, confidence: c.confidence_score || 0.7, sourceType: "observed" as const },
      ],
      alternatives: c.notes ? [c.notes] : [],
      metadata: { connectionId: c.id, strength: c.strength },
    }));

    const nodes = await db.execute(
      sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId} AND type = 'theory'`
    );
    for (const theory of (nodes.rows as any[])) {
      const relatedConns = await db.execute(
        sql`SELECT * FROM detective_connections WHERE matter_id = ${matterId} 
        AND (source_node_id = ${theory.id} OR target_node_id = ${theory.id})
        AND connection_type = 'contradicts'`
      );
      if ((relatedConns.rows as any[]).length > 0) {
        items.push({
          id: `theory_conflict_${theory.id}`,
          type: "theory_conflict",
          title: `Theory "${theory.title}" has contradicting evidence`,
          description: `${(relatedConns.rows as any[]).length} piece(s) of evidence contradict this theory`,
          severity: "high",
          confidence: 0.8,
          sourceType: "inferred",
          citations: [{ documentId: theory.id, documentTitle: theory.title, confidence: 0.8, sourceType: "inferred" }],
        });
      }
    }

    const summary = items.length > 0
      ? `Found ${items.length} contradiction(s) in matter evidence. ${items.filter(i => i.severity === "critical").length} critical.`
      : "No contradictions detected in current evidence.";

    completeAIOp(op.id, op.startTime, summary);
    return buildResult("contradiction_finder", "Contradiction Finder", matterId, items, summary, ctx);
  } catch (error) {
    completeAIOp(op.id, op.startTime, "", "error", String(error));
    throw error;
  }
}

export async function runTimelineBuilder(matterId: string): Promise<AnalysisResult> {
  const ctx = getPolicyContext(matterId, "timeline_builder");
  const op = startAIOp(ctx.decision.effectiveProvider, ctx.decision.effectiveModelId, "timeline_builder", matterId, "analysis-modules");

  try {
    const events = await db.execute(
      sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId} AND type IN ('event', 'timeline_marker')
      ORDER BY created_at ASC`
    );

    const timelineItems = await db.execute(
      sql`SELECT * FROM matter_timeline WHERE matter_id = ${matterId} ORDER BY event_date ASC`
    );

    const items: AnalysisResult["items"] = [];

    for (const ev of (timelineItems.rows as any[])) {
      items.push({
        id: `timeline_${ev.id}`,
        type: "timeline_event",
        title: ev.title,
        description: ev.description || "",
        confidence: 0.9,
        sourceType: "observed",
        citations: [{ documentId: ev.id, documentTitle: ev.title, confidence: 0.9, sourceType: "observed" }],
        metadata: { eventDate: ev.event_date, eventType: ev.event_type },
      });
    }

    for (const node of (events.rows as any[])) {
      const exists = items.some(i => i.title === node.title);
      if (!exists) {
        items.push({
          id: `board_event_${node.id}`,
          type: "board_event",
          title: node.title,
          description: node.description || "",
          confidence: node.confidence_score || 0.7,
          sourceType: node.is_inferred ? "inferred" : "observed",
          citations: [{ documentId: node.id, documentTitle: node.title, confidence: node.confidence_score || 0.7, sourceType: node.is_inferred ? "inferred" : "observed" }],
          metadata: { nodeType: node.type, position: { x: node.position_x, y: node.position_y } },
        });
      }
    }

    const gaps: string[] = [];
    const sorted = items.sort((a, b) => {
      const da = a.metadata?.eventDate ? new Date(a.metadata.eventDate).getTime() : 0;
      const db2 = b.metadata?.eventDate ? new Date(b.metadata.eventDate).getTime() : 0;
      return da - db2;
    });
    for (let i = 0; i < sorted.length - 1; i++) {
      const currDate = sorted[i].metadata?.eventDate ? new Date(sorted[i].metadata!.eventDate as string) : null;
      const nextDate = sorted[i + 1].metadata?.eventDate ? new Date(sorted[i + 1].metadata!.eventDate as string) : null;
      if (currDate && nextDate) {
        const gapHours = (nextDate.getTime() - currDate.getTime()) / (1000 * 60 * 60);
        if (gapHours > 24) {
          gaps.push(`${Math.round(gapHours / 24)} day gap between "${sorted[i].title}" and "${sorted[i + 1].title}"`);
          items.push({
            id: `gap_${i}`,
            type: "timeline_gap",
            title: `Gap: ${Math.round(gapHours / 24)} days unaccounted`,
            description: `Between "${sorted[i].title}" and "${sorted[i + 1].title}"`,
            severity: gapHours > 168 ? "critical" : gapHours > 72 ? "high" : "medium",
            confidence: 0.95,
            sourceType: "inferred",
            citations: [
              { documentId: sorted[i].id, documentTitle: sorted[i].title, confidence: 0.95, sourceType: "observed" },
              { documentId: sorted[i + 1].id, documentTitle: sorted[i + 1].title, confidence: 0.95, sourceType: "observed" },
            ],
          });
        }
      }
    }

    const summary = `Timeline contains ${items.filter(i => i.type !== "timeline_gap").length} event(s). ${gaps.length} significant gap(s) detected.`;
    completeAIOp(op.id, op.startTime, summary);
    return buildResult("timeline_builder", "Timeline Builder", matterId, items, summary, ctx);
  } catch (error) {
    completeAIOp(op.id, op.startTime, "", "error", String(error));
    throw error;
  }
}

export async function runEntityGraphBuilder(matterId: string): Promise<AnalysisResult> {
  const ctx = getPolicyContext(matterId, "entity_graph_builder");
  const op = startAIOp(ctx.decision.effectiveProvider, ctx.decision.effectiveModelId, "entity_graph_builder", matterId, "analysis-modules");

  try {
    const nodes = await db.execute(
      sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId}`
    );
    const connections = await db.execute(
      sql`SELECT dc.*, sn.title as source_title, tn.title as target_title
      FROM detective_connections dc
      JOIN detective_nodes sn ON dc.source_node_id = sn.id
      JOIN detective_nodes tn ON dc.target_node_id = tn.id
      WHERE dc.matter_id = ${matterId}`
    );
    const contacts = await db.execute(
      sql`SELECT * FROM matter_contacts WHERE matter_id = ${matterId}`
    );

    const items: AnalysisResult["items"] = [];

    const typeCounts: Record<string, number> = {};
    for (const n of (nodes.rows as any[])) {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      items.push({
        id: `entity_group_${type}`,
        type: "entity_cluster",
        title: `${type}: ${count} node(s)`,
        description: `${count} ${type} entities identified in the investigation`,
        confidence: 0.95,
        sourceType: "observed",
        citations: (nodes.rows as any[]).filter((n: any) => n.type === type).slice(0, 3).map((n: any) => ({
          documentId: n.id,
          documentTitle: n.title,
          confidence: n.confidence_score || 0.8,
          sourceType: (n.is_inferred ? "inferred" : "observed") as "observed" | "inferred",
        })),
        metadata: { nodeType: type, count },
      });
    }

    const degreeMap: Record<string, number> = {};
    for (const c of (connections.rows as any[])) {
      degreeMap[c.source_node_id] = (degreeMap[c.source_node_id] || 0) + 1;
      degreeMap[c.target_node_id] = (degreeMap[c.target_node_id] || 0) + 1;
    }
    const hubs = Object.entries(degreeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [nodeId, degree] of hubs) {
      const node = (nodes.rows as any[]).find((n: any) => n.id === nodeId);
      if (node) {
        items.push({
          id: `hub_${nodeId}`,
          type: "hub_entity",
          title: `Hub: ${node.title} (${degree} connections)`,
          description: `Central entity with ${degree} connections — likely key figure or evidence`,
          severity: degree >= 5 ? "critical" : degree >= 3 ? "high" : "medium",
          confidence: 0.9,
          sourceType: "observed",
          citations: [{ documentId: node.id, documentTitle: node.title, confidence: 0.9, sourceType: "observed" }],
          metadata: { degree, nodeType: node.type },
        });
      }
    }

    const isolated = (nodes.rows as any[]).filter((n: any) => !degreeMap[n.id]);
    if (isolated.length > 0) {
      items.push({
        id: "isolated_nodes",
        type: "isolation_warning",
        title: `${isolated.length} isolated node(s) — unconnected evidence`,
        description: `These entities have no connections: ${isolated.map((n: any) => n.title).join(", ")}`,
        severity: "medium",
        confidence: 1.0,
        sourceType: "observed",
        citations: isolated.slice(0, 5).map((n: any) => ({
          documentId: n.id,
          documentTitle: n.title,
          confidence: 1.0,
          sourceType: "observed" as const,
        })),
      });
    }

    const summary = `Graph contains ${(nodes.rows as any[]).length} entities, ${(connections.rows as any[]).length} connections, ${contacts.rows.length} contacts. ${hubs.length} hub entities, ${isolated.length} isolated.`;
    completeAIOp(op.id, op.startTime, summary);
    return buildResult("entity_graph_builder", "Entity Graph Builder", matterId, items, summary, ctx);
  } catch (error) {
    completeAIOp(op.id, op.startTime, "", "error", String(error));
    throw error;
  }
}

export async function runDamagesLedger(matterId: string): Promise<AnalysisResult> {
  const ctx = getPolicyContext(matterId, "damages_ledger");
  const op = startAIOp(ctx.decision.effectiveProvider, ctx.decision.effectiveModelId, "damages_ledger", matterId, "analysis-modules");

  try {
    const expenses = await db.execute(
      sql`SELECT * FROM billing_expenses WHERE matter_id = ${matterId} ORDER BY expense_date DESC`
    );
    const timeEntries = await db.execute(
      sql`SELECT * FROM time_entries WHERE matter_id = ${matterId}`
    );
    const evidenceNodes = await db.execute(
      sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId} AND type = 'evidence'`
    );

    const items: AnalysisResult["items"] = [];

    let totalExpenses = 0;
    for (const exp of (expenses.rows as any[])) {
      totalExpenses += Number(exp.amount || 0);
      items.push({
        id: `expense_${exp.id}`,
        type: "documented_expense",
        title: exp.description || "Expense",
        description: `$${Number(exp.amount || 0).toFixed(2)} — ${exp.category || "uncategorized"} on ${exp.expense_date || "unknown date"}`,
        confidence: 0.95,
        sourceType: "observed",
        citations: [{ documentId: exp.id, documentTitle: exp.description || "Expense", confidence: 0.95, sourceType: "observed" }],
        metadata: { amount: Number(exp.amount || 0), category: exp.category, date: exp.expense_date },
      });
    }

    let totalHours = 0;
    for (const te of (timeEntries.rows as any[])) {
      totalHours += Number(te.hours || 0);
    }
    if (totalHours > 0) {
      items.push({
        id: "time_summary",
        type: "time_investment",
        title: `${totalHours.toFixed(1)} hours logged`,
        description: `Total attorney/staff time across ${(timeEntries.rows as any[]).length} entries`,
        confidence: 1.0,
        sourceType: "observed",
        citations: (timeEntries.rows as any[]).slice(0, 3).map((te: any) => ({
          documentId: te.id,
          documentTitle: te.description || "Time entry",
          confidence: 1.0,
          sourceType: "observed" as const,
        })),
        metadata: { totalHours, entryCount: (timeEntries.rows as any[]).length },
      });
    }

    const damageEvidence = (evidenceNodes.rows as any[]).filter((n: any) =>
      (n.description || "").toLowerCase().match(/damage|injur|loss|cost|medical|pain|suffer/)
    );
    for (const ev of damageEvidence) {
      items.push({
        id: `damage_evidence_${ev.id}`,
        type: "damage_evidence",
        title: `Evidence: ${ev.title}`,
        description: (ev.description || "").slice(0, 300),
        confidence: ev.confidence_score || 0.7,
        sourceType: ev.is_inferred ? "inferred" : "observed",
        citations: [{ documentId: ev.id, documentTitle: ev.title, confidence: ev.confidence_score || 0.7, sourceType: ev.is_inferred ? "inferred" : "observed" }],
      });
    }

    const summary = `Damages ledger: $${totalExpenses.toFixed(2)} documented expenses, ${totalHours.toFixed(1)} hours logged, ${damageEvidence.length} damage-related evidence items.`;
    completeAIOp(op.id, op.startTime, summary);
    return buildResult("damages_ledger", "Damages Ledger", matterId, items, summary, ctx);
  } catch (error) {
    completeAIOp(op.id, op.startTime, "", "error", String(error));
    throw error;
  }
}

export async function runDiscoverySniper(matterId: string): Promise<AnalysisResult> {
  const ctx = getPolicyContext(matterId, "discovery_sniper");
  const op = startAIOp(ctx.decision.effectiveProvider, ctx.decision.effectiveModelId, "discovery_sniper", matterId, "analysis-modules");

  try {
    const nodes = await db.execute(
      sql`SELECT * FROM detective_nodes WHERE matter_id = ${matterId}`
    );
    const connections = await db.execute(
      sql`SELECT dc.*, sn.title as source_title, tn.title as target_title
      FROM detective_connections dc
      JOIN detective_nodes sn ON dc.source_node_id = sn.id
      JOIN detective_nodes tn ON dc.target_node_id = tn.id
      WHERE dc.matter_id = ${matterId}`
    );

    const items: AnalysisResult["items"] = [];

    const gapNodes = (nodes.rows as any[]).filter((n: any) => n.type === "gap_indicator" || n.type === "question");
    for (const gap of gapNodes) {
      items.push({
        id: `discovery_gap_${gap.id}`,
        type: "discovery_target",
        title: `Missing: ${gap.title}`,
        description: `${gap.description || "Evidence gap identified"} — pursue in discovery`,
        severity: "high",
        confidence: 0.85,
        sourceType: "inferred",
        citations: [{ documentId: gap.id, documentTitle: gap.title, confidence: 0.85, sourceType: "inferred" }],
        metadata: { nodeType: gap.type },
      });
    }

    const contradictions = (connections.rows as any[]).filter((c: any) => c.connection_type === "contradicts");
    for (const c of contradictions) {
      items.push({
        id: `depo_target_${c.id}`,
        type: "deposition_target",
        title: `Deposition target: "${c.source_title}" vs "${c.target_title}"`,
        description: `Contradiction between these items should be explored during deposition. ${c.notes || ""}`,
        severity: c.strength >= 4 ? "critical" : "high",
        confidence: 0.8,
        sourceType: "inferred",
        citations: [
          { documentId: c.source_node_id, documentTitle: c.source_title, confidence: 0.8, sourceType: "observed" },
          { documentId: c.target_node_id, documentTitle: c.target_title, confidence: 0.8, sourceType: "observed" },
        ],
      });
    }

    const personNodes = (nodes.rows as any[]).filter((n: any) => n.type === "person");
    const degreeMap: Record<string, number> = {};
    for (const c of (connections.rows as any[])) {
      degreeMap[c.source_node_id] = (degreeMap[c.source_node_id] || 0) + 1;
      degreeMap[c.target_node_id] = (degreeMap[c.target_node_id] || 0) + 1;
    }
    for (const person of personNodes) {
      const degree = degreeMap[person.id] || 0;
      if (degree >= 3) {
        items.push({
          id: `key_witness_${person.id}`,
          type: "key_witness",
          title: `Key witness: ${person.title}`,
          description: `Connected to ${degree} pieces of evidence/events. Priority deposition candidate.`,
          severity: degree >= 5 ? "critical" : "high",
          confidence: 0.85,
          sourceType: "inferred",
          citations: [{ documentId: person.id, documentTitle: person.title, confidence: 0.85, sourceType: "observed" }],
          metadata: { connections: degree },
        });
      }
    }

    const weakEvidence = (nodes.rows as any[]).filter((n: any) =>
      n.type === "evidence" && n.confidence_score && n.confidence_score < 0.5
    );
    for (const ev of weakEvidence) {
      items.push({
        id: `strengthen_${ev.id}`,
        type: "needs_corroboration",
        title: `Weak evidence needs corroboration: ${ev.title}`,
        description: `Confidence ${Math.round((ev.confidence_score || 0) * 100)}% — request supporting documents in discovery`,
        severity: "medium",
        confidence: 0.9,
        sourceType: "inferred",
        citations: [{ documentId: ev.id, documentTitle: ev.title, confidence: ev.confidence_score || 0.5, sourceType: "observed" }],
      });
    }

    const summary = `Discovery plan: ${items.filter(i => i.type === "discovery_target").length} evidence gaps, ${items.filter(i => i.type === "deposition_target").length} deposition targets, ${items.filter(i => i.type === "key_witness").length} key witnesses, ${items.filter(i => i.type === "needs_corroboration").length} items needing corroboration.`;
    completeAIOp(op.id, op.startTime, summary);
    return buildResult("discovery_sniper", "Discovery Sniper", matterId, items, summary, ctx);
  } catch (error) {
    completeAIOp(op.id, op.startTime, "", "error", String(error));
    throw error;
  }
}

export const ANALYSIS_MODULES = {
  contradiction_finder: { name: "Contradiction Finder", run: runContradictionFinder },
  timeline_builder: { name: "Timeline Builder", run: runTimelineBuilder },
  entity_graph_builder: { name: "Entity Graph Builder", run: runEntityGraphBuilder },
  damages_ledger: { name: "Damages Ledger", run: runDamagesLedger },
  discovery_sniper: { name: "Discovery Sniper", run: runDiscoverySniper },
} as const;

export type AnalysisModuleId = keyof typeof ANALYSIS_MODULES;
