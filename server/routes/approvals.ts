import type { Express } from "express";
import { storage } from "../storage";
import { insertApprovalRequestSchema, updateApprovalRequestSchema, insertApprovalCommentSchema } from "@shared/schema";
import type { ApprovalInitial } from "@shared/schema";
import { z } from "zod";

const initialSchema = z.object({
  field: z.string().min(1),
});

export function registerApprovalRoutes(app: Express): void {
  app.get("/api/approvals", async (req, res) => {
    try {
      const { matterId } = req.query;
      const requests = await storage.getApprovalRequests(matterId as string | undefined);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approval requests" });
    }
  });

  app.get("/api/approvals/:id", async (req, res) => {
    try {
      const request = await storage.getApprovalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approval request" });
    }
  });

  app.post("/api/approvals", async (req, res) => {
    try {
      const dbUser = req.dbUser;
      const userName = dbUser ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email : "Unknown User";
      const body = {
        ...req.body,
        requestedBy: req.body.requestedBy || dbUser?.id || "unknown",
        requestedByName: req.body.requestedByName || userName,
      };
      const data = insertApprovalRequestSchema.parse(body);
      const request = await storage.createApprovalRequest(data);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create approval request" });
    }
  });

  app.patch("/api/approvals/:id", async (req, res) => {
    try {
      const data = updateApprovalRequestSchema.parse(req.body);
      const request = await storage.updateApprovalRequest(req.params.id, data);
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update approval request" });
    }
  });

  app.delete("/api/approvals/:id", async (req, res) => {
    try {
      await storage.deleteApprovalRequest(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete approval request" });
    }
  });

  app.post("/api/approvals/:id/comments", async (req, res) => {
    try {
      const dbUser = req.dbUser;
      const body = {
        ...req.body,
        approvalId: req.params.id,
        userId: req.body.userId || dbUser?.id || "unknown",
        userName: req.body.userName || (dbUser ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email : "Unknown User"),
      };
      const data = insertApprovalCommentSchema.parse(body);
      const comment = await storage.addApprovalComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  app.post("/api/approvals/:id/initials", async (req, res) => {
    try {
      const dbUser = req.dbUser;
      const { field } = initialSchema.parse(req.body);
      const userName = dbUser ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email : "User";
      const initial: ApprovalInitial = {
        userId: dbUser?.id || "unknown",
        userName,
        field,
        at: new Date().toISOString(),
      };
      const updated = await storage.addApprovalInitial(req.params.id, initial);
      if (!updated) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add initial" });
    }
  });
}
