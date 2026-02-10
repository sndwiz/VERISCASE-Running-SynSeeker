import { z } from "zod";

// Priority levels
export type Priority = "low" | "medium" | "high" | "critical";

// Status types
export type StatusType = "not-started" | "working-on-it" | "stuck" | "done" | "pending-review";

// Column types supported by the board - comprehensive Monday.com-style types
export type ColumnType =
  // Essentials
  | "text"
  | "long-text"
  | "status"
  | "date"
  | "person"
  | "progress"
  | "timeline"
  | "files"
  | "time"
  | "priority"
  | "number"
  | "numbers"
  | "label"
  // More column types
  | "tags"
  | "checkbox"
  | "dropdown"
  | "email"
  | "phone"
  | "rating"
  | "link"
  | "vote"
  | "approval"
  | "location"
  | "world-clock"
  | "item-id"
  // Team Power-Ups
  | "creation-log"
  | "last-updated"
  | "auto-number"
  | "progress-tracking"
  // Board Power-Ups
  | "button"
  | "dependency"
  | "week"
  | "formula"
  | "country"
  | "color-picker"
  | "time-tracking"
  | "hour"
  // Combo columns
  | "date-status"
  | "timeline-status"
  | "timeline-numeric"
  // AI-Powered
  | "ai-improve"
  | "ai-write"
  | "ai-extract"
  | "ai-summarize"
  | "ai-translate"
  | "ai-sentiment"
  | "ai-categorize";

// Column type configuration
export type ColumnCategory = 
  | "essentials"
  | "more"
  | "team-power-up"
  | "board-power-up"
  | "combo"
  | "ai-powered";

export interface ColumnTypeConfig {
  label: string;
  icon: string;
  category: ColumnCategory;
  description?: string;
}

export const columnTypeConfig: Record<ColumnType, ColumnTypeConfig> = {
  // Essentials
  "text": { label: "Text", icon: "type", category: "essentials", description: "Add textual content" },
  "long-text": { label: "Long Text", icon: "align-left", category: "essentials", description: "Add longer text content with formatting" },
  "status": { label: "Status", icon: "circle-dot", category: "essentials", description: "Track progress with customizable statuses" },
  "date": { label: "Date", icon: "calendar", category: "essentials", description: "Set and track dates" },
  "person": { label: "People", icon: "users", category: "essentials", description: "Assign team members" },
  "progress": { label: "Progress", icon: "trending-up", category: "essentials", description: "Track completion percentage" },
  "timeline": { label: "Timeline", icon: "calendar-range", category: "essentials", description: "Set date ranges for tasks" },
  "files": { label: "Files", icon: "paperclip", category: "essentials", description: "Upload and manage files" },
  "time": { label: "Time", icon: "clock", category: "essentials", description: "Track time spent" },
  "priority": { label: "Priority", icon: "flag", category: "essentials", description: "Set task priority levels" },
  "number": { label: "Numbers", icon: "hash", category: "essentials", description: "Add numeric values" },
  "numbers": { label: "Numbers", icon: "calculator", category: "essentials", description: "Numeric calculations" },
  "label": { label: "Label", icon: "tag", category: "essentials", description: "Categorize with labels" },
  // More
  "tags": { label: "Tags", icon: "tags", category: "more", description: "Add multiple tags" },
  "checkbox": { label: "Checkbox", icon: "check-square", category: "more", description: "Simple yes/no toggle" },
  "dropdown": { label: "Dropdown", icon: "chevron-down", category: "more", description: "Select from predefined options" },
  "email": { label: "Email", icon: "mail", category: "more", description: "Store email addresses" },
  "phone": { label: "Phone", icon: "phone", category: "more", description: "Store phone numbers" },
  "rating": { label: "Rating", icon: "star", category: "more", description: "Rate items with stars" },
  "link": { label: "Link", icon: "link", category: "more", description: "Add URLs" },
  "vote": { label: "Vote", icon: "thumbs-up", category: "more", description: "Collect team votes" },
  "approval": { label: "Approval", icon: "check-circle", category: "more", description: "Track approval status for legal review" },
  "location": { label: "Location", icon: "map-pin", category: "more", description: "Store addresses and locations" },
  "world-clock": { label: "World Clock", icon: "globe", category: "more", description: "Display time zones" },
  "item-id": { label: "Item ID", icon: "hash", category: "more", description: "Unique identifier" },
  // Team Power-Ups
  "creation-log": { label: "Creation Log", icon: "user-plus", category: "team-power-up", description: "Track who created the item" },
  "last-updated": { label: "Last Updated", icon: "refresh-cw", category: "team-power-up", description: "Track last modification" },
  "auto-number": { label: "Auto Number", icon: "list-ordered", category: "team-power-up", description: "Automatic sequential numbering" },
  "progress-tracking": { label: "Progress Tracking", icon: "bar-chart-2", category: "team-power-up", description: "Visual progress indicators" },
  // Board Power-Ups
  "button": { label: "Button", icon: "square", category: "board-power-up", description: "Trigger actions with a click" },
  "dependency": { label: "Dependency", icon: "git-branch", category: "board-power-up", description: "Link dependent items" },
  "week": { label: "Week", icon: "calendar-days", category: "board-power-up", description: "Week-based scheduling" },
  "formula": { label: "Formula", icon: "function-square", category: "board-power-up", description: "Calculate values automatically" },
  "country": { label: "Country", icon: "flag", category: "board-power-up", description: "Select countries" },
  "color-picker": { label: "Color Picker", icon: "palette", category: "board-power-up", description: "Choose colors" },
  "time-tracking": { label: "Time Tracking", icon: "timer", category: "board-power-up", description: "Log time with start/stop" },
  "hour": { label: "Hour", icon: "clock-4", category: "board-power-up", description: "Time of day" },
  // Combo columns
  "date-status": { label: "Date + Status", icon: "calendar-check", category: "combo", description: "Combined date and status" },
  "timeline-status": { label: "Timeline + Status", icon: "calendar-range", category: "combo", description: "Combined timeline and status" },
  "timeline-numeric": { label: "Timeline + Numeric", icon: "calendar-range", category: "combo", description: "Combined timeline and numbers" },
  // AI-Powered
  "ai-improve": { label: "Improve Text", icon: "sparkles", category: "ai-powered", description: "AI-powered text improvement" },
  "ai-write": { label: "Write with AI", icon: "wand-2", category: "ai-powered", description: "AI-generated content" },
  "ai-extract": { label: "Extract Info", icon: "scan", category: "ai-powered", description: "AI-powered information extraction" },
  "ai-summarize": { label: "Summarize", icon: "file-text", category: "ai-powered", description: "AI-generated summaries" },
  "ai-translate": { label: "Translate", icon: "languages", category: "ai-powered", description: "AI-powered translation" },
  "ai-sentiment": { label: "Detect Sentiment", icon: "smile", category: "ai-powered", description: "AI sentiment analysis" },
  "ai-categorize": { label: "Categorize", icon: "folder-tree", category: "ai-powered", description: "AI-powered categorization" },
};

// Status configuration
export const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string }> = {
  "not-started": { label: "Not Started", color: "text-gray-700 dark:text-gray-300", bgColor: "bg-gray-100 dark:bg-gray-800" },
  "working-on-it": { label: "Working on it", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  "stuck": { label: "Stuck", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900/30" },
  "done": { label: "Done", color: "text-green-700 dark:text-green-300", bgColor: "bg-green-100 dark:bg-green-900/30" },
  "pending-review": { label: "Pending Review", color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
};

// Priority configuration
export const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string }> = {
  "low": { label: "Low", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800" },
  "medium": { label: "Medium", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  "high": { label: "High", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  "critical": { label: "Critical", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

// Person/Assignee interface
export interface Person {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

// File attachment interface
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

// Time log entry
export interface TimeLogEntry {
  id: string;
  personId: string;
  personName: string;
  hours: number;
  date: string;
  note?: string;
}

// Custom status label configuration
export interface CustomStatusLabel {
  id: string;
  label: string;
  color: string; // Hex color for the status
}

// Column definition for the table
export interface ColumnDef {
  id: string;
  title: string;
  type: ColumnType;
  width: number;
  visible: boolean;
  order: number;
  options?: string[];
  description?: string; // Column description for tooltips
  statusLabels?: CustomStatusLabel[]; // Custom status labels for status columns
}

// Task interface
export interface Task {
  id: string;
  title: string;
  description: string;
  status: StatusType;
  priority: Priority;
  dueDate: string | null;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: Person[];
  owner: Person | null;
  progress: number;
  timeEstimate: number | null;
  timeTracked: number;
  timeLogs: TimeLogEntry[];
  files: FileAttachment[];
  boardId: string;
  groupId: string;
  order: number;
  parentTaskId: string | null;
  tags: string[];
  notes: string;
  lastUpdatedBy: string | null;
  customFields: Record<string, any>;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

// Default status labels for boards
export const defaultStatusLabels: CustomStatusLabel[] = [
  { id: "not-started", label: "Not Started", color: "#6B7280" },
  { id: "working-on-it", label: "Working on it", color: "#F59E0B" },
  { id: "stuck", label: "Stuck", color: "#EF4444" },
  { id: "done", label: "Done", color: "#22C55E" },
  { id: "pending-review", label: "Pending Review", color: "#8B5CF6" },
];

// Board interface
export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  columns: ColumnDef[];
  statusLabels?: CustomStatusLabel[];
  clientId?: string | null;
  matterId?: string | null;
  workspaceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Group interface
export interface Group {
  id: string;
  title: string;
  color: string;
  collapsed: boolean;
  order: number;
  boardId: string;
}

// ============ AI & CHAT SYSTEM ============

// AI Provider types
export type AIProvider = "openai" | "anthropic" | "deepseek" | "private";
export type AIModelType = "LLM" | "Vision" | "Audio" | "Multimodal" | "Embedding" | "Classification" | "Generation" | "Agent" | "Other";

// AI Conversation
export interface AIConversation {
  id: string;
  title: string;
  provider: AIProvider;
  model: string;
  matterId?: string;
  boardId?: string;
  createdAt: string;
  updatedAt: string;
}

// AI Message
export interface AIMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { type: "image" | "file"; url: string; name: string }[];
  metadata?: Record<string, any>;
  createdAt: string;
}

// AI Configuration
export interface AIConfig {
  id: string;
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  isActive: boolean;
  priority: number;
}

// ============ EVIDENCE VAULT ============

export type EvidenceType = "document" | "photo" | "video" | "audio" | "email" | "other";
export type ConfidentialityLevel = "public" | "confidential" | "aeo" | "privileged" | "work-product";
export type OCRStatus = "pending" | "processing" | "completed" | "failed";

// Evidence Vault File (immutable original content)
export interface EvidenceVaultFile {
  id: string;
  matterId: string;
  originalName: string;
  originalUrl: string;
  originalHash: string; // SHA-256
  originalSize: number;
  originalMimeType: string;
  evidenceType: EvidenceType;
  confidentiality: ConfidentialityLevel;
  description: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  chainOfCustody: { action: string; by: string; at: string; notes?: string }[];
  ocrJobId?: string;
  extractedText?: string;
  aiAnalysis?: Record<string, any>;
  metadata: Record<string, any>;
}

// OCR Job
export interface OCRJob {
  id: string;
  fileId: string;
  matterId: string;
  status: OCRStatus;
  provider: string;
  confidence?: number;
  extractedText?: string;
  pageCount?: number;
  processingTime?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ============ TIMELINE & THREADS ============

export type TimelineEventType =
  | "file_uploaded"
  | "file_viewed"
  | "note_added"
  | "status_changed"
  | "decision_made"
  | "deadline_set"
  | "contact_added"
  | "research_added"
  | "thread_created"
  | "meeting_scheduled"
  | "court_date"
  | "filing_submitted"
  | "discovery_request"
  | "deposition"
  | "settlement_offer"
  | "custom";

export interface TimelineEvent {
  id: string;
  matterId: string;
  eventType: TimelineEventType;
  title: string;
  description: string;
  linkedFileId?: string;
  linkedTaskId?: string;
  linkedThreadId?: string;
  createdBy: string;
  eventDate: string;
  createdAt: string;
  metadata: Record<string, any>;
}

// Thread (conversation linked to matter)
export interface Thread {
  id: string;
  matterId: string;
  subject: string;
  participants: Person[];
  status: "open" | "closed" | "archived";
  priority: Priority;
  linkedFiles: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Thread Message
export interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments: FileAttachment[];
  createdAt: string;
}

// Thread Decision (extractable decisions from threads)
export interface ThreadDecision {
  id: string;
  threadId: string;
  messageId: string;
  decision: string;
  madeBy: string;
  madeAt: string;
  status: "pending" | "approved" | "rejected" | "implemented";
  approvals?: { personId: string; approved: boolean; at: string }[];
}

// ============ CONTACTS & MATTERS ============

export type ContactRole = "plaintiff" | "defendant" | "witness" | "expert" | "opposing-counsel" | "judge" | "client" | "other";

export interface MatterContact {
  id: string;
  matterId: string;
  name: string;
  role: ContactRole;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Matter {
  id: string;
  clientId: string;
  name: string;
  caseNumber?: string;
  matterType: string;
  status: "active" | "pending" | "closed" | "on_hold" | "on-hold" | "archived";
  description: string;
  openedDate: string;
  closedDate?: string;
  assignedAttorneys: Person[];
  practiceArea: string;
  courtName?: string;
  judgeAssigned?: string;
  opposingCounsel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchResult {
  id: string;
  matterId: string;
  query: string;
  source: string;
  citation: string;
  summary: string;
  relevance: number;
  notes: string;
  createdBy: string;
  createdAt: string;
}

// ============ AUTOMATIONS ============

export type AutomationTriggerType =
  | "item_created"
  | "status_changed"
  | "priority_changed"
  | "due_date_approaching"
  | "due_date_passed"
  | "assigned"
  | "unassigned"
  | "moved_to_group"
  | "field_changed"
  | "file_uploaded"
  | "column_changed"
  | "item_name_changed"
  | "update_created"
  | "button_clicked"
  | "email_received"
  | "subitem_created"
  | "activity_created"
  | "item_moved_to_board"
  | "approval_status_changed"
  | "approval_required"
  | "document_uploaded"
  | "deadline_warning"
  | "compliance_check"
  | "custom";

export type AutomationActionType =
  | "change_status"
  | "change_priority"
  | "move_to_group"
  | "assign_person"
  | "unassign_person"
  | "send_notification"
  | "create_subtask"
  | "update_field"
  | "trigger_webhook"
  | "create_item"
  | "set_date"
  | "start_time_tracking"
  | "stop_time_tracking"
  | "adjust_date"
  | "connect_boards"
  // AI Actions
  | "ai_fill_column"
  | "ai_summarize"
  | "ai_categorize"
  | "ai_detect_language"
  | "ai_translate"
  | "ai_sentiment"
  | "ai_improve"
  | "ai_extract"
  | "ai_write"
  // Legal/Approval Actions
  | "request_approval"
  | "create_approval_record"
  | "notify_approver"
  | "escalate_review"
  | "generate_confirmation"
  | "log_compliance"
  // Integration Actions
  | "send_slack"
  | "send_sms"
  | "send_email"
  | "create_contact"
  | "notify_channel"
  | "custom"
  // SynSeekr Server Actions
  | "synseekr_analyze_document"
  | "synseekr_extract_entities"
  | "synseekr_rag_query"
  | "synseekr_run_investigation"
  | "synseekr_detect_contradictions"
  | "synseekr_classify_document"
  | "synseekr_run_agent"
  | "synseekr_search_documents"
  | "synseekr_timeline_events"
  | "route_to_detective"
  | "assign_reviewer";

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value?: any;
}

export interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: AutomationTriggerType;
  triggerField?: string;
  triggerValue?: string;
  conditions: AutomationCondition[];
  actionType: AutomationActionType;
  actionConfig: Record<string, any>;
  runCount: number;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  taskId?: string;
  triggerData: Record<string, any>;
  actionResult: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  executedAt: string;
  completedAt?: string;
}

// ============ AI ACTION CONFIGURATIONS ============

export interface AIActionConfigBase {
  sourceColumn?: string;
  targetColumn: string;
  customInstructions?: string;
}

export interface AISummarizeConfig extends AIActionConfigBase {
  maxLength?: "brief" | "moderate" | "detailed";
  format?: "paragraph" | "bullet-points" | "numbered-list";
}

export interface AIExtractConfig extends AIActionConfigBase {
  extractionFields: string[];
  outputFormat?: "json" | "text" | "structured";
}

export interface AIImproveConfig extends AIActionConfigBase {
  changes: "minimal" | "moderate" | "extensive";
  length: "shorter" | "same" | "longer";
  tone: "formal" | "professional" | "friendly" | "natural";
}

export interface AITranslateConfig extends AIActionConfigBase {
  targetLanguage: string;
  preserveFormatting?: boolean;
}

export interface AIDetectLanguageConfig extends AIActionConfigBase {
  outputFormat?: "code" | "name" | "both";
}

export interface AISentimentConfig extends AIActionConfigBase {
  categories?: string[];
  includeConfidence?: boolean;
}

export interface AICategorizeConfig extends AIActionConfigBase {
  categories: string[];
  allowMultiple?: boolean;
}

export interface AIWriteConfig extends AIActionConfigBase {
  tone: "formal" | "professional" | "friendly" | "natural";
  length: "brief" | "moderate" | "detailed";
  style?: "legal" | "business" | "casual";
  context?: string;
}

export interface AIFillColumnConfig extends AIActionConfigBase {
  contextColumns?: string[];
  format?: string;
}

export type AIActionConfig =
  | AISummarizeConfig
  | AIExtractConfig
  | AIImproveConfig
  | AITranslateConfig
  | AIDetectLanguageConfig
  | AISentimentConfig
  | AICategorizeConfig
  | AIWriteConfig
  | AIFillColumnConfig;

// ============ APPROVAL & AUDIT TRAIL ============

export type ApprovalStatus = "pending" | "vetting" | "approved" | "confirmed" | "rejected";

export interface ApprovalRecord {
  id: string;
  taskId: string;
  columnId: string;
  status: ApprovalStatus;
  requestedBy?: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  initialed?: boolean;
  initialedBy?: string;
  initialedAt?: string;
  signature?: string;
  contextSnapshot?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAuditEntry {
  id: string;
  approvalId: string;
  action: "created" | "viewed" | "status_changed" | "initialed" | "note_added" | "reopened";
  previousStatus?: ApprovalStatus;
  newStatus?: ApprovalStatus;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  notes?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface InitialRecord {
  id: string;
  taskId: string;
  columnId?: string;
  documentId?: string;
  initialedBy: string;
  initialedByName: string;
  initials: string;
  timestamp: string;
  reason?: string;
  verified: boolean;
  hash?: string;
}

// ============ AI AUTOMATION TEMPLATE ============

export type AIAutomationCategory = 
  | "ai-powered"
  | "legal-compliance"
  | "notifications"
  | "status-workflow"
  | "deadline-management"
  | "integrations"
  | "team-collaboration";

export interface AutomationTemplate {
  id: string;
  category: AIAutomationCategory;
  name: string;
  description: string;
  icon: string;
  triggerType: AutomationTriggerType;
  triggerConfig?: Record<string, any>;
  actionType: AutomationActionType;
  actionConfig: Record<string, any>;
  isAIPowered: boolean;
  requiredColumns?: ColumnType[];
  tags: string[];
}

// ============ DETECTIVE BOARD ============

export interface DetectiveNode {
  id: string;
  matterId: string;
  type: "evidence" | "person" | "location" | "event" | "theory" | "note";
  title: string;
  description: string;
  linkedEvidenceId?: string;
  linkedContactId?: string;
  position: { x: number; y: number };
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DetectiveConnection {
  id: string;
  matterId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  connectionType: "related" | "contradicts" | "supports" | "leads-to" | "timeline" | "corroborates" | "communicates" | "references";
  strength: number;
  notes: string;
  isInferred?: boolean;
  confidenceScore?: number;
  sourceCitation?: string;
  createdAt: string;
}

// ============ INSERT SCHEMAS ============

export const insertBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  description: z.string().optional().default(""),
  color: z.string().optional().default("#6366f1"),
  icon: z.string().optional().default("layout-grid"),
  columns: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    width: z.number(),
    visible: z.boolean(),
    order: z.number(),
    options: z.array(z.string()).optional(),
  })).optional(),
  clientId: z.string().nullable().optional(),
  matterId: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional(),
});

export const insertGroupSchema = z.object({
  title: z.string().min(1, "Group title is required"),
  color: z.string().optional().default("#6366f1"),
  collapsed: z.boolean().optional().default(false),
  boardId: z.string(),
  order: z.number().optional().default(0),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  status: z.enum(["not-started", "working-on-it", "stuck", "done", "pending-review"]).optional().default("not-started"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  assignees: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    color: z.string(),
  })).optional().default([]),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    color: z.string(),
  }).nullable().optional(),
  progress: z.number().min(0).max(100).optional().default(0),
  timeEstimate: z.number().nullable().optional(),
  boardId: z.string(),
  groupId: z.string(),
  parentTaskId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
  customFields: z.record(z.any()).optional().default({}),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
  })).optional().default([]),
});

export const updateTaskSchema = insertTaskSchema.partial().omit({ boardId: true });

export const updateBoardSchema = insertBoardSchema.partial();

export const updateGroupSchema = z.object({
  title: z.string().min(1).optional(),
  color: z.string().optional(),
  collapsed: z.boolean().optional(),
  order: z.number().optional(),
});

// AI Conversation schemas
export const insertAIConversationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  provider: z.enum(["openai", "anthropic", "deepseek", "private"]).optional().default("anthropic"),
  model: z.string().optional().default("claude-sonnet-4-5"),
  matterId: z.string().optional(),
  boardId: z.string().optional(),
});

export const insertAIMessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  attachments: z.array(z.object({
    type: z.enum(["image", "file"]),
    url: z.string(),
    name: z.string(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

// Evidence schemas
export const insertEvidenceVaultFileSchema = z.object({
  matterId: z.string(),
  originalName: z.string(),
  originalUrl: z.string(),
  originalHash: z.string(),
  originalSize: z.number(),
  originalMimeType: z.string(),
  evidenceType: z.enum(["document", "photo", "video", "audio", "email", "other"]).optional().default("document"),
  confidentiality: z.enum(["public", "confidential", "privileged", "work-product"]).optional().default("confidential"),
  description: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  uploadedBy: z.string(),
});

export const updateEvidenceVaultFileSchema = z.object({
  evidenceType: z.enum(["document", "photo", "video", "audio", "email", "other"]).optional(),
  confidentiality: z.enum(["public", "confidential", "privileged", "work-product"]).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  extractedText: z.string().optional(),
  aiAnalysis: z.record(z.any()).optional(),
});

// OCR schemas
export const insertOCRJobSchema = z.object({
  fileId: z.string(),
  matterId: z.string(),
  provider: z.string().optional().default("openai-vision"),
});

export const updateOCRJobSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  confidence: z.number().optional(),
  extractedText: z.string().optional(),
  pageCount: z.number().optional(),
  processingTime: z.number().optional(),
  error: z.string().optional(),
});

// Timeline schemas
export const insertTimelineEventSchema = z.object({
  matterId: z.string(),
  eventType: z.enum(["file_uploaded", "file_viewed", "note_added", "status_changed", "decision_made", "deadline_set", "contact_added", "research_added", "thread_created", "meeting_scheduled", "court_date", "filing_submitted", "discovery_request", "deposition", "settlement_offer", "custom"]),
  title: z.string(),
  description: z.string().optional().default(""),
  linkedFileId: z.string().optional(),
  linkedTaskId: z.string().optional(),
  linkedThreadId: z.string().optional(),
  createdBy: z.string(),
  eventDate: z.string(),
  metadata: z.record(z.any()).optional().default({}),
});

// Thread schemas
export const insertThreadSchema = z.object({
  matterId: z.string(),
  subject: z.string(),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    color: z.string(),
  })).optional().default([]),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  linkedFiles: z.array(z.string()).optional().default([]),
  createdBy: z.string(),
});

export const updateThreadSchema = z.object({
  subject: z.string().optional(),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    color: z.string(),
  })).optional(),
  status: z.enum(["open", "closed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  linkedFiles: z.array(z.string()).optional(),
});

export const insertThreadMessageSchema = z.object({
  threadId: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  content: z.string(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
    uploadedAt: z.string(),
    uploadedBy: z.string(),
  })).optional().default([]),
});

export const insertThreadDecisionSchema = z.object({
  threadId: z.string(),
  messageId: z.string(),
  decision: z.string(),
  madeBy: z.string(),
});

// Contact schemas
export const insertMatterContactSchema = z.object({
  matterId: z.string(),
  name: z.string(),
  role: z.enum(["plaintiff", "defendant", "witness", "expert", "opposing-counsel", "judge", "client", "other"]),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional().default(""),
});

export const updateMatterContactSchema = insertMatterContactSchema.partial().omit({ matterId: true });

// Client schemas
export const insertClientSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional().default(""),
});

export const updateClientSchema = insertClientSchema.partial();

// Team Member schemas
export const insertTeamMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["attorney", "paralegal", "legal_assistant", "office_manager", "clerk", "intern", "of_counsel", "partner", "associate", "staff"]),
  title: z.string().optional(),
  barNumber: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  userId: z.string().optional(),
});

export const updateTeamMemberSchema = insertTeamMemberSchema.partial();

export type InsertTeamMemberInput = z.infer<typeof insertTeamMemberSchema>;

// Matter schemas
export const insertMatterSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  caseNumber: z.string().optional(),
  matterType: z.string(),
  status: z.enum(["active", "pending", "closed", "on_hold", "on-hold", "archived"]).optional().default("active"),
  description: z.string().optional().default(""),
  openedDate: z.string(),
  responsiblePartyId: z.string().optional(),
  practiceArea: z.string(),
  courtName: z.string().optional(),
  judgeAssigned: z.string().optional(),
  opposingCounsel: z.string().optional(),
  assignedAttorneys: z.array(z.string()).optional().default([]),
  assignedParalegals: z.array(z.string()).optional().default([]),
});

export const updateMatterSchema = insertMatterSchema.partial().omit({ clientId: true });

// Research schemas
export const insertResearchResultSchema = z.object({
  matterId: z.string(),
  query: z.string(),
  source: z.string(),
  citation: z.string(),
  summary: z.string(),
  relevance: z.number().min(0).max(100).optional().default(50),
  notes: z.string().optional().default(""),
  createdBy: z.string(),
});

export const updateResearchResultSchema = z.object({
  summary: z.string().optional(),
  relevance: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// Automation schemas
export const insertAutomationRuleSchema = z.object({
  boardId: z.string(),
  name: z.string(),
  description: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
  triggerType: z.enum([
    "item_created", "status_changed", "priority_changed", "due_date_approaching", "due_date_passed",
    "assigned", "unassigned", "moved_to_group", "field_changed", "file_uploaded",
    "column_changed", "item_name_changed", "update_created", "button_clicked", "email_received", "custom"
  ]),
  triggerField: z.string().optional(),
  triggerValue: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
    value: z.any(),
  })).optional().default([]),
  actionType: z.enum([
    "change_status", "change_priority", "move_to_group", "assign_person", "unassign_person",
    "send_notification", "create_subtask", "update_field", "trigger_webhook", "create_item",
    "set_date", "start_time_tracking", "stop_time_tracking",
    // AI Actions
    "ai_fill_column", "ai_summarize", "ai_categorize", "ai_detect_language", "ai_translate",
    "ai_sentiment", "ai_improve", "ai_extract", "ai_write",
    // Integration Actions
    "send_slack", "send_sms", "send_email", "custom",
    // Legal/Approval Actions
    "request_approval", "create_approval_record", "notify_approver", "escalate_review",
    "generate_confirmation", "log_compliance", "adjust_date", "connect_boards",
    // SynSeekr Actions
    "synseekr_analyze_document", "synseekr_extract_entities", "synseekr_rag_query",
    "synseekr_run_investigation", "synseekr_detect_contradictions", "synseekr_classify_document",
    "synseekr_run_agent", "synseekr_search_documents", "synseekr_timeline_events",
    // Detective/Review Actions
    "route_to_detective", "assign_reviewer"
  ]),
  actionConfig: z.record(z.any()),
});

export const updateAutomationRuleSchema = insertAutomationRuleSchema.partial().omit({ boardId: true });

// Detective Board schemas
export const insertDetectiveNodeSchema = z.object({
  matterId: z.string(),
  type: z.enum(["evidence", "person", "organization", "location", "event", "theory", "note", "hypothesis", "legal_element", "timeline_marker", "quote", "question", "gap_indicator", "document_ref"]),
  title: z.string(),
  description: z.string().optional().default(""),
  linkedEvidenceId: z.string().optional(),
  linkedContactId: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  color: z.string().optional().default("#6366f1"),
  icon: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  isInferred: z.boolean().optional().default(false),
  reliabilityLevel: z.enum(["strong", "moderate", "weak"]).optional(),
  hypothesisType: z.enum(["null", "alternative"]).optional(),
  legalElement: z.string().optional(),
});

export const updateDetectiveNodeSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  isInferred: z.boolean().optional(),
  reliabilityLevel: z.enum(["strong", "moderate", "weak"]).optional(),
  hypothesisType: z.enum(["null", "alternative"]).optional(),
  legalElement: z.string().optional(),
});

export const insertDetectiveConnectionSchema = z.object({
  matterId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().optional().default(""),
  connectionType: z.enum(["related", "contradicts", "supports", "leads-to", "timeline", "corroborates", "communicates", "references"]),
  strength: z.number().min(1).max(5).optional().default(3),
  notes: z.string().optional().default(""),
  isInferred: z.boolean().optional().default(false),
  confidenceScore: z.number().min(0).max(1).optional(),
  sourceCitation: z.string().optional(),
});

export const updateDetectiveConnectionSchema = z.object({
  label: z.string().optional(),
  connectionType: z.enum(["related", "contradicts", "supports", "leads-to", "timeline", "corroborates", "communicates", "references"]).optional(),
  strength: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  isInferred: z.boolean().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  sourceCitation: z.string().optional(),
});

// ============ FILING STRUCTURE ============

// Document Categories (Layer A - broad bucket)
export type DocCategory =
  | "pleading"
  | "motion"
  | "discovery"
  | "order-ruling"
  | "correspondence"
  | "evidence-records"
  | "internal-work-product"
  | "admin-operations";

// Document Type - all possible types across categories
export type DocType = string;

// Document Types by Category
export const docTypesByCategory: Record<DocCategory, string[]> = {
  "pleading": [
    "Complaint/Petition",
    "Answer",
    "Counterclaim/Crossclaim/Third-Party Complaint",
    "Reply to Counterclaim",
    "Amended Complaint",
    "Amended Answer",
  ],
  "motion": [
    "Motion",
    "Memorandum/Brief",
    "Declaration/Affidavit",
    "Exhibit (Motion)",
    "Proposed Order",
    "Notice of Hearing",
    "Oral Argument Notice",
    "Opposition",
    "Reply",
  ],
  "discovery": [
    "Interrogatories",
    "Requests for Production",
    "Requests for Admission",
    "Responses/Objections",
    "Supplemental Responses",
    "Deposition Notice",
    "Subpoena (to nonparty)",
    "Deposition Transcript",
    "Discovery Dispute Letter",
    "Joint Statement",
  ],
  "order-ruling": [
    "Order",
    "Minute Entry/Docket Entry",
    "Judgment",
    "Findings/Conclusions",
    "Transcript",
  ],
  "correspondence": [
    "Attorney Correspondence (Substantive)",
    "Administrative Correspondence",
    "Demand Letter",
    "Settlement Communication",
  ],
  "evidence-records": [
    "Produced Documents (incoming)",
    "Productions (outgoing)",
    "Photos/Videos/Audio",
    "Forensic Exports",
    "Business Records",
    "Medical Records",
    "Financial Records",
  ],
  "internal-work-product": [
    "Research Memo",
    "Draft (internal)",
    "Notes",
    "Outline",
    "Deposition Prep",
    "Chronology/Timeline",
    "Damages Model/Calculations",
  ],
  "admin-operations": [
    "Engagement Letter",
    "Conflict Check",
    "ID/KYC",
    "Billing/Invoices",
    "Trust Account/IOLTA",
    "Medical Authorizations/HIPAA",
    "Settlement Documents",
    "Release",
    "Settlement Agreement",
  ],
};

// Doc Category labels
export const docCategoryLabels: Record<DocCategory, { label: string; icon: string; color: string }> = {
  "pleading": { label: "Pleadings", icon: "file-text", color: "#3b82f6" },
  "motion": { label: "Motions & Supporting Papers", icon: "gavel", color: "#8b5cf6" },
  "discovery": { label: "Discovery", icon: "search", color: "#f59e0b" },
  "order-ruling": { label: "Court Orders & Rulings", icon: "landmark", color: "#10b981" },
  "correspondence": { label: "Correspondence", icon: "mail", color: "#6366f1" },
  "evidence-records": { label: "Evidence & Records", icon: "folder-archive", color: "#ef4444" },
  "internal-work-product": { label: "Internal Work Product", icon: "lock", color: "#64748b" },
  "admin-operations": { label: "Admin/Operations", icon: "briefcase", color: "#0891b2" },
};

// Document roles
export type DocRole = "primary" | "supporting" | "exhibit" | "draft" | "final";
export const DOC_ROLES: DocRole[] = ["primary", "supporting", "exhibit", "draft", "final"];

// Document parties
export type DocParty = "plaintiff" | "defendant" | "nonparty" | "court" | "client" | "third-party";
export const DOC_PARTIES: DocParty[] = ["plaintiff", "defendant", "nonparty", "court", "client", "third-party"];

// Document version status
export type DocVersionStatus = "draft" | "final" | "filed" | "served" | "received";

// Privilege basis
export type PrivilegeBasis = "attorney-client" | "work-product" | "joint-defense" | "common-interest" | "none";

// Constant arrays for UI components
export const DOC_CATEGORIES: DocCategory[] = [
  "pleading",
  "motion",
  "discovery",
  "order-ruling",
  "correspondence",
  "evidence-records",
  "internal-work-product",
  "admin-operations"
];

export const CONFIDENTIALITY_LEVELS: ConfidentialityLevel[] = [
  "public",
  "confidential",
  "aeo",
  "privileged",
  "work-product"
];

// Entity types for PeopleOrg
export type EntityType = "person" | "organization";

// Entity roles
export type EntityRole = "client" | "opposing-counsel" | "court" | "witness" | "expert" | "judge" | "party" | "other";

// FileItem interface
export interface FileItem {
  id: string;
  matterId: string;
  serverPath: string;
  fileName: string;
  extension?: string;
  sizeBytes: number;
  hashSha256?: string;
  isEmail: boolean;
  isAttachment: boolean;
  parentFileId?: string;
  confidentiality: ConfidentialityLevel;
  createdUtc?: string;
  modifiedUtc?: string;
  ingestedUtc: string;
}

// DocProfile interface
export interface DocProfile {
  id: string;
  fileId: string;
  docCategory: DocCategory;
  docType: string;
  docRole: DocRole;
  captionTitle?: string;
  party?: DocParty;
  author?: string;
  recipient?: string;
  serviceDate?: string;
  filingDate?: string;
  hearingDate?: string;
  docketNumber?: string;
  version: DocVersionStatus;
  status: DocVersionStatus;
  privilegeBasis?: PrivilegeBasis;
  productionId?: string;
  batesRange?: string;
  createdAt: string;
  updatedAt: string;
}

// FilingTag interface
export interface FilingTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// PeopleOrg interface
export interface PeopleOrg {
  id: string;
  matterId?: string;
  name: string;
  entityType: EntityType;
  role?: EntityRole;
  email?: string;
  phone?: string;
  company?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// FileItem with profile (joined)
export interface FileItemWithProfile extends FileItem {
  profile?: DocProfile;
  tags?: FilingTag[];
}

// Insert schemas
export const insertFileItemSchema = z.object({
  matterId: z.string(),
  serverPath: z.string(),
  fileName: z.string(),
  extension: z.string().optional(),
  sizeBytes: z.number().optional().default(0),
  hashSha256: z.string().optional(),
  isEmail: z.boolean().optional().default(false),
  isAttachment: z.boolean().optional().default(false),
  parentFileId: z.string().optional(),
  confidentiality: z.enum(["public", "confidential", "aeo", "privileged", "work-product"]).optional().default("confidential"),
});

export const updateFileItemSchema = insertFileItemSchema.partial().omit({ matterId: true });

export const insertDocProfileSchema = z.object({
  fileId: z.string(),
  docCategory: z.enum(["pleading", "motion", "discovery", "order-ruling", "correspondence", "evidence-records", "internal-work-product", "admin-operations"]),
  docType: z.string().min(1),
  docRole: z.enum(["primary", "supporting", "exhibit", "draft", "final"]).optional().default("primary"),
  captionTitle: z.string().optional(),
  party: z.enum(["plaintiff", "defendant", "nonparty", "court", "client", "third-party"]).optional(),
  author: z.string().optional(),
  recipient: z.string().optional(),
  serviceDate: z.string().optional(),
  filingDate: z.string().optional(),
  hearingDate: z.string().optional(),
  docketNumber: z.string().optional(),
  version: z.enum(["draft", "final", "filed", "served", "received"]).optional().default("final"),
  status: z.enum(["draft", "final", "filed", "served", "received"]).optional().default("draft"),
  privilegeBasis: z.enum(["attorney-client", "work-product", "joint-defense", "common-interest", "none"]).optional(),
  productionId: z.string().optional(),
  batesRange: z.string().optional(),
}).superRefine((data, ctx) => {
  const validTypes = docTypesByCategory[data.docCategory];
  if (!validTypes.includes(data.docType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid docType "${data.docType}" for category "${data.docCategory}"`,
      path: ["docType"],
    });
  }
});

export const updateDocProfileSchema = z.object({
  docCategory: z.enum(["pleading", "motion", "discovery", "order-ruling", "correspondence", "evidence-records", "internal-work-product", "admin-operations"]).optional(),
  docType: z.string().min(1).optional(),
  docRole: z.enum(["primary", "supporting", "exhibit", "draft", "final"]).optional(),
  captionTitle: z.string().optional(),
  party: z.enum(["plaintiff", "defendant", "nonparty", "court", "client", "third-party"]).optional(),
  author: z.string().optional(),
  recipient: z.string().optional(),
  serviceDate: z.string().optional(),
  filingDate: z.string().optional(),
  hearingDate: z.string().optional(),
  docketNumber: z.string().optional(),
  version: z.enum(["draft", "final", "filed", "served", "received"]).optional(),
  status: z.enum(["draft", "final", "filed", "served", "received"]).optional(),
  privilegeBasis: z.enum(["attorney-client", "work-product", "joint-defense", "common-interest", "none"]).optional(),
  productionId: z.string().optional(),
  batesRange: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.docCategory && data.docType) {
    const validTypes = docTypesByCategory[data.docCategory];
    if (!validTypes.includes(data.docType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid docType "${data.docType}" for category "${data.docCategory}"`,
        path: ["docType"],
      });
    }
  }
});

export const insertFilingTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().default("#6366f1"),
});

export const insertPeopleOrgSchema = z.object({
  matterId: z.string().optional(),
  name: z.string().min(1),
  entityType: z.enum(["person", "organization"]),
  role: z.enum(["client", "opposing-counsel", "court", "witness", "expert", "judge", "party", "other"]).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional().default(""),
});

export const updatePeopleOrgSchema = insertPeopleOrgSchema.partial();

// ============ TIME TRACKING ============

export type TimeEntryBillableStatus = "billable" | "non-billable" | "no-charge";

export interface TimeEntry {
  id: string;
  matterId: string;
  taskId?: string;
  userId: string;
  userName: string;
  date: string;
  hours: number;
  description: string;
  billableStatus: TimeEntryBillableStatus;
  hourlyRate?: number;
  activityCode?: string;
  createdAt: string;
  updatedAt: string;
}

export const insertTimeEntrySchema = z.object({
  matterId: z.string(),
  taskId: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
  date: z.string(),
  hours: z.number().min(0.01).max(24),
  description: z.string().min(1),
  billableStatus: z.enum(["billable", "non-billable", "no-charge"]).optional().default("billable"),
  hourlyRate: z.number().optional(),
  activityCode: z.string().optional(),
});

export const updateTimeEntrySchema = insertTimeEntrySchema.partial().omit({ matterId: true, userId: true });

// ============ CALENDAR EVENTS ============

export type CalendarEventType = "court-date" | "hearing" | "deadline" | "meeting" | "deposition" | "filing" | "reminder" | "other";

export interface CalendarEvent {
  id: string;
  matterId?: string;
  taskId?: string;
  title: string;
  description: string;
  eventType: CalendarEventType;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  location?: string;
  attendees: string[];
  reminderMinutes?: number;
  color?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const insertCalendarEventSchema = z.object({
  matterId: z.string().optional(),
  taskId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  eventType: z.enum(["court-date", "hearing", "deadline", "meeting", "deposition", "filing", "reminder", "other"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional().default(false),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional().default([]),
  reminderMinutes: z.number().optional(),
  color: z.string().optional(),
  createdBy: z.string(),
});

export const updateCalendarEventSchema = insertCalendarEventSchema.partial().omit({ createdBy: true });

// ============ APPROVAL REQUESTS ============

export interface ApprovalRequest {
  id: string;
  fileId: string;
  matterId: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  assignedTo: string[];
  status: ApprovalStatus; // Uses ApprovalStatus from above
  dueDate?: string;
  priority: Priority;
  comments: ApprovalComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  decision?: "approved" | "rejected" | "vetting";
  createdAt: string;
}

export const insertApprovalRequestSchema = z.object({
  fileId: z.string(),
  matterId: z.string(),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  requestedBy: z.string(),
  requestedByName: z.string(),
  assignedTo: z.array(z.string()).min(1),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
});

export const updateApprovalRequestSchema = z.object({
  status: z.enum(["pending", "vetting", "approved", "confirmed", "rejected"]).optional(),
  assignedTo: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const insertApprovalCommentSchema = z.object({
  approvalId: z.string(),
  userId: z.string(),
  userName: z.string(),
  content: z.string().min(1),
  decision: z.enum(["approved", "rejected", "vetting"]).optional(),
});

// ============ BILLING - EXPENSES ============

export type ExpenseCategory =
  | "filing-fees"
  | "court-costs"
  | "expert-witness"
  | "travel"
  | "copying"
  | "postage"
  | "process-serving"
  | "deposition"
  | "research"
  | "transcript"
  | "mediation"
  | "investigation"
  | "technology"
  | "other";

export interface Expense {
  id: string;
  matterId: string;
  clientId: string;
  date: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  billable: boolean;
  reimbursable: boolean;
  vendor?: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const insertExpenseSchema = z.object({
  matterId: z.string(),
  clientId: z.string(),
  date: z.string(),
  amount: z.number().min(0),
  description: z.string().min(1),
  category: z.enum(["filing-fees", "court-costs", "expert-witness", "travel", "copying", "postage", "process-serving", "deposition", "research", "transcript", "mediation", "investigation", "technology", "other"]),
  billable: z.boolean().default(true),
  reimbursable: z.boolean().default(false),
  vendor: z.string().optional(),
  receiptUrl: z.string().optional(),
  createdBy: z.string(),
});

export const updateExpenseSchema = insertExpenseSchema.partial().omit({ matterId: true, clientId: true, createdBy: true });

// ============ BILLING - INVOICES ============

export type InvoiceStatus = "draft" | "sent" | "viewed" | "partially-paid" | "paid" | "overdue" | "void" | "write-off";

export interface InvoiceLineItem {
  id: string;
  type: "time" | "expense" | "flat-fee" | "adjustment";
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  timeEntryId?: string;
  expenseId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  matterId?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string;
  paymentTerms?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const insertInvoiceSchema = z.object({
  clientId: z.string(),
  matterId: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  status: z.enum(["draft", "sent", "viewed", "partially-paid", "paid", "overdue", "void", "write-off"]).default("draft"),
  lineItems: z.array(z.object({
    id: z.string(),
    type: z.enum(["time", "expense", "flat-fee", "adjustment"]),
    description: z.string(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number(),
    timeEntryId: z.string().optional(),
    expenseId: z.string().optional(),
  })).default([]),
  subtotal: z.number().default(0),
  taxRate: z.number().default(0),
  taxAmount: z.number().default(0),
  totalAmount: z.number().default(0),
  paidAmount: z.number().default(0),
  balanceDue: z.number().default(0),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  createdBy: z.string(),
});

export const updateInvoiceSchema = insertInvoiceSchema.partial().omit({ clientId: true, createdBy: true });

// ============ BILLING - PAYMENTS ============

export type PaymentMethod = "check" | "wire" | "ach" | "credit-card" | "cash" | "trust-transfer" | "other";

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export const insertPaymentSchema = z.object({
  invoiceId: z.string(),
  clientId: z.string(),
  date: z.string(),
  amount: z.number().min(0.01),
  method: z.enum(["check", "wire", "ach", "credit-card", "cash", "trust-transfer", "other"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string(),
});

// ============ BILLING - TRUST ACCOUNTS ============

export type TrustTransactionType = "deposit" | "withdrawal" | "transfer-in" | "transfer-out" | "interest" | "fee";

export interface TrustTransaction {
  id: string;
  clientId: string;
  matterId?: string;
  date: string;
  amount: number;
  type: TrustTransactionType;
  description: string;
  reference?: string;
  runningBalance: number;
  createdBy: string;
  createdAt: string;
}

export const insertTrustTransactionSchema = z.object({
  clientId: z.string(),
  matterId: z.string().optional(),
  date: z.string(),
  amount: z.number(),
  type: z.enum(["deposit", "withdrawal", "transfer-in", "transfer-out", "interest", "fee"]),
  description: z.string().min(1),
  reference: z.string().optional(),
  runningBalance: z.number().default(0),
  createdBy: z.string(),
});

// Type exports
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertTrustTransaction = z.infer<typeof insertTrustTransactionSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertAIConversation = z.infer<typeof insertAIConversationSchema>;
export type InsertAIMessage = z.infer<typeof insertAIMessageSchema>;
export type InsertEvidenceVaultFile = z.infer<typeof insertEvidenceVaultFileSchema>;
export type InsertOCRJob = z.infer<typeof insertOCRJobSchema>;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type InsertThreadMessage = z.infer<typeof insertThreadMessageSchema>;
export type InsertThreadDecision = z.infer<typeof insertThreadDecisionSchema>;
export type InsertMatterContact = z.infer<typeof insertMatterContactSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertMatter = z.infer<typeof insertMatterSchema>;
export type MatterDocument = typeof import("./models/tables").matterDocuments.$inferSelect;
export type InsertResearchResult = z.infer<typeof insertResearchResultSchema>;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type InsertDetectiveNode = z.infer<typeof insertDetectiveNodeSchema>;
export type InsertDetectiveConnection = z.infer<typeof insertDetectiveConnectionSchema>;
export type InsertFileItem = z.infer<typeof insertFileItemSchema>;
export type InsertDocProfile = z.infer<typeof insertDocProfileSchema>;
export type InsertFilingTag = z.infer<typeof insertFilingTagSchema>;
export type InsertPeopleOrg = z.infer<typeof insertPeopleOrgSchema>;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type InsertApprovalComment = z.infer<typeof insertApprovalCommentSchema>;

// ============ DOCUMENT AND FORM MAKER ============

// Document template categories
export type DocumentCategory = 
  | "motions"
  | "pleadings"
  | "discovery"
  | "contracts"
  | "court-filings"
  | "client-forms"
  | "correspondence"
  | "administrative"
  | "family-law"
  | "criminal"
  | "civil"
  | "torts"
  | "probate"
  | "real-estate"
  | "business"
  | "other";

// Utah court jurisdictions
export type UtahJurisdiction = 
  | "utah-district-court"
  | "utah-justice-court"
  | "utah-juvenile-court"
  | "utah-appellate-court"
  | "utah-supreme-court"
  | "federal-district-utah"
  | "other";

// Document generation status
export type DocumentStatus = 
  | "draft"
  | "ai-generated"
  | "pending-review"
  | "under-review"
  | "revision-requested"
  | "approved"
  | "rejected"
  | "finalized"
  | "filed";

// Document template
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  jurisdiction: UtahJurisdiction;
  templateContent: string; // Base template with placeholders
  requiredFields: DocumentField[];
  optionalFields: DocumentField[];
  utahRuleReferences: string[]; // URCP/Utah Code references
  formatRequirements: DocumentFormatRequirements;
  bilingualNoticeRequired: boolean;
  sampleDocument?: string;
  aiPromptInstructions: string; // Instructions for AI generation
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Document field definition
export interface DocumentField {
  id: string;
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select" | "checkbox" | "party" | "court" | "case-number";
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  defaultValue?: string;
  validation?: string; // Regex or rule
  helpText?: string;
}

// Utah-compliant format requirements
export interface DocumentFormatRequirements {
  paperSize: "8.5x11";
  margins: { top: number; right: number; bottom: number; left: number };
  fontSize: number;
  fontFamily: string;
  lineSpacing: "single" | "double";
  pageLimit?: number;
  wordLimit?: number;
  requiresCaption: boolean;
  requiresCertificateOfService: boolean;
  requiresSignatureBlock: boolean;
  requiresBilingualNotice: boolean;
}

// Generated document
export interface GeneratedDocument {
  id: string;
  templateId: string;
  matterId?: string;
  title: string;
  documentType: DocumentCategory;
  jurisdiction: UtahJurisdiction;
  status: DocumentStatus;
  content: string; // The generated document content
  fieldValues: Record<string, any>; // Filled field values
  aiGenerationPrompt?: string;
  aiGenerationResponse?: string;
  formatCompliance: DocumentFormatCompliance;
  version: number;
  previousVersionId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

// Format compliance check result
export interface DocumentFormatCompliance {
  isCompliant: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
  utahRulesChecked: string[];
}

// Document approval record (lawyer review)
export interface DocumentApproval {
  id: string;
  documentId: string;
  status: "pending" | "in-review" | "approved" | "rejected" | "revision-requested";
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  reviewStartedAt?: string;
  reviewCompletedAt?: string;
  lawyerInitials?: string;
  lawyerSignature?: string;
  lawyerBarNumber?: string;
  approvalStamp?: string; // Timestamp of approval
  revisionNotes?: string;
  legalReviewNotes?: string;
  complianceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Document approval audit trail
export interface DocumentApprovalAudit {
  id: string;
  documentId: string;
  approvalId: string;
  action: "created" | "assigned" | "review-started" | "revision-requested" | "approved" | "rejected" | "initialed" | "signed" | "finalized" | "downloaded" | "filed";
  performedBy: string;
  performedByName: string;
  performedAt: string;
  previousStatus?: DocumentStatus;
  newStatus?: DocumentStatus;
  notes?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

// Client intake form
export interface ClientForm {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  formFields: DocumentField[];
  isPublic: boolean; // Can be shared with clients
  requiresSignature: boolean;
  instructions: string;
  thankYouMessage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Client form submission
export interface ClientFormSubmission {
  id: string;
  formId: string;
  matterId?: string;
  clientName: string;
  clientEmail?: string;
  submittedData: Record<string, any>;
  signature?: string;
  signedAt?: string;
  ipAddress?: string;
  submittedAt: string;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

// Utah bilingual notice content
export const utahBilingualNotice = {
  english: `NOTICE TO RESPONDING PARTY
This motion requires you to respond within the time specified by the Utah Rules of Civil Procedure. If you do not respond, the court may grant the relief requested.`,
  spanish: `AVISO PARA LA PARTE QUE RESPONDE
Esta moción requiere que usted responda dentro del tiempo especificado por las Reglas de Procedimiento Civil de Utah. Si no responde, el tribunal puede otorgar el alivio solicitado.`
};

// Utah court format defaults
export const utahDocumentFormatDefaults: DocumentFormatRequirements = {
  paperSize: "8.5x11",
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  fontSize: 12,
  fontFamily: "Times New Roman",
  lineSpacing: "double",
  requiresCaption: true,
  requiresCertificateOfService: true,
  requiresSignatureBlock: true,
  requiresBilingualNotice: true
};

// Utah motion page limits
export const utahMotionLimits = {
  motion: { pages: 25, words: 7750 },
  reply: { pages: 10, words: 2500 },
  opposition: { pages: 25, words: 7750 }
};

// Insert schemas for documents
export const insertDocumentTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(["motions", "pleadings", "discovery", "contracts", "court-filings", "client-forms", "correspondence", "administrative", "family-law", "criminal", "civil", "probate", "real-estate", "business", "other"]),
  jurisdiction: z.enum(["utah-district-court", "utah-justice-court", "utah-juvenile-court", "utah-appellate-court", "utah-supreme-court", "federal-district-utah", "other"]),
  templateContent: z.string(),
  requiredFields: z.array(z.any()).default([]),
  optionalFields: z.array(z.any()).default([]),
  utahRuleReferences: z.array(z.string()).default([]),
  formatRequirements: z.any(),
  bilingualNoticeRequired: z.boolean().default(true),
  sampleDocument: z.string().optional(),
  aiPromptInstructions: z.string().default(""),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const insertGeneratedDocumentSchema = z.object({
  templateId: z.string(),
  matterId: z.string().optional(),
  title: z.string().min(1),
  documentType: z.enum(["motions", "pleadings", "discovery", "contracts", "court-filings", "client-forms", "correspondence", "administrative", "family-law", "criminal", "civil", "torts", "probate", "real-estate", "business", "other"]),
  jurisdiction: z.enum(["utah-district-court", "utah-justice-court", "utah-juvenile-court", "utah-appellate-court", "utah-supreme-court", "federal-district-utah", "other"]),
  content: z.string(),
  fieldValues: z.record(z.any()).default({}),
  aiGenerationPrompt: z.string().optional(),
  aiGenerationResponse: z.string().optional(),
  formatCompliance: z.any().optional(),
  createdBy: z.string(),
  createdByName: z.string(),
});

export const insertDocumentApprovalSchema = z.object({
  documentId: z.string(),
  assignedReviewerId: z.string().optional(),
  assignedReviewerName: z.string().optional(),
});

export const updateDocumentApprovalSchema = z.object({
  status: z.enum(["pending", "in-review", "approved", "rejected", "revision-requested"]).optional(),
  lawyerInitials: z.string().optional(),
  lawyerSignature: z.string().optional(),
  lawyerBarNumber: z.string().optional(),
  revisionNotes: z.string().optional(),
  legalReviewNotes: z.string().optional(),
  complianceNotes: z.string().optional(),
});

export const insertClientFormSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(["motions", "pleadings", "discovery", "contracts", "court-filings", "client-forms", "correspondence", "administrative", "family-law", "criminal", "civil", "probate", "real-estate", "business", "other"]),
  formFields: z.array(z.any()).default([]),
  isPublic: z.boolean().default(false),
  requiresSignature: z.boolean().default(false),
  instructions: z.string().default(""),
  thankYouMessage: z.string().default("Thank you for your submission."),
  isActive: z.boolean().default(true),
});

export const insertClientFormSubmissionSchema = z.object({
  formId: z.string(),
  matterId: z.string().optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
  submittedData: z.record(z.any()),
  signature: z.string().optional(),
});

// ============ MEETING NOTES ============
export interface MeetingParticipant {
  name: string;
  email?: string;
  role?: string;
  color?: string;
}

export interface MeetingTopic {
  title: string;
  content: string;
  expanded?: boolean;
}

export interface TranscriptEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface MeetingActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

export const meetingParticipantSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  role: z.string().optional(),
  color: z.string().optional(),
});

export const meetingTopicSchema = z.object({
  title: z.string(),
  content: z.string(),
  expanded: z.boolean().optional(),
});

export const transcriptEntrySchema = z.object({
  speaker: z.string(),
  timestamp: z.string(),
  text: z.string(),
});

export const meetingActionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  completed: z.boolean(),
});

export const insertMeetingSchema = z.object({
  title: z.string().min(1),
  matterId: z.string().optional(),
  date: z.string(),
  duration: z.number().default(0),
  status: z.enum(["scheduled", "recording", "recorded", "processing", "summarized"]).default("recorded"),
  participants: z.array(meetingParticipantSchema).default([]),
  summary: z.string().default(""),
  mainPoints: z.array(z.string()).default([]),
  topics: z.array(meetingTopicSchema).default([]),
  transcript: z.array(transcriptEntrySchema).default([]),
  actionItems: z.array(meetingActionItemSchema).default([]),
  tags: z.array(z.string()).default([]),
  createdBy: z.string(),
});

export type Meeting = {
  id: string;
  title: string;
  matterId: string | null;
  date: string;
  duration: number | null;
  status: string | null;
  participants: MeetingParticipant[];
  summary: string | null;
  mainPoints: string[];
  topics: MeetingTopic[];
  transcript: TranscriptEntry[];
  actionItems: MeetingActionItem[];
  tags: string[];
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

// Type exports for Document Maker
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type InsertDocumentApproval = z.infer<typeof insertDocumentApprovalSchema>;
export type UpdateDocumentApproval = z.infer<typeof updateDocumentApprovalSchema>;
export type InsertClientForm = z.infer<typeof insertClientFormSchema>;
export type InsertClientFormSubmission = z.infer<typeof insertClientFormSubmissionSchema>;

// Audit Log types
export type AuditLog = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  method: string | null;
  path: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number | null;
  metadata: Record<string, any>;
  severity: string | null;
  createdAt: Date | null;
};

export type InsertAuditLog = {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  method?: string | null;
  path?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  metadata?: Record<string, any>;
  severity?: string;
};

export type SecurityEvent = {
  id: string;
  eventType: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, any>;
  severity: string | null;
  resolved: boolean | null;
  createdAt: Date | null;
};

export type InsertSecurityEvent = {
  eventType: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
  severity?: string;
};

// ============ UPLOAD ORGANIZER TYPES ============

export type IncomingFileStatus = "new" | "planned" | "approved" | "executed" | "reverted" | "failed";
export type OrganizeRunStatus = "draft_plan" | "awaiting_approval" | "approved" | "executing_preview" | "paused" | "complete" | "failed";
export type OrganizeAction = "rename_move" | "keep" | "trash_candidate";
export type ConfidenceLevel = "high" | "medium" | "low";
export type PlanItemExecStatus = "pending" | "approved" | "rejected" | "executed" | "failed" | "reverted";

export const insertIncomingFileSchema = z.object({
  originalFilename: z.string().min(1),
  currentPath: z.string().min(1),
  fileType: z.string().min(1),
  subtype: z.string().optional().default("unknown"),
  sizeBytes: z.number().optional().default(0),
  hashSha256: z.string().optional(),
  mimeType: z.string().optional(),
  matterId: z.string().optional(),
  ocrText: z.string().optional(),
  ocrConfidence: z.number().optional(),
  metadataJson: z.any().optional(),
});
export type InsertIncomingFile = z.infer<typeof insertIncomingFileSchema>;

export const createOrganizeRunSchema = z.object({
  scope: z.enum(["incoming", "matter"]).optional().default("incoming"),
  matterId: z.string().optional(),
  daysFilter: z.number().optional().default(14),
});
export type CreateOrganizeRun = z.infer<typeof createOrganizeRunSchema>;

export const approvePlanSchema = z.object({
  approvals: z.array(z.object({
    planItemId: z.string(),
    action: z.enum(["rename_move", "keep", "trash_candidate"]),
    filename: z.string().optional(),
    folder: z.string().optional(),
  })),
});
export type ApprovePlan = z.infer<typeof approvePlanSchema>;

export interface ScanSummary {
  totalCount: number;
  dateRangeOldest: string | null;
  dateRangeNewest: string | null;
  countsByType: Record<string, number>;
  countsBySubtype: Record<string, number>;
  derivedTextCount: number;
  last14DaysCount: number;
}

export interface OrganizePlanGroup {
  label: string;
  items: Array<{
    id: string;
    fileId: string;
    originalFilename: string;
    fileType: string;
    sizeBytes: number;
    detectedSummary: string;
    suggestedFilename: string;
    suggestedFolder: string;
    suggestedAction: OrganizeAction;
    confidence: ConfidenceLevel;
    rationale: string;
    approvedAction?: OrganizeAction | null;
    approvedFilename?: string | null;
    approvedFolder?: string | null;
    executionStatus: PlanItemExecStatus;
  }>;
}

// ============ BOARD CHAT + MASTER CHAT ============
export const sendChatMessageSchema = z.object({
  bodyText: z.string().min(1).max(10000),
  replyToMessageId: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
});
export type SendChatMessage = z.infer<typeof sendChatMessageSchema>;

export const approveProposalSchema = z.object({
  approvedItemIds: z.array(z.string()),
});

export type ChatMessageEntityType = "mention" | "tag" | "task_ref" | "item_ref" | "date_ref";
export type ProposalStatus = "draft" | "awaiting_approval" | "approved" | "rejected" | "executed";
export type ProposalActionType = "create_task" | "update_due_date" | "create_event" | "move_board" | "tag_item" | "attach_file" | "assign_user";

// ============ DOCUMENT WASH ============
export type WashPolicy = "strict" | "medium" | "minimal";
export type WashStatus = "pending" | "processing" | "completed" | "failed";
export type WashEntityType =
  | "person"
  | "email"
  | "phone"
  | "address"
  | "ssn"
  | "date"
  | "case_number"
  | "financial"
  | "organization"
  | "government_id"
  | "medical"
  | "other";

export interface WashJob {
  id: string;
  matterId: string | null;
  userId: string;
  title: string;
  originalText: string;
  washedText: string | null;
  policy: WashPolicy;
  reversible: boolean;
  status: WashStatus;
  entityCount: number;
  piiReport: WashPiiReport | null;
  createdAt: string;
  updatedAt: string;
}

export interface WashEntity {
  id: string;
  jobId: string;
  entityType: WashEntityType;
  originalValue: string;
  replacement: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  detectedBy: "regex" | "ai" | "hybrid";
}

export interface WashMapping {
  id: string;
  matterId: string;
  entityType: WashEntityType;
  originalValue: string;
  replacement: string;
  createdAt: string;
}

export interface WashPiiReport {
  totalEntities: number;
  byType: Record<string, number>;
  byDetector: Record<string, number>;
  highRiskCount: number;
  entities: Array<{
    type: WashEntityType;
    original: string;
    replacement: string;
    confidence: number;
    detector: string;
  }>;
}

export const insertWashJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  originalText: z.string().min(1, "Document text is required").max(500000),
  matterId: z.string().nullable().optional(),
  policy: z.enum(["strict", "medium", "minimal"]).default("strict"),
  reversible: z.boolean().default(true),
});

export type InsertWashJob = z.infer<typeof insertWashJobSchema>;

// ============ BILLING VERIFIER ============
export const insertBillingProfileSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(255),
  matterId: z.string().nullable().optional(),
  aliases: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  keyParties: z.array(z.string()).default([]),
  hourlyRate: z.number().min(0).default(350),
  longThreshold: z.number().min(0).default(6),
  dayThreshold: z.number().min(0).default(10),
  roundingIncrement: z.number().min(0.01).default(0.1),
  roundingDirection: z.enum(["up", "down", "nearest"]).default("up"),
  minimumEntry: z.number().min(0).default(0),
  travelTimeRate: z.number().min(0).max(1).default(1),
  paymentTerms: z.enum(["receipt", "net15", "net30", "net60"]).default("receipt"),
  retainerBalance: z.number().min(0).default(0),
  firmName: z.string().max(255).optional(),
  attorneyName: z.string().max(255).optional(),
  firmAddress: z.string().optional(),
});

export type InsertBillingProfile = z.infer<typeof insertBillingProfileSchema>;

export const insertBillingReviewLogSchema = z.object({
  profileId: z.string().optional(),
  reviewData: z.any().default([]),
  summary: z.any().default({}),
});

export type InsertBillingReviewLog = z.infer<typeof insertBillingReviewLogSchema>;

export const insertBillingPipelineResultSchema = z.object({
  profileId: z.string().optional(),
  totalEntries: z.number().default(0),
  totalHours: z.number().default(0),
  totalAmount: z.number().default(0),
  flaggedCount: z.number().default(0),
  qualityIssueCount: z.number().default(0),
  entriesData: z.any().default([]),
  settings: z.any().default({}),
});

export type InsertBillingPipelineResult = z.infer<typeof insertBillingPipelineResultSchema>;

// ============ PROCESS RECORDER SCHEMAS ============
export const insertProcessRecordingSchema = z.object({
  scopeType: z.string().default("board"),
  scopeId: z.string().optional(),
  title: z.string().default("Untitled Recording"),
});
export type InsertProcessRecordingInput = z.infer<typeof insertProcessRecordingSchema>;

export const insertProcessEventSchema = z.object({
  recordingId: z.string(),
  eventType: z.string(),
  payloadJson: z.any().default({}),
});
export type InsertProcessEventInput = z.infer<typeof insertProcessEventSchema>;

export const insertProcessConversionSchema = z.object({
  recordingId: z.string(),
  outputType: z.enum(["automation_rule", "macro", "sop"]),
  generatedJson: z.any().default({}),
});
export type InsertProcessConversionInput = z.infer<typeof insertProcessConversionSchema>;

// ============ TEMPLATE SCHEMAS ============
export const insertTemplateSchema = z.object({
  type: z.enum(["email", "macro", "automation", "board", "package"]),
  scopeType: z.string().default("global"),
  scopeId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default("general"),
  tagsJson: z.array(z.string()).default([]),
  version: z.number().default(1),
  status: z.string().default("active"),
});
export type InsertTemplateInput = z.infer<typeof insertTemplateSchema>;

export const insertTemplateContentSchema = z.object({
  templateId: z.string(),
  contentJson: z.any().default({}),
});
export type InsertTemplateContentInput = z.infer<typeof insertTemplateContentSchema>;

export const insertTemplateUsageSchema = z.object({
  templateId: z.string(),
  usedOnScopeType: z.string().optional(),
  usedOnScopeId: z.string().optional(),
});
export type InsertTemplateUsageInput = z.infer<typeof insertTemplateUsageSchema>;

// ============ PDF PRO SCHEMAS ============

export type PdfDocumentJobType = "ocr" | "bates" | "stamp" | "wash" | "merge" | "split" | "redact";
export type PdfDocumentJobStatus = "queued" | "running" | "complete" | "failed";
export type PdfOperationType = "BATES" | "STAMP" | "OCR" | "WASH" | "MERGE" | "SPLIT" | "REDACT" | "AI_REVISION";
export type PdfStampType = "CONFIDENTIAL" | "AEO" | "PRIVILEGED" | "WORK_PRODUCT" | "DRAFT";
export type PdfWashPolicy = "strict" | "medium" | "minimal";
export type PdfWashMode = "regex" | "local_ner" | "llm";

export const insertPdfDocumentSchema = z.object({
  workspaceId: z.string().optional(),
  matterId: z.string().optional(),
  title: z.string().optional(),
  originalFilename: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().default("application/pdf"),
  fileSize: z.number().default(0),
  sha256Hash: z.string().min(1),
  pageCount: z.number().optional(),
  createdBy: z.string().min(1),
});
export type InsertPdfDocumentInput = z.infer<typeof insertPdfDocumentSchema>;

export const insertDocumentVersionSchema = z.object({
  documentId: z.string().min(1),
  parentVersionId: z.string().optional(),
  versionNumber: z.number().default(1),
  operationType: z.string().min(1),
  operationParams: z.record(z.any()).default({}),
  storageKey: z.string().min(1),
  sha256Hash: z.string().min(1),
  createdBy: z.string().min(1),
});
export type InsertDocumentVersionInput = z.infer<typeof insertDocumentVersionSchema>;

export const insertDocumentJobSchema = z.object({
  workspaceId: z.string().optional(),
  matterId: z.string().optional(),
  documentId: z.string().min(1),
  versionId: z.string().optional(),
  jobType: z.enum(["ocr", "bates", "stamp", "wash", "merge", "split", "redact"]),
  jobParams: z.record(z.any()).default({}),
  createdBy: z.string().min(1),
});
export type InsertDocumentJobInput = z.infer<typeof insertDocumentJobSchema>;

export const insertBatesSetSchema = z.object({
  workspaceId: z.string().optional(),
  matterId: z.string().optional(),
  name: z.string().min(1, "Production name is required"),
  prefix: z.string().min(1, "Bates prefix is required"),
  padding: z.number().min(1).max(10).default(6),
  nextNumber: z.number().min(1).default(1),
  placement: z.enum(["bottom-right", "bottom-left", "bottom-center", "top-right", "top-left", "top-center", "footer-center"]).default("bottom-right"),
  fontSize: z.number().min(6).max(24).default(10),
  createdBy: z.string().min(1),
});
export type InsertBatesSetInput = z.infer<typeof insertBatesSetSchema>;

export const insertPdfWashReportSchema = z.object({
  workspaceId: z.string().optional(),
  matterId: z.string().optional(),
  documentId: z.string().min(1),
  versionId: z.string().optional(),
  policy: z.enum(["strict", "medium", "minimal"]).default("medium"),
  detections: z.array(z.any()).default([]),
  summary: z.record(z.any()).default({}),
  createdBy: z.string().min(1),
});
export type InsertPdfWashReportInput = z.infer<typeof insertPdfWashReportSchema>;

// ============ E-FILING AUTOMATION SCHEMAS ============

export const insertJurisdictionProfileSchema = z.object({
  name: z.string().min(1),
  state: z.string().min(1),
  courtLevel: z.string().min(1),
  ruleSet: z.string().optional(),
  defaultServiceMethod: z.string().default("electronic"),
  settings: z.record(z.any()).default({}),
});
export type InsertJurisdictionProfileInput = z.infer<typeof insertJurisdictionProfileSchema>;

export const insertDeadlineRuleSchema = z.object({
  jurisdictionId: z.string().optional(),
  name: z.string().min(1),
  triggerDocType: z.string().min(1),
  triggerEvent: z.enum(["filed", "served", "hearing", "order_entered"]),
  offsetDays: z.number().int(),
  offsetDirection: z.enum(["after", "before"]).default("after"),
  resultTitle: z.string().min(1),
  resultDocType: z.string().optional(),
  criticality: z.enum(["hard", "soft"]).default("hard"),
  ruleSource: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type InsertDeadlineRuleInput = z.infer<typeof insertDeadlineRuleSchema>;

export const insertCaseFilingSchema = z.object({
  matterId: z.string().min(1),
  originalFileName: z.string().min(1),
  storedPath: z.string().optional(),
  docType: z.string().min(1),
  docSubtype: z.string().optional(),
  docCategory: z.string().optional(),
  classificationConfidence: z.number().min(0).max(1).default(0),
  filedDate: z.string().optional(),
  servedDate: z.string().optional(),
  hearingDate: z.string().optional(),
  sourceType: z.enum(["upload", "email", "efiling_system", "manual"]).default("upload"),
  classifiedBy: z.enum(["ai", "manual", "filename"]).default("manual"),
  fileHash: z.string().optional(),
  ocrText: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  createdBy: z.string().optional(),
  status: z.string().default("active"),
});
export type InsertCaseFilingInput = z.infer<typeof insertCaseFilingSchema>;

export const insertCaseDeadlineSchema = z.object({
  matterId: z.string().min(1),
  filingId: z.string().optional(),
  ruleId: z.string().optional(),
  title: z.string().min(1),
  dueDate: z.string().min(1),
  anchorEvent: z.string().optional(),
  anchorDate: z.string().optional(),
  criticality: z.enum(["hard", "soft"]).default("hard"),
  status: z.enum(["pending", "completed", "waived", "extended"]).default("pending"),
  requiredAction: z.string().optional(),
  resultDocType: z.string().optional(),
  ruleSource: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});
export type InsertCaseDeadlineInput = z.infer<typeof insertCaseDeadlineSchema>;

export const insertCaseActionSchema = z.object({
  matterId: z.string().min(1),
  deadlineId: z.string().optional(),
  filingId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  actionType: z.enum(["draft", "review", "file", "serve", "respond", "prepare", "research"]).default("draft"),
  requiredDocType: z.string().optional(),
  status: z.enum(["draft", "review", "final", "file", "served", "confirmed"]).default("draft"),
  priority: z.enum(["low", "medium", "high", "urgent", "critical"]).default("medium"),
  dueDate: z.string().optional(),
  daysRemaining: z.number().optional(),
  assignedTo: z.string().optional(),
  boardTaskId: z.string().optional(),
  auditTrail: z.array(z.any()).default([]),
});
export type InsertCaseActionInput = z.infer<typeof insertCaseActionSchema>;

export const updateActionStatusSchema = z.object({
  status: z.enum(["draft", "review", "final", "file", "served", "confirmed"]),
});

export const reclassifyFilingSchema = z.object({
  docType: z.string().optional(),
  docSubtype: z.string().optional(),
  docCategory: z.string().optional(),
  filedDate: z.string().optional(),
  servedDate: z.string().optional(),
  hearingDate: z.string().optional(),
});

// ─── Evidence Citation Standard (Spec §4) ────────────────────────────────
export const evidenceCitationSchema = z.object({
  documentId: z.string(),
  documentTitle: z.string().optional(),
  pageNumber: z.number().optional(),
  textSpan: z.string().optional(),
  boundingBox: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
  confidence: z.number().min(0).max(1),
  sourceType: z.enum(["observed", "inferred"]).default("observed"),
  excerpt: z.string().optional(),
});
export type EvidenceCitation = z.infer<typeof evidenceCitationSchema>;

// ─── Analysis Result Standard (Spec §7) ──────────────────────────────────
export const analysisResultSchema = z.object({
  moduleId: z.string(),
  moduleName: z.string(),
  matterId: z.string(),
  runAt: z.string(),
  auditId: z.string(),
  mode: z.enum(["online", "batmode"]),
  effectiveModel: z.string(),
  items: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
    confidence: z.number().min(0).max(1),
    sourceType: z.enum(["observed", "inferred"]),
    citations: z.array(evidenceCitationSchema),
    alternatives: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  })),
  summary: z.string(),
  totalItems: z.number(),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// ─── Case Insights Summary (Spec §8) ─────────────────────────────────────
export const caseInsightsSummarySchema = z.object({
  matterId: z.string(),
  matterName: z.string(),
  generatedAt: z.string(),
  auditId: z.string(),
  overview: z.object({
    totalDocuments: z.number(),
    totalEntities: z.number(),
    totalEvents: z.number(),
    totalContradictions: z.number(),
    totalGaps: z.number(),
    evidenceStrength: z.enum(["strong", "moderate", "weak"]),
  }),
  elementCoverage: z.array(z.object({
    element: z.string(),
    coverage: z.number().min(0).max(100),
    supportingEvidence: z.number(),
    gaps: z.number(),
    status: z.enum(["well_supported", "partial", "weak", "missing"]),
  })),
  keyFindings: z.array(z.object({
    finding: z.string(),
    type: z.enum(["contradiction", "gap", "pattern", "corroboration", "timeline_issue"]),
    severity: z.enum(["critical", "high", "medium", "low"]),
    citations: z.array(evidenceCitationSchema),
  })),
  recommendations: z.array(z.string()),
});
export type CaseInsightsSummary = z.infer<typeof caseInsightsSummarySchema>;

// ─── RAG Query (Spec §8) ─────────────────────────────────────────────────
export const ragQuerySchema = z.object({
  query: z.string().min(1),
  matterId: z.string().optional(),
  maxResults: z.number().min(1).max(50).optional().default(10),
  includeInferred: z.boolean().optional().default(true),
});
export type RagQuery = z.infer<typeof ragQuerySchema>;

export const ragResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(evidenceCitationSchema),
  auditId: z.string(),
  mode: z.enum(["online", "batmode"]),
  effectiveModel: z.string(),
  confidence: z.number().min(0).max(1),
  relatedEntities: z.array(z.string()).optional(),
});
export type RagResponse = z.infer<typeof ragResponseSchema>;

// ── Email Intelligence Schemas ──

export const analyzeEmailSchema = z.object({
  subject: z.string().optional().default(""),
  body: z.string().min(1, "Email body is required"),
  sender: z.string().optional().default(""),
  recipients: z.union([z.string(), z.array(z.string())]).optional().default([]),
  cc: z.union([z.string(), z.array(z.string())]).optional().default([]),
  direction: z.enum(["inbound", "outbound"]).optional().default("inbound"),
  date: z.string().optional(),
});

export const linkEmailSchema = z.object({
  matterId: z.string().min(1, "Matter ID required"),
});

export const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string().optional().default("Lauren"),
});

// Re-export auth models (for Drizzle migrations)
export { users, sessions, type User, type UpsertUser, type UserRole } from "./models/auth";

// Re-export all database tables for Drizzle
export * from "./models/tables";
