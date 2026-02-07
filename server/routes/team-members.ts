import type { Express } from "express";
import { db } from "../db";
import { teamMembers } from "@shared/models/tables";
import { insertTeamMemberSchema, updateTeamMemberSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function registerTeamMemberRoutes(app: Express): void {
  app.get("/api/team-members", async (_req, res) => {
    try {
      const members = await db.select().from(teamMembers).orderBy(teamMembers.lastName);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/team-members/:id", async (req, res) => {
    try {
      const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, req.params.id));
      if (!member) return res.status(404).json({ error: "Team member not found" });
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team member" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const data = insertTeamMemberSchema.parse(req.body);
      const [member] = await db.insert(teamMembers).values(data).returning();
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.patch("/api/team-members/:id", async (req, res) => {
    try {
      const data = updateTeamMemberSchema.parse(req.body);
      const [member] = await db.update(teamMembers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(teamMembers.id, req.params.id))
        .returning();
      if (!member) return res.status(404).json({ error: "Team member not found" });
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const [deleted] = await db.delete(teamMembers)
        .where(eq(teamMembers.id, req.params.id))
        .returning();
      if (!deleted) return res.status(404).json({ error: "Team member not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });
}
