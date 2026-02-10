import { z } from "zod";
import { insightsStorage } from "./insights-storage";
import { logger } from "../utils/logger";
import { INSIGHTS_CONFIG } from "../config/insights";
import type { InsightAnalysisResult, InsightCitation, PriorityRules } from "@shared/insights-types";
import { INSIGHT_INTENT_TYPES, type InsightIntentType } from "@shared/insights-types";

const citationSchema = z.object({
  assetId: z.string().optional().default(""),
  filename: z.string().optional().default(""),
  pageNumber: z.number().optional(),
  snippet: z.string().optional().default(""),
});

const themeSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  citations: z.array(citationSchema).default([]),
});

const timelineSchema = z.object({
  eventDate: z.string(),
  description: z.string(),
  involvedParties: z.array(z.string()).default([]),
  citations: z.array(citationSchema).default([]),
});

const entitySchema = z.object({
  name: z.string(),
  type: z.enum(["person", "organization", "place"]).default("person"),
  role: z.string(),
  isInferred: z.boolean().default(false),
  citations: z.array(citationSchema).default([]),
});

const contradictionSchema = z.object({
  statementA: z.string(),
  statementB: z.string(),
  conflict: z.string(),
  citations: z.array(citationSchema).default([]),
});

const actionItemSchema = z.object({
  title: z.string(),
  suggestedOwner: z.string().optional(),
  suggestedDueDate: z.string().optional(),
  confidence: z.number().default(0.5),
  citations: z.array(citationSchema).default([]),
});

const riskSchema = z.object({
  title: z.string(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  description: z.string(),
  citations: z.array(citationSchema).default([]),
});

const toneShiftSchema = z.object({
  location: z.string(),
  fromTone: z.string(),
  toTone: z.string(),
  significance: z.string(),
});

const credibilityIndicatorsSchema = z.object({
  hedgingLanguage: z.array(z.string()).default([]),
  absoluteStatements: z.array(z.string()).default([]),
  qualifiers: z.array(z.string()).default([]),
  evasivePatterns: z.array(z.string()).default([]),
});

const toneAnalysisSchema = z.object({
  document: z.string(),
  assetId: z.string().optional(),
  overallTone: z.string(),
  emotionalRegister: z.string(),
  formalityLevel: z.enum(["very_formal", "formal", "neutral", "informal", "very_informal"]).default("neutral"),
  persuasionTactics: z.array(z.string()).default([]),
  linguisticMarkers: z.array(z.string()).default([]),
  toneShifts: z.array(toneShiftSchema).default([]),
  credibilityIndicators: credibilityIndicatorsSchema.default({ hedgingLanguage: [], absoluteStatements: [], qualifiers: [], evasivePatterns: [] }),
  summary: z.string(),
  citations: z.array(citationSchema).default([]),
});

const consistencyEvidenceSchema = z.object({
  statement: z.string(),
  citation: citationSchema,
});

const factualDiscrepancySchema = z.object({
  claim: z.string(),
  versionA: z.string(),
  versionB: z.string(),
  significance: z.enum(["critical", "major", "minor"]).default("minor"),
});

const consistencyCheckSchema = z.object({
  pairId: z.string(),
  documentA: z.string(),
  documentB: z.string(),
  assetIdA: z.string().optional(),
  assetIdB: z.string().optional(),
  nullHypothesis: z.string(),
  alternativeHypothesis: z.string(),
  verdict: z.enum(["consistent", "inconsistent", "inconclusive"]).default("inconclusive"),
  confidenceScore: z.number().default(0.5),
  evidenceForNull: z.array(consistencyEvidenceSchema).default([]),
  evidenceForAlternative: z.array(consistencyEvidenceSchema).default([]),
  statisticalReasoning: z.string(),
  factualDiscrepancies: z.array(factualDiscrepancySchema).default([]),
  toneAlignment: z.object({
    aligned: z.boolean().default(true),
    explanation: z.string(),
  }),
  overallAssessment: z.string(),
});

const analysisResultSchema = z.object({
  themes: z.array(themeSchema).optional(),
  timeline: z.array(timelineSchema).optional(),
  entities: z.array(entitySchema).optional(),
  contradictions: z.array(contradictionSchema).optional(),
  action_items: z.array(actionItemSchema).optional(),
  risks: z.array(riskSchema).optional(),
  tone_analysis: z.array(toneAnalysisSchema).optional(),
  consistency_check: z.array(consistencyCheckSchema).optional(),
}).passthrough();

const INTENT_PROMPT_TEMPLATES: Record<InsightIntentType, string> = {
  themes: `## THEMES (Convergence Analysis)
Identify 3-8 major themes by looking for CONVERGING LINES OF EVIDENCE — independent signals that together create a coherent explanation mapping to legal elements. For each:
- "title": theme name
- "explanation": 2-3 sentences explaining the theme AND how multiple independent sources support it. Note if evidence is from a single source or corroborated across documents.
- "citations": array of {"assetId", "filename", "snippet"} (at least 2 per theme when possible — from INDEPENDENT sources)
Flag any theme that relies on a single source. Do not count duplicate documents as independent corroboration.`,
  timeline: `## TIMELINE (Chronological Backbone)
Construct a timeline as the backbone of the case. Events must include plausibility checks. For each:
- "eventDate": ISO date or "approximate: YYYY" or date range
- "description": what happened (OBSERVED facts only — label any inference separately)
- "involvedParties": people/orgs involved
- "citations": array of {"assetId", "filename", "snippet"}
When narratives conflict, preserve BOTH versions as forks — do not overwrite one with the other. Note sequence feasibility (travel time, office hours). Flag temporal clustering and escalation patterns.`,
  entities: `## ENTITIES (Knowledge Graph Nodes)
Build the case knowledge graph. Identify people, organizations, places, and their relationships. For each:
- "name": entity name
- "type": "person" | "organization" | "place"
- "role": their role (witness, attorney, defendant, custodian, etc.)
- "isInferred": TRUE if the role is guessed from context, FALSE if explicitly stated in the document
- "citations": array of {"assetId", "filename", "snippet"}
Track entity appearances across documents. Note where the same entity appears in multiple independent sources (convergence) vs. documents that are copies/derivatives of each other (single source).`,
  contradictions: `## CONTRADICTIONS (Gap & Conflict Finder)
Apply rigorous contradiction detection per the VERICASE Doctrine. Find conflicting statements, timeline impossibilities, inconsistent narratives, and missing expected evidence. For each:
- "statementA": first claim (with EXACT quote)
- "statementB": conflicting claim (with EXACT quote)
- "conflict": why they conflict — include: Is this a factual conflict, a timeline impossibility, an omission, or a tonal inconsistency?
- "citations": array of {"assetId", "filename", "snippet"} (one for each statement minimum)
Also identify "missing evidence" — documents or information that SHOULD exist but are absent (missing pages, gaps in correspondence, expected records not found).`,
  action_items: `## ACTION ITEMS (Discovery Targets + Evidence Strengthening)
Suggest actionable tasks that would strengthen the case. Prioritize: authentication needs, missing evidence to obtain, weak legal elements to bolster, witnesses to depose. For each:
- "title": clear task title
- "suggestedOwner": who should handle (if apparent)
- "suggestedDueDate": ISO date if deadline is mentioned or inferable
- "confidence": 0-1 how confident this is needed
- "citations": array of {"assetId", "filename", "snippet"}
Flag any documents that need authentication (screenshots, informal messages, unsigned documents, documents without visible metadata).`,
  risks: `## RISKS (Reliability & Admissibility Assessment)
Score evidence reliability and identify risks using the VERICASE doctrine. For each risk:
- "title": risk title
- "severity": "low" | "medium" | "high"
- "description": what the risk is, including:
  * Source reliability (official record > sworn statement > professional record > informal communication > screenshot > hearsay)
  * Corroboration level (single-source vs multi-source, independence check)
  * Manipulation risk (editable formats, missing metadata, inconsistent copies)
  * Materiality (how much it affects a legal element or damages)
  * Authentication status (needs authentication flag)
- "citations": array of {"assetId", "filename", "snippet"}
Label evidentiary strength: Strong (direct + corroborated) / Moderate (direct OR multi-source inferential) / Weak (single-source inferential).`,
  tone_analysis: `## TONE ANALYSIS (Behavioral & Emotional Intelligence — per VERICASE Doctrine)
REMEMBER: Emotion analysis is SUPPORTING CONTEXT, not proof of conduct. Always pair with exact quoted text and offer alternative interpretations.

Analyze the tone, emotional register, and linguistic patterns of EACH document individually. For each document produce an object:
- "document": the filename
- "assetId": the document's asset ID
- "overallTone": dominant tone (e.g., "adversarial", "cooperative", "defensive", "neutral", "sympathetic", "aggressive", "evasive")
- "emotionalRegister": emotional quality (e.g., "detached", "passionate", "measured", "anxious", "confident")
- "formalityLevel": "very_formal" | "formal" | "neutral" | "informal" | "very_informal"
- "persuasionTactics": array of tactics used — detect: appeal to authority, emotional appeal, logical reasoning, minimization, deflection, gaslighting language, DARVO patterns (Deny-Attack-Reverse Victim and Offender), coercion markers, conditional demands, escalating pressure
- "linguisticMarkers": array of notable language patterns (e.g., "passive voice dominance", "hedging language", "absolute statements", "qualifying phrases", "self-contradiction within document")
- "toneShifts": array of {"location": where in doc, "fromTone": initial tone, "toTone": shifted tone, "significance": why it matters — flag escalation patterns and behavioral clusters}
- "credibilityIndicators": {
    "hedgingLanguage": array of hedging phrases found (e.g., "I believe", "to the best of my knowledge", "approximately"),
    "absoluteStatements": array of absolute claims (e.g., "never", "always", "without question"),
    "qualifiers": array of qualifying language used,
    "evasivePatterns": array of evasive language patterns (e.g., "I don't recall", "not to my knowledge")
  }
- "summary": 2-3 sentence tone assessment. MUST include: (1) what the tone OBSERVABLY is, (2) what it MIGHT indicate, and (3) at least one ALTERNATIVE interpretation. Separate observation from inference.
- "citations": array of {"assetId", "filename", "snippet"} with specific EXACT TEXT examples — every behavioral claim must cite the exact words`,
  consistency_check: `## CONSISTENCY CHECK (Null vs Alternative Hypothesis)
Cross-reference ALL documents against each other pairwise. For each pair of documents, apply formal hypothesis testing:

NULL HYPOTHESIS (H0): The documents are consistent — they describe the same events, facts, and circumstances without material contradiction.
ALTERNATIVE HYPOTHESIS (H1): The documents contain material inconsistencies that suggest conflicting accounts, selective omission, or fabrication.

For each document pair produce an object:
- "pairId": "docA_vs_docB" format
- "documentA": filename of first document
- "documentB": filename of second document
- "assetIdA": asset ID of first document
- "assetIdB": asset ID of second document
- "nullHypothesis": state H0 specifically for this pair (e.g., "Witness A's account of the accident is consistent with the police report")
- "alternativeHypothesis": state H1 specifically for this pair
- "verdict": "consistent" (fail to reject H0) | "inconsistent" (reject H0 in favor of H1) | "inconclusive" (insufficient evidence)
- "confidenceScore": 0-1 confidence in the verdict
- "evidenceForNull": array of {"statement": supporting evidence for consistency, "citation": {"assetId", "filename", "snippet"}}
- "evidenceForAlternative": array of {"statement": evidence of inconsistency, "citation": {"assetId", "filename", "snippet"}}
- "statisticalReasoning": explain the weight of evidence — how many facts align vs conflict, and why the verdict was reached
- "factualDiscrepancies": array of {"claim": what is being claimed, "versionA": doc A's version, "versionB": doc B's version, "significance": "critical" | "major" | "minor"}
- "toneAlignment": {"aligned": boolean, "explanation": whether the tone/register of both documents is consistent with their stated roles}
- "overallAssessment": 3-5 sentence assessment of this document pair's reliability and consistency`,
};

const SECTION_KEYS = ["themes", "timeline", "entities", "contradictions", "action_items", "risks", "tone_analysis", "consistency_check"] as const;

async function gatherTextContext(
  matterId: string,
  scope: string | null,
): Promise<Array<{ assetId: string; filename: string; text: string; pageCount?: number }>> {
  const textsWithAssets = await insightsStorage.getAssetTextsForMatter(matterId);

  let sorted = textsWithAssets.sort((a, b) =>
    (b.asset.createdAt?.getTime() || 0) - (a.asset.createdAt?.getTime() || 0)
  );

  const { defaultScopeThreshold, defaultScopeSize } = INSIGHTS_CONFIG.analysis;

  if (scope === "10_most_recent" || (!scope && sorted.length > defaultScopeThreshold)) {
    sorted = sorted.slice(0, defaultScopeSize);
  } else if (scope?.startsWith("next_batch_")) {
    const offset = parseInt(scope.replace("next_batch_", ""), 10) || 0;
    sorted = sorted.slice(offset, offset + defaultScopeSize);
  }

  return sorted.map(t => ({
    assetId: t.assetId,
    filename: t.asset.originalFilename,
    text: t.fullText || "",
    pageCount: t.asset.pageCount || undefined,
  }));
}

function buildAnalysisPrompt(
  intentType: string,
  outputFormat: string | null,
  priorityRules: PriorityRules | null,
  documents: Array<{ assetId: string; filename: string; text: string }>,
): string {
  const { maxDocumentTextLength } = INSIGHTS_CONFIG.analysis;

  const docContext = documents.map((d, i) =>
    `--- DOCUMENT ${i + 1}: "${d.filename}" (ID: ${d.assetId}) ---\n${d.text.slice(0, maxDocumentTextLength)}\n`
  ).join("\n\n");

  const intents = intentType.split(",").map(s => s.trim()).filter(s => INSIGHT_INTENT_TYPES.includes(s as any)) as InsightIntentType[];
  const sections = intents.map(i => INTENT_PROMPT_TEMPLATES[i]).join("\n\n");

  let priorityInstructions = "";
  if (priorityRules) {
    if (priorityRules.dateWindow) {
      priorityInstructions += `\nFocus on documents/events from ${priorityRules.dateWindow.start || "earliest"} to ${priorityRules.dateWindow.end || "latest"}.`;
    }
    if (priorityRules.docTypes?.length) {
      priorityInstructions += `\nPrioritize document types: ${priorityRules.docTypes.join(", ")}.`;
    }
    if (priorityRules.custodians?.length) {
      priorityInstructions += `\nFocus on materials from: ${priorityRules.custodians.join(", ")}.`;
    }
    if (priorityRules.mostRecentFirst) {
      priorityInstructions += `\nPrioritize more recent documents.`;
    }
  }

  let formatInstruction = "";
  if (outputFormat === "executive_brief") {
    formatInstruction = "Format results as a concise executive brief suitable for senior attorneys.";
  } else if (outputFormat === "timeline_table") {
    formatInstruction = "Emphasize timeline entries in chronological order.";
  } else if (outputFormat === "task_list") {
    formatInstruction = "Emphasize actionable items that can be assigned as tasks.";
  }

  const { DOCTRINE_ANALYSIS_PREAMBLE, DOCTRINE_INSIGHT_RULES } = require("../config/core-doctrine");

  return `${DOCTRINE_ANALYSIS_PREAMBLE}

${DOCTRINE_INSIGHT_RULES}
${priorityInstructions}
${formatInstruction}

Produce a JSON response with the following sections:
${sections}

Return ONLY valid JSON in this exact format:
{
  "themes": [...] or omit if not requested,
  "timeline": [...] or omit if not requested,
  "entities": [...] or omit if not requested,
  "contradictions": [...] or omit if not requested,
  "action_items": [...] or omit if not requested,
  "risks": [...] or omit if not requested,
  "tone_analysis": [...] or omit if not requested,
  "consistency_check": [...] or omit if not requested
}

DOCUMENTS:
${docContext}`;
}

async function callAI(prompt: string): Promise<InsightAnalysisResult> {
  try {
    const { aiModel, maxTokens } = INSIGHTS_CONFIG.analysis;
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || undefined,
    });
    const response = await anthropic.messages.create({
      model: aiModel,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b: any) => b.type === "text");
    const text = (textBlock as any)?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = analysisResultSchema.parse(parsed);
    return validated as InsightAnalysisResult;
  } catch (err: any) {
    logger.error("AI analysis call failed", { error: err.message });
    throw err;
  }
}

export async function runInsightAnalysis(runId: string): Promise<void> {
  const run = await insightsStorage.getInsightRun(runId);
  if (!run) {
    logger.error("Insight run not found", { runId });
    return;
  }

  await insightsStorage.updateInsightRun(runId, { status: "running" });

  try {
    const documents = await gatherTextContext(run.matterId, run.scope || null);

    if (documents.length === 0) {
      await insightsStorage.updateInsightRun(runId, {
        status: "failed",
        errorMessage: "No processed documents found. Upload and wait for files to finish processing.",
      });
      return;
    }

    const prompt = buildAnalysisPrompt(
      run.intentType,
      run.outputFormat || null,
      run.priorityRules as PriorityRules | null,
      documents,
    );

    const validated = await callAI(prompt);

    const outputs = SECTION_KEYS
      .filter(key => validated[key] && Array.isArray(validated[key]))
      .map(key => ({ insightRunId: runId, section: key, contentJson: validated[key] }));

    if (outputs.length > 0) {
      await insightsStorage.createInsightOutputs(outputs);
    }

    await insightsStorage.updateInsightRun(runId, { status: "complete" });
    logger.info("Insight analysis complete", { runId, sections: outputs.map(o => o.section) });
  } catch (err: any) {
    logger.error("Insight analysis failed", { runId, error: err.message });
    await insightsStorage.updateInsightRun(runId, {
      status: "failed",
      errorMessage: err.message,
    });
  }
}
