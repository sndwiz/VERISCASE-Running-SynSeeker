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

const analysisResultSchema = z.object({
  themes: z.array(themeSchema).optional(),
  timeline: z.array(timelineSchema).optional(),
  entities: z.array(entitySchema).optional(),
  contradictions: z.array(contradictionSchema).optional(),
  action_items: z.array(actionItemSchema).optional(),
  risks: z.array(riskSchema).optional(),
}).passthrough();

const INTENT_PROMPT_TEMPLATES: Record<InsightIntentType, string> = {
  themes: `## THEMES
Identify 3-8 major themes. For each:
- "title": theme name
- "explanation": 2-3 sentences
- "citations": array of {"assetId", "filename", "snippet"} (at least 2 per theme when possible)`,
  timeline: `## TIMELINE
Extract key events chronologically. For each:
- "eventDate": ISO date or "approximate: YYYY" or date range
- "description": what happened
- "involvedParties": people/orgs involved
- "citations": array of {"assetId", "filename", "snippet"}`,
  entities: `## ENTITIES
Identify people, organizations, places. For each:
- "name": entity name
- "type": "person" | "organization" | "place"
- "role": their role (witness, attorney, defendant, etc.)
- "isInferred": true if role is guessed, false if stated
- "citations": array of {"assetId", "filename", "snippet"}`,
  contradictions: `## CONTRADICTIONS
Find conflicting statements across documents. For each:
- "statementA": first claim
- "statementB": conflicting claim
- "conflict": why they conflict
- "citations": array of {"assetId", "filename", "snippet"} (one for each statement minimum)`,
  action_items: `## ACTION ITEMS
Suggest actionable tasks from the documents. For each:
- "title": clear task title
- "suggestedOwner": who should handle (if apparent)
- "suggestedDueDate": ISO date if deadline is mentioned or inferable
- "confidence": 0-1 how confident this is needed
- "citations": array of {"assetId", "filename", "snippet"}`,
  risks: `## RISKS
Identify risks, red flags, and concerns. For each:
- "title": risk title
- "severity": "low" | "medium" | "high"
- "description": what the risk is and why it matters
- "citations": array of {"assetId", "filename", "snippet"}`,
};

const SECTION_KEYS = ["themes", "timeline", "entities", "contradictions", "action_items", "risks"] as const;

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

  return `You are a legal document analysis AI. Analyze the following documents and produce structured insights.

IMPORTANT RULES:
- Every claim MUST include citations with the exact assetId and a snippet from the source
- If confidence is low, note it explicitly
- Mark inferred information as such
- Be thorough but precise
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
  "risks": [...] or omit if not requested
}

DOCUMENTS:
${docContext}`;
}

async function callAI(prompt: string): Promise<InsightAnalysisResult> {
  try {
    const { aiModel, maxTokens } = INSIGHTS_CONFIG.analysis;
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();
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
