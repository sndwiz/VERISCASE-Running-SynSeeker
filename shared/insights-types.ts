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

export interface ToneAnalysisResult {
  document: string;
  assetId?: string;
  overallTone: string;
  emotionalRegister: string;
  formalityLevel: "very_formal" | "formal" | "neutral" | "informal" | "very_informal";
  persuasionTactics: string[];
  linguisticMarkers: string[];
  toneShifts: Array<{
    location: string;
    fromTone: string;
    toTone: string;
    significance: string;
  }>;
  credibilityIndicators: {
    hedgingLanguage: string[];
    absoluteStatements: string[];
    qualifiers: string[];
    evasivePatterns: string[];
  };
  summary: string;
  citations: InsightCitation[];
}

export interface ConsistencyCheckResult {
  pairId: string;
  documentA: string;
  documentB: string;
  assetIdA?: string;
  assetIdB?: string;
  nullHypothesis: string;
  alternativeHypothesis: string;
  verdict: "consistent" | "inconsistent" | "inconclusive";
  confidenceScore: number;
  evidenceForNull: Array<{
    statement: string;
    citation: InsightCitation;
  }>;
  evidenceForAlternative: Array<{
    statement: string;
    citation: InsightCitation;
  }>;
  statisticalReasoning: string;
  factualDiscrepancies: Array<{
    claim: string;
    versionA: string;
    versionB: string;
    significance: "critical" | "major" | "minor";
  }>;
  toneAlignment: {
    aligned: boolean;
    explanation: string;
  };
  overallAssessment: string;
}

export interface InsightAnalysisResult {
  themes?: ThemeResult[];
  timeline?: TimelineEntry[];
  entities?: EntityResult[];
  contradictions?: ContradictionResult[];
  action_items?: ActionItemResult[];
  risks?: RiskResult[];
  tone_analysis?: ToneAnalysisResult[];
  consistency_check?: ConsistencyCheckResult[];
}

export const INSIGHT_INTENT_TYPES = ["themes", "timeline", "entities", "contradictions", "action_items", "risks", "tone_analysis", "consistency_check"] as const;
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
