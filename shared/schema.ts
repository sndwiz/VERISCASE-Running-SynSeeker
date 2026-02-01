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

// Column definition for the table
export interface ColumnDef {
  id: string;
  title: string;
  type: ColumnType;
  width: number;
  visible: boolean;
  order: number;
  options?: string[];
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

// Board interface
export interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  columns: ColumnDef[];
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
  status: "active" | "pending" | "closed" | "on-hold";
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
  | "custom";

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: any;
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
  connectionType: "related" | "contradicts" | "supports" | "leads-to" | "timeline";
  strength: number; // 1-5
  notes: string;
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

// Matter schemas
export const insertMatterSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  caseNumber: z.string().optional(),
  matterType: z.string(),
  status: z.enum(["active", "pending", "closed", "on-hold"]).optional().default("active"),
  description: z.string().optional().default(""),
  openedDate: z.string(),
  practiceArea: z.string(),
  courtName: z.string().optional(),
  judgeAssigned: z.string().optional(),
  opposingCounsel: z.string().optional(),
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
  triggerType: z.enum(["item_created", "status_changed", "priority_changed", "due_date_approaching", "due_date_passed", "assigned", "unassigned", "moved_to_group", "field_changed", "file_uploaded", "custom"]),
  triggerField: z.string().optional(),
  triggerValue: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
    value: z.any(),
  })).optional().default([]),
  actionType: z.enum(["change_status", "change_priority", "move_to_group", "assign_person", "unassign_person", "send_notification", "create_subtask", "update_field", "trigger_webhook", "custom"]),
  actionConfig: z.record(z.any()),
});

export const updateAutomationRuleSchema = insertAutomationRuleSchema.partial().omit({ boardId: true });

// Detective Board schemas
export const insertDetectiveNodeSchema = z.object({
  matterId: z.string(),
  type: z.enum(["evidence", "person", "location", "event", "theory", "note"]),
  title: z.string(),
  description: z.string().optional().default(""),
  linkedEvidenceId: z.string().optional(),
  linkedContactId: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  color: z.string().optional().default("#6366f1"),
  icon: z.string().optional(),
});

export const updateDetectiveNodeSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const insertDetectiveConnectionSchema = z.object({
  matterId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().optional().default(""),
  connectionType: z.enum(["related", "contradicts", "supports", "leads-to", "timeline"]),
  strength: z.number().min(1).max(5).optional().default(3),
  notes: z.string().optional().default(""),
});

export const updateDetectiveConnectionSchema = z.object({
  label: z.string().optional(),
  connectionType: z.enum(["related", "contradicts", "supports", "leads-to", "timeline"]).optional(),
  strength: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
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

// ============ APPROVALS ============

export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs-revision";

export interface ApprovalRequest {
  id: string;
  fileId: string;
  matterId: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  assignedTo: string[];
  status: ApprovalStatus;
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
  decision?: "approved" | "rejected" | "needs-revision";
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
  status: z.enum(["pending", "approved", "rejected", "needs-revision"]).optional(),
  assignedTo: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const insertApprovalCommentSchema = z.object({
  approvalId: z.string(),
  userId: z.string(),
  userName: z.string(),
  content: z.string().min(1),
  decision: z.enum(["approved", "rejected", "needs-revision"]).optional(),
});

// Type exports
export type InsertBoard = z.infer<typeof insertBoardSchema>;
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

// Re-export auth models (for Drizzle migrations)
export { users, sessions, type User, type UpsertUser, type UserRole } from "./models/auth";

// Re-export all database tables for Drizzle
export * from "./models/tables";
