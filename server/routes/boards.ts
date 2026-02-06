import type { Express } from "express";
import { storage } from "../storage";
import { insertBoardSchema, updateBoardSchema } from "@shared/schema";
import { z } from "zod";

export function registerBoardRoutes(app: Express): void {
  app.get("/api/boards", async (req, res) => {
    try {
      const { clientId, matterId } = req.query;
      let boards;
      if (clientId && typeof clientId === "string") {
        boards = await storage.getBoardsByClient(clientId);
      } else if (matterId && typeof matterId === "string") {
        boards = await storage.getBoardsByMatter(matterId);
      } else {
        boards = await storage.getBoards();
      }
      res.json(boards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
    try {
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
      const data = insertBoardSchema.parse(req.body);
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
