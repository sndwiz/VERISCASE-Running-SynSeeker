import { insightsStorage } from "./insights-storage";
import { logger } from "../utils/logger";
import type { InsightRun, InsightOutput } from "./insights-storage";

interface Citation {
  assetId: string;
  filename: string;
  pageNumber?: number;
  lineStart?: number;
  lineEnd?: number;
  snippet: string;
}

interface ThemeResult {
  title: string;
  explanation: string;
  citations: Citation[];
}

interface TimelineEntry {
  eventDate: string;
  description: string;
  involvedParties: string[];
  citations: Citation[];
}

interface EntityResult {
  name: string;
  type: string;
  role: string;
  isInferred: boolean;
  citations: Citation[];
}

interface ContradictionResult {
  statementA: string;
  statementB: string;
  conflict: string;
  citations: Citation[];
}

interface ActionItem {
  title: string;
  suggestedOwner?: string;
  suggestedDueDate?: string;
  confidence: number;
  citations: Citation[];
}

interface RiskFlag {
  title: string;
  severity: string;
  description: string;
  citations: Citation[];
}

async function gatherTextContext(
  matterId: string,
  scope: string | null,
): Promise<Array<{ assetId: string; filename: string; text: string; pageCount?: number }>> {
  const textsWithAssets = await insightsStorage.getAssetTextsForMatter(matterId);

  let sorted = textsWithAssets.sort((a, b) =>
    (b.asset.createdAt?.getTime() || 0) - (a.asset.createdAt?.getTime() || 0)
  );

  if (scope === "10_most_recent" || (!scope && sorted.length > 20)) {
    sorted = sorted.slice(0, 10);
  } else if (scope?.startsWith("next_batch_")) {
    const offset = parseInt(scope.replace("next_batch_", ""), 10) || 0;
    sorted = sorted.slice(offset, offset + 10);
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
  priorityRules: any,
  documents: Array<{ assetId: string; filename: string; text: string }>,
): string {
  const docContext = documents.map((d, i) =>
    `--- DOCUMENT ${i + 1}: "${d.filename}" (ID: ${d.assetId}) ---\n${d.text.slice(0, 8000)}\n`
  ).join("\n\n");

  const intents = intentType.split(",").map(s => s.trim());

  let sections = "";
  if (intents.includes("themes")) {
    sections += `
## THEMES
Identify 3-8 major themes. For each:
- "title": theme name
- "explanation": 2-3 sentences
- "citations": array of {"assetId", "filename", "snippet"} (at least 2 per theme when possible)
`;
  }
  if (intents.includes("timeline")) {
    sections += `
## TIMELINE
Extract key events chronologically. For each:
- "eventDate": ISO date or "approximate: YYYY" or date range
- "description": what happened
- "involvedParties": people/orgs involved
- "citations": array of {"assetId", "filename", "snippet"}
`;
  }
  if (intents.includes("entities")) {
    sections += `
## ENTITIES
Identify people, organizations, places. For each:
- "name": entity name
- "type": "person" | "organization" | "place"
- "role": their role (witness, attorney, defendant, etc.)
- "isInferred": true if role is guessed, false if stated
- "citations": array of {"assetId", "filename", "snippet"}
`;
  }
  if (intents.includes("contradictions")) {
    sections += `
## CONTRADICTIONS
Find conflicting statements across documents. For each:
- "statementA": first claim
- "statementB": conflicting claim
- "conflict": why they conflict
- "citations": array of {"assetId", "filename", "snippet"} (one for each statement minimum)
`;
  }
  if (intents.includes("action_items")) {
    sections += `
## ACTION ITEMS
Suggest actionable tasks from the documents. For each:
- "title": clear task title
- "suggestedOwner": who should handle (if apparent)
- "suggestedDueDate": ISO date if deadline is mentioned or inferable
- "confidence": 0-1 how confident this is needed
- "citations": array of {"assetId", "filename", "snippet"}
`;
  }
  if (intents.includes("risks")) {
    sections += `
## RISKS
Identify risks, red flags, and concerns. For each:
- "title": risk title
- "severity": "low" | "medium" | "high"
- "description": what the risk is and why it matters
- "citations": array of {"assetId", "filename", "snippet"}
`;
  }

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

async function callAI(prompt: string): Promise<any> {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b: any) => b.type === "text");
    const text = (textBlock as any)?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    return JSON.parse(jsonMatch[0]);
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
      run.priorityRules,
      documents,
    );

    const result = await callAI(prompt);

    const outputs: Array<{ insightRunId: string; section: string; contentJson: any }> = [];

    if (result.themes) {
      outputs.push({ insightRunId: runId, section: "themes", contentJson: result.themes });
    }
    if (result.timeline) {
      outputs.push({ insightRunId: runId, section: "timeline", contentJson: result.timeline });
    }
    if (result.entities) {
      outputs.push({ insightRunId: runId, section: "entities", contentJson: result.entities });
    }
    if (result.contradictions) {
      outputs.push({ insightRunId: runId, section: "contradictions", contentJson: result.contradictions });
    }
    if (result.action_items) {
      outputs.push({ insightRunId: runId, section: "action_items", contentJson: result.action_items });
    }
    if (result.risks) {
      outputs.push({ insightRunId: runId, section: "risks", contentJson: result.risks });
    }

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
