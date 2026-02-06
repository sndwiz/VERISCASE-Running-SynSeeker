import { randomUUID } from "crypto";
import type {
  Board,
  Group,
  Task,
  InsertBoard,
  InsertGroup,
  InsertTask,
  ColumnDef,
  AIConversation,
  AIMessage,
  InsertAIConversation,
  InsertAIMessage,
  EvidenceVaultFile,
  InsertEvidenceVaultFile,
  OCRJob,
  InsertOCRJob,
  TimelineEvent,
  InsertTimelineEvent,
  Thread,
  InsertThread,
  ThreadMessage,
  InsertThreadMessage,
  ThreadDecision,
  InsertThreadDecision,
  MatterContact,
  InsertMatterContact,
  Client,
  InsertClient,
  Matter,
  InsertMatter,
  ResearchResult,
  InsertResearchResult,
  AutomationRule,
  InsertAutomationRule,
  AutomationRun,
  DetectiveNode,
  InsertDetectiveNode,
  DetectiveConnection,
  InsertDetectiveConnection,
  FileItem,
  InsertFileItem,
  DocProfile,
  InsertDocProfile,
  FilingTag,
  InsertFilingTag,
  PeopleOrg,
  InsertPeopleOrg,
  FileItemWithProfile,
  TimeEntry,
  InsertTimeEntry,
  CalendarEvent,
  InsertCalendarEvent,
  ApprovalRequest,
  InsertApprovalRequest,
  ApprovalComment,
  InsertApprovalComment,
  DocumentTemplate,
  InsertDocumentTemplate,
  GeneratedDocument,
  InsertGeneratedDocument,
  DocumentApproval,
  InsertDocumentApproval,
  UpdateDocumentApproval,
  DocumentApprovalAudit,
  ClientForm,
  InsertClientForm,
  ClientFormSubmission,
  InsertClientFormSubmission,
  Meeting,
  InsertMeeting,
  AuditLog,
  InsertAuditLog,
  SecurityEvent,
  InsertSecurityEvent,
  Expense,
  InsertExpense,
  Invoice,
  InsertInvoice,
  InvoiceLineItem,
  Payment,
  InsertPayment,
  TrustTransaction,
  InsertTrustTransaction,
} from "@shared/schema";

// Default columns for new boards
const defaultColumns: ColumnDef[] = [
  { id: "status", title: "Status", type: "status", width: 120, visible: true, order: 0 },
  { id: "priority", title: "Priority", type: "priority", width: 100, visible: true, order: 1 },
  { id: "dueDate", title: "Due Date", type: "date", width: 100, visible: true, order: 2 },
  { id: "assignees", title: "Assignee", type: "person", width: 100, visible: true, order: 3 },
  { id: "progress", title: "Progress", type: "progress", width: 120, visible: true, order: 4 },
];

export interface IStorage {
  // Boards
  getBoards(): Promise<Board[]>;
  getBoardsByClient(clientId: string): Promise<Board[]>;
  getBoardsByMatter(matterId: string): Promise<Board[]>;
  getBoard(id: string): Promise<Board | undefined>;
  createBoard(data: InsertBoard): Promise<Board>;
  updateBoard(id: string, data: Partial<Board>): Promise<Board | undefined>;
  deleteBoard(id: string): Promise<boolean>;

  // Groups
  getGroups(boardId: string): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(data: InsertGroup): Promise<Group>;
  updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;

  // Tasks
  getTasks(boardId?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getRecentTasks(limit?: number): Promise<Task[]>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // AI Conversations
  getAIConversations(): Promise<AIConversation[]>;
  getAIConversation(id: string): Promise<AIConversation | undefined>;
  createAIConversation(data: InsertAIConversation): Promise<AIConversation>;
  deleteAIConversation(id: string): Promise<boolean>;
  getAIMessages(conversationId: string): Promise<AIMessage[]>;
  createAIMessage(data: InsertAIMessage): Promise<AIMessage>;

  // Evidence Vault
  getEvidenceVaultFiles(matterId: string): Promise<EvidenceVaultFile[]>;
  getEvidenceVaultFile(id: string): Promise<EvidenceVaultFile | undefined>;
  createEvidenceVaultFile(data: InsertEvidenceVaultFile): Promise<EvidenceVaultFile>;
  updateEvidenceVaultFile(id: string, data: Partial<EvidenceVaultFile>): Promise<EvidenceVaultFile | undefined>;
  addChainOfCustodyEntry(id: string, action: string, by: string, notes?: string): Promise<EvidenceVaultFile | undefined>;

  // OCR Jobs
  getOCRJobs(matterId?: string): Promise<OCRJob[]>;
  getOCRJob(id: string): Promise<OCRJob | undefined>;
  createOCRJob(data: InsertOCRJob): Promise<OCRJob>;
  updateOCRJob(id: string, data: Partial<OCRJob>): Promise<OCRJob | undefined>;

  // Timeline
  getTimelineEvents(matterId: string): Promise<TimelineEvent[]>;
  createTimelineEvent(data: InsertTimelineEvent): Promise<TimelineEvent>;

  // Threads
  getThreads(matterId: string): Promise<Thread[]>;
  getThread(id: string): Promise<Thread | undefined>;
  createThread(data: InsertThread): Promise<Thread>;
  updateThread(id: string, data: Partial<Thread>): Promise<Thread | undefined>;
  getThreadMessages(threadId: string): Promise<ThreadMessage[]>;
  createThreadMessage(data: InsertThreadMessage): Promise<ThreadMessage>;
  getThreadDecisions(threadId: string): Promise<ThreadDecision[]>;
  createThreadDecision(data: InsertThreadDecision): Promise<ThreadDecision>;

  // Contacts
  getMatterContacts(matterId: string): Promise<MatterContact[]>;
  createMatterContact(data: InsertMatterContact): Promise<MatterContact>;
  updateMatterContact(id: string, data: Partial<MatterContact>): Promise<MatterContact | undefined>;
  deleteMatterContact(id: string): Promise<boolean>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Matters
  getMatters(clientId?: string): Promise<Matter[]>;
  getMatter(id: string): Promise<Matter | undefined>;
  createMatter(data: InsertMatter): Promise<Matter>;
  updateMatter(id: string, data: Partial<Matter>): Promise<Matter | undefined>;
  deleteMatter(id: string): Promise<boolean>;

  // Research
  getResearchResults(matterId: string): Promise<ResearchResult[]>;
  createResearchResult(data: InsertResearchResult): Promise<ResearchResult>;
  updateResearchResult(id: string, data: Partial<ResearchResult>): Promise<ResearchResult | undefined>;

  // Automations
  getAutomationRules(boardId: string): Promise<AutomationRule[]>;
  getAutomationRule(id: string): Promise<AutomationRule | undefined>;
  createAutomationRule(data: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: string, data: Partial<AutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: string): Promise<boolean>;
  createAutomationRun(data: Partial<AutomationRun>): Promise<AutomationRun>;

  // Detective Board
  getDetectiveNodes(matterId: string): Promise<DetectiveNode[]>;
  createDetectiveNode(data: InsertDetectiveNode): Promise<DetectiveNode>;
  updateDetectiveNode(id: string, data: Partial<DetectiveNode>): Promise<DetectiveNode | undefined>;
  deleteDetectiveNode(id: string): Promise<boolean>;
  getDetectiveConnections(matterId: string): Promise<DetectiveConnection[]>;
  createDetectiveConnection(data: InsertDetectiveConnection): Promise<DetectiveConnection>;
  updateDetectiveConnection(id: string, data: Partial<DetectiveConnection>): Promise<DetectiveConnection | undefined>;
  deleteDetectiveConnection(id: string): Promise<boolean>;

  // Filing Structure
  getFileItems(matterId: string): Promise<FileItem[]>;
  getFileItem(id: string): Promise<FileItem | undefined>;
  createFileItem(data: InsertFileItem): Promise<FileItem>;
  updateFileItem(id: string, data: Partial<FileItem>): Promise<FileItem | undefined>;
  deleteFileItem(id: string): Promise<boolean>;
  getDocProfile(fileId: string): Promise<DocProfile | undefined>;
  createDocProfile(data: InsertDocProfile): Promise<DocProfile>;
  updateDocProfile(fileId: string, data: Partial<DocProfile>): Promise<DocProfile | undefined>;
  deleteDocProfile(fileId: string): Promise<boolean>;
  getFileItemsWithProfiles(matterId: string): Promise<FileItemWithProfile[]>;
  getFileItemWithProfile(id: string): Promise<FileItemWithProfile | undefined>;
  getFilingTags(): Promise<FilingTag[]>;
  createFilingTag(data: InsertFilingTag): Promise<FilingTag>;
  deleteFilingTag(id: string): Promise<boolean>;
  getFileItemTags(fileId: string): Promise<FilingTag[]>;
  addTagToFileItem(fileId: string, tagId: string): Promise<void>;
  removeTagFromFileItem(fileId: string, tagId: string): Promise<void>;
  getPeopleOrgs(matterId?: string): Promise<PeopleOrg[]>;
  createPeopleOrg(data: InsertPeopleOrg): Promise<PeopleOrg>;
  updatePeopleOrg(id: string, data: Partial<PeopleOrg>): Promise<PeopleOrg | undefined>;
  deletePeopleOrg(id: string): Promise<boolean>;

  // Time Entries
  getTimeEntries(matterId?: string): Promise<TimeEntry[]>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;

  // Expenses
  getExpenses(filters?: { clientId?: string; matterId?: string }): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(data: InsertExpense): Promise<Expense>;
  updateExpense(id: string, data: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Invoices
  getInvoices(filters?: { clientId?: string; matterId?: string }): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;

  // Payments
  getPayments(filters?: { clientId?: string; invoiceId?: string }): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;

  // Trust Transactions
  getTrustTransactions(filters?: { clientId?: string; matterId?: string }): Promise<TrustTransaction[]>;
  createTrustTransaction(data: InsertTrustTransaction): Promise<TrustTransaction>;

  // Calendar Events
  getCalendarEvents(matterId?: string): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: string): Promise<boolean>;

  // Approval Requests
  getApprovalRequests(matterId?: string): Promise<ApprovalRequest[]>;
  getApprovalRequest(id: string): Promise<ApprovalRequest | undefined>;
  createApprovalRequest(data: InsertApprovalRequest): Promise<ApprovalRequest>;
  updateApprovalRequest(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined>;
  deleteApprovalRequest(id: string): Promise<boolean>;
  addApprovalComment(data: InsertApprovalComment): Promise<ApprovalComment>;

  // Document Templates
  getDocumentTemplates(category?: string): Promise<DocumentTemplate[]>;
  getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined>;
  createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate>;
  updateDocumentTemplate(id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate | undefined>;
  deleteDocumentTemplate(id: string): Promise<boolean>;

  // Generated Documents
  getGeneratedDocuments(matterId?: string): Promise<GeneratedDocument[]>;
  getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined>;
  createGeneratedDocument(data: InsertGeneratedDocument): Promise<GeneratedDocument>;
  updateGeneratedDocument(id: string, data: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined>;
  deleteGeneratedDocument(id: string): Promise<boolean>;

  // Document Approvals
  getDocumentApprovals(documentId?: string): Promise<DocumentApproval[]>;
  getDocumentApproval(id: string): Promise<DocumentApproval | undefined>;
  createDocumentApproval(data: InsertDocumentApproval): Promise<DocumentApproval>;
  updateDocumentApproval(id: string, data: UpdateDocumentApproval): Promise<DocumentApproval | undefined>;
  addDocumentApprovalAudit(data: Partial<DocumentApprovalAudit>): Promise<DocumentApprovalAudit>;
  getDocumentApprovalAudit(documentId: string): Promise<DocumentApprovalAudit[]>;

  // Client Forms
  getClientForms(): Promise<ClientForm[]>;
  getClientForm(id: string): Promise<ClientForm | undefined>;
  createClientForm(data: InsertClientForm): Promise<ClientForm>;
  updateClientForm(id: string, data: Partial<ClientForm>): Promise<ClientForm | undefined>;
  deleteClientForm(id: string): Promise<boolean>;
  getClientFormSubmissions(formId?: string): Promise<ClientFormSubmission[]>;
  getClientFormSubmission(id: string): Promise<ClientFormSubmission | undefined>;
  createClientFormSubmission(data: InsertClientFormSubmission): Promise<ClientFormSubmission>;
  updateClientFormSubmission(id: string, data: Partial<ClientFormSubmission>): Promise<ClientFormSubmission | undefined>;

  // Meetings
  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(data: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<boolean>;

  // Audit Logs
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(options?: { userId?: string; action?: string; resourceType?: string; limit?: number; offset?: number }): Promise<AuditLog[]>;
  getAuditLogCount(options?: { userId?: string; action?: string; resourceType?: string }): Promise<number>;

  // Security Events
  createSecurityEvent(data: InsertSecurityEvent): Promise<SecurityEvent>;
  getSecurityEvents(options?: { eventType?: string; severity?: string; resolved?: boolean; limit?: number }): Promise<SecurityEvent[]>;
  resolveSecurityEvent(id: string): Promise<SecurityEvent | undefined>;
}

export class MemStorage implements IStorage {
  private boards: Map<string, Board> = new Map();
  private groups: Map<string, Group> = new Map();
  private tasks: Map<string, Task> = new Map();
  private aiConversations: Map<string, AIConversation> = new Map();
  private aiMessages: Map<string, AIMessage> = new Map();
  private evidenceFiles: Map<string, EvidenceVaultFile> = new Map();
  private ocrJobs: Map<string, OCRJob> = new Map();
  private timelineEvents: Map<string, TimelineEvent> = new Map();
  private threads: Map<string, Thread> = new Map();
  private threadMessages: Map<string, ThreadMessage> = new Map();
  private threadDecisions: Map<string, ThreadDecision> = new Map();
  private matterContacts: Map<string, MatterContact> = new Map();
  private clients: Map<string, Client> = new Map();
  private matters: Map<string, Matter> = new Map();
  private researchResults: Map<string, ResearchResult> = new Map();
  private automationRules: Map<string, AutomationRule> = new Map();
  private automationRuns: Map<string, AutomationRun> = new Map();
  private detectiveNodes: Map<string, DetectiveNode> = new Map();
  private detectiveConnections: Map<string, DetectiveConnection> = new Map();
  private fileItems: Map<string, FileItem> = new Map();
  private docProfiles: Map<string, DocProfile> = new Map();
  private filingTags: Map<string, FilingTag> = new Map();
  private fileTagLinks: Map<string, { fileId: string; tagId: string }> = new Map();
  private peopleOrgs: Map<string, PeopleOrg> = new Map();
  private timeEntries: Map<string, TimeEntry> = new Map();
  private calendarEvents: Map<string, CalendarEvent> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private documentTemplates: Map<string, DocumentTemplate> = new Map();
  private generatedDocuments: Map<string, GeneratedDocument> = new Map();
  private documentApprovals: Map<string, DocumentApproval> = new Map();
  private documentApprovalAudits: Map<string, DocumentApprovalAudit> = new Map();
  private clientForms: Map<string, ClientForm> = new Map();
  private clientFormSubmissions: Map<string, ClientFormSubmission> = new Map();
  private meetingsMap: Map<string, Meeting> = new Map();
  private expenses: Map<string, Expense> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private payments: Map<string, Payment> = new Map();
  private trustTransactions: Map<string, TrustTransaction> = new Map();
  private invoiceCounter: number = 1000;

  constructor() {
    this.initializeSampleData();
    this.initializeUtahTemplates();
  }

  private initializeSampleData() {
    // Create a sample board
    const boardId = randomUUID();
    const board: Board = {
      id: boardId,
      name: "Active Cases",
      description: "Track ongoing legal cases and matters",
      color: "#6366f1",
      icon: "layout-grid",
      columns: [...defaultColumns],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.boards.set(boardId, board);

    // Create sample groups
    const groups = [
      { title: "Discovery", color: "#3b82f6", order: 0 },
      { title: "In Progress", color: "#f59e0b", order: 1 },
      { title: "Under Review", color: "#8b5cf6", order: 2 },
      { title: "Completed", color: "#10b981", order: 3 },
    ];

    const groupIds: string[] = [];
    groups.forEach((g) => {
      const groupId = randomUUID();
      groupIds.push(groupId);
      const group: Group = {
        id: groupId,
        title: g.title,
        color: g.color,
        collapsed: false,
        order: g.order,
        boardId,
      };
      this.groups.set(groupId, group);
    });

    // Create sample tasks
    const sampleTasks = [
      { title: "Review contract for Smith Corp acquisition", status: "working-on-it", priority: "high", groupIdx: 1, progress: 60 },
      { title: "Prepare witness statements", status: "not-started", priority: "medium", groupIdx: 0, progress: 0 },
      { title: "File motion for summary judgment", status: "stuck", priority: "critical", groupIdx: 1, progress: 35 },
      { title: "Client meeting preparation - Johnson case", status: "pending-review", priority: "high", groupIdx: 2, progress: 85 },
      { title: "Research precedent cases for IP dispute", status: "working-on-it", priority: "medium", groupIdx: 0, progress: 45 },
      { title: "Draft settlement agreement", status: "done", priority: "low", groupIdx: 3, progress: 100 },
      { title: "Review discovery documents", status: "not-started", priority: "high", groupIdx: 0, progress: 0 },
      { title: "Finalize court filing documents", status: "working-on-it", priority: "critical", groupIdx: 1, progress: 75 },
    ];

    sampleTasks.forEach((t, idx) => {
      const taskId = randomUUID();
      const task: Task = {
        id: taskId,
        title: t.title,
        description: "",
        status: t.status as any,
        priority: t.priority as any,
        dueDate: null,
        startDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignees: [],
        owner: null,
        progress: t.progress,
        timeEstimate: null,
        timeTracked: 0,
        timeLogs: [],
        files: [],
        boardId,
        groupId: groupIds[t.groupIdx],
        order: idx,
        parentTaskId: null,
        tags: [],
        notes: "",
        lastUpdatedBy: null,
        customFields: {},
      };
      this.tasks.set(taskId, task);
    });

    // Create a second board for documents
    const board2Id = randomUUID();
    const board2: Board = {
      id: board2Id,
      name: "Client Documents",
      description: "Document management and tracking",
      color: "#10b981",
      icon: "file-text",
      columns: [...defaultColumns],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.boards.set(board2Id, board2);

    const docGroupId = randomUUID();
    const docGroup: Group = {
      id: docGroupId,
      title: "Pending Review",
      color: "#f59e0b",
      collapsed: false,
      order: 0,
      boardId: board2Id,
    };
    this.groups.set(docGroupId, docGroup);

    // Create sample clients
    const sampleClients = [
      { name: "Smith Corporation", email: "legal@smithcorp.com", type: "company" as const, industry: "Technology" },
      { name: "Johnson Family Trust", email: "johnson.trust@email.com", type: "individual" as const, industry: "Private" },
      { name: "Metro Development LLC", email: "contracts@metrodev.com", type: "company" as const, industry: "Real Estate" },
    ];

    const clientIds: string[] = [];
    sampleClients.forEach((c) => {
      const clientId = randomUUID();
      clientIds.push(clientId);
      const client: Client = {
        id: clientId,
        name: c.name,
        email: c.email,
        phone: undefined,
        address: undefined,
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.clients.set(clientId, client);
    });

    // Create sample matters
    const sampleMatters = [
      { 
        name: "Smith Corp Acquisition Review", 
        caseNumber: "2026-CORP-001", 
        clientIdx: 0, 
        type: "corporate" as const,
        description: "Review and due diligence for proposed acquisition" 
      },
      { 
        name: "Johnson Estate Planning", 
        caseNumber: "2026-ESTATE-042", 
        clientIdx: 1, 
        type: "estate" as const,
        description: "Comprehensive estate planning and trust administration" 
      },
      { 
        name: "Metro v. City Development Dispute", 
        caseNumber: "2026-LIT-089", 
        clientIdx: 2, 
        type: "litigation" as const,
        description: "Commercial real estate development dispute litigation" 
      },
    ];

    sampleMatters.forEach((m) => {
      const matterId = randomUUID();
      const matter: Matter = {
        id: matterId,
        name: m.name,
        caseNumber: m.caseNumber,
        clientId: clientIds[m.clientIdx],
        matterType: m.type,
        status: "active",
        description: m.description,
        openedDate: new Date().toISOString(),
        practiceArea: m.type,
        assignedAttorneys: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.matters.set(matterId, matter);
    });
  }

  // ============ BOARD METHODS ============
  async getBoards(): Promise<Board[]> {
    return Array.from(this.boards.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async getBoardsByClient(clientId: string): Promise<Board[]> {
    return Array.from(this.boards.values()).filter(b => b.clientId === clientId);
  }

  async getBoardsByMatter(matterId: string): Promise<Board[]> {
    return Array.from(this.boards.values()).filter(b => b.matterId === matterId);
  }

  async getBoard(id: string): Promise<Board | undefined> {
    return this.boards.get(id);
  }

  async createBoard(data: InsertBoard): Promise<Board> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const board: Board = {
      id,
      name: data.name,
      description: data.description || "",
      color: data.color || "#6366f1",
      icon: data.icon || "layout-grid",
      columns: (data.columns as ColumnDef[]) || [...defaultColumns],
      clientId: data.clientId || null,
      matterId: data.matterId || null,
      createdAt: now,
      updatedAt: now,
    };
    this.boards.set(id, board);
    return board;
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board | undefined> {
    const board = this.boards.get(id);
    if (!board) return undefined;
    const updated = { ...board, ...data, updatedAt: new Date().toISOString() };
    this.boards.set(id, updated);
    return updated;
  }

  async deleteBoard(id: string): Promise<boolean> {
    const tasks = Array.from(this.tasks.values()).filter((t) => t.boardId === id);
    tasks.forEach((t) => this.tasks.delete(t.id));
    const groups = Array.from(this.groups.values()).filter((g) => g.boardId === id);
    groups.forEach((g) => this.groups.delete(g.id));
    return this.boards.delete(id);
  }

  // ============ GROUP METHODS ============
  async getGroups(boardId: string): Promise<Group[]> {
    return Array.from(this.groups.values())
      .filter((g) => g.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async createGroup(data: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const existingGroups = await this.getGroups(data.boardId);
    const group: Group = {
      id,
      title: data.title,
      color: data.color || "#6366f1",
      collapsed: data.collapsed || false,
      order: data.order ?? existingGroups.length,
      boardId: data.boardId,
    };
    this.groups.set(id, group);
    return group;
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    const updated = { ...group, ...data };
    this.groups.set(id, updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const tasks = Array.from(this.tasks.values()).filter((t) => t.groupId === id);
    tasks.forEach((t) => this.tasks.delete(t.id));
    return this.groups.delete(id);
  }

  // ============ TASK METHODS ============
  async getTasks(boardId?: string): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());
    if (boardId) {
      tasks = tasks.filter((t) => t.boardId === boardId);
    }
    return tasks.sort((a, b) => a.order - b.order);
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getRecentTasks(limit: number = 10): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  async createTask(data: InsertTask): Promise<Task> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const existingTasks = await this.getTasks(data.boardId);
    const task: Task = {
      id,
      title: data.title,
      description: data.description || "",
      status: data.status || "not-started",
      priority: data.priority || "medium",
      dueDate: data.dueDate || null,
      startDate: data.startDate || null,
      createdAt: now,
      updatedAt: now,
      assignees: data.assignees || [],
      owner: data.owner || null,
      progress: data.progress || 0,
      timeEstimate: data.timeEstimate || null,
      timeTracked: 0,
      timeLogs: [],
      files: [],
      boardId: data.boardId,
      groupId: data.groupId,
      order: existingTasks.length,
      parentTaskId: data.parentTaskId || null,
      tags: data.tags || [],
      notes: data.notes || "",
      lastUpdatedBy: null,
      customFields: data.customFields || {},
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...data, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // ============ AI CONVERSATION METHODS ============
  async getAIConversations(): Promise<AIConversation[]> {
    return Array.from(this.aiConversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getAIConversation(id: string): Promise<AIConversation | undefined> {
    return this.aiConversations.get(id);
  }

  async createAIConversation(data: InsertAIConversation): Promise<AIConversation> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const conversation: AIConversation = {
      id,
      title: data.title,
      provider: data.provider || "anthropic",
      model: data.model || "claude-sonnet-4-5",
      matterId: data.matterId,
      boardId: data.boardId,
      createdAt: now,
      updatedAt: now,
    };
    this.aiConversations.set(id, conversation);
    return conversation;
  }

  async deleteAIConversation(id: string): Promise<boolean> {
    // Delete associated messages
    const messages = Array.from(this.aiMessages.values()).filter((m) => m.conversationId === id);
    messages.forEach((m) => this.aiMessages.delete(m.id));
    return this.aiConversations.delete(id);
  }

  async getAIMessages(conversationId: string): Promise<AIMessage[]> {
    return Array.from(this.aiMessages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createAIMessage(data: InsertAIMessage): Promise<AIMessage> {
    const id = randomUUID();
    const message: AIMessage = {
      id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      attachments: data.attachments,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
    };
    this.aiMessages.set(id, message);
    // Update conversation updatedAt
    const conv = this.aiConversations.get(data.conversationId);
    if (conv) {
      this.aiConversations.set(data.conversationId, { ...conv, updatedAt: new Date().toISOString() });
    }
    return message;
  }

  // ============ EVIDENCE VAULT METHODS ============
  async getEvidenceVaultFiles(matterId: string): Promise<EvidenceVaultFile[]> {
    return Array.from(this.evidenceFiles.values()).filter((f) => f.matterId === matterId);
  }

  async getEvidenceVaultFile(id: string): Promise<EvidenceVaultFile | undefined> {
    return this.evidenceFiles.get(id);
  }

  async createEvidenceVaultFile(data: InsertEvidenceVaultFile): Promise<EvidenceVaultFile> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const file: EvidenceVaultFile = {
      id,
      matterId: data.matterId,
      originalName: data.originalName,
      originalUrl: data.originalUrl,
      originalHash: data.originalHash,
      originalSize: data.originalSize,
      originalMimeType: data.originalMimeType,
      evidenceType: data.evidenceType || "document",
      confidentiality: data.confidentiality || "confidential",
      description: data.description || "",
      tags: data.tags || [],
      uploadedBy: data.uploadedBy,
      uploadedAt: now,
      chainOfCustody: [{ action: "uploaded", by: data.uploadedBy, at: now }],
      metadata: {},
    };
    this.evidenceFiles.set(id, file);
    return file;
  }

  async updateEvidenceVaultFile(id: string, data: Partial<EvidenceVaultFile>): Promise<EvidenceVaultFile | undefined> {
    const file = this.evidenceFiles.get(id);
    if (!file) return undefined;
    // IMMUTABLE ENFORCEMENT: Prevent modification of original content fields
    // Only allow updating metadata, tags, description, analysis, and append to chain of custody
    const safeUpdate: Partial<EvidenceVaultFile> = {};
    if (data.evidenceType !== undefined) safeUpdate.evidenceType = data.evidenceType;
    if (data.confidentiality !== undefined) safeUpdate.confidentiality = data.confidentiality;
    if (data.description !== undefined) safeUpdate.description = data.description;
    if (data.tags !== undefined) safeUpdate.tags = data.tags;
    if (data.extractedText !== undefined) safeUpdate.extractedText = data.extractedText;
    if (data.aiAnalysis !== undefined) safeUpdate.aiAnalysis = data.aiAnalysis;
    if (data.ocrJobId !== undefined) safeUpdate.ocrJobId = data.ocrJobId;
    if (data.metadata !== undefined) safeUpdate.metadata = { ...file.metadata, ...data.metadata };
    
    const updated = { ...file, ...safeUpdate };
    this.evidenceFiles.set(id, updated);
    return updated;
  }

  async addChainOfCustodyEntry(id: string, action: string, by: string, notes?: string): Promise<EvidenceVaultFile | undefined> {
    const file = this.evidenceFiles.get(id);
    if (!file) return undefined;
    const entry = { action, by, at: new Date().toISOString(), notes };
    const updated = {
      ...file,
      chainOfCustody: [...file.chainOfCustody, entry],
    };
    this.evidenceFiles.set(id, updated);
    return updated;
  }

  // ============ OCR JOB METHODS ============
  async getOCRJobs(matterId?: string): Promise<OCRJob[]> {
    let jobs = Array.from(this.ocrJobs.values());
    if (matterId) {
      jobs = jobs.filter((j) => j.matterId === matterId);
    }
    return jobs;
  }

  async getOCRJob(id: string): Promise<OCRJob | undefined> {
    return this.ocrJobs.get(id);
  }

  async createOCRJob(data: InsertOCRJob): Promise<OCRJob> {
    const id = randomUUID();
    const job: OCRJob = {
      id,
      fileId: data.fileId,
      matterId: data.matterId,
      status: "pending",
      provider: data.provider || "openai-vision",
      createdAt: new Date().toISOString(),
    };
    this.ocrJobs.set(id, job);
    return job;
  }

  async updateOCRJob(id: string, data: Partial<OCRJob>): Promise<OCRJob | undefined> {
    const job = this.ocrJobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...data };
    this.ocrJobs.set(id, updated);
    return updated;
  }

  // ============ TIMELINE METHODS ============
  async getTimelineEvents(matterId: string): Promise<TimelineEvent[]> {
    return Array.from(this.timelineEvents.values())
      .filter((e) => e.matterId === matterId)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  async createTimelineEvent(data: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = randomUUID();
    const event: TimelineEvent = {
      id,
      matterId: data.matterId,
      eventType: data.eventType,
      title: data.title,
      description: data.description || "",
      linkedFileId: data.linkedFileId,
      linkedTaskId: data.linkedTaskId,
      linkedThreadId: data.linkedThreadId,
      createdBy: data.createdBy,
      eventDate: data.eventDate,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {},
    };
    this.timelineEvents.set(id, event);
    return event;
  }

  // ============ THREAD METHODS ============
  async getThreads(matterId: string): Promise<Thread[]> {
    return Array.from(this.threads.values()).filter((t) => t.matterId === matterId);
  }

  async getThread(id: string): Promise<Thread | undefined> {
    return this.threads.get(id);
  }

  async createThread(data: InsertThread): Promise<Thread> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const thread: Thread = {
      id,
      matterId: data.matterId,
      subject: data.subject,
      participants: data.participants || [],
      status: "open",
      priority: data.priority || "medium",
      linkedFiles: data.linkedFiles || [],
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.threads.set(id, thread);
    return thread;
  }

  async updateThread(id: string, data: Partial<Thread>): Promise<Thread | undefined> {
    const thread = this.threads.get(id);
    if (!thread) return undefined;
    const updated = { ...thread, ...data, updatedAt: new Date().toISOString() };
    this.threads.set(id, updated);
    return updated;
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    return Array.from(this.threadMessages.values())
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createThreadMessage(data: InsertThreadMessage): Promise<ThreadMessage> {
    const id = randomUUID();
    const message: ThreadMessage = {
      id,
      threadId: data.threadId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date().toISOString(),
    };
    this.threadMessages.set(id, message);
    return message;
  }

  async getThreadDecisions(threadId: string): Promise<ThreadDecision[]> {
    return Array.from(this.threadDecisions.values()).filter((d) => d.threadId === threadId);
  }

  async createThreadDecision(data: InsertThreadDecision): Promise<ThreadDecision> {
    const id = randomUUID();
    const decision: ThreadDecision = {
      id,
      threadId: data.threadId,
      messageId: data.messageId,
      decision: data.decision,
      madeBy: data.madeBy,
      madeAt: new Date().toISOString(),
      status: "pending",
    };
    this.threadDecisions.set(id, decision);
    return decision;
  }

  // ============ CONTACT METHODS ============
  async getMatterContacts(matterId: string): Promise<MatterContact[]> {
    return Array.from(this.matterContacts.values()).filter((c) => c.matterId === matterId);
  }

  async createMatterContact(data: InsertMatterContact): Promise<MatterContact> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const contact: MatterContact = {
      id,
      matterId: data.matterId,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };
    this.matterContacts.set(id, contact);
    return contact;
  }

  async updateMatterContact(id: string, data: Partial<MatterContact>): Promise<MatterContact | undefined> {
    const contact = this.matterContacts.get(id);
    if (!contact) return undefined;
    const updated = { ...contact, ...data, updatedAt: new Date().toISOString() };
    this.matterContacts.set(id, updated);
    return updated;
  }

  async deleteMatterContact(id: string): Promise<boolean> {
    return this.matterContacts.delete(id);
  }

  // ============ CLIENT METHODS ============
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(data: InsertClient): Promise<Client> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const client: Client = {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    const updated = { ...client, ...data, updatedAt: new Date().toISOString() };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // ============ MATTER METHODS ============
  async getMatters(clientId?: string): Promise<Matter[]> {
    let matters = Array.from(this.matters.values());
    if (clientId) {
      matters = matters.filter((m) => m.clientId === clientId);
    }
    return matters;
  }

  async getMatter(id: string): Promise<Matter | undefined> {
    return this.matters.get(id);
  }

  async createMatter(data: InsertMatter): Promise<Matter> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const matter: Matter = {
      id,
      clientId: data.clientId,
      name: data.name,
      caseNumber: data.caseNumber,
      matterType: data.matterType,
      status: data.status || "active",
      description: data.description || "",
      openedDate: data.openedDate,
      assignedAttorneys: [],
      practiceArea: data.practiceArea,
      courtName: data.courtName,
      judgeAssigned: data.judgeAssigned,
      opposingCounsel: data.opposingCounsel,
      createdAt: now,
      updatedAt: now,
    };
    this.matters.set(id, matter);
    return matter;
  }

  async updateMatter(id: string, data: Partial<Matter>): Promise<Matter | undefined> {
    const matter = this.matters.get(id);
    if (!matter) return undefined;
    const updated = { ...matter, ...data, updatedAt: new Date().toISOString() };
    this.matters.set(id, updated);
    return updated;
  }

  async deleteMatter(id: string): Promise<boolean> {
    return this.matters.delete(id);
  }

  // ============ RESEARCH METHODS ============
  async getResearchResults(matterId: string): Promise<ResearchResult[]> {
    return Array.from(this.researchResults.values()).filter((r) => r.matterId === matterId);
  }

  async createResearchResult(data: InsertResearchResult): Promise<ResearchResult> {
    const id = randomUUID();
    const result: ResearchResult = {
      id,
      matterId: data.matterId,
      query: data.query,
      source: data.source,
      citation: data.citation,
      summary: data.summary,
      relevance: data.relevance || 50,
      notes: data.notes || "",
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.researchResults.set(id, result);
    return result;
  }

  async updateResearchResult(id: string, data: Partial<ResearchResult>): Promise<ResearchResult | undefined> {
    const result = this.researchResults.get(id);
    if (!result) return undefined;
    const updated = { ...result, ...data };
    this.researchResults.set(id, updated);
    return updated;
  }

  // ============ AUTOMATION METHODS ============
  async getAutomationRules(boardId: string): Promise<AutomationRule[]> {
    return Array.from(this.automationRules.values()).filter((r) => r.boardId === boardId);
  }

  async getAutomationRule(id: string): Promise<AutomationRule | undefined> {
    return this.automationRules.get(id);
  }

  async createAutomationRule(data: InsertAutomationRule): Promise<AutomationRule> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const rule: AutomationRule = {
      id,
      boardId: data.boardId,
      name: data.name,
      description: data.description || "",
      isActive: data.isActive ?? true,
      triggerType: data.triggerType,
      triggerField: data.triggerField,
      triggerValue: data.triggerValue,
      conditions: (data.conditions || []).map(c => ({ ...c, value: c.value ?? null })),
      actionType: data.actionType,
      actionConfig: data.actionConfig,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.automationRules.set(id, rule);
    return rule;
  }

  async updateAutomationRule(id: string, data: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const rule = this.automationRules.get(id);
    if (!rule) return undefined;
    const updated = { ...rule, ...data, updatedAt: new Date().toISOString() };
    this.automationRules.set(id, updated);
    return updated;
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    return this.automationRules.delete(id);
  }

  async createAutomationRun(data: Partial<AutomationRun>): Promise<AutomationRun> {
    const id = randomUUID();
    const run: AutomationRun = {
      id,
      ruleId: data.ruleId || "",
      taskId: data.taskId,
      triggerData: data.triggerData || {},
      actionResult: data.actionResult || {},
      status: data.status || "pending",
      error: data.error,
      executedAt: new Date().toISOString(),
      completedAt: data.completedAt,
    };
    this.automationRuns.set(id, run);
    return run;
  }

  // ============ DETECTIVE BOARD METHODS ============
  async getDetectiveNodes(matterId: string): Promise<DetectiveNode[]> {
    return Array.from(this.detectiveNodes.values()).filter((n) => n.matterId === matterId);
  }

  async createDetectiveNode(data: InsertDetectiveNode): Promise<DetectiveNode> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const node: DetectiveNode = {
      id,
      matterId: data.matterId,
      type: data.type,
      title: data.title,
      description: data.description || "",
      linkedEvidenceId: data.linkedEvidenceId,
      linkedContactId: data.linkedContactId,
      position: data.position,
      color: data.color || "#6366f1",
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
    };
    this.detectiveNodes.set(id, node);
    return node;
  }

  async updateDetectiveNode(id: string, data: Partial<DetectiveNode>): Promise<DetectiveNode | undefined> {
    const node = this.detectiveNodes.get(id);
    if (!node) return undefined;
    const updated = { ...node, ...data, updatedAt: new Date().toISOString() };
    this.detectiveNodes.set(id, updated);
    return updated;
  }

  async deleteDetectiveNode(id: string): Promise<boolean> {
    // Also delete connections involving this node
    const connections = Array.from(this.detectiveConnections.values()).filter(
      (c) => c.sourceNodeId === id || c.targetNodeId === id
    );
    connections.forEach((c) => this.detectiveConnections.delete(c.id));
    return this.detectiveNodes.delete(id);
  }

  async getDetectiveConnections(matterId: string): Promise<DetectiveConnection[]> {
    return Array.from(this.detectiveConnections.values()).filter((c) => c.matterId === matterId);
  }

  async createDetectiveConnection(data: InsertDetectiveConnection): Promise<DetectiveConnection> {
    const id = randomUUID();
    const connection: DetectiveConnection = {
      id,
      matterId: data.matterId,
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      label: data.label || "",
      connectionType: data.connectionType,
      strength: data.strength || 3,
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
    };
    this.detectiveConnections.set(id, connection);
    return connection;
  }

  async updateDetectiveConnection(id: string, data: Partial<DetectiveConnection>): Promise<DetectiveConnection | undefined> {
    const connection = this.detectiveConnections.get(id);
    if (!connection) return undefined;
    const updated = { ...connection, ...data };
    this.detectiveConnections.set(id, updated);
    return updated;
  }

  async deleteDetectiveConnection(id: string): Promise<boolean> {
    return this.detectiveConnections.delete(id);
  }

  // Filing Structure - MemStorage stubs (DbStorage is used in production)
  async getFileItems(matterId: string): Promise<FileItem[]> {
    return Array.from(this.fileItems.values()).filter(f => f.matterId === matterId);
  }

  async getFileItem(id: string): Promise<FileItem | undefined> {
    return this.fileItems.get(id);
  }

  async createFileItem(data: InsertFileItem): Promise<FileItem> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const file: FileItem = {
      id,
      matterId: data.matterId,
      serverPath: data.serverPath,
      fileName: data.fileName,
      extension: data.extension,
      sizeBytes: data.sizeBytes || 0,
      hashSha256: data.hashSha256,
      isEmail: data.isEmail || false,
      isAttachment: data.isAttachment || false,
      parentFileId: data.parentFileId,
      confidentiality: data.confidentiality || "confidential",
      ingestedUtc: now,
    };
    this.fileItems.set(id, file);
    return file;
  }

  async updateFileItem(id: string, data: Partial<FileItem>): Promise<FileItem | undefined> {
    const file = this.fileItems.get(id);
    if (!file) return undefined;
    const updated = { ...file, ...data };
    this.fileItems.set(id, updated);
    return updated;
  }

  async deleteFileItem(id: string): Promise<boolean> {
    return this.fileItems.delete(id);
  }

  async getDocProfile(fileId: string): Promise<DocProfile | undefined> {
    return Array.from(this.docProfiles.values()).find(p => p.fileId === fileId);
  }

  async createDocProfile(data: InsertDocProfile): Promise<DocProfile> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const profile: DocProfile = {
      id,
      fileId: data.fileId,
      docCategory: data.docCategory,
      docType: data.docType,
      docRole: data.docRole || "primary",
      captionTitle: data.captionTitle,
      party: data.party,
      author: data.author,
      recipient: data.recipient,
      serviceDate: data.serviceDate,
      filingDate: data.filingDate,
      hearingDate: data.hearingDate,
      docketNumber: data.docketNumber,
      version: data.version || "final",
      status: data.status || "draft",
      privilegeBasis: data.privilegeBasis,
      productionId: data.productionId,
      batesRange: data.batesRange,
      createdAt: now,
      updatedAt: now,
    };
    this.docProfiles.set(id, profile);
    return profile;
  }

  async updateDocProfile(fileId: string, data: Partial<DocProfile>): Promise<DocProfile | undefined> {
    const profile = Array.from(this.docProfiles.values()).find(p => p.fileId === fileId);
    if (!profile) return undefined;
    const updated = { ...profile, ...data, updatedAt: new Date().toISOString() };
    this.docProfiles.set(profile.id, updated);
    return updated;
  }

  async deleteDocProfile(fileId: string): Promise<boolean> {
    const profile = Array.from(this.docProfiles.values()).find(p => p.fileId === fileId);
    if (!profile) return false;
    return this.docProfiles.delete(profile.id);
  }

  async getFileItemsWithProfiles(matterId: string): Promise<FileItemWithProfile[]> {
    const files = await this.getFileItems(matterId);
    const result: FileItemWithProfile[] = [];
    for (const file of files) {
      const profile = await this.getDocProfile(file.id);
      const tags = await this.getFileItemTags(file.id);
      result.push({ ...file, profile, tags });
    }
    return result;
  }

  async getFileItemWithProfile(id: string): Promise<FileItemWithProfile | undefined> {
    const file = await this.getFileItem(id);
    if (!file) return undefined;
    const profile = await this.getDocProfile(file.id);
    const tags = await this.getFileItemTags(file.id);
    return { ...file, profile, tags };
  }

  async getFilingTags(): Promise<FilingTag[]> {
    return Array.from(this.filingTags.values());
  }

  async createFilingTag(data: InsertFilingTag): Promise<FilingTag> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const tag: FilingTag = {
      id,
      name: data.name,
      color: data.color || "#6366f1",
      createdAt: now,
    };
    this.filingTags.set(id, tag);
    return tag;
  }

  async deleteFilingTag(id: string): Promise<boolean> {
    return this.filingTags.delete(id);
  }

  async getFileItemTags(fileId: string): Promise<FilingTag[]> {
    const links = Array.from(this.fileTagLinks.values()).filter(l => l.fileId === fileId);
    return links.map(l => this.filingTags.get(l.tagId)).filter((t): t is FilingTag => !!t);
  }

  async addTagToFileItem(fileId: string, tagId: string): Promise<void> {
    const key = `${fileId}-${tagId}`;
    this.fileTagLinks.set(key, { fileId, tagId });
  }

  async removeTagFromFileItem(fileId: string, tagId: string): Promise<void> {
    const key = `${fileId}-${tagId}`;
    this.fileTagLinks.delete(key);
  }

  async getPeopleOrgs(matterId?: string): Promise<PeopleOrg[]> {
    const all = Array.from(this.peopleOrgs.values());
    return matterId ? all.filter(p => p.matterId === matterId) : all;
  }

  async createPeopleOrg(data: InsertPeopleOrg): Promise<PeopleOrg> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const entity: PeopleOrg = {
      id,
      matterId: data.matterId,
      name: data.name,
      entityType: data.entityType,
      role: data.role,
      email: data.email,
      phone: data.phone,
      company: data.company,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };
    this.peopleOrgs.set(id, entity);
    return entity;
  }

  async updatePeopleOrg(id: string, data: Partial<PeopleOrg>): Promise<PeopleOrg | undefined> {
    const entity = this.peopleOrgs.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data, updatedAt: new Date().toISOString() };
    this.peopleOrgs.set(id, updated);
    return updated;
  }

  async deletePeopleOrg(id: string): Promise<boolean> {
    return this.peopleOrgs.delete(id);
  }

  // Time Entries
  async getTimeEntries(matterId?: string): Promise<TimeEntry[]> {
    const all = Array.from(this.timeEntries.values());
    return matterId ? all.filter(e => e.matterId === matterId) : all;
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const entry: TimeEntry = {
      id,
      matterId: data.matterId,
      taskId: data.taskId,
      userId: data.userId,
      userName: data.userName,
      date: data.date,
      hours: data.hours,
      description: data.description,
      billableStatus: data.billableStatus || "billable",
      hourlyRate: data.hourlyRate,
      activityCode: data.activityCode,
      createdAt: now,
      updatedAt: now,
    };
    this.timeEntries.set(id, entry);
    return entry;
  }

  async updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const entry = this.timeEntries.get(id);
    if (!entry) return undefined;
    const updated = { ...entry, ...data, updatedAt: new Date().toISOString() };
    this.timeEntries.set(id, updated);
    return updated;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  // Expenses
  async getExpenses(filters?: { clientId?: string; matterId?: string }): Promise<Expense[]> {
    let all = Array.from(this.expenses.values());
    if (filters?.clientId) all = all.filter(e => e.clientId === filters.clientId);
    if (filters?.matterId) all = all.filter(e => e.matterId === filters.matterId);
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const expense: Expense = {
      id,
      matterId: data.matterId,
      clientId: data.clientId,
      date: data.date,
      amount: data.amount,
      description: data.description,
      category: data.category,
      billable: data.billable ?? true,
      reimbursable: data.reimbursable ?? false,
      vendor: data.vendor,
      receiptUrl: data.receiptUrl,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    const updated = { ...expense, ...data, updatedAt: new Date().toISOString() };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Invoices
  async getInvoices(filters?: { clientId?: string; matterId?: string }): Promise<Invoice[]> {
    let all = Array.from(this.invoices.values());
    if (filters?.clientId) all = all.filter(i => i.clientId === filters.clientId);
    if (filters?.matterId) all = all.filter(i => i.matterId === filters.matterId);
    return all.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.invoiceCounter++;
    const invoice: Invoice = {
      id,
      invoiceNumber: `INV-${this.invoiceCounter}`,
      clientId: data.clientId,
      matterId: data.matterId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      status: data.status || "draft",
      lineItems: data.lineItems || [],
      subtotal: data.subtotal || 0,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount || 0,
      paidAmount: data.paidAmount || 0,
      balanceDue: data.balanceDue || 0,
      notes: data.notes,
      paymentTerms: data.paymentTerms,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    const updated = { ...invoice, ...data, updatedAt: new Date().toISOString() };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // Payments
  async getPayments(filters?: { clientId?: string; invoiceId?: string }): Promise<Payment[]> {
    let all = Array.from(this.payments.values());
    if (filters?.clientId) all = all.filter(p => p.clientId === filters.clientId);
    if (filters?.invoiceId) all = all.filter(p => p.invoiceId === filters.invoiceId);
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const payment: Payment = {
      id,
      invoiceId: data.invoiceId,
      clientId: data.clientId,
      date: data.date,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: now,
    };
    this.payments.set(id, payment);
    return payment;
  }

  // Trust Transactions
  async getTrustTransactions(filters?: { clientId?: string; matterId?: string }): Promise<TrustTransaction[]> {
    let all = Array.from(this.trustTransactions.values());
    if (filters?.clientId) all = all.filter(t => t.clientId === filters.clientId);
    if (filters?.matterId) all = all.filter(t => t.matterId === filters.matterId);
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createTrustTransaction(data: InsertTrustTransaction): Promise<TrustTransaction> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const transaction: TrustTransaction = {
      id,
      clientId: data.clientId,
      matterId: data.matterId,
      date: data.date,
      amount: data.amount,
      type: data.type,
      description: data.description,
      reference: data.reference,
      runningBalance: data.runningBalance || 0,
      createdBy: data.createdBy,
      createdAt: now,
    };
    this.trustTransactions.set(id, transaction);
    return transaction;
  }

  // Calendar Events
  async getCalendarEvents(matterId?: string): Promise<CalendarEvent[]> {
    const all = Array.from(this.calendarEvents.values());
    return matterId ? all.filter(e => e.matterId === matterId) : all;
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const event: CalendarEvent = {
      id,
      matterId: data.matterId,
      taskId: data.taskId,
      title: data.title,
      description: data.description || "",
      eventType: data.eventType,
      startDate: data.startDate,
      endDate: data.endDate,
      allDay: data.allDay || false,
      location: data.location,
      attendees: data.attendees || [],
      reminderMinutes: data.reminderMinutes,
      color: data.color,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.calendarEvents.set(id, event);
    return event;
  }

  async updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const event = this.calendarEvents.get(id);
    if (!event) return undefined;
    const updated = { ...event, ...data, updatedAt: new Date().toISOString() };
    this.calendarEvents.set(id, updated);
    return updated;
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }

  // Approval Requests
  async getApprovalRequests(matterId?: string): Promise<ApprovalRequest[]> {
    const all = Array.from(this.approvalRequests.values());
    return matterId ? all.filter(r => r.matterId === matterId) : all;
  }

  async getApprovalRequest(id: string): Promise<ApprovalRequest | undefined> {
    return this.approvalRequests.get(id);
  }

  async createApprovalRequest(data: InsertApprovalRequest): Promise<ApprovalRequest> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const request: ApprovalRequest = {
      id,
      fileId: data.fileId,
      matterId: data.matterId,
      title: data.title,
      description: data.description || "",
      requestedBy: data.requestedBy,
      requestedByName: data.requestedByName,
      assignedTo: data.assignedTo,
      status: "pending",
      dueDate: data.dueDate,
      priority: data.priority || "medium",
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    this.approvalRequests.set(id, request);
    return request;
  }

  async updateApprovalRequest(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const request = this.approvalRequests.get(id);
    if (!request) return undefined;
    const updated = { ...request, ...data, updatedAt: new Date().toISOString() };
    this.approvalRequests.set(id, updated);
    return updated;
  }

  async deleteApprovalRequest(id: string): Promise<boolean> {
    return this.approvalRequests.delete(id);
  }

  async addApprovalComment(data: InsertApprovalComment): Promise<ApprovalComment> {
    const request = this.approvalRequests.get(data.approvalId);
    if (!request) throw new Error("Approval request not found");
    
    const comment: ApprovalComment = {
      id: randomUUID(),
      userId: data.userId,
      userName: data.userName,
      content: data.content,
      decision: data.decision,
      createdAt: new Date().toISOString(),
    };
    
    request.comments.push(comment);
    if (data.decision) {
      request.status = data.decision === "approved" ? "approved" : 
                       data.decision === "rejected" ? "rejected" : "vetting";
    }
    request.updatedAt = new Date().toISOString();
    this.approvalRequests.set(data.approvalId, request);
    
    return comment;
  }

  // ============ DOCUMENT TEMPLATES ============
  
  private initializeUtahTemplates() {
    const utahFormatDefaults = {
      paperSize: "8.5x11" as const,
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
      fontSize: 12,
      fontFamily: "Times New Roman",
      lineSpacing: "double" as const,
      requiresCaption: true,
      requiresCertificateOfService: true,
      requiresSignatureBlock: true,
      requiresBilingualNotice: true,
    };

    // Motion for Continuance
    const motionContinuance: DocumentTemplate = {
      id: "tpl-motion-continuance",
      name: "Motion for Continuance",
      description: "Request to postpone a scheduled hearing, trial, or deadline in Utah courts",
      category: "motions",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION FOR CONTINUANCE

{{movingParty}}, by and through counsel, hereby moves this Court for an order continuing the {{eventType}} currently scheduled for {{currentDate}}.

STATEMENT OF FACTS

{{factStatement}}

GROUNDS FOR CONTINUANCE

{{groundsForContinuance}}

PROPOSED NEW DATE

{{movingParty}} respectfully requests that the {{eventType}} be rescheduled to {{proposedDate}}, or such other date as the Court deems appropriate.

GOOD CAUSE

Good cause exists for this continuance because: {{goodCauseStatement}}

WHEREFORE, {{movingParty}} respectfully requests that this Court grant this Motion and continue the {{eventType}} to {{proposedDate}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
{{firmPhone}}
{{firmEmail}}
Attorney for {{representedParty}}

CERTIFICATE OF SERVICE

I hereby certify that on {{serviceDate}}, I served a true and correct copy of the foregoing MOTION FOR CONTINUANCE upon the following by {{serviceMethod}}:

{{opposingCounselInfo}}

_____________________________
{{attorneyName}}`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true, placeholder: "Third District Court" },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
        { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["Plaintiff", "Defendant"] },
        { id: "eventType", name: "eventType", label: "Event Type", type: "select", required: true, options: ["hearing", "trial", "deposition", "mediation", "status conference"] },
        { id: "currentDate", name: "currentDate", label: "Current Scheduled Date", type: "date", required: true },
        { id: "proposedDate", name: "proposedDate", label: "Proposed New Date", type: "date", required: true },
      ],
      optionalFields: [
        { id: "factStatement", name: "factStatement", label: "Statement of Facts", type: "textarea", required: false, helpText: "Brief factual background" },
        { id: "groundsForContinuance", name: "groundsForContinuance", label: "Grounds for Continuance", type: "textarea", required: false },
        { id: "goodCauseStatement", name: "goodCauseStatement", label: "Good Cause Statement", type: "textarea", required: false },
      ],
      utahRuleReferences: ["URCP Rule 7", "URCP Rule 6", "URCP Rule 40"],
      formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
      bilingualNoticeRequired: true,
      aiPromptInstructions: "Generate a professional motion for continuance following Utah Rules of Civil Procedure. Include proper caption, good cause statement, and certificate of service. Be concise and cite applicable rules.",
      tags: ["motion", "continuance", "scheduling", "civil"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(motionContinuance.id, motionContinuance);

    // Motion to Dismiss
    const motionDismiss: DocumentTemplate = {
      id: "tpl-motion-dismiss",
      name: "Motion to Dismiss",
      description: "Motion to dismiss under Utah Rules of Civil Procedure Rule 12(b)",
      category: "motions",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION TO DISMISS

{{movingParty}}, by and through counsel, hereby moves this Court pursuant to Utah Rule of Civil Procedure 12(b)({{dismissalBasis}}) for an order dismissing {{dismissTarget}}.

MEMORANDUM IN SUPPORT

I. INTRODUCTION

{{introduction}}

II. STATEMENT OF FACTS

{{factStatement}}

III. ARGUMENT

{{legalArgument}}

IV. CONCLUSION

For the reasons set forth above, {{movingParty}} respectfully requests that this Court grant this Motion and dismiss {{dismissTarget}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
{{firmPhone}}
{{firmEmail}}
Attorney for {{representedParty}}`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
        { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["Plaintiff", "Defendant"] },
        { id: "dismissalBasis", name: "dismissalBasis", label: "Basis for Dismissal (12(b))", type: "select", required: true, options: ["1 - Lack of subject matter jurisdiction", "2 - Lack of personal jurisdiction", "3 - Improper venue", "4 - Insufficient process", "5 - Insufficient service of process", "6 - Failure to state a claim", "7 - Failure to join a party"] },
        { id: "dismissTarget", name: "dismissTarget", label: "What to Dismiss", type: "text", required: true, placeholder: "Plaintiff's Complaint" },
      ],
      optionalFields: [
        { id: "introduction", name: "introduction", label: "Introduction", type: "textarea", required: false },
        { id: "factStatement", name: "factStatement", label: "Statement of Facts", type: "textarea", required: false },
        { id: "legalArgument", name: "legalArgument", label: "Legal Argument", type: "textarea", required: false },
      ],
      utahRuleReferences: ["URCP Rule 12(b)", "URCP Rule 7", "URCP Rule 10"],
      formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
      bilingualNoticeRequired: true,
      aiPromptInstructions: "Generate a professional motion to dismiss following Utah Rules of Civil Procedure Rule 12(b). Include clear legal arguments, cite relevant case law, and follow proper Utah court formatting.",
      tags: ["motion", "dismiss", "12(b)", "civil"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(motionDismiss.id, motionDismiss);

    // Motion for Summary Judgment
    const motionSummaryJudgment: DocumentTemplate = {
      id: "tpl-motion-summary-judgment",
      name: "Motion for Summary Judgment",
      description: "Motion for summary judgment under Utah Rules of Civil Procedure Rule 56",
      category: "motions",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION FOR SUMMARY JUDGMENT

{{movingParty}}, by and through counsel, hereby moves this Court pursuant to Utah Rule of Civil Procedure 56 for summary judgment on {{claimsAtIssue}}.

MEMORANDUM IN SUPPORT

I. INTRODUCTION

{{introduction}}

II. UNDISPUTED MATERIAL FACTS

{{undisputedFacts}}

III. LEGAL STANDARD

Summary judgment is appropriate when "the pleadings, depositions, answers to interrogatories, and admissions on file, together with the affidavits, if any, show that there is no genuine issue as to any material fact and that the moving party is entitled to judgment as a matter of law." Utah R. Civ. P. 56(c).

IV. ARGUMENT

{{legalArgument}}

V. CONCLUSION

For the reasons set forth above, {{movingParty}} respectfully requests that this Court grant summary judgment in favor of {{movingParty}} on {{claimsAtIssue}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Attorney for {{representedParty}}`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
        { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["Plaintiff", "Defendant"] },
        { id: "claimsAtIssue", name: "claimsAtIssue", label: "Claims at Issue", type: "text", required: true, placeholder: "all claims" },
      ],
      optionalFields: [
        { id: "introduction", name: "introduction", label: "Introduction", type: "textarea", required: false },
        { id: "undisputedFacts", name: "undisputedFacts", label: "Undisputed Material Facts", type: "textarea", required: false, helpText: "List each undisputed fact with supporting evidence" },
        { id: "legalArgument", name: "legalArgument", label: "Legal Argument", type: "textarea", required: false },
      ],
      utahRuleReferences: ["URCP Rule 56", "URCP Rule 7", "URCP Rule 10"],
      formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
      bilingualNoticeRequired: true,
      aiPromptInstructions: "Generate a professional motion for summary judgment following Utah Rules of Civil Procedure Rule 56. Include clear undisputed facts, cite supporting evidence, and provide compelling legal arguments.",
      tags: ["motion", "summary judgment", "Rule 56", "civil"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(motionSummaryJudgment.id, motionSummaryJudgment);

    // Answer to Complaint
    const answerComplaint: DocumentTemplate = {
      id: "tpl-answer-complaint",
      name: "Answer to Complaint",
      description: "Defendant's answer to plaintiff's complaint under Utah Rules of Civil Procedure",
      category: "pleadings",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

ANSWER TO COMPLAINT

Defendant {{defendantName}}, by and through counsel, hereby answers Plaintiff's Complaint as follows:

GENERAL DENIAL

Defendant denies each and every allegation in Plaintiff's Complaint except as specifically admitted herein.

SPECIFIC RESPONSES TO ALLEGATIONS

{{specificResponses}}

AFFIRMATIVE DEFENSES

{{affirmativeDefenses}}

PRAYER FOR RELIEF

WHEREFORE, Defendant respectfully requests that this Court:
1. Dismiss Plaintiff's Complaint with prejudice;
2. Award Defendant costs and attorney's fees as allowed by law; and
3. Grant such other relief as the Court deems just and proper.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Attorney for Defendant`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
        { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
      ],
      optionalFields: [
        { id: "specificResponses", name: "specificResponses", label: "Specific Responses", type: "textarea", required: false, helpText: "Respond to each numbered paragraph" },
        { id: "affirmativeDefenses", name: "affirmativeDefenses", label: "Affirmative Defenses", type: "textarea", required: false },
      ],
      utahRuleReferences: ["URCP Rule 8", "URCP Rule 12", "URCP Rule 10"],
      formatRequirements: utahFormatDefaults,
      bilingualNoticeRequired: false,
      aiPromptInstructions: "Generate a professional answer to complaint following Utah Rules of Civil Procedure. Include specific responses to allegations and relevant affirmative defenses.",
      tags: ["pleading", "answer", "defense", "civil"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(answerComplaint.id, answerComplaint);

    // Civil Complaint
    const civilComplaint: DocumentTemplate = {
      id: "tpl-civil-complaint",
      name: "Civil Complaint",
      description: "Initial complaint for civil action in Utah courts",
      category: "pleadings",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. _______________
Judge _______________

COMPLAINT

Plaintiff {{plaintiffName}}, by and through counsel, hereby complains against Defendant {{defendantName}} as follows:

PARTIES

1. Plaintiff {{plaintiffName}} is {{plaintiffDescription}}.

2. Defendant {{defendantName}} is {{defendantDescription}}.

JURISDICTION AND VENUE

3. This Court has jurisdiction over this matter pursuant to {{jurisdictionBasis}}.

4. Venue is proper in {{courtCounty}} County because {{venueBasis}}.

FACTUAL ALLEGATIONS

{{factualAllegations}}

CAUSES OF ACTION

{{causesOfAction}}

PRAYER FOR RELIEF

WHEREFORE, Plaintiff respectfully requests that this Court:
1. Enter judgment in favor of Plaintiff and against Defendant;
2. Award Plaintiff compensatory damages in the amount of {{damagesAmount}};
3. Award Plaintiff costs and attorney's fees;
4. Grant such other relief as the Court deems just and proper.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Attorney for Plaintiff`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "plaintiffDescription", name: "plaintiffDescription", label: "Plaintiff Description", type: "text", required: true, placeholder: "a resident of Salt Lake County, Utah" },
        { id: "defendantDescription", name: "defendantDescription", label: "Defendant Description", type: "text", required: true },
        { id: "jurisdictionBasis", name: "jurisdictionBasis", label: "Jurisdiction Basis", type: "text", required: true, placeholder: "Utah Code Ann. § 78A-5-102" },
        { id: "venueBasis", name: "venueBasis", label: "Venue Basis", type: "text", required: true, placeholder: "Defendant resides in this County" },
      ],
      optionalFields: [
        { id: "factualAllegations", name: "factualAllegations", label: "Factual Allegations", type: "textarea", required: false },
        { id: "causesOfAction", name: "causesOfAction", label: "Causes of Action", type: "textarea", required: false },
        { id: "damagesAmount", name: "damagesAmount", label: "Damages Amount", type: "text", required: false },
      ],
      utahRuleReferences: ["URCP Rule 3", "URCP Rule 8", "URCP Rule 10"],
      formatRequirements: utahFormatDefaults,
      bilingualNoticeRequired: false,
      aiPromptInstructions: "Generate a professional civil complaint following Utah Rules of Civil Procedure. Include clear factual allegations, proper causes of action, and prayer for relief.",
      tags: ["pleading", "complaint", "civil", "initial filing"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(civilComplaint.id, civilComplaint);

    // Subpoena
    const subpoena: DocumentTemplate = {
      id: "tpl-subpoena",
      name: "Subpoena",
      description: "Subpoena for witness testimony or document production",
      category: "discovery",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

SUBPOENA

TO: {{subpoenaRecipient}}
    {{recipientAddress}}

YOU ARE COMMANDED:

{{subpoenaType}}

{{specificInstructions}}

Your failure to comply with this subpoena may result in contempt of court proceedings.

DATED this {{day}} day of {{month}}, {{year}}.

BY THE COURT:

_____________________________
Clerk of Court

ISSUED BY:

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Attorney for {{representedParty}}`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
        { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        { id: "subpoenaRecipient", name: "subpoenaRecipient", label: "Subpoena Recipient", type: "text", required: true },
        { id: "recipientAddress", name: "recipientAddress", label: "Recipient Address", type: "textarea", required: true },
        { id: "subpoenaType", name: "subpoenaType", label: "Type of Subpoena", type: "select", required: true, options: ["To appear and testify at hearing/trial", "To appear and testify at deposition", "To produce documents or things", "To appear, testify, and produce documents"] },
      ],
      optionalFields: [
        { id: "specificInstructions", name: "specificInstructions", label: "Specific Instructions", type: "textarea", required: false, helpText: "Details about when, where, and what" },
      ],
      utahRuleReferences: ["URCP Rule 45", "URCP Rule 30", "URCP Rule 34"],
      formatRequirements: utahFormatDefaults,
      bilingualNoticeRequired: false,
      aiPromptInstructions: "Generate a professional subpoena following Utah Rules of Civil Procedure Rule 45. Be clear about requirements and include proper warnings.",
      tags: ["discovery", "subpoena", "witness", "documents"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(subpoena.id, subpoena);

    // Stipulation
    const stipulation: DocumentTemplate = {
      id: "tpl-stipulation",
      name: "Stipulation",
      description: "Agreement between parties on procedural or substantive matters",
      category: "court-filings",
      jurisdiction: "utah-district-court",
      templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

STIPULATION

The parties, by and through their respective counsel, hereby stipulate and agree as follows:

{{stipulationTerms}}

WHEREFORE, the parties respectfully request that this Court enter an order consistent with this Stipulation.

DATED this {{day}} day of {{month}}, {{year}}.

FOR PLAINTIFF:                          FOR DEFENDANT:

_____________________________          _____________________________
{{plaintiffAttorney}}                  {{defendantAttorney}}
Utah Bar No. {{plaintiffBarNumber}}    Utah Bar No. {{defendantBarNumber}}
Attorney for Plaintiff                  Attorney for Defendant`,
      requiredFields: [
        { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
        { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Summit", "Tooele", "Iron"] },
        { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
        { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
        { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        { id: "stipulationTerms", name: "stipulationTerms", label: "Stipulation Terms", type: "textarea", required: true },
      ],
      optionalFields: [
        { id: "plaintiffAttorney", name: "plaintiffAttorney", label: "Plaintiff's Attorney", type: "text", required: false },
        { id: "defendantAttorney", name: "defendantAttorney", label: "Defendant's Attorney", type: "text", required: false },
      ],
      utahRuleReferences: ["URCP Rule 7"],
      formatRequirements: utahFormatDefaults,
      bilingualNoticeRequired: false,
      aiPromptInstructions: "Generate a professional stipulation following Utah court requirements. Clearly state the agreed terms.",
      tags: ["stipulation", "agreement", "court filing"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documentTemplates.set(stipulation.id, stipulation);
  }

  async getDocumentTemplates(category?: string): Promise<DocumentTemplate[]> {
    const templates = Array.from(this.documentTemplates.values());
    if (category) {
      return templates.filter(t => t.category === category && t.isActive);
    }
    return templates.filter(t => t.isActive);
  }

  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    return this.documentTemplates.get(id);
  }

  async createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const now = new Date().toISOString();
    const template: DocumentTemplate = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      jurisdiction: data.jurisdiction,
      templateContent: data.templateContent,
      requiredFields: data.requiredFields || [],
      optionalFields: data.optionalFields || [],
      utahRuleReferences: data.utahRuleReferences || [],
      formatRequirements: data.formatRequirements || {
        paperSize: "8.5x11",
        margins: { top: 1, right: 1, bottom: 1, left: 1 },
        fontSize: 12,
        fontFamily: "Times New Roman",
        lineSpacing: "double",
        requiresCaption: true,
        requiresCertificateOfService: true,
        requiresSignatureBlock: true,
        requiresBilingualNotice: true,
      },
      bilingualNoticeRequired: data.bilingualNoticeRequired ?? true,
      sampleDocument: data.sampleDocument,
      aiPromptInstructions: data.aiPromptInstructions || "",
      tags: data.tags || [],
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.documentTemplates.set(template.id, template);
    return template;
  }

  async updateDocumentTemplate(id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate | undefined> {
    const template = this.documentTemplates.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...data, updatedAt: new Date().toISOString() };
    this.documentTemplates.set(id, updated);
    return updated;
  }

  async deleteDocumentTemplate(id: string): Promise<boolean> {
    return this.documentTemplates.delete(id);
  }

  // ============ GENERATED DOCUMENTS ============

  async getGeneratedDocuments(matterId?: string): Promise<GeneratedDocument[]> {
    const docs = Array.from(this.generatedDocuments.values());
    if (matterId) {
      return docs.filter(d => d.matterId === matterId);
    }
    return docs;
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined> {
    return this.generatedDocuments.get(id);
  }

  async createGeneratedDocument(data: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const now = new Date().toISOString();
    const doc: GeneratedDocument = {
      id: randomUUID(),
      templateId: data.templateId,
      matterId: data.matterId,
      title: data.title,
      documentType: data.documentType,
      jurisdiction: data.jurisdiction,
      status: "draft",
      content: data.content,
      fieldValues: data.fieldValues || {},
      aiGenerationPrompt: data.aiGenerationPrompt,
      aiGenerationResponse: data.aiGenerationResponse,
      formatCompliance: data.formatCompliance || { isCompliant: false, checks: [], utahRulesChecked: [] },
      version: 1,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    this.generatedDocuments.set(doc.id, doc);
    return doc;
  }

  async updateGeneratedDocument(id: string, data: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const doc = this.generatedDocuments.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...data, updatedAt: new Date().toISOString() };
    this.generatedDocuments.set(id, updated);
    return updated;
  }

  async deleteGeneratedDocument(id: string): Promise<boolean> {
    return this.generatedDocuments.delete(id);
  }

  // ============ DOCUMENT APPROVALS ============

  async getDocumentApprovals(documentId?: string): Promise<DocumentApproval[]> {
    const approvals = Array.from(this.documentApprovals.values());
    if (documentId) {
      return approvals.filter(a => a.documentId === documentId);
    }
    return approvals;
  }

  async getDocumentApproval(id: string): Promise<DocumentApproval | undefined> {
    return this.documentApprovals.get(id);
  }

  async createDocumentApproval(data: InsertDocumentApproval): Promise<DocumentApproval> {
    const now = new Date().toISOString();
    const approval: DocumentApproval = {
      id: randomUUID(),
      documentId: data.documentId,
      status: "pending",
      assignedReviewerId: data.assignedReviewerId,
      assignedReviewerName: data.assignedReviewerName,
      createdAt: now,
      updatedAt: now,
    };
    this.documentApprovals.set(approval.id, approval);
    return approval;
  }

  async updateDocumentApproval(id: string, data: UpdateDocumentApproval): Promise<DocumentApproval | undefined> {
    const approval = this.documentApprovals.get(id);
    if (!approval) return undefined;
    
    const updated: DocumentApproval = {
      ...approval,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    if (data.status === "approved" && data.lawyerInitials) {
      updated.approvalStamp = new Date().toISOString();
    }
    
    this.documentApprovals.set(id, updated);
    return updated;
  }

  async addDocumentApprovalAudit(data: Partial<DocumentApprovalAudit>): Promise<DocumentApprovalAudit> {
    const audit: DocumentApprovalAudit = {
      id: randomUUID(),
      documentId: data.documentId || "",
      approvalId: data.approvalId || "",
      action: data.action || "created",
      performedBy: data.performedBy || "",
      performedByName: data.performedByName || "",
      performedAt: new Date().toISOString(),
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      notes: data.notes,
      ipAddress: data.ipAddress,
      metadata: data.metadata,
    };
    this.documentApprovalAudits.set(audit.id, audit);
    return audit;
  }

  async getDocumentApprovalAudit(documentId: string): Promise<DocumentApprovalAudit[]> {
    return Array.from(this.documentApprovalAudits.values())
      .filter(a => a.documentId === documentId)
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }

  // ============ CLIENT FORMS ============

  async getClientForms(): Promise<ClientForm[]> {
    return Array.from(this.clientForms.values()).filter(f => f.isActive);
  }

  async getClientForm(id: string): Promise<ClientForm | undefined> {
    return this.clientForms.get(id);
  }

  async createClientForm(data: InsertClientForm): Promise<ClientForm> {
    const now = new Date().toISOString();
    const form: ClientForm = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      formFields: data.formFields || [],
      isPublic: data.isPublic ?? false,
      requiresSignature: data.requiresSignature ?? false,
      instructions: data.instructions || "",
      thankYouMessage: data.thankYouMessage || "Thank you for your submission.",
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.clientForms.set(form.id, form);
    return form;
  }

  async updateClientForm(id: string, data: Partial<ClientForm>): Promise<ClientForm | undefined> {
    const form = this.clientForms.get(id);
    if (!form) return undefined;
    const updated = { ...form, ...data, updatedAt: new Date().toISOString() };
    this.clientForms.set(id, updated);
    return updated;
  }

  async deleteClientForm(id: string): Promise<boolean> {
    return this.clientForms.delete(id);
  }

  async getClientFormSubmissions(formId?: string): Promise<ClientFormSubmission[]> {
    const submissions = Array.from(this.clientFormSubmissions.values());
    if (formId) {
      return submissions.filter(s => s.formId === formId);
    }
    return submissions;
  }

  async getClientFormSubmission(id: string): Promise<ClientFormSubmission | undefined> {
    return this.clientFormSubmissions.get(id);
  }

  async createClientFormSubmission(data: InsertClientFormSubmission): Promise<ClientFormSubmission> {
    const submission: ClientFormSubmission = {
      id: randomUUID(),
      formId: data.formId,
      matterId: data.matterId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      submittedData: data.submittedData,
      signature: data.signature,
      signedAt: data.signature ? new Date().toISOString() : undefined,
      submittedAt: new Date().toISOString(),
      reviewed: false,
    };
    this.clientFormSubmissions.set(submission.id, submission);
    return submission;
  }

  async updateClientFormSubmission(id: string, data: Partial<ClientFormSubmission>): Promise<ClientFormSubmission | undefined> {
    const submission = this.clientFormSubmissions.get(id);
    if (!submission) return undefined;
    const updated = { ...submission, ...data };
    this.clientFormSubmissions.set(id, updated);
    return updated;
  }

  async getMeetings(): Promise<Meeting[]> {
    return Array.from(this.meetingsMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetingsMap.get(id);
  }

  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const meeting: Meeting = {
      id: randomUUID(),
      title: data.title,
      matterId: data.matterId || null,
      date: data.date,
      duration: data.duration || 0,
      status: data.status || "recorded",
      participants: data.participants as any[] || [],
      summary: data.summary || "",
      mainPoints: data.mainPoints as any[] || [],
      topics: data.topics as any[] || [],
      transcript: data.transcript as any[] || [],
      actionItems: data.actionItems as any[] || [],
      tags: data.tags || [],
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.meetingsMap.set(meeting.id, meeting);
    return meeting;
  }

  async updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | undefined> {
    const meeting = this.meetingsMap.get(id);
    if (!meeting) return undefined;
    const updated = { ...meeting, ...data, updatedAt: new Date() };
    this.meetingsMap.set(id, updated);
    return updated;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    return this.meetingsMap.delete(id);
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = { id: randomUUID(), ...data, metadata: data.metadata || {}, severity: data.severity || "info", createdAt: new Date(), userId: data.userId || null, userEmail: data.userEmail || null, resourceType: data.resourceType || null, resourceId: data.resourceId || null, method: data.method || null, path: data.path || null, ipAddress: data.ipAddress || null, userAgent: data.userAgent || null, statusCode: data.statusCode || null };
    return log;
  }
  async getAuditLogs(_options?: { userId?: string; action?: string; resourceType?: string; limit?: number; offset?: number }): Promise<AuditLog[]> { return []; }
  async getAuditLogCount(_options?: { userId?: string; action?: string; resourceType?: string }): Promise<number> { return 0; }
  async createSecurityEvent(data: InsertSecurityEvent): Promise<SecurityEvent> {
    const event: SecurityEvent = { id: randomUUID(), ...data, details: data.details || {}, severity: data.severity || "warning", resolved: false, createdAt: new Date(), userId: data.userId || null, ipAddress: data.ipAddress || null, userAgent: data.userAgent || null };
    return event;
  }
  async getSecurityEvents(_options?: { eventType?: string; severity?: string; resolved?: boolean; limit?: number }): Promise<SecurityEvent[]> { return []; }
  async resolveSecurityEvent(_id: string): Promise<SecurityEvent | undefined> { return undefined; }
}

// Use database storage for persistence
import { DbStorage } from "./dbStorage";
export const storage = new DbStorage();
