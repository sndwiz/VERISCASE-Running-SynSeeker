import type { Express } from "express";
import { storage } from "../storage";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { tasks as tasksTable } from "@shared/models/tables";
import { boards } from "@shared/models/tables";
import { eq, and, sql, or } from "drizzle-orm";
import { syncTaskToCalendar, removeSyncedEvent } from "../services/calendar-sync";
import { triggerAutomation } from "../automation-engine";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const taskUpload = multer({
  dest: "uploads/task-files/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

function getUserId(req: any): string | null {
  return req.user?.id || (req.session as any)?.passport?.user?.id || null;
}

const mirrorMoveSchema = z.object({
  targetBoardId: z.string().min(1),
  targetGroupId: z.string().min(1),
});

export function registerTaskRoutes(app: Express): void {
  app.get("/api/boards/:boardId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.params.boardId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/recent", async (_req, res) => {
    try {
      const tasks = await storage.getRecentTasks(10);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent tasks" });
    }
  });

  app.get("/api/tasks/my", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const allTasks = await db.select({
        task: tasksTable,
        boardName: boards.name,
        boardColor: boards.color,
        matterId: boards.matterId,
      })
        .from(tasksTable)
        .leftJoin(boards, eq(tasksTable.boardId, boards.id))
        .orderBy(tasksTable.dueDate, tasksTable.priority);

      const myTasks = allTasks.filter(row => {
        const assignees = row.task.assignees as any[];
        const owner = row.task.owner as any;
        if (assignees && Array.isArray(assignees)) {
          if (assignees.some((a: any) => a.id === userId || a === userId)) return true;
        }
        if (owner && (owner.id === userId || owner === userId)) return true;
        if (row.task.lastUpdatedBy === userId) return false;
        return false;
      });

      res.json(myTasks.map(row => ({
        ...row.task,
        boardName: row.boardName,
        boardColor: row.boardColor,
        matterId: row.matterId,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user tasks" });
    }
  });

  app.get("/api/tasks/all-today", async (_req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const allTasks = await db.select({
        task: tasksTable,
        boardName: boards.name,
        boardColor: boards.color,
        matterId: boards.matterId,
      })
        .from(tasksTable)
        .leftJoin(boards, eq(tasksTable.boardId, boards.id))
        .where(
          or(
            eq(tasksTable.dueDate, today),
            eq(tasksTable.startDate, today)
          )
        )
        .orderBy(tasksTable.priority);

      res.json(allTasks.map(row => ({
        ...row.task,
        boardName: row.boardName,
        boardColor: row.boardColor,
        matterId: row.matterId,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/boards/:boardId/tasks", async (req, res) => {
    try {
      const data = insertTaskSchema.parse({
        ...req.body,
        boardId: req.params.boardId,
      });
      const task = await storage.createTask(data);
      if (task.dueDate || task.startDate) {
        syncTaskToCalendar(task.id).catch(e => console.error("[tasks] Calendar sync error:", e));
      }
      triggerAutomation({
        type: "item_created",
        boardId: req.params.boardId,
        taskId: task.id,
        newValue: task.title,
        metadata: { status: task.status, priority: task.priority },
      }).catch(e => console.error("[tasks] Automation trigger error:", e));
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const data = updateTaskSchema.parse(req.body);
      const oldTask = await storage.getTask(req.params.id);
      const task = await storage.updateTask(req.params.id, data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.dueDate || task.startDate || data.dueDate !== undefined || data.startDate !== undefined) {
        syncTaskToCalendar(task.id).catch(e => console.error("[tasks] Calendar sync error:", e));
      }

      if (oldTask && task.boardId) {
        if (data.status && oldTask.status !== data.status) {
          triggerAutomation({
            type: "status_changed",
            boardId: task.boardId,
            taskId: task.id,
            field: "status",
            previousValue: oldTask.status,
            newValue: data.status,
          }).catch(e => console.error("[tasks] Automation trigger error:", e));
        }
        if (data.priority && oldTask.priority !== data.priority) {
          triggerAutomation({
            type: "priority_changed",
            boardId: task.boardId,
            taskId: task.id,
            field: "priority",
            previousValue: oldTask.priority,
            newValue: data.priority,
          }).catch(e => console.error("[tasks] Automation trigger error:", e));
        }
        if (data.title && oldTask.title !== data.title) {
          triggerAutomation({
            type: "name_changed",
            boardId: task.boardId,
            taskId: task.id,
            field: "title",
            previousValue: oldTask.title,
            newValue: data.title,
          }).catch(e => console.error("[tasks] Automation trigger error:", e));
        }
        if (data.dueDate !== undefined && oldTask.dueDate !== data.dueDate) {
          triggerAutomation({
            type: "date_changed",
            boardId: task.boardId,
            taskId: task.id,
            field: "dueDate",
            previousValue: oldTask.dueDate,
            newValue: data.dueDate,
          }).catch(e => console.error("[tasks] Automation trigger error:", e));
        }
        if (data.customFields && JSON.stringify(oldTask.customFields) !== JSON.stringify(data.customFields)) {
          triggerAutomation({
            type: "column_changed",
            boardId: task.boardId,
            taskId: task.id,
            field: "customFields",
            previousValue: oldTask.customFields,
            newValue: data.customFields,
          }).catch(e => console.error("[tasks] Automation trigger error:", e));
        }
      }

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const userRole = req.user?.claims?.metadata?.role;
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Only admins can delete tasks" });
      }
      removeSyncedEvent("board-task", req.params.id).catch(e => console.error("[tasks] Calendar unsync error:", e));
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.post("/api/tasks/:taskId/files", taskUpload.single("file"), async (req, res) => {
    try {
      const taskId = req.params.taskId as string;
      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const destDir = path.join("uploads", "task-files", task.boardId, taskId);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, file.originalname);
      fs.renameSync(file.path, destPath);

      const fileBuffer = fs.readFileSync(destPath);
      const sha256 = createHash("sha256").update(fileBuffer).digest("hex");

      const fileRecord = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: destPath,
        sha256,
        uploadedAt: new Date().toISOString(),
      };

      const existingFiles = (task.files as any[]) || [];
      await storage.updateTask(taskId, {
        files: [...existingFiles, fileRecord],
      });

      triggerAutomation({
        type: "file_uploaded",
        boardId: task.boardId,
        taskId: task.id,
        newValue: file.originalname,
        metadata: { fileName: file.originalname, mimeType: file.mimetype, size: file.size, fileId: fileRecord.id },
      }).catch(e => console.error("[tasks] Automation trigger error:", e));

      res.status(201).json(fileRecord);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks/:taskId/files", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task.files || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks/:taskId/files/:fileId/download", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });
      const files = (task.files || []) as any[];
      const fileRecord = files.find((f: any) => f.id === req.params.fileId);
      if (!fileRecord) return res.status(404).json({ error: "File not found" });
      if (!fs.existsSync(fileRecord.path)) return res.status(404).json({ error: "File missing from storage" });
      res.download(fileRecord.path, fileRecord.name);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tasks/:id/mirror", async (req, res) => {
    try {
      const { targetBoardId, targetGroupId } = mirrorMoveSchema.parse(req.body);
      const originalTask = await storage.getTask(req.params.id);
      if (!originalTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const targetBoard = await storage.getBoard(targetBoardId);
      if (!targetBoard) {
        return res.status(400).json({ error: "Target board not found" });
      }
      const targetGroups = await storage.getGroups(targetBoardId);
      const groupBelongsToBoard = targetGroups.some(g => g.id === targetGroupId);
      if (!groupBelongsToBoard) {
        return res.status(400).json({ error: "Target group does not belong to target board" });
      }

      const mirroredTask = await storage.createTask({
        title: `[Mirror] ${originalTask.title}`,
        description: originalTask.description || "",
        status: originalTask.status as any,
        priority: originalTask.priority as any,
        dueDate: originalTask.dueDate,
        startDate: originalTask.startDate,
        assignees: originalTask.assignees as any,
        owner: originalTask.owner as any,
        progress: originalTask.progress,
        timeEstimate: originalTask.timeEstimate,
        boardId: targetBoardId,
        groupId: targetGroupId,
        parentTaskId: originalTask.id,
        tags: originalTask.tags as any,
        notes: originalTask.notes || "",
        customFields: originalTask.customFields as any,
        subtasks: originalTask.subtasks as any,
      });

      res.status(201).json(mirroredTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to mirror task" });
    }
  });

  app.post("/api/tasks/:id/move-to-board", async (req, res) => {
    try {
      const { targetBoardId, targetGroupId } = mirrorMoveSchema.parse(req.body);
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const targetBoard = await storage.getBoard(targetBoardId);
      if (!targetBoard) {
        return res.status(400).json({ error: "Target board not found" });
      }
      const targetGroups = await storage.getGroups(targetBoardId);
      const groupBelongsToBoard = targetGroups.some(g => g.id === targetGroupId);
      if (!groupBelongsToBoard) {
        return res.status(400).json({ error: "Target group does not belong to target board" });
      }

      const updatedTask = await storage.updateTask(req.params.id, {
        boardId: targetBoardId,
        groupId: targetGroupId,
      });

      if (!updatedTask) {
        return res.status(500).json({ error: "Failed to move task" });
      }

      triggerAutomation({
        type: "item_moved",
        boardId: targetBoardId,
        taskId: updatedTask.id,
        previousValue: task.boardId,
        newValue: targetBoardId,
        metadata: { fromBoardId: task.boardId, toBoardId: targetBoardId, groupId: targetGroupId },
      }).catch(e => console.error("[tasks] Automation trigger error:", e));

      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to move task to board" });
    }
  });
}
