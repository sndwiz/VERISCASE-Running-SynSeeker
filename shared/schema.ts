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

// Insert schemas
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

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// User schema (keeping for compatibility)
export interface User {
  id: string;
  username: string;
  password: string;
}

export type InsertUser = Omit<User, "id">;
