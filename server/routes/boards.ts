import type { Express } from "express";
import { storage } from "../storage";
import { insertBoardSchema, updateBoardSchema, type Board } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { workspaces, boards } from "@shared/models/tables";
import { eq, and, inArray, asc } from "drizzle-orm";
import { getUserId } from "../utils/auth";
import { maybePageinate } from "../utils/pagination";

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
}
