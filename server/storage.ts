import { randomUUID } from "crypto";
import type {
  Board,
  Group,
  Task,
  InsertBoard,
  InsertGroup,
  InsertTask,
  ColumnDef,
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
}

export class MemStorage implements IStorage {
  private boards: Map<string, Board>;
  private groups: Map<string, Group>;
  private tasks: Map<string, Task>;

  constructor() {
    this.boards = new Map();
    this.groups = new Map();
    this.tasks = new Map();

    // Initialize with sample data
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

    // Create a second board
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

    // Create groups for second board
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
  }

  // Board methods
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
      columns: data.columns || [...defaultColumns],
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
    // Delete all tasks and groups in this board
    const tasks = Array.from(this.tasks.values()).filter((t) => t.boardId === id);
    tasks.forEach((t) => this.tasks.delete(t.id));
    
    const groups = Array.from(this.groups.values()).filter((g) => g.boardId === id);
    groups.forEach((g) => this.groups.delete(g.id));
    
    return this.boards.delete(id);
  }

  // Group methods
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
    // Delete all tasks in this group
    const tasks = Array.from(this.tasks.values()).filter((t) => t.groupId === id);
    tasks.forEach((t) => this.tasks.delete(t.id));
    return this.groups.delete(id);
  }

  // Task methods
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
}

export const storage = new MemStorage();
