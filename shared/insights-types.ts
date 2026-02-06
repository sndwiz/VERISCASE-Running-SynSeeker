export interface InsightCitation {
  assetId?: string;
  filename?: string;
  pageNumber?: number;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
}

export interface ThemeResult {
  title: string;
  explanation: string;
  citations: InsightCitation[];
}

export interface TimelineEntry {
  eventDate: string;
  description: string;
  involvedParties: string[];
  citations: InsightCitation[];
}

export interface EntityResult {
  name: string;
  type: "person" | "organization" | "place";
  role: string;
  isInferred: boolean;
  citations: InsightCitation[];
}

export interface ContradictionResult {
  statementA: string;
  statementB: string;
  conflict: string;
  citations: InsightCitation[];
}

export interface ActionItemResult {
  title: string;
  suggestedOwner?: string;
  suggestedDueDate?: string;
  confidence: number;
  citations: InsightCitation[];
}

export interface RiskResult {
  title: string;
  severity: "low" | "medium" | "high";
  description: string;
  citations: InsightCitation[];
}

export interface InsightAnalysisResult {
  themes?: ThemeResult[];
  timeline?: TimelineEntry[];
  entities?: EntityResult[];
  contradictions?: ContradictionResult[];
  action_items?: ActionItemResult[];
  risks?: RiskResult[];
}

export const INSIGHT_INTENT_TYPES = ["themes", "timeline", "entities", "contradictions", "action_items", "risks"] as const;
export type InsightIntentType = typeof INSIGHT_INTENT_TYPES[number];

export const INSIGHT_OUTPUT_FORMATS = ["executive_brief", "timeline_table", "issue_map", "task_list", "board_update"] as const;
export type InsightOutputFormat = typeof INSIGHT_OUTPUT_FORMATS[number];

export interface StartAnalysisRequest {
  intentType: string;
  priorityRules?: PriorityRules;
  outputFormat?: InsightOutputFormat;
  scope?: string;
}

export interface PriorityRules {
  dateWindow?: { start?: string; end?: string };
  docTypes?: string[];
  custodians?: string[];
  mostRecentFirst?: boolean;
}

export interface InsightRunResponse {
  run: {
    id: string;
    matterId: string;
    intentType: string;
    status: string;
    outputFormat: string | null;
    createdAt: string;
    errorMessage: string | null;
  };
  sections: Partial<InsightAnalysisResult>;
}
