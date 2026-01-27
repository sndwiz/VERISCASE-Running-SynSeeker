import { z } from "zod";

// Priority levels
export type Priority = "low" | "medium" | "high" | "critical";

// Status types
export type StatusType = "not-started" | "working-on-it" | "stuck" | "done" | "pending-review";

// Column types supported by the board
export type ColumnType =
  | "text"
  | "status"
  | "date"
  | "person"
  | "progress"
  | "timeline"
  | "files"
  | "time"
  | "priority"
  | "number"
  | "tags"
  | "checkbox"
  | "dropdown"
  | "email"
  | "phone"
  | "rating"
  | "link";

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
export type ConfidentialityLevel = "public" | "confidential" | "privileged" | "work-product";
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

// User schema (keeping for compatibility)
export interface User {
  id: string;
  username: string;
  password: string;
}

export type InsertUser = Omit<User, "id">;
