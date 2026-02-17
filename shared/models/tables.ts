import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, pgEnum, timestamp, varchar, text, integer, bigint, boolean, real } from "drizzle-orm/pg-core";

// ============ TEAM MEMBERS ============
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }),
  barNumber: varchar("bar_number", { length: 50 }),
  department: varchar("department", { length: 100 }),
  isActive: boolean("is_active").default(true),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by", { length: 255 }),
  offboardedAt: timestamp("offboarded_at"),
  lastLoginAt: timestamp("last_login_at"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaMethod: varchar("mfa_method", { length: 20 }),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ============ WORKSPACES ============
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(""),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("briefcase"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ BOARDS ============
export const boards = pgTable("boards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(""),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("layout-grid"),
  columns: jsonb("columns").default([]),
  clientId: varchar("client_id"),
  matterId: varchar("matter_id"),
  workspaceId: varchar("workspace_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_boards_client_id").on(table.clientId),
  index("IDX_boards_matter_id").on(table.matterId),
  index("IDX_boards_workspace_id").on(table.workspaceId),
]);

// ============ GROUPS ============
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  collapsed: boolean("collapsed").default(false),
  order: integer("order").default(0),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
}, (table) => [
  index("IDX_groups_board_id").on(table.boardId),
]);

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
}, (table) => [
  index("IDX_tasks_board_id").on(table.boardId),
  index("IDX_tasks_group_id").on(table.groupId),
]);

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
}, (table) => [
  index("IDX_ai_conversations_matter_id").on(table.matterId),
]);

// ============ AI MESSAGES ============
export const aiMessages = pgTable("ai_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_ai_messages_conversation_id").on(table.conversationId),
]);

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
  responsiblePartyId: varchar("responsible_party_id"),
  assignedAttorneys: jsonb("assigned_attorneys").default([]),
  assignedParalegals: jsonb("assigned_paralegals").default([]),
  practiceArea: varchar("practice_area", { length: 100 }).notNull(),
  courtName: varchar("court_name", { length: 255 }),
  judgeAssigned: varchar("judge_assigned", { length: 255 }),
  opposingCounsel: varchar("opposing_counsel", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  externalAiAllowed: boolean("external_ai_allowed").default(false),
  aiSensitivityLevel: varchar("ai_sensitivity_level", { length: 20 }).default("high"),
}, (table) => [
  index("IDX_matters_client_id").on(table.clientId),
]);

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
}, (table) => [
  index("IDX_matter_contacts_matter_id").on(table.matterId),
]);

// ============ MATTER DOCUMENTS ============
export const matterDocuments = pgTable("matter_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull().default(0),
  mimeType: varchar("mime_type", { length: 100 }).notNull().default("application/octet-stream"),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("IDX_matter_documents_matter_id").on(table.matterId),
]);

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
  storageKey: text("storage_key"),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by", { length: 255 }),
  ocrJobId: varchar("ocr_job_id"),
  extractedText: text("extracted_text"),
  aiAnalysis: jsonb("ai_analysis"),
  metadata: jsonb("metadata").default({}),
}, (table) => [
  index("IDX_evidence_vault_matter_id").on(table.matterId),
]);

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

export type OcrJob = typeof ocrJobs.$inferSelect;
export type InsertOcrJob = typeof ocrJobs.$inferInsert;

// ============ OCR SESSIONS (detailed processing reports) ============
export const ocrSessions = pgTable("ocr_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id"),
  fileId: varchar("file_id"),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  method: varchar("method", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("processing").notNull(),
  confidence: real("confidence"),
  pageCount: integer("page_count"),
  extractedTextLength: integer("extracted_text_length"),
  chunkCount: integer("chunk_count"),
  anchorCount: integer("anchor_count"),
  hashSha256: varchar("hash_sha256", { length: 128 }),
  processingTimeMs: integer("processing_time_ms"),
  errorMessage: text("error_message"),
  ocrMetadata: jsonb("ocr_metadata").default({}),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by"),
}, (table) => [
  index("IDX_ocr_sessions_matter").on(table.matterId),
]);

export type OcrSession = typeof ocrSessions.$inferSelect;
export type InsertOcrSession = typeof ocrSessions.$inferInsert;

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
}, (table) => [
  index("IDX_timeline_events_matter_id").on(table.matterId),
]);

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
}, (table) => [
  index("IDX_threads_matter_id").on(table.matterId),
]);

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
}, (table) => [
  index("IDX_detective_nodes_matter_id").on(table.matterId),
]);

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
}, (table) => [
  index("IDX_file_items_matter_id").on(table.matterId),
]);

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

// ============ TIME ENTRIES ============
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  userId: varchar("user_id", { length: 100 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  hours: real("hours").notNull(),
  description: text("description").notNull(),
  billableStatus: varchar("billable_status", { length: 20 }).default("billable"),
  hourlyRate: real("hourly_rate"),
  activityCode: varchar("activity_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_time_entries_matter_id").on(table.matterId),
]);

// ============ TIME ENTRY SUPPORTING DOCS ============
export const timeEntrySupportingDocs = pgTable("time_entry_supporting_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeEntryId: varchar("time_entry_id").notNull().references(() => timeEntries.id, { onDelete: "cascade" }),
  matterId: varchar("matter_id").notNull(),
  docType: varchar("doc_type", { length: 50 }).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  filePath: varchar("file_path", { length: 1000 }),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  linkedEmailId: varchar("linked_email_id"),
  notes: text("notes"),
  uploadedBy: varchar("uploaded_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_supporting_docs_time_entry").on(table.timeEntryId),
]);

export type TimeEntrySupportingDoc = typeof timeEntrySupportingDocs.$inferSelect;
export type InsertTimeEntrySupportingDoc = typeof timeEntrySupportingDocs.$inferInsert;

// ============ CALENDAR EVENTS ============
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").references(() => matters.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").default(""),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  startDate: varchar("start_date", { length: 50 }).notNull(),
  endDate: varchar("end_date", { length: 50 }),
  allDay: boolean("all_day").default(false),
  location: text("location"),
  attendees: jsonb("attendees").default([]),
  reminderMinutes: integer("reminder_minutes"),
  color: varchar("color", { length: 20 }),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: varchar("source_id", { length: 255 }),
  autoSynced: boolean("auto_synced").default(false),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_calendar_source").on(table.sourceType, table.sourceId),
  index("IDX_calendar_matter_id").on(table.matterId),
  index("IDX_calendar_start_date").on(table.startDate),
]);

// ============ APPROVAL REQUESTS ============
export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => fileItems.id, { onDelete: "cascade" }),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").default(""),
  requestedBy: varchar("requested_by", { length: 100 }).notNull(),
  requestedByName: varchar("requested_by_name", { length: 255 }).notNull(),
  assignedTo: jsonb("assigned_to").notNull().default([]),
  status: varchar("status", { length: 50 }).default("pending"),
  dueDate: varchar("due_date", { length: 50 }),
  priority: varchar("priority", { length: 20 }).default("medium"),
  type: varchar("type", { length: 50 }).default("general"),
  sourceData: jsonb("source_data").default({}),
  initials: jsonb("initials").default([]),
  revisionNotes: text("revision_notes").default(""),
  comments: jsonb("comments").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ MEETINGS ============
export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  matterId: varchar("matter_id").references(() => matters.id, { onDelete: "set null" }),
  date: varchar("date", { length: 50 }).notNull(),
  duration: integer("duration").default(0),
  status: varchar("status", { length: 50 }).default("recorded"),
  participants: jsonb("participants").default([]),
  summary: text("summary").default(""),
  mainPoints: jsonb("main_points").default([]),
  topics: jsonb("topics").default([]),
  transcript: jsonb("transcript").default([]),
  actionItems: jsonb("action_items").default([]),
  tags: jsonb("tags").default([]),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ AUDIT LOGS ============
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }),
  userEmail: varchar("user_email", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceId: varchar("resource_id", { length: 255 }),
  method: varchar("method", { length: 10 }),
  path: varchar("path", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  statusCode: integer("status_code"),
  metadata: jsonb("metadata").default({}),
  severity: varchar("severity", { length: 20 }).default("info"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_audit_user").on(table.userId),
  index("IDX_audit_action").on(table.action),
  index("IDX_audit_created").on(table.createdAt),
  index("IDX_audit_resource").on(table.resourceType, table.resourceId),
]);

// ============ SECURITY EVENTS ============
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  userId: varchar("user_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  details: jsonb("details").default({}),
  severity: varchar("severity", { length: 20 }).default("warning"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_security_event_type").on(table.eventType),
  index("IDX_security_severity").on(table.severity),
  index("IDX_security_created").on(table.createdAt),
]);

// ============ EXPENSES ============
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  date: varchar("date", { length: 32 }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  billable: boolean("billable").default(true),
  reimbursable: boolean("reimbursable").default(false),
  vendor: varchar("vendor", { length: 255 }),
  receiptUrl: text("receipt_url"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_expense_client").on(table.clientId),
  index("IDX_expense_matter").on(table.matterId),
]);

// ============ INVOICES ============
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  matterId: varchar("matter_id", { length: 255 }),
  issueDate: varchar("issue_date", { length: 32 }).notNull(),
  dueDate: varchar("due_date", { length: 32 }).notNull(),
  status: varchar("status", { length: 30 }).default("draft"),
  lineItems: jsonb("line_items").default([]),
  subtotal: real("subtotal").default(0),
  taxRate: real("tax_rate").default(0),
  taxAmount: real("tax_amount").default(0),
  totalAmount: real("total_amount").default(0),
  paidAmount: real("paid_amount").default(0),
  balanceDue: real("balance_due").default(0),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_invoice_client").on(table.clientId),
  index("IDX_invoice_status").on(table.status),
]);

// ============ PAYMENTS ============
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  date: varchar("date", { length: 32 }).notNull(),
  amount: real("amount").notNull(),
  method: varchar("method", { length: 30 }).notNull(),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_payment_invoice").on(table.invoiceId),
  index("IDX_payment_client").on(table.clientId),
]);

// ============ TRUST TRANSACTIONS ============
export const trustTransactions = pgTable("trust_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  matterId: varchar("matter_id", { length: 255 }),
  date: varchar("date", { length: 32 }).notNull(),
  amount: real("amount").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 255 }),
  runningBalance: real("running_balance").default(0),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_trust_client").on(table.clientId),
]);

// ============ MATTER INSIGHTS: ASSETS ============
export const matterAssets = pgTable("matter_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull(),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  storageUrl: text("storage_url").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  hashSha256: varchar("hash_sha256", { length: 64 }),
  uploadedByUserId: varchar("uploaded_by_user_id"),
  sourceDate: timestamp("source_date"),
  docType: varchar("doc_type", { length: 100 }),
  custodian: varchar("custodian", { length: 100 }),
  confidentiality: varchar("confidentiality", { length: 50 }).default("normal"),
  status: varchar("status", { length: 50 }).default("queued").notNull(),
  errorMessage: text("error_message"),
  pageCount: integer("page_count"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_matter_assets_matter_id").on(table.matterId),
  index("IDX_matter_assets_status").on(table.status),
]);

// ============ MATTER INSIGHTS: ASSET TEXT ============
export const assetText = pgTable("asset_text", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => matterAssets.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 50 }).notNull(),
  fullText: text("full_text"),
  confidenceOverall: real("confidence_overall"),
  language: varchar("language", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_asset_text_asset_id").on(table.assetId),
]);

// ============ MATTER INSIGHTS: TEXT ANCHORS ============
export const textAnchors = pgTable("text_anchors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetTextId: varchar("asset_text_id").notNull().references(() => assetText.id, { onDelete: "cascade" }),
  anchorType: varchar("anchor_type", { length: 50 }).notNull(),
  pageNumber: integer("page_number"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  timeStartMs: integer("time_start_ms"),
  timeEndMs: integer("time_end_ms"),
  snippet: text("snippet"),
  confidence: real("confidence"),
}, (table) => [
  index("IDX_text_anchors_asset_text_id").on(table.assetTextId),
]);

// ============ MATTER INSIGHTS: TEXT CHUNKS ============
export const textChunks = pgTable("text_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull(),
  assetId: varchar("asset_id").notNull(),
  assetTextId: varchar("asset_text_id").notNull(),
  chunkText: text("chunk_text").notNull(),
  anchorIdStart: varchar("anchor_id_start"),
  anchorIdEnd: varchar("anchor_id_end"),
  chunkIndex: integer("chunk_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_text_chunks_matter_id").on(table.matterId),
  index("IDX_text_chunks_asset_id").on(table.assetId),
]);

// ============ MATTER INSIGHTS: INSIGHT RUNS ============
export const insightRuns = pgTable("insight_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull(),
  requestedByUserId: varchar("requested_by_user_id"),
  intentType: varchar("intent_type", { length: 100 }).notNull(),
  priorityRules: jsonb("priority_rules"),
  outputFormat: varchar("output_format", { length: 100 }),
  scope: varchar("scope", { length: 255 }),
  status: varchar("status", { length: 50 }).default("queued").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_insight_runs_matter_id").on(table.matterId),
  index("IDX_insight_runs_status").on(table.status),
]);

// ============ MATTER INSIGHTS: INSIGHT OUTPUTS ============
export const insightOutputs = pgTable("insight_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightRunId: varchar("insight_run_id").notNull().references(() => insightRuns.id, { onDelete: "cascade" }),
  section: varchar("section", { length: 100 }).notNull(),
  contentJson: jsonb("content_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_insight_outputs_run_id").on(table.insightRunId),
]);

// ============ UPLOAD ORGANIZER: INCOMING FILES ============
export const incomingFiles = pgTable("incoming_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  matterId: varchar("matter_id"),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  currentPath: text("current_path").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  subtype: varchar("subtype", { length: 50 }).default("unknown"),
  sizeBytes: integer("size_bytes").default(0),
  hashSha256: varchar("hash_sha256", { length: 128 }),
  mimeType: varchar("mime_type", { length: 100 }),
  ocrText: text("ocr_text"),
  ocrConfidence: real("ocr_confidence"),
  metadataJson: jsonb("metadata_json"),
  status: varchar("status", { length: 50 }).default("new").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_incoming_files_user_id").on(table.userId),
  index("IDX_incoming_files_status").on(table.status),
  index("IDX_incoming_files_uploaded_at").on(table.uploadedAt),
]);

// ============ UPLOAD ORGANIZER: RUNS ============
export const organizeRuns = pgTable("organize_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  scope: varchar("scope", { length: 50 }).default("incoming").notNull(),
  matterId: varchar("matter_id"),
  daysFilter: integer("days_filter").default(14),
  totalFiles: integer("total_files").default(0),
  filesToMove: integer("files_to_move").default(0),
  filesToKeep: integer("files_to_keep").default(0),
  filesToTrash: integer("files_to_trash").default(0),
  executedCount: integer("executed_count").default(0),
  status: varchar("status", { length: 50 }).default("draft_plan").notNull(),
  aiProvider: varchar("ai_provider", { length: 50 }),
  aiModel: varchar("ai_model", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_organize_runs_user_id").on(table.userId),
  index("IDX_organize_runs_status").on(table.status),
]);

// ============ UPLOAD ORGANIZER: PLAN ITEMS ============
export const organizePlanItems = pgTable("organize_plan_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull().references(() => organizeRuns.id, { onDelete: "cascade" }),
  incomingFileId: varchar("incoming_file_id").notNull().references(() => incomingFiles.id, { onDelete: "cascade" }),
  detectedSummary: text("detected_summary"),
  suggestedFilename: varchar("suggested_filename", { length: 500 }),
  suggestedFolder: text("suggested_folder"),
  suggestedAction: varchar("suggested_action", { length: 50 }).default("rename_move").notNull(),
  confidence: varchar("confidence", { length: 20 }).default("medium"),
  rationale: text("rationale"),
  groupLabel: varchar("group_label", { length: 200 }),
  approvedAction: varchar("approved_action", { length: 50 }),
  approvedFilename: varchar("approved_filename", { length: 500 }),
  approvedFolder: text("approved_folder"),
  executionStatus: varchar("execution_status", { length: 50 }).default("pending").notNull(),
  executedAt: timestamp("executed_at"),
  errorMessage: text("error_message"),
}, (table) => [
  index("IDX_plan_items_run_id").on(table.runId),
  index("IDX_plan_items_file_id").on(table.incomingFileId),
]);

// ============ UPLOAD ORGANIZER: CHANGE LOG ============
export const fileChangeLog = pgTable("file_change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incomingFileId: varchar("incoming_file_id").notNull().references(() => incomingFiles.id, { onDelete: "cascade" }),
  planItemId: varchar("plan_item_id").references(() => organizePlanItems.id, { onDelete: "set null" }),
  runId: varchar("run_id").references(() => organizeRuns.id, { onDelete: "set null" }),
  changedByUserId: varchar("changed_by_user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  oldFilename: varchar("old_filename", { length: 500 }),
  newFilename: varchar("new_filename", { length: 500 }),
  oldPath: text("old_path"),
  newPath: text("new_path"),
  reversible: boolean("reversible").default(true),
  reversedAt: timestamp("reversed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_change_log_file_id").on(table.incomingFileId),
  index("IDX_change_log_run_id").on(table.runId),
]);

// Type exports
export type MatterAssetRecord = typeof matterAssets.$inferSelect;
export type InsertMatterAssetRecord = typeof matterAssets.$inferInsert;
export type AssetTextRecord = typeof assetText.$inferSelect;
export type InsertAssetTextRecord = typeof assetText.$inferInsert;
export type TextAnchorRecord = typeof textAnchors.$inferSelect;
export type InsertTextAnchorRecord = typeof textAnchors.$inferInsert;
export type TextChunkRecord = typeof textChunks.$inferSelect;
export type InsertTextChunkRecord = typeof textChunks.$inferInsert;
export type InsightRunRecord = typeof insightRuns.$inferSelect;
export type InsertInsightRunRecord = typeof insightRuns.$inferInsert;
export type InsightOutputRecord = typeof insightOutputs.$inferSelect;
export type InsertInsightOutputRecord = typeof insightOutputs.$inferInsert;

export type AuditLogRecord = typeof auditLogs.$inferSelect;
export type InsertAuditLogRecord = typeof auditLogs.$inferInsert;
export type SecurityEventRecord = typeof securityEvents.$inferSelect;
export type InsertSecurityEventRecord = typeof securityEvents.$inferInsert;
export type MeetingRecord = typeof meetings.$inferSelect;
export type InsertMeetingRecord = typeof meetings.$inferInsert;
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
export type TimeEntryRecord = typeof timeEntries.$inferSelect;
export type InsertTimeEntryRecord = typeof timeEntries.$inferInsert;
export type CalendarEventRecord = typeof calendarEvents.$inferSelect;
export type InsertCalendarEventRecord = typeof calendarEvents.$inferInsert;
export type ApprovalRequestRecord = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequestRecord = typeof approvalRequests.$inferInsert;
export type IncomingFileRecord = typeof incomingFiles.$inferSelect;
export type InsertIncomingFileRecord = typeof incomingFiles.$inferInsert;
export type OrganizeRunRecord = typeof organizeRuns.$inferSelect;
export type InsertOrganizeRunRecord = typeof organizeRuns.$inferInsert;
export type OrganizePlanItemRecord = typeof organizePlanItems.$inferSelect;
export type InsertOrganizePlanItemRecord = typeof organizePlanItems.$inferInsert;
export type FileChangeLogRecord = typeof fileChangeLog.$inferSelect;
export type InsertFileChangeLogRecord = typeof fileChangeLog.$inferInsert;

// ============ BOARD CHAT + MASTER CHAT ============
export const boardChats = pgTable("board_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scopeType: varchar("scope_type", { length: 20 }).notNull().default("board"),
  boardId: varchar("board_id").references(() => boards.id, { onDelete: "cascade" }),
  clientId: varchar("client_id"),
  matterId: varchar("matter_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_board_chats_board_id").on(table.boardId),
  index("IDX_board_chats_client_id").on(table.clientId),
  index("IDX_board_chats_matter_id").on(table.matterId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => boardChats.id, { onDelete: "cascade" }),
  senderUserId: varchar("sender_user_id").notNull(),
  bodyText: text("body_text").notNull(),
  bodyRichJson: jsonb("body_rich_json"),
  replyToMessageId: varchar("reply_to_message_id"),
  isSystemMessage: boolean("is_system_message").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_chat_messages_chat_id").on(table.chatId),
  index("IDX_chat_messages_sender").on(table.senderUserId),
  index("IDX_chat_messages_created").on(table.createdAt),
]);

export const chatMessageEntities = pgTable("chat_message_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  value: varchar("value", { length: 500 }).notNull(),
  startIndex: integer("start_index"),
  endIndex: integer("end_index"),
}, (table) => [
  index("IDX_chat_entities_message").on(table.messageId),
  index("IDX_chat_entities_type").on(table.entityType),
]);

export const chatAttachments = pgTable("chat_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size").default(0),
  mimeType: varchar("mime_type", { length: 100 }),
  storagePath: varchar("storage_path", { length: 1000 }),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_chat_attachments_message").on(table.messageId),
]);

export const actionProposals = pgTable("action_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scopeType: varchar("scope_type", { length: 20 }).notNull(),
  scopeId: varchar("scope_id").notNull(),
  chatId: varchar("chat_id").references(() => boardChats.id, { onDelete: "set null" }),
  sourceMessageId: varchar("source_message_id").references(() => chatMessages.id, { onDelete: "set null" }),
  createdByUserId: varchar("created_by_user_id").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("awaiting_approval"),
  summaryText: text("summary_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_action_proposals_scope").on(table.scopeType, table.scopeId),
  index("IDX_action_proposals_chat").on(table.chatId),
  index("IDX_action_proposals_status").on(table.status),
]);

export const actionProposalItems = pgTable("action_proposal_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull().references(() => actionProposals.id, { onDelete: "cascade" }),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  confidence: varchar("confidence", { length: 10 }).default("medium"),
  rationale: text("rationale"),
  executedAt: timestamp("executed_at"),
  resultJson: jsonb("result_json"),
}, (table) => [
  index("IDX_action_items_proposal").on(table.proposalId),
]);

export type BoardChatRecord = typeof boardChats.$inferSelect;
export type InsertBoardChatRecord = typeof boardChats.$inferInsert;
export type ChatMessageRecord = typeof chatMessages.$inferSelect;
export type InsertChatMessageRecord = typeof chatMessages.$inferInsert;
export type ChatMessageEntityRecord = typeof chatMessageEntities.$inferSelect;
export type InsertChatMessageEntityRecord = typeof chatMessageEntities.$inferInsert;
export type ChatAttachmentRecord = typeof chatAttachments.$inferSelect;
export type InsertChatAttachmentRecord = typeof chatAttachments.$inferInsert;
export type ActionProposalRecord = typeof actionProposals.$inferSelect;
export type InsertActionProposalRecord = typeof actionProposals.$inferInsert;
export type ActionProposalItemRecord = typeof actionProposalItems.$inferSelect;
export type InsertActionProposalItemRecord = typeof actionProposalItems.$inferInsert;

// ============ DOCUMENT WASH ============
export const washJobs = pgTable("wash_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id"),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalText: text("original_text").notNull(),
  washedText: text("washed_text"),
  policy: varchar("policy", { length: 20 }).notNull().default("strict"),
  reversible: boolean("reversible").notNull().default(true),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  entityCount: integer("entity_count").default(0),
  piiReport: jsonb("pii_report"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_wash_jobs_matter").on(table.matterId),
  index("IDX_wash_jobs_user").on(table.userId),
  index("IDX_wash_jobs_status").on(table.status),
]);

export const washEntities = pgTable("wash_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => washJobs.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  originalValue: text("original_value").notNull(),
  replacement: text("replacement").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  confidence: real("confidence").default(0.9),
  detectedBy: varchar("detected_by", { length: 20 }).default("regex"),
}, (table) => [
  index("IDX_wash_entities_job").on(table.jobId),
  index("IDX_wash_entities_type").on(table.entityType),
]);

export const washMappings = pgTable("wash_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  originalValue: text("original_value").notNull(),
  replacement: text("replacement").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_wash_mappings_matter").on(table.matterId),
  index("IDX_wash_mappings_lookup").on(table.matterId, table.entityType),
]);

export type WashJobRecord = typeof washJobs.$inferSelect;
export type InsertWashJobRecord = typeof washJobs.$inferInsert;
export type WashEntityRecord = typeof washEntities.$inferSelect;
export type InsertWashEntityRecord = typeof washEntities.$inferInsert;
export type WashMappingRecord = typeof washMappings.$inferSelect;
export type InsertWashMappingRecord = typeof washMappings.$inferInsert;

// ============ BILLING VERIFIER ============
export const billingProfiles = pgTable("billing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 100 }).notNull(),
  matterId: varchar("matter_id"),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  aliases: text("aliases").array().default([]),
  phones: text("phones").array().default([]),
  keyParties: text("key_parties").array().default([]),
  hourlyRate: real("hourly_rate").default(350),
  longThreshold: real("long_threshold").default(6),
  dayThreshold: real("day_threshold").default(10),
  roundingIncrement: real("rounding_increment").default(0.1),
  roundingDirection: varchar("rounding_direction", { length: 20 }).default("up"),
  minimumEntry: real("minimum_entry").default(0),
  travelTimeRate: real("travel_time_rate").default(1),
  paymentTerms: varchar("payment_terms", { length: 20 }).default("receipt"),
  retainerBalance: real("retainer_balance").default(0),
  firmName: varchar("firm_name", { length: 255 }),
  attorneyName: varchar("attorney_name", { length: 255 }),
  firmAddress: text("firm_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_billing_profiles_user").on(table.userId),
  index("IDX_billing_profiles_matter").on(table.matterId),
]);

export const billingReviewLogs = pgTable("billing_review_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 100 }).notNull(),
  profileId: varchar("profile_id").references(() => billingProfiles.id, { onDelete: "cascade" }),
  reviewData: jsonb("review_data").default([]),
  summary: jsonb("summary").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_billing_review_logs_user").on(table.userId),
  index("IDX_billing_review_logs_profile").on(table.profileId),
]);

export const billingPipelineResults = pgTable("billing_pipeline_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 100 }).notNull(),
  profileId: varchar("profile_id").references(() => billingProfiles.id, { onDelete: "cascade" }),
  totalEntries: integer("total_entries").default(0),
  totalHours: real("total_hours").default(0),
  totalAmount: real("total_amount").default(0),
  flaggedCount: integer("flagged_count").default(0),
  qualityIssueCount: integer("quality_issue_count").default(0),
  entriesData: jsonb("entries_data").default([]),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_billing_results_user").on(table.userId),
  index("IDX_billing_results_profile").on(table.profileId),
]);

export type BillingProfileRecord = typeof billingProfiles.$inferSelect;
export type InsertBillingProfileRecord = typeof billingProfiles.$inferInsert;
export type BillingReviewLogRecord = typeof billingReviewLogs.$inferSelect;
export type InsertBillingReviewLogRecord = typeof billingReviewLogs.$inferInsert;
export type BillingPipelineResultRecord = typeof billingPipelineResults.$inferSelect;
export type InsertBillingPipelineResultRecord = typeof billingPipelineResults.$inferInsert;

// ============ PROCESS RECORDINGS ============
export const processRecordings = pgTable("process_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull(),
  scopeType: varchar("scope_type", { length: 50 }).default("board"),
  scopeId: varchar("scope_id"),
  title: varchar("title", { length: 255 }).default("Untitled Recording"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 20 }).default("recording"),
  eventCount: integer("event_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_process_recordings_user").on(table.createdByUserId),
  index("IDX_process_recordings_status").on(table.status),
]);

export const processEvents = pgTable("process_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recordingId: varchar("recording_id").notNull().references(() => processRecordings.id, { onDelete: "cascade" }),
  ts: timestamp("ts").defaultNow().notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payloadJson: jsonb("payload_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_process_events_recording").on(table.recordingId),
  index("IDX_process_events_type").on(table.eventType),
]);

export const processConversions = pgTable("process_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recordingId: varchar("recording_id").notNull().references(() => processRecordings.id, { onDelete: "cascade" }),
  outputType: varchar("output_type", { length: 50 }).notNull(),
  generatedJson: jsonb("generated_json").default({}),
  status: varchar("status", { length: 20 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_process_conversions_recording").on(table.recordingId),
]);

export type ProcessRecording = typeof processRecordings.$inferSelect;
export type InsertProcessRecording = typeof processRecordings.$inferInsert;
export type ProcessEvent = typeof processEvents.$inferSelect;
export type InsertProcessEvent = typeof processEvents.$inferInsert;
export type ProcessConversion = typeof processConversions.$inferSelect;
export type InsertProcessConversion = typeof processConversions.$inferInsert;

// ============ TEMPLATES ============
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  scopeType: varchar("scope_type", { length: 50 }).default("global"),
  scopeId: varchar("scope_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(""),
  category: varchar("category", { length: 100 }).default("general"),
  tagsJson: jsonb("tags_json").default([]),
  createdByUserId: varchar("created_by_user_id", { length: 255 }).notNull(),
  version: integer("version").default(1),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_templates_type").on(table.type),
  index("IDX_templates_status").on(table.status),
  index("IDX_templates_category").on(table.category),
  index("IDX_templates_user").on(table.createdByUserId),
]);

export const templateContents = pgTable("template_contents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  contentJson: jsonb("content_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_template_contents_template").on(table.templateId),
]);

export const templateUsageLog = pgTable("template_usage_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  usedByUserId: varchar("used_by_user_id", { length: 255 }).notNull(),
  usedOnScopeType: varchar("used_on_scope_type", { length: 50 }),
  usedOnScopeId: varchar("used_on_scope_id"),
  usedAt: timestamp("used_at").defaultNow(),
}, (table) => [
  index("IDX_template_usage_template").on(table.templateId),
  index("IDX_template_usage_user").on(table.usedByUserId),
]);

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
export type TemplateContent = typeof templateContents.$inferSelect;
export type InsertTemplateContent = typeof templateContents.$inferInsert;
export type TemplateUsageLogEntry = typeof templateUsageLog.$inferSelect;
export type InsertTemplateUsageLogEntry = typeof templateUsageLog.$inferInsert;

// ============ PDF PRO - DOCUMENTS ============
export const pdfDocuments = pgTable("pdf_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id"),
  matterId: varchar("matter_id"),
  title: varchar("title", { length: 500 }),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).default("application/pdf"),
  fileSize: integer("file_size").default(0),
  sha256Hash: varchar("sha256_hash", { length: 64 }).notNull(),
  pageCount: integer("page_count"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_pdf_docs_workspace").on(table.workspaceId),
  index("IDX_pdf_docs_matter").on(table.matterId),
  index("IDX_pdf_docs_created_by").on(table.createdBy),
]);

export type PdfDocument = typeof pdfDocuments.$inferSelect;
export type InsertPdfDocument = typeof pdfDocuments.$inferInsert;

// ============ PDF PRO - DOCUMENT VERSIONS ============
export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => pdfDocuments.id, { onDelete: "cascade" }),
  parentVersionId: varchar("parent_version_id"),
  versionNumber: integer("version_number").notNull().default(1),
  operationType: varchar("operation_type", { length: 50 }).notNull(),
  operationParams: jsonb("operation_params").default({}),
  storageKey: text("storage_key").notNull(),
  sha256Hash: varchar("sha256_hash", { length: 64 }).notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_doc_versions_document").on(table.documentId),
  index("IDX_doc_versions_parent").on(table.parentVersionId),
]);

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

// ============ PDF PRO - DOCUMENT JOBS ============
export const documentJobs = pgTable("document_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id"),
  matterId: varchar("matter_id"),
  documentId: varchar("document_id").notNull().references(() => pdfDocuments.id, { onDelete: "cascade" }),
  versionId: varchar("version_id"),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("queued"),
  progressPercent: integer("progress_percent").default(0),
  errorMessage: text("error_message"),
  jobParams: jsonb("job_params").default({}),
  resultVersionId: varchar("result_version_id"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
}, (table) => [
  index("IDX_doc_jobs_document").on(table.documentId),
  index("IDX_doc_jobs_status").on(table.status),
  index("IDX_doc_jobs_workspace").on(table.workspaceId),
]);

export type DocumentJob = typeof documentJobs.$inferSelect;
export type InsertDocumentJob = typeof documentJobs.$inferInsert;

// ============ PDF PRO - OCR TEXT ============
export const documentOcrText = pgTable("document_ocr_text", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => pdfDocuments.id, { onDelete: "cascade" }),
  versionId: varchar("version_id"),
  fullText: text("full_text").default(""),
  confidenceSummary: jsonb("confidence_summary").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_doc_ocr_document").on(table.documentId),
]);

export type DocumentOcrText = typeof documentOcrText.$inferSelect;
export type InsertDocumentOcrText = typeof documentOcrText.$inferInsert;

// ============ PDF PRO - BATES SETS ============
export const batesSets = pgTable("bates_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id"),
  matterId: varchar("matter_id"),
  name: varchar("name", { length: 255 }).notNull(),
  prefix: varchar("prefix", { length: 50 }).notNull(),
  padding: integer("padding").default(6),
  nextNumber: integer("next_number").default(1),
  placement: varchar("placement", { length: 50 }).default("bottom-right"),
  fontSize: integer("font_size").default(10),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_bates_sets_workspace").on(table.workspaceId),
  index("IDX_bates_sets_matter").on(table.matterId),
]);

export type BatesSet = typeof batesSets.$inferSelect;
export type InsertBatesSet = typeof batesSets.$inferInsert;

// ============ PDF PRO - BATES RANGES ============
export const batesRanges = pgTable("bates_ranges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batesSetId: varchar("bates_set_id").notNull().references(() => batesSets.id, { onDelete: "cascade" }),
  documentId: varchar("document_id").notNull().references(() => pdfDocuments.id, { onDelete: "cascade" }),
  versionId: varchar("version_id"),
  startNumber: integer("start_number").notNull(),
  endNumber: integer("end_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_bates_ranges_set").on(table.batesSetId),
  index("IDX_bates_ranges_document").on(table.documentId),
]);

export type BatesRange = typeof batesRanges.$inferSelect;
export type InsertBatesRange = typeof batesRanges.$inferInsert;

// ============ PDF PRO - WASH MAPS ============
export const pdfWashMaps = pgTable("pdf_wash_maps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id"),
  matterId: varchar("matter_id"),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  originalValueHash: varchar("original_value_hash", { length: 64 }).notNull(),
  surrogateValue: text("surrogate_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_wash_maps_workspace_matter").on(table.workspaceId, table.matterId),
  index("IDX_wash_maps_hash").on(table.originalValueHash),
]);

export type PdfWashMap = typeof pdfWashMaps.$inferSelect;
export type InsertPdfWashMap = typeof pdfWashMaps.$inferInsert;

// ============ PDF PRO - WASH REPORTS ============
export const pdfWashReports = pgTable("pdf_wash_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id"),
  matterId: varchar("matter_id"),
  documentId: varchar("document_id").notNull().references(() => pdfDocuments.id, { onDelete: "cascade" }),
  versionId: varchar("version_id"),
  policy: varchar("policy", { length: 20 }).default("medium"),
  detections: jsonb("detections").default([]),
  summary: jsonb("summary").default({}),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_wash_reports_document").on(table.documentId),
  index("IDX_wash_reports_workspace").on(table.workspaceId),
]);

export type PdfWashReport = typeof pdfWashReports.$inferSelect;
export type InsertPdfWashReport = typeof pdfWashReports.$inferInsert;

// ============ E-FILING AUTOMATION BRAIN ============

// Jurisdiction profiles - rules configuration per jurisdiction
export const jurisdictionProfiles = pgTable("jurisdiction_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  courtType: varchar("court_type", { length: 50 }).notNull(),
  ruleSet: varchar("rule_set", { length: 100 }).notNull(),
  discoveryResponseDays: integer("discovery_response_days").default(30),
  motionOppositionDays: integer("motion_opposition_days").default(14),
  motionReplyDays: integer("motion_reply_days").default(7),
  initialDisclosureDays: integer("initial_disclosure_days").default(14),
  answerDays: integer("answer_days").default(21),
  mailServiceExtraDays: integer("mail_service_extra_days").default(3),
  electronicServiceExtraDays: integer("electronic_service_extra_days").default(0),
  weekendHolidayAdjust: boolean("weekend_holiday_adjust").default(true),
  holidays: jsonb("holidays").default([]),
  customRules: jsonb("custom_rules").default([]),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type JurisdictionProfile = typeof jurisdictionProfiles.$inferSelect;
export type InsertJurisdictionProfile = typeof jurisdictionProfiles.$inferInsert;

// Deadline rules - reusable IF/THEN rules for deadline computation
export const deadlineRules = pgTable("deadline_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jurisdictionId: varchar("jurisdiction_id").references(() => jurisdictionProfiles.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  triggerDocType: varchar("trigger_doc_type", { length: 100 }).notNull(),
  anchorDateField: varchar("anchor_date_field", { length: 50 }).notNull(),
  offsetDays: integer("offset_days").notNull(),
  offsetDirection: varchar("offset_direction", { length: 10 }).default("after"),
  resultAction: varchar("result_action", { length: 100 }).notNull(),
  resultDocType: varchar("result_doc_type", { length: 100 }),
  criticality: varchar("criticality", { length: 20 }).default("hard"),
  ruleSource: varchar("rule_source", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_deadline_rules_jurisdiction").on(table.jurisdictionId),
  index("IDX_deadline_rules_trigger").on(table.triggerDocType),
]);

export type DeadlineRule = typeof deadlineRules.$inferSelect;
export type InsertDeadlineRule = typeof deadlineRules.$inferInsert;

// Case filings - classified documents ingested into a matter
export const caseFilings = pgTable("case_filings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  fileItemId: varchar("file_item_id").references(() => fileItems.id, { onDelete: "set null" }),
  originalFileName: varchar("original_file_name", { length: 500 }).notNull(),
  filePath: text("file_path").notNull(),
  ocrText: text("ocr_text").default(""),
  docType: varchar("doc_type", { length: 100 }).notNull(),
  docSubtype: varchar("doc_subtype", { length: 100 }),
  docCategory: varchar("doc_category", { length: 50 }),
  classificationConfidence: real("classification_confidence").default(0),
  filedDate: varchar("filed_date", { length: 50 }),
  servedDate: varchar("served_date", { length: 50 }),
  hearingDate: varchar("hearing_date", { length: 50 }),
  responseDeadlineAnchor: varchar("response_deadline_anchor", { length: 50 }),
  partiesInvolved: jsonb("parties_involved").default([]),
  extractedFacts: jsonb("extracted_facts").default({}),
  relatedFilingId: varchar("related_filing_id"),
  filingProof: jsonb("filing_proof").default({}),
  sourceType: varchar("source_type", { length: 50 }).default("manual"),
  sha256Hash: varchar("sha256_hash", { length: 64 }),
  status: varchar("status", { length: 30 }).default("classified"),
  classifiedBy: varchar("classified_by", { length: 20 }).default("ai"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_case_filings_matter").on(table.matterId),
  index("IDX_case_filings_type").on(table.docType),
  index("IDX_case_filings_related").on(table.relatedFilingId),
]);

export type CaseFiling = typeof caseFilings.$inferSelect;
export type InsertCaseFiling = typeof caseFilings.$inferInsert;

// Case deadlines - computed deadlines from filings + rules
export const caseDeadlines = pgTable("case_deadlines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  filingId: varchar("filing_id").references(() => caseFilings.id, { onDelete: "cascade" }),
  ruleId: varchar("rule_id").references(() => deadlineRules.id, { onDelete: "set null" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  dueDate: varchar("due_date", { length: 50 }).notNull(),
  dueTime: varchar("due_time", { length: 20 }),
  anchorEvent: varchar("anchor_event", { length: 255 }),
  anchorDate: varchar("anchor_date", { length: 50 }),
  ruleSource: varchar("rule_source", { length: 100 }),
  criticality: varchar("criticality", { length: 20 }).default("hard"),
  dependsOnDeadlineId: varchar("depends_on_deadline_id"),
  status: varchar("status", { length: 30 }).default("pending"),
  requiredAction: varchar("required_action", { length: 255 }),
  resultDocType: varchar("result_doc_type", { length: 100 }),
  assignedTo: varchar("assigned_to"),
  completedAt: timestamp("completed_at"),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_case_deadlines_matter").on(table.matterId),
  index("IDX_case_deadlines_filing").on(table.filingId),
  index("IDX_case_deadlines_due").on(table.dueDate),
  index("IDX_case_deadlines_status").on(table.status),
]);

export type CaseDeadline = typeof caseDeadlines.$inferSelect;
export type InsertCaseDeadline = typeof caseDeadlines.$inferInsert;

// Case actions - sequenced next-best-actions with status pipeline
export const caseActions = pgTable("case_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  deadlineId: varchar("deadline_id").references(() => caseDeadlines.id, { onDelete: "cascade" }),
  filingId: varchar("filing_id").references(() => caseFilings.id, { onDelete: "set null" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").default(""),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  requiredDocType: varchar("required_doc_type", { length: 100 }),
  templateId: varchar("template_id"),
  status: varchar("status", { length: 30 }).default("draft"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  dueDate: varchar("due_date", { length: 50 }),
  daysRemaining: integer("days_remaining"),
  assignedTo: varchar("assigned_to"),
  dependsOnActionId: varchar("depends_on_action_id"),
  generatedDocPath: text("generated_doc_path"),
  auditTrail: jsonb("audit_trail").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_case_actions_matter").on(table.matterId),
  index("IDX_case_actions_deadline").on(table.deadlineId),
  index("IDX_case_actions_status").on(table.status),
]);

export type CaseAction = typeof caseActions.$inferSelect;
export type InsertCaseAction = typeof caseActions.$inferInsert;

export const draftDocuments = pgTable("draft_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  templateType: varchar("template_type", { length: 100 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).default("draft"),
  linkedFilingId: varchar("linked_filing_id").references(() => caseFilings.id, { onDelete: "set null" }),
  linkedDeadlineId: varchar("linked_deadline_id").references(() => caseDeadlines.id, { onDelete: "set null" }),
  linkedActionId: varchar("linked_action_id").references(() => caseActions.id, { onDelete: "set null" }),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_draft_docs_matter").on(table.matterId),
]);

export type DraftDocument = typeof draftDocuments.$inferSelect;
export type InsertDraftDocument = typeof draftDocuments.$inferInsert;

export const modelIntelligenceEntries = pgTable("model_intelligence_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelId: varchar("model_id", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  capabilities: jsonb("capabilities").default([]),
  license: varchar("license", { length: 100 }),
  parameterSize: varchar("parameter_size", { length: 50 }),
  quantization: varchar("quantization", { length: 50 }),
  contextWindow: integer("context_window").default(0),
  qualityScores: jsonb("quality_scores").default({}),
  tasksRecommended: jsonb("tasks_recommended").default([]),
  replacesModelId: varchar("replaces_model_id"),
  replacedByModelId: varchar("replaced_by_model_id"),
  releasedAt: timestamp("released_at"),
  sourceUrl: varchar("source_url", { length: 500 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_model_intel_model_id").on(table.modelId),
  index("IDX_model_intel_category").on(table.category),
]);

export const modelRecommendations = pgTable("model_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskType: varchar("task_type", { length: 100 }).notNull(),
  modelId: varchar("model_id", { length: 255 }).notNull(),
  rank: integer("rank").default(1),
  reason: text("reason"),
  performanceNotes: text("performance_notes"),
  sizeEfficiency: varchar("size_efficiency", { length: 50 }),
  isCurrentBest: boolean("is_current_best").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_model_rec_task").on(table.taskType),
  index("IDX_model_rec_model").on(table.modelId),
]);

export const modelAlerts = pgTable("model_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  currentModelId: varchar("current_model_id", { length: 255 }),
  suggestedModelId: varchar("suggested_model_id", { length: 255 }).notNull(),
  taskType: varchar("task_type", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("info"),
  isDismissed: boolean("is_dismissed").default(false),
  dismissedBy: varchar("dismissed_by"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_model_alerts_type").on(table.alertType),
  index("IDX_model_alerts_dismissed").on(table.isDismissed),
]);

export type ModelIntelligenceEntry = typeof modelIntelligenceEntries.$inferSelect;
export type InsertModelIntelligenceEntry = typeof modelIntelligenceEntries.$inferInsert;
export type ModelRecommendation = typeof modelRecommendations.$inferSelect;
export type InsertModelRecommendation = typeof modelRecommendations.$inferInsert;
export type ModelAlert = typeof modelAlerts.$inferSelect;
export type InsertModelAlert = typeof modelAlerts.$inferInsert;

// ============ VIDEO PIPELINE JOBS ============
export const videoPipelineJobs = pgTable("video_pipeline_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id"),
  boardId: varchar("board_id"),
  evidenceFileId: varchar("evidence_file_id"),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  currentStage: varchar("current_stage", { length: 50 }).default("validate"),
  progress: integer("progress").default(0),
  config: jsonb("config").default({}),
  stageResults: jsonb("stage_results").default({}),
  rawFrameCount: integer("raw_frame_count").default(0),
  uniqueFrameCount: integer("unique_frame_count").default(0),
  ocrFragments: jsonb("ocr_fragments").default([]),
  stitchedText: text("stitched_text").default(""),
  entities: jsonb("entities").default([]),
  outputPaths: jsonb("output_paths").default({}),
  warnings: jsonb("warnings").default([]),
  error: text("error"),
  totalDuration: real("total_duration"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_video_pipeline_status").on(table.status),
  index("IDX_video_pipeline_matter").on(table.matterId),
  index("IDX_video_pipeline_board").on(table.boardId),
]);

export type VideoPipelineJob = typeof videoPipelineJobs.$inferSelect;
export type InsertVideoPipelineJob = typeof videoPipelineJobs.$inferInsert;

// ============ EMAIL INTELLIGENCE ============

export const analyzedEmails = pgTable("analyzed_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: varchar("subject", { length: 500 }).notNull().default("(No Subject)"),
  sender: varchar("sender", { length: 500 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  senderDomain: varchar("sender_domain", { length: 255 }),
  recipients: jsonb("recipients").default([]),
  cc: jsonb("cc").default([]),
  direction: varchar("direction", { length: 20 }).default("inbound"),
  emailDate: timestamp("email_date"),
  bodyText: text("body_text").default(""),
  bodyPreview: varchar("body_preview", { length: 500 }).default(""),
  attachments: jsonb("attachments").default([]),
  threadId: varchar("thread_id", { length: 255 }),
  urgency: varchar("urgency", { length: 20 }).default("normal"),
  urgencyScore: integer("urgency_score").default(0),
  sentiment: varchar("sentiment", { length: 30 }).default("formal_neutral"),
  sentimentScores: jsonb("sentiment_scores").default({}),
  deceptionFlags: jsonb("deception_flags").default([]),
  deceptionScore: integer("deception_score").default(0),
  datesMentioned: jsonb("dates_mentioned").default([]),
  deadlines: jsonb("deadlines").default([]),
  caseNumbers: jsonb("case_numbers").default([]),
  moneyAmounts: jsonb("money_amounts").default([]),
  isLawyerComm: boolean("is_lawyer_comm").default(false),
  actionItems: jsonb("action_items").default([]),
  keyPhrases: jsonb("key_phrases").default([]),
  psychologicalProfile: jsonb("psychological_profile").default({}),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"),
  matterId: varchar("matter_id"),
  clientId: varchar("client_id"),
  autoLinked: boolean("auto_linked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_analyzed_emails_matter_id").on(table.matterId),
  index("IDX_analyzed_emails_client_id").on(table.clientId),
  index("IDX_analyzed_emails_sender").on(table.sender),
  index("IDX_analyzed_emails_urgency").on(table.urgency),
  index("IDX_analyzed_emails_sentiment").on(table.sentiment),
  index("IDX_analyzed_emails_risk_level").on(table.riskLevel),
  index("IDX_analyzed_emails_email_date").on(table.emailDate),
]);

export type AnalyzedEmail = typeof analyzedEmails.$inferSelect;
export type InsertAnalyzedEmail = typeof analyzedEmails.$inferInsert;

export const adminAlerts = pgTable("admin_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  message: text("message").notNull(),
  triggers: jsonb("triggers").default([]),
  senderName: varchar("sender_name", { length: 255 }),
  senderEmail: varchar("sender_email", { length: 255 }),
  emailSubject: varchar("email_subject", { length: 500 }),
  matterId: varchar("matter_id"),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_admin_alerts_email_id").on(table.emailId),
  index("IDX_admin_alerts_acknowledged").on(table.acknowledged),
  index("IDX_admin_alerts_priority").on(table.priority),
  index("IDX_admin_alerts_matter_id").on(table.matterId),
]);

export type AdminAlert = typeof adminAlerts.$inferSelect;
export type InsertAdminAlert = typeof adminAlerts.$inferInsert;

export const emailContacts = pgTable("email_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  names: jsonb("names").default([]),
  domains: jsonb("domains").default([]),
  isLawyer: boolean("is_lawyer").default(false),
  totalEmails: integer("total_emails").default(0),
  matterIds: jsonb("matter_ids").default([]),
  clientId: varchar("client_id"),
  dominantSentiment: varchar("dominant_sentiment", { length: 30 }),
  avgDeceptionScore: real("avg_deception_score").default(0),
  alertCount: integer("alert_count").default(0),
  riskAssessment: varchar("risk_assessment", { length: 20 }).default("low"),
  behaviorTimeline: jsonb("behavior_timeline").default([]),
  firstSeen: timestamp("first_seen"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_email_contacts_email").on(table.email),
  index("IDX_email_contacts_client_id").on(table.clientId),
  index("IDX_email_contacts_is_lawyer").on(table.isLawyer),
]);

export type EmailContact = typeof emailContacts.$inferSelect;
export type InsertEmailContact = typeof emailContacts.$inferInsert;

// ============ SYNSEEKER INVESTIGATION ENGINE ============

export const investigationStatusEnum = pgEnum('investigation_status', [
  'queued', 'scanning', 'analyzing', 'complete', 'failed', 'archived',
]);

export const findingSeverityEnum = pgEnum('finding_severity', [
  'critical', 'warning', 'info', 'success',
]);

export const entityTypeEnum = pgEnum('entity_type_inv', [
  'company', 'person', 'domain', 'address', 'phone', 'email', 'license', 'case',
]);

export const investigations = pgTable("investigations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id"),
  targetName: text("target_name").notNull(),
  targetDomain: text("target_domain"),
  targetAddress: text("target_address"),
  targetState: text("target_state"),
  sources: jsonb("sources").$type<string[]>().default(['web', 'corp', 'domain', 'legal', 'npi', 'reviews', 'social', 'news']),
  templateId: text("template_id"),
  status: investigationStatusEnum("status").default('queued').notNull(),
  progress: integer("progress").default(0).notNull(),
  scanLog: jsonb("scan_log").$type<Array<{
    timestamp: string;
    source: string;
    action: string;
    result: string;
    message: string;
    dataFound?: boolean;
  }>>().default([]),
  totalFindings: integer("total_findings").default(0).notNull(),
  criticalFlags: integer("critical_flags").default(0).notNull(),
  entityCount: integer("entity_count").default(0).notNull(),
  connectionCount: integer("connection_count").default(0).notNull(),
  aiSummary: text("ai_summary"),
  aiRiskScore: integer("ai_risk_score"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  scanDuration: integer("scan_duration"),
}, (table) => [
  index("idx_investigations_status").on(table.status),
  index("idx_investigations_matter").on(table.matterId),
  index("idx_investigations_created").on(table.createdAt),
]);

export type Investigation = typeof investigations.$inferSelect;
export type InsertInvestigation = typeof investigations.$inferInsert;

export const investigationFindings = pgTable("investigation_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investigationId: varchar("investigation_id").notNull(),
  severity: findingSeverityEnum("severity").notNull(),
  source: text("source").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  rawData: jsonb("raw_data"),
  tags: jsonb("tags").$type<string[]>().default([]),
  url: text("url"),
  screenshot: text("screenshot"),
  aiRelevance: integer("ai_relevance"),
  aiNotes: text("ai_notes"),
  starred: boolean("starred").default(false).notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  userNotes: text("user_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_inv_findings_investigation").on(table.investigationId),
  index("idx_inv_findings_severity").on(table.severity),
]);

export type InvestigationFinding = typeof investigationFindings.$inferSelect;
export type InsertInvestigationFinding = typeof investigationFindings.$inferInsert;

export const discoveredEntities = pgTable("discovered_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investigationId: varchar("investigation_id").notNull(),
  type: entityTypeEnum("type").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  details: jsonb("details"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  state: text("state"),
  sosId: text("sos_id"),
  npi: text("npi"),
  registrar: text("registrar"),
  registrationDate: timestamp("registration_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_disc_entities_investigation").on(table.investigationId),
  index("idx_disc_entities_type").on(table.type),
]);

export type DiscoveredEntity = typeof discoveredEntities.$inferSelect;
export type InsertDiscoveredEntity = typeof discoveredEntities.$inferInsert;

export const entityConnections = pgTable("entity_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investigationId: varchar("investigation_id").notNull(),
  sourceEntityId: varchar("source_entity_id").notNull(),
  targetEntityId: varchar("target_entity_id").notNull(),
  relationship: text("relationship").notNull(),
  strength: text("strength"),
  evidence: text("evidence"),
  severity: findingSeverityEnum("severity"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_entity_connections_investigation").on(table.investigationId),
]);

export type EntityConnection = typeof entityConnections.$inferSelect;
export type InsertEntityConnection = typeof entityConnections.$inferInsert;

// ============ AI EVENT LOGS (Immutable) ============
export const aiEventLogs = pgTable("ai_event_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  matterId: varchar("matter_id", { length: 36 }),
  action: varchar("action", { length: 100 }).notNull(),
  mode: varchar("mode", { length: 20 }).notNull(),
  modelId: varchar("model_id", { length: 100 }).notNull(),
  modelProvider: varchar("model_provider", { length: 50 }).notNull(),
  isExternal: boolean("is_external").notNull().default(false),
  inputDocIds: jsonb("input_doc_ids").$type<string[]>().default([]),
  inputTokenCount: integer("input_token_count"),
  outputTokenCount: integer("output_token_count"),
  promptHash: varchar("prompt_hash", { length: 64 }),
  outputHash: varchar("output_hash", { length: 64 }),
  citations: jsonb("citations").$type<{ docId: string; page?: number; excerpt?: string }[]>().default([]),
  actionsTaken: jsonb("actions_taken").$type<string[]>().default([]),
  piiDetected: boolean("pii_detected").default(false),
  piiRedacted: boolean("pii_redacted").default(false),
  piiEntities: jsonb("pii_entities").$type<string[]>().default([]),
  requestId: varchar("request_id", { length: 36 }),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_event_logs_user").on(table.userId),
  index("idx_ai_event_logs_matter").on(table.matterId),
  index("idx_ai_event_logs_created").on(table.createdAt),
]);

export type AIEventLog = typeof aiEventLogs.$inferSelect;
export type InsertAIEventLog = typeof aiEventLogs.$inferInsert;

// ============ ROLES ============
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ============ MATTER PERMISSIONS ============
export const matterPermissions = pgTable("matter_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  accessLevel: varchar("access_level", { length: 20 }).notNull(),
  grantedBy: varchar("granted_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_matter_permissions_matter").on(table.matterId),
  index("idx_matter_permissions_user").on(table.userId),
]);

export type MatterPermission = typeof matterPermissions.$inferSelect;
export type InsertMatterPermission = typeof matterPermissions.$inferInsert;

// ============ DOCUMENT PERMISSIONS ============
export const documentPermissions = pgTable("document_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 36 }).notNull(),
  privilegeLevel: varchar("privilege_level", { length: 30 }).notNull(),
  restrictedToRoles: jsonb("restricted_to_roles").$type<string[]>().default([]),
  restrictedToUsers: jsonb("restricted_to_users").$type<string[]>().default([]),
  setBy: varchar("set_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_document_permissions_doc").on(table.documentId),
]);

export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type InsertDocumentPermission = typeof documentPermissions.$inferInsert;

// ============ PII POLICIES ============
export const piiPolicies = pgTable("pii_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 36 }),
  enabledEntities: jsonb("enabled_entities").$type<string[]>().default(["SSN", "DOB", "address", "phone", "email", "bank_account", "credit_card", "drivers_license", "passport", "MRN"]),
  defaultAction: varchar("default_action", { length: 20 }).notNull().default("flag"),
  redactBeforeExternalAI: boolean("redact_before_external_ai").notNull().default(true),
  allowPIIInBatmode: boolean("allow_pii_in_batmode").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PIIPolicy = typeof piiPolicies.$inferSelect;
export type InsertPIIPolicy = typeof piiPolicies.$inferInsert;

// ============ CUSTOM FIELD DEFINITIONS ============
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 36 }),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(),
  options: jsonb("options").$type<string[]>(),
  required: boolean("required").default(false),
  validationRegex: varchar("validation_regex", { length: 255 }),
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type InsertCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;

// ============ CUSTOM FIELD VALUES ============
export const customFieldValues = pgTable("custom_field_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldDefinitionId: varchar("field_definition_id", { length: 36 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  value: jsonb("value"),
  updatedBy: varchar("updated_by", { length: 255 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_custom_field_values_entity").on(table.entityId),
  index("idx_custom_field_values_field").on(table.fieldDefinitionId),
]);

export type CustomFieldValue = typeof customFieldValues.$inferSelect;
export type InsertCustomFieldValue = typeof customFieldValues.$inferInsert;

// ============ COURT HOLIDAYS ============
export const courtHolidays = pgTable("court_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jurisdictionId: varchar("jurisdiction_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  recurring: boolean("recurring").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CourtHoliday = typeof courtHolidays.$inferSelect;
export type InsertCourtHoliday = typeof courtHolidays.$inferInsert;

// ============ WORKSPACE BILLING ============
export const workspaceBilling = pgTable("workspace_billing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  plan: varchar("plan", { length: 30 }).notNull().default("starter"),
  seatCount: integer("seat_count").notNull().default(1),
  storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).default(0),
  aiTokensUsedMonth: integer("ai_tokens_used_month").default(0),
  ocrPagesUsedMonth: integer("ocr_pages_used_month").default(0),
  storageLimit: bigint("storage_limit", { mode: "number" }).default(5368709120),
  aiTokenLimit: integer("ai_token_limit").default(100000),
  ocrPageLimit: integer("ocr_page_limit").default(500),
  dataRetentionDays: integer("data_retention_days").default(2555),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WorkspaceBilling = typeof workspaceBilling.$inferSelect;
export type InsertWorkspaceBilling = typeof workspaceBilling.$inferInsert;

// ============ TEXT SNIPPETS ============
export const textSnippets = pgTable("text_snippets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 36 }),
  userId: varchar("user_id", { length: 255 }),
  name: varchar("name", { length: 100 }).notNull(),
  shortcut: varchar("shortcut", { length: 30 }),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }),
  isShared: boolean("is_shared").default(false),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TextSnippet = typeof textSnippets.$inferSelect;
export type InsertTextSnippet = typeof textSnippets.$inferInsert;

// ============ CASE JOURNAL (TraceLogic) ============
export const caseJournals = pgTable("case_journals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  entryType: varchar("entry_type", { length: 50 }).notNull().default("observation"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  privacyLevel: varchar("privacy_level", { length: 30 }).notNull().default("case_team"),
  tags: jsonb("tags").default([]),
  linkedDocIds: jsonb("linked_doc_ids").default([]),
  linkedEntityIds: jsonb("linked_entity_ids").default([]),
  epistemicStatus: varchar("epistemic_status", { length: 30 }).default("provisional"),
  confidenceScore: real("confidence_score").default(0.5),
  flagged: boolean("flagged").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_case_journals_matter_id").on(table.matterId),
  index("IDX_case_journals_author_id").on(table.authorId),
]);

export type CaseJournal = typeof caseJournals.$inferSelect;
export type InsertCaseJournal = typeof caseJournals.$inferInsert;

// ============ CASE OUTCOMES (TraceLogic) ============
export const caseOutcomes = pgTable("case_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  resolution: varchar("resolution", { length: 50 }).notNull(),
  resolutionDate: varchar("resolution_date", { length: 50 }),
  summary: text("summary").notNull(),
  winningArguments: jsonb("winning_arguments").default([]),
  losingArguments: jsonb("losing_arguments").default([]),
  oppositionTactics: jsonb("opposition_tactics").default([]),
  judgeNotes: text("judge_notes").default(""),
  judgeTendencies: jsonb("judge_tendencies").default([]),
  lessonsLearned: jsonb("lessons_learned").default([]),
  keyDocuments: jsonb("key_documents").default([]),
  settlementAmount: real("settlement_amount"),
  awardedAmount: real("awarded_amount"),
  submittedToKb: boolean("submitted_to_kb").default(false),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_case_outcomes_matter_id").on(table.matterId),
]);

export type CaseOutcome = typeof caseOutcomes.$inferSelect;
export type InsertCaseOutcome = typeof caseOutcomes.$inferInsert;

// ============ KNOWLEDGE BASE (TraceLogic) ============
export const knowledgeBaseEntries = pgTable("knowledge_base_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").default([]),
  practiceArea: varchar("practice_area", { length: 100 }),
  sourceMatterId: varchar("source_matter_id"),
  sourceCaseOutcomeId: varchar("source_case_outcome_id"),
  successRate: real("success_rate"),
  usageCount: integer("usage_count").default(0),
  status: varchar("status", { length: 30 }).notNull().default("pending_review"),
  curatedBy: varchar("curated_by", { length: 255 }),
  curatedAt: timestamp("curated_at"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_kb_category").on(table.category),
  index("IDX_kb_status").on(table.status),
]);

export type KnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferSelect;
export type InsertKnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferInsert;

// ============ EVIDENCE VIEWS (TraceLogic) ============
export const evidenceViews = pgTable("evidence_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matterId: varchar("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
  viewType: varchar("view_type", { length: 30 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description").default(""),
  entries: jsonb("entries").default([]),
  metadata: jsonb("metadata").default({}),
  epistemicStatus: varchar("epistemic_status", { length: 30 }).default("descriptive"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_evidence_views_matter_id").on(table.matterId),
  index("IDX_evidence_views_type").on(table.viewType),
]);

export type EvidenceView = typeof evidenceViews.$inferSelect;
export type InsertEvidenceView = typeof evidenceViews.$inferInsert;

// ============ MATTER TEMPLATES ============
export const matterTemplates = pgTable("matter_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  practiceArea: varchar("practice_area", { length: 100 }).notNull(),
  description: text("description"),
  matterType: varchar("matter_type", { length: 100 }),
  defaultGroups: jsonb("default_groups").default([]),
  defaultColumns: jsonb("default_columns").default([]),
  defaultCustomFields: jsonb("default_custom_fields").default([]),
  automationRules: jsonb("automation_rules").default([]),
  documentTemplates: jsonb("document_templates").default([]),
  isBuiltIn: boolean("is_built_in").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MatterTemplate = typeof matterTemplates.$inferSelect;
export type InsertMatterTemplate = typeof matterTemplates.$inferInsert;

// ============ TRUST RECONCILIATION BATCHES ============
export const trustReconciliationBatches = pgTable("trust_reconciliation_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  bankAccountName: varchar("bank_account_name", { length: 255 }).notNull(),
  periodStart: varchar("period_start", { length: 32 }).notNull(),
  periodEnd: varchar("period_end", { length: 32 }).notNull(),
  bankStatementBalance: real("bank_statement_balance").notNull(),
  bookBalance: real("book_balance"),
  clientLedgerTotal: real("client_ledger_total"),
  status: varchar("status", { length: 30 }).default("draft"),
  reconciledAt: timestamp("reconciled_at"),
  reconciledBy: varchar("reconciled_by", { length: 255 }),
  notes: text("notes"),
  unmatchedItems: jsonb("unmatched_items").default([]),
  adjustments: jsonb("adjustments").default([]),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TrustReconciliationBatch = typeof trustReconciliationBatches.$inferSelect;
export type InsertTrustReconciliationBatch = typeof trustReconciliationBatches.$inferInsert;

// ============ BANK STATEMENT ENTRIES ============
export const bankStatementEntries = pgTable("bank_statement_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => trustReconciliationBatches.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 32 }).notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  reference: varchar("reference", { length: 255 }),
  matchedTransactionId: varchar("matched_transaction_id"),
  matchStatus: varchar("match_status", { length: 30 }).default("unmatched"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_bank_entries_batch").on(table.batchId),
]);

export type BankStatementEntry = typeof bankStatementEntries.$inferSelect;
export type InsertBankStatementEntry = typeof bankStatementEntries.$inferInsert;

// ============ CLIENT PORTAL ACCESS ============
export const clientPortalAccess = pgTable("client_portal_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  accessToken: varchar("access_token", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastAccessedAt: timestamp("last_accessed_at"),
  permissions: jsonb("permissions").default(["view_matters", "view_invoices", "messaging", "view_documents"]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_portal_access_client").on(table.clientId),
  index("IDX_portal_access_token").on(table.accessToken),
]);

export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;
export type InsertClientPortalAccess = typeof clientPortalAccess.$inferInsert;

// ============ CLIENT PORTAL MESSAGES ============
export const clientPortalMessages = pgTable("client_portal_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  matterId: varchar("matter_id"),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  senderId: varchar("sender_id", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_portal_messages_client").on(table.clientId),
  index("IDX_portal_messages_matter").on(table.matterId),
]);

export type ClientPortalMessage = typeof clientPortalMessages.$inferSelect;
export type InsertClientPortalMessage = typeof clientPortalMessages.$inferInsert;

// ============ SHARED DOCUMENTS ============
export const sharedDocuments = pgTable("shared_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  matterId: varchar("matter_id"),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size").default(0),
  mimeType: varchar("mime_type", { length: 100 }),
  description: text("description"),
  sharedBy: varchar("shared_by", { length: 255 }).notNull(),
  sharedByName: varchar("shared_by_name", { length: 255 }).notNull(),
  downloadCount: integer("download_count").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_shared_docs_client").on(table.clientId),
]);

export type SharedDocument = typeof sharedDocuments.$inferSelect;
export type InsertSharedDocument = typeof sharedDocuments.$inferInsert;

// ============ E-SIGN ENVELOPES ============
export const esignEnvelopes = pgTable("esign_envelopes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  matterId: varchar("matter_id"),
  clientId: varchar("client_id"),
  documentName: varchar("document_name", { length: 500 }).notNull(),
  status: varchar("status", { length: 30 }).default("draft"),
  message: text("message"),
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EsignEnvelope = typeof esignEnvelopes.$inferSelect;
export type InsertEsignEnvelope = typeof esignEnvelopes.$inferInsert;

// ============ E-SIGN SIGNERS ============
export const esignSigners = pgTable("esign_signers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  envelopeId: varchar("envelope_id").notNull().references(() => esignEnvelopes.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  order: integer("order").default(1),
  status: varchar("status", { length: 30 }).default("pending"),
  signedAt: timestamp("signed_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
  signatureData: text("signature_data"),
  signingToken: varchar("signing_token", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_esign_signers_envelope").on(table.envelopeId),
  index("IDX_esign_signers_token").on(table.signingToken),
]);

export type EsignSigner = typeof esignSigners.$inferSelect;
export type InsertEsignSigner = typeof esignSigners.$inferInsert;

// ============ E-SIGN AUDIT TRAIL ============
export const esignAuditTrail = pgTable("esign_audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  envelopeId: varchar("envelope_id").notNull().references(() => esignEnvelopes.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  actorEmail: varchar("actor_email", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_esign_audit_envelope").on(table.envelopeId),
]);

export type EsignAuditTrailEntry = typeof esignAuditTrail.$inferSelect;
export type InsertEsignAuditTrailEntry = typeof esignAuditTrail.$inferInsert;

// ============ SMS MESSAGES ============
export const smsMessages = pgTable("sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"),
  matterId: varchar("matter_id"),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 30 }).default("sent"),
  twilioSid: varchar("twilio_sid", { length: 255 }),
  sentBy: varchar("sent_by", { length: 255 }),
  sentByName: varchar("sent_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_sms_client").on(table.clientId),
  index("IDX_sms_phone").on(table.phoneNumber),
]);

export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = typeof smsMessages.$inferInsert;

// ============ INTEGRATION CONNECTIONS ============
export const integrationConnections = pgTable("integration_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  accountEmail: varchar("account_email", { length: 255 }),
  status: varchar("status", { length: 30 }).default("connected"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  settings: jsonb("settings").default({}),
  lastSyncAt: timestamp("last_sync_at"),
  syncErrors: jsonb("sync_errors").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_integrations_user").on(table.userId),
  index("IDX_integrations_provider").on(table.provider),
]);

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type InsertIntegrationConnection = typeof integrationConnections.$inferInsert;

// ============ SYNCED EMAILS ============
export const syncedEmails = pgTable("synced_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  matterId: varchar("matter_id"),
  clientId: varchar("client_id"),
  fromAddress: varchar("from_address", { length: 255 }).notNull(),
  toAddresses: text("to_addresses").notNull(),
  ccAddresses: text("cc_addresses"),
  subject: varchar("subject", { length: 500 }),
  bodyPreview: text("body_preview"),
  receivedAt: timestamp("received_at"),
  isRead: boolean("is_read").default(false),
  hasAttachments: boolean("has_attachments").default(false),
  folder: varchar("folder", { length: 100 }),
  linkedMatterId: varchar("linked_matter_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_synced_emails_connection").on(table.connectionId),
  index("IDX_synced_emails_matter").on(table.matterId),
]);

export type SyncedEmail = typeof syncedEmails.$inferSelect;
export type InsertSyncedEmail = typeof syncedEmails.$inferInsert;
