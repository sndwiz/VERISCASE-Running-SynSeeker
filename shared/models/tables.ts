import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, integer, boolean, real } from "drizzle-orm/pg-core";

// ============ BOARDS ============
export const boards = pgTable("boards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(""),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("layout-grid"),
  columns: jsonb("columns").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ GROUPS ============
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  collapsed: boolean("collapsed").default(false),
  order: integer("order").default(0),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
});

// ============ TASKS ============
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").default(""),
  status: varchar("status", { length: 50 }).default("not-started"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  dueDate: varchar("due_date", { length: 50 }),
  startDate: varchar("start_date", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  assignees: jsonb("assignees").default([]),
  owner: jsonb("owner"),
  progress: integer("progress").default(0),
  timeEstimate: integer("time_estimate"),
  timeTracked: integer("time_tracked").default(0),
  timeLogs: jsonb("time_logs").default([]),
  files: jsonb("files").default([]),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  order: integer("order").default(0),
  parentTaskId: varchar("parent_task_id"),
  tags: jsonb("tags").default([]),
  notes: text("notes").default(""),
  lastUpdatedBy: varchar("last_updated_by"),
  customFields: jsonb("custom_fields").default({}),
  subtasks: jsonb("subtasks").default([]),
});

// ============ AI CONVERSATIONS ============
export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).default("anthropic"),
  model: varchar("model", { length: 100 }).default("claude-sonnet-4-5"),
  matterId: varchar("matter_id"),
  boardId: varchar("board_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ AI MESSAGES ============
export const aiMessages = pgTable("ai_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ CLIENTS ============
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  address: text("address"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ MATTERS ============
export const matters = pgTable("matters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  caseNumber: varchar("case_number", { length: 100 }),
  matterType: varchar("matter_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  description: text("description").default(""),
  openedDate: varchar("opened_date", { length: 50 }).notNull(),
  closedDate: varchar("closed_date", { length: 50 }),
  assignedAttorneys: jsonb("assigned_attorneys").default([]),
  practiceArea: varchar("practice_area", { length: 100 }).notNull(),
  courtName: varchar("court_name", { length: 255 }),
  judgeAssigned: varchar("judge_assigned", { length: 255 }),
  opposingCounsel: varchar("opposing_counsel", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ MATTER CONTACTS ============
export const matterContacts = pgTable("matter_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  address: text("address"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ EVIDENCE VAULT FILES ============
export const evidenceVaultFiles = pgTable("evidence_vault_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  originalName: varchar("original_name", { length: 500 }).notNull(),
  originalUrl: text("original_url").notNull(),
  originalHash: varchar("original_hash", { length: 128 }).notNull(),
  originalSize: integer("original_size").notNull(),
  originalMimeType: varchar("original_mime_type", { length: 100 }).notNull(),
  evidenceType: varchar("evidence_type", { length: 50 }).default("document"),
  confidentiality: varchar("confidentiality", { length: 50 }).default("confidential"),
  description: text("description").default(""),
  tags: jsonb("tags").default([]),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  chainOfCustody: jsonb("chain_of_custody").default([]),
  ocrJobId: varchar("ocr_job_id"),
  extractedText: text("extracted_text"),
  aiAnalysis: jsonb("ai_analysis"),
  metadata: jsonb("metadata").default({}),
});

// ============ OCR JOBS ============
export const ocrJobs = pgTable("ocr_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull(),
  matterId: varchar("matter_id").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  provider: varchar("provider", { length: 100 }).default("openai-vision"),
  confidence: real("confidence"),
  extractedText: text("extracted_text"),
  pageCount: integer("page_count"),
  processingTime: integer("processing_time"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ============ TIMELINE EVENTS ============
export const timelineEvents = pgTable("timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").default(""),
  linkedFileId: varchar("linked_file_id"),
  linkedTaskId: varchar("linked_task_id"),
  linkedThreadId: varchar("linked_thread_id"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  eventDate: varchar("event_date", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

// ============ THREADS ============
export const threads = pgTable("threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 500 }).notNull(),
  participants: jsonb("participants").default([]),
  status: varchar("status", { length: 50 }).default("open"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  linkedFiles: jsonb("linked_files").default([]),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ THREAD MESSAGES ============
export const threadMessages = pgTable("thread_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 255 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ THREAD DECISIONS ============
export const threadDecisions = pgTable("thread_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  messageId: varchar("message_id").notNull(),
  decision: text("decision").notNull(),
  madeBy: varchar("made_by", { length: 255 }).notNull(),
  madeAt: timestamp("made_at").defaultNow(),
  status: varchar("status", { length: 50 }).default("pending"),
  approvals: jsonb("approvals"),
});

// ============ RESEARCH RESULTS ============
export const researchResults = pgTable("research_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  citation: text("citation").notNull(),
  summary: text("summary").notNull(),
  relevance: integer("relevance").default(50),
  notes: text("notes").default(""),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ AUTOMATION RULES ============
export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(""),
  isActive: boolean("is_active").default(true),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  triggerField: varchar("trigger_field", { length: 100 }),
  triggerValue: varchar("trigger_value", { length: 255 }),
  conditions: jsonb("conditions").default([]),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionConfig: jsonb("action_config").default({}),
  runCount: integer("run_count").default(0),
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ AUTOMATION RUNS ============
export const automationRuns = pgTable("automation_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }),
  taskId: varchar("task_id"),
  triggerData: jsonb("trigger_data").default({}),
  actionResult: jsonb("action_result").default({}),
  status: varchar("status", { length: 50 }).default("pending"),
  error: text("error"),
  executedAt: timestamp("executed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ============ DETECTIVE NODES ============
export const detectiveNodes = pgTable("detective_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").default(""),
  linkedEvidenceId: varchar("linked_evidence_id"),
  linkedContactId: varchar("linked_contact_id"),
  position: jsonb("position").notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ DETECTIVE CONNECTIONS ============
export const detectiveConnections = pgTable("detective_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  sourceNodeId: varchar("source_node_id").notNull().references(() => detectiveNodes.id, { onDelete: "cascade" }),
  targetNodeId: varchar("target_node_id").notNull().references(() => detectiveNodes.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).default(""),
  connectionType: varchar("connection_type", { length: 50 }).notNull(),
  strength: integer("strength").default(3),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ FILE ITEMS (Physical files on server) ============
export const fileItems = pgTable("file_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  serverPath: text("server_path").notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  extension: varchar("extension", { length: 20 }),
  sizeBytes: integer("size_bytes").default(0),
  hashSha256: varchar("hash_sha256", { length: 128 }),
  isEmail: boolean("is_email").default(false),
  isAttachment: boolean("is_attachment").default(false),
  parentFileId: varchar("parent_file_id"),
  confidentiality: varchar("confidentiality", { length: 50 }).default("confidential"),
  createdUtc: timestamp("created_utc"),
  modifiedUtc: timestamp("modified_utc"),
  ingestedUtc: timestamp("ingested_utc").defaultNow(),
});

// ============ DOC PROFILES (Legal meaning of files) ============
export const docProfiles = pgTable("doc_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => fileItems.id, { onDelete: "cascade" }),
  docCategory: varchar("doc_category", { length: 50 }).notNull(),
  docType: varchar("doc_type", { length: 100 }).notNull(),
  docRole: varchar("doc_role", { length: 50 }).default("primary"),
  captionTitle: varchar("caption_title", { length: 500 }),
  party: varchar("party", { length: 50 }),
  author: varchar("author", { length: 255 }),
  recipient: varchar("recipient", { length: 255 }),
  serviceDate: varchar("service_date", { length: 50 }),
  filingDate: varchar("filing_date", { length: 50 }),
  hearingDate: varchar("hearing_date", { length: 50 }),
  docketNumber: varchar("docket_number", { length: 100 }),
  version: varchar("version", { length: 50 }).default("final"),
  status: varchar("status", { length: 50 }).default("draft"),
  privilegeBasis: varchar("privilege_basis", { length: 100 }),
  productionId: varchar("production_id", { length: 100 }),
  batesRange: varchar("bates_range", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ FILING TAGS ============
export const filingTags = pgTable("filing_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ FILE TAG JOIN TABLE ============
export const fileTagLinks = pgTable("file_tag_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => fileItems.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => filingTags.id, { onDelete: "cascade" }),
});

// ============ PEOPLE/ORGS (for clean search) ============
export const peopleOrgs = pgTable("people_orgs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").references(() => matters.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  role: varchar("role", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports
export type BoardRecord = typeof boards.$inferSelect;
export type InsertBoardRecord = typeof boards.$inferInsert;
export type GroupRecord = typeof groups.$inferSelect;
export type InsertGroupRecord = typeof groups.$inferInsert;
export type TaskRecord = typeof tasks.$inferSelect;
export type InsertTaskRecord = typeof tasks.$inferInsert;
export type FileItemRecord = typeof fileItems.$inferSelect;
export type InsertFileItemRecord = typeof fileItems.$inferInsert;
export type DocProfileRecord = typeof docProfiles.$inferSelect;
export type InsertDocProfileRecord = typeof docProfiles.$inferInsert;
export type FilingTagRecord = typeof filingTags.$inferSelect;
export type InsertFilingTagRecord = typeof filingTags.$inferInsert;
export type PeopleOrgRecord = typeof peopleOrgs.$inferSelect;
export type InsertPeopleOrgRecord = typeof peopleOrgs.$inferInsert;
