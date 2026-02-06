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
  clientId: varchar("client_id"),
  matterId: varchar("matter_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_boards_client_id").on(table.clientId),
  index("IDX_boards_matter_id").on(table.matterId),
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
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
