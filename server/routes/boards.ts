import type { Express } from "express";
import { storage } from "../storage";
import { insertBoardSchema, updateBoardSchema, type Board, type Task } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { workspaces, boards } from "@shared/models/tables";
import { eq, and, inArray, asc } from "drizzle-orm";
import { getUserId } from "../utils/auth";
import { maybePageinate } from "../utils/pagination";
import { generateCompletion } from "../ai/providers";

async function verifyWorkspaceOwnership(userId: string, workspaceId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)));
  return !!ws;
}

async function verifyBoardAccess(userId: string, boardId: string): Promise<boolean> {
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  if (!board) return false;
  if (!board.workspaceId) return true;
  return verifyWorkspaceOwnership(userId, board.workspaceId);
}

async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const userWorkspaces = await db.select({ id: workspaces.id }).from(workspaces)
    .where(eq(workspaces.ownerId, userId));
  return userWorkspaces.map(ws => ws.id);
}

export function registerBoardRoutes(app: Express): void {
  app.get("/api/boards", async (req, res) => {
    try {
      const { clientId, matterId, workspaceId } = req.query;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      let boardList: Board[];

      if (clientId && typeof clientId === "string") {
        boardList = await storage.getBoardsByClient(clientId);
      } else if (matterId && typeof matterId === "string") {
        boardList = await storage.getBoardsByMatter(matterId);
      } else if (workspaceId && typeof workspaceId === "string") {
        const owns = await verifyWorkspaceOwnership(userId, workspaceId);
        if (!owns) {
          return res.status(403).json({ error: "Workspace not found or access denied" });
        }
        boardList = await storage.getBoardsByWorkspaceIds([workspaceId]);
      } else {
        const wsIds = await getUserWorkspaceIds(userId);
        boardList = await storage.getBoardsByWorkspaceIds(wsIds);
      }
      res.json(maybePageinate(boardList, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const hasAccess = await verifyBoardAccess(userId, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Board not found or access denied" });
      }
      const board = await storage.getBoard(req.params.id);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      res.json(board);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch board" });
    }
  });

  app.post("/api/boards", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = insertBoardSchema.parse(req.body);
      if (data.workspaceId) {
        const owns = await verifyWorkspaceOwnership(userId, data.workspaceId);
        if (!owns) {
          return res.status(403).json({ error: "Workspace not found or access denied" });
        }
      }
      const board = await storage.createBoard(data);
      res.status(201).json(board);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create board" });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const hasAccess = await verifyBoardAccess(userId, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Board not found or access denied" });
      }
      const data = updateBoardSchema.parse(req.body);
      const board = await storage.updateBoard(req.params.id, data as any);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      res.json(board);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const hasAccess = await verifyBoardAccess(userId, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Board not found or access denied" });
      }
      const deleted = await storage.deleteBoard(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Board not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete board" });
    }
  });

  const autofillSchema = z.object({
    sourceColumnId: z.string(),
    targetColumnId: z.string(),
    labels: z.array(z.string()),
    instructions: z.string().optional(),
    includeEmpty: z.boolean().optional(),
    previewOnly: z.boolean().optional(),
    taskIds: z.array(z.string()).optional(),
  });

  app.post("/api/boards/:id/ai-autofill", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const hasAccess = await verifyBoardAccess(userId, req.params.id);
      if (!hasAccess) return res.status(403).json({ error: "Forbidden" });

      const board = await storage.getBoard(req.params.id);
      if (!board) return res.status(404).json({ error: "Board not found" });

      const parsed = autofillSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      }

      const { sourceColumnId, targetColumnId, labels, instructions, includeEmpty, previewOnly, taskIds } = parsed.data;

      const sourceCol = board.columns.find((c: any) => c.id === sourceColumnId);
      const targetCol = board.columns.find((c: any) => c.id === targetColumnId);
      if (!sourceCol || !targetCol) {
        return res.status(400).json({ error: "Column not found" });
      }

      let allTasks = await storage.getTasks(req.params.id);

      if (taskIds && taskIds.length > 0) {
        allTasks = allTasks.filter((t: Task) => taskIds.includes(t.id));
      }

      if (includeEmpty === false) {
        allTasks = allTasks.filter((t: Task) => {
          const val = getTaskFieldValue(t, targetColumnId, targetCol.type);
          return !val || val === "" || val === "not-started";
        });
      }

      if (previewOnly) {
        allTasks = allTasks.slice(0, 5);
      }

      if (allTasks.length === 0) {
        return res.json({ predictions: [] });
      }

      const taskTexts = allTasks.map((t: Task) => {
        const sourceText = getTaskFieldValue(t, sourceColumnId, sourceCol.type);
        return { id: t.id, title: t.title, text: sourceText || "" };
      });

      const labelsStr = labels.map((l, i) => `${i + 1}. "${l}"`).join("\n");
      const prompt = `You are a classification assistant for a legal practice management system. Analyze the source text of each item and assign the most appropriate label from the provided list.

Labels to choose from:
${labelsStr}

Items to classify:
${taskTexts.map((t: { id: string; title: string; text: string }, i: number) => `[${i + 1}] ID: ${t.id} | Title: "${t.title}" | Text: "${t.text}"`).join("\n")}

${instructions ? `Additional instructions: ${instructions}` : ""}

Respond in valid JSON format only, as an array of objects:
[{"taskId": "<id>", "label": "<chosen label>", "confidence": <0.0-1.0>}]

Rules:
- Choose exactly ONE label per item from the provided list
- If uncertain, choose the closest match and give lower confidence
- confidence should be between 0.0 and 1.0
- Return ONLY the JSON array, no other text`;

      const result = await generateCompletion(
        [{ role: "user", content: prompt }],
        { maxTokens: 2048, caller: "board-ai-autofill", system: "You are a precise classification engine. Always respond with valid JSON only." }
      );

      let predictions: Array<{ taskId: string; label: string; confidence: number }> = [];
      try {
        const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        predictions = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "AI returned invalid response", raw: result });
      }

      const enriched = predictions.map((p: any) => {
        const task = allTasks.find((t: Task) => t.id === p.taskId);
        return {
          ...p,
          taskTitle: task?.title || "",
          currentValue: task ? getTaskFieldValue(task, targetColumnId, targetCol.type) : "",
        };
      });

      res.json({ predictions: enriched });
    } catch (error: any) {
      console.error("AI autofill error:", error);
      res.status(500).json({ error: error.message || "AI autofill failed" });
    }
  });

  app.post("/api/boards/:id/ai-autofill/apply", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const hasAccess = await verifyBoardAccess(userId, req.params.id);
      if (!hasAccess) return res.status(403).json({ error: "Forbidden" });

      const board = await storage.getBoard(req.params.id);
      if (!board) return res.status(404).json({ error: "Board not found" });

      const { targetColumnId, assignments } = req.body as {
        targetColumnId: string;
        assignments: Array<{ taskId: string; label: string }>;
      };

      if (!targetColumnId || !assignments?.length) {
        return res.status(400).json({ error: "Missing targetColumnId or assignments" });
      }

      const targetCol = board.columns.find((c: any) => c.id === targetColumnId);
      if (!targetCol) return res.status(400).json({ error: "Target column not found" });

      let updated = 0;
      for (const assignment of assignments) {
        const task = await storage.getTask(assignment.taskId);
        if (!task) continue;

        const updates: Partial<Task> = {};
        if (targetCol.type === "status") {
          const statusLabel = targetCol.statusLabels?.find((s: any) => s.label === assignment.label);
          if (statusLabel) {
            updates.status = statusLabel.id as any;
          }
        } else if (targetCol.type === "priority") {
          updates.priority = assignment.label.toLowerCase() as any;
        } else {
          updates.customFields = {
            ...task.customFields,
            [targetColumnId]: assignment.label,
          };
        }

        await storage.updateTask(assignment.taskId, updates);
        updated++;
      }

      res.json({ success: true, updated });
    } catch (error: any) {
      console.error("AI autofill apply error:", error);
      res.status(500).json({ error: error.message || "Failed to apply autofill" });
    }
  });
}

function getTaskFieldValue(task: Task, columnId: string, columnType: string): string {
  switch (columnId) {
    case "title": return task.title;
    case "description": return task.description;
    case "notes": return task.notes;
    case "status": return task.status;
    case "priority": return task.priority;
    case "tags": return (task.tags || []).join(", ");
    default:
      if (columnType === "status") return task.status;
      if (columnType === "priority") return task.priority;
      return task.customFields?.[columnId] || "";
  }
}
