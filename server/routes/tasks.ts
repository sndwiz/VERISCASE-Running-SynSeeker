import type { Express } from "express";
import { storage } from "../storage";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { z } from "zod";

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
      const task = await storage.updateTask(req.params.id, data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
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
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
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

      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to move task to board" });
    }
  });
}
