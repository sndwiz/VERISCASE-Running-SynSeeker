export interface TimeEntry {
  id: string;
  date: string;
  attorney: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  utbmsCode?: string;
  utbmsPhase?: string;
  utbmsTask?: string;
  utbmsActivity?: string;
  confidence: "high" | "medium" | "low";
  flags: Flag[];
  qualityIssues: QualityIssue[];
  roundedHours?: number;
  splitSuggestion?: SplitSuggestion;
  approved?: boolean;
  adjustedHours?: number;
  adjustedAmount?: number;
  clioNarrative?: string;
  evidenceSuggested?: string;
  reviewStatus: "pending" | "confirmed" | "edited";
  notes?: string;
  writeOff?: boolean;
}

export interface Flag {
  type: "long_entry" | "day_total" | "block_billing" | "vague" | "duplicate" | "excessive_rounding" | "weekend" | "holiday" | "minimum_entry";
  severity: "error" | "warning" | "info";
  message: string;
}

export interface QualityIssue {
  type: "abbreviation" | "capitalization" | "passive_voice" | "missing_detail" | "client_name" | "privileged_info";
  message: string;
  suggestion?: string;
}

export interface SplitSuggestion {
  entries: { description: string; hours: number }[];
  reason: string;
}

export interface VerifierSettings {
  hourlyRate: number;
  longThreshold: number;
  dayThreshold: number;
  roundingIncrement: number;
  roundingDirection: "up" | "down" | "nearest";
  minimumEntry: number;
  travelTimeRate: number;
  clientName: string;
  aliases: string[];
  phones: string[];
  keyParties: string[];
  detectUtbms: boolean;
  checkQuality: boolean;
  suggestSplits: boolean;
  checkBlockBilling: boolean;
  checkDuplicates: boolean;
  checkWeekendHoliday: boolean;
  firmName: string;
  attorneyName: string;
  firmAddress: string;
  paymentTerms: "receipt" | "net15" | "net30" | "net60";
  retainerBalance: number;
  startDate: string;
  endDate: string;
}

export interface DailySummary {
  date: string;
  entries: number;
  hours: number;
  amount: number;
  flagCount: number;
  overThreshold: boolean;
}

export type TabKey = "upload" | "settings" | "results" | "daily" | "adjustments" | "review" | "export";
