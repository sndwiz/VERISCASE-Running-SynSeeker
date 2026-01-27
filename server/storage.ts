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

  constructor() {
    this.initializeSampleData();
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
        phone: null,
        address: null,
        type: c.type,
        status: "active",
        industry: c.industry,
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
        type: m.type,
        status: "active",
        description: m.description,
        openDate: new Date().toISOString(),
        closeDate: null,
        practiceArea: m.type,
        responsibleAttorney: null,
        billingType: "hourly",
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
      conditions: data.conditions || [],
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
}

export const storage = new MemStorage();
