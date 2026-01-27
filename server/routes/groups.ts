import type { Express } from "express";
import { storage } from "../storage";
import { insertGroupSchema, updateGroupSchema } from "@shared/schema";
import { z } from "zod";

export function registerGroupRoutes(app: Express): void {
  app.get("/api/boards/:boardId/groups", async (req, res) => {
    try {
      const groups = await storage.getGroups(req.params.boardId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.post("/api/boards/:boardId/groups", async (req, res) => {
    try {
      const data = insertGroupSchema.parse({
        ...req.body,
        boardId: req.params.boardId,
      });
      const group = await storage.createGroup(data);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const data = updateGroupSchema.parse(req.body);
      const group = await storage.updateGroup(req.params.id, data);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGroup(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete group" });
    }
  });
}
