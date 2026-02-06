import type { Express } from "express";
import { db } from "../db";
import { workspaces } from "@shared/models/tables";
import { eq, and, desc } from "drizzle-orm";
import { getUserId } from "../utils/auth";

export function registerWorkspaceRoutes(app: Express): void {
  app.get("/api/workspaces", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const rows = await db.select().from(workspaces)
        .where(eq(workspaces.ownerId, userId))
        .orderBy(desc(workspaces.createdAt));

      if (rows.length === 0) {
        const [defaultWs] = await db.insert(workspaces).values({
          name: "Main Workspace",
          description: "Default workspace for all cases and boards",
          color: "#6366f1",
          icon: "briefcase",
          ownerId: userId,
        }).returning();
        return res.json([defaultWs]);
      }

      res.json(rows);
    } catch (err: any) {
      console.error("Error fetching workspaces:", err);
      res.status(500).json({ error: "Failed to fetch workspaces" });
    }
  });

  app.post("/api/workspaces", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { name, description, color, icon } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Name is required" });
      }

      const [ws] = await db.insert(workspaces).values({
        name: name.trim(),
        description: description || "",
        color: color || "#6366f1",
        icon: icon || "briefcase",
        ownerId: userId,
      }).returning();

      res.status(201).json(ws);
    } catch (err: any) {
      console.error("Error creating workspace:", err);
      res.status(500).json({ error: "Failed to create workspace" });
    }
  });

  app.patch("/api/workspaces/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { id } = req.params;
      const existing = await db.select().from(workspaces)
        .where(and(eq(workspaces.id, id), eq(workspaces.ownerId, userId)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      const { name, description, color, icon } = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;

      const [updated] = await db.update(workspaces)
        .set(updates)
        .where(eq(workspaces.id, id))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error("Error updating workspace:", err);
      res.status(500).json({ error: "Failed to update workspace" });
    }
  });

  app.delete("/api/workspaces/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { id } = req.params;
      const existing = await db.select().from(workspaces)
        .where(and(eq(workspaces.id, id), eq(workspaces.ownerId, userId)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      const allWorkspaces = await db.select().from(workspaces)
        .where(eq(workspaces.ownerId, userId));

      if (allWorkspaces.length <= 1) {
        return res.status(400).json({ error: "Cannot delete the last workspace" });
      }

      await db.delete(workspaces).where(eq(workspaces.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting workspace:", err);
      res.status(500).json({ error: "Failed to delete workspace" });
    }
  });
}
