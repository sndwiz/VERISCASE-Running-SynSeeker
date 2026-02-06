import type { Express } from "express";
import { storage } from "../storage";
import {
  insertMatterSchema,
  updateMatterSchema,
  insertMatterContactSchema,
  updateMatterContactSchema,
  insertTimelineEventSchema,
  insertThreadSchema,
  updateThreadSchema,
  insertThreadMessageSchema,
  insertThreadDecisionSchema,
  insertResearchResultSchema,
} from "@shared/schema";
import { z } from "zod";
import { maybePageinate } from "../utils/pagination";

export function registerMatterRoutes(app: Express): void {
  app.get("/api/matters", async (req, res) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const matters = await storage.getMatters(clientId);
      res.json(maybePageinate(matters, req.query));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matters" });
    }
  });

  app.get("/api/matters/:id", async (req, res) => {
    try {
      const matter = await storage.getMatter(req.params.id);
      if (!matter) {
        return res.status(404).json({ error: "Matter not found" });
      }
      res.json(matter);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter" });
    }
  });

  app.post("/api/matters", async (req, res) => {
    try {
      // TODO: Wrap matter + board creation in a database transaction.
      // Currently the storage layer uses the db singleton and doesn't support
      // passing a transaction handle. Refactor storage to accept an optional
      // transaction parameter so both operations can be atomic.
      const data = insertMatterSchema.parse(req.body);
      const matter = await storage.createMatter(data);

      await storage.createBoard({
        name: matter.name,
        description: `Case board for ${matter.name}`,
        color: "#6366f1",
        icon: "briefcase",
        clientId: matter.clientId,
        matterId: matter.id,
      });

      res.status(201).json(matter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create matter" });
    }
  });

  app.patch("/api/matters/:id", async (req, res) => {
    try {
      const data = updateMatterSchema.parse(req.body);
      const matter = await storage.updateMatter(req.params.id, data);
      if (!matter) {
        return res.status(404).json({ error: "Matter not found" });
      }
      res.json(matter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update matter" });
    }
  });

  app.delete("/api/matters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMatter(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Matter not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete matter" });
    }
  });

  app.get("/api/matters/:matterId/contacts", async (req, res) => {
    try {
      const contacts = await storage.getMatterContacts(req.params.matterId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/matters/:matterId/contacts", async (req, res) => {
    try {
      const data = insertMatterContactSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const contact = await storage.createMatterContact(data);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const data = updateMatterContactSchema.parse(req.body);
      const contact = await storage.updateMatterContact(req.params.id, data);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMatterContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/matters/:matterId/timeline", async (req, res) => {
    try {
      const events = await storage.getTimelineEvents(req.params.matterId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch timeline events" });
    }
  });

  app.post("/api/matters/:matterId/timeline", async (req, res) => {
    try {
      const data = insertTimelineEventSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const event = await storage.createTimelineEvent(data);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create timeline event" });
    }
  });

  app.get("/api/matters/:matterId/threads", async (req, res) => {
    try {
      const threads = await storage.getThreads(req.params.matterId);
      res.json(threads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const thread = await storage.getThread(req.params.id);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      res.json(thread);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  app.post("/api/matters/:matterId/threads", async (req, res) => {
    try {
      const data = insertThreadSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const thread = await storage.createThread(data);
      res.status(201).json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  app.patch("/api/threads/:id", async (req, res) => {
    try {
      const data = updateThreadSchema.parse(req.body);
      const thread = await storage.updateThread(req.params.id, data);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      res.json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update thread" });
    }
  });

  app.get("/api/threads/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getThreadMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread messages" });
    }
  });

  app.post("/api/threads/:id/messages", async (req, res) => {
    try {
      const data = insertThreadMessageSchema.parse({
        ...req.body,
        threadId: req.params.id,
      });
      const message = await storage.createThreadMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create thread message" });
    }
  });

  app.get("/api/threads/:id/decisions", async (req, res) => {
    try {
      const decisions = await storage.getThreadDecisions(req.params.id);
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread decisions" });
    }
  });

  app.post("/api/threads/:id/decisions", async (req, res) => {
    try {
      const data = insertThreadDecisionSchema.parse({
        ...req.body,
        threadId: req.params.id,
      });
      const decision = await storage.createThreadDecision(data);
      res.status(201).json(decision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create thread decision" });
    }
  });

  app.get("/api/matters/:matterId/research", async (req, res) => {
    try {
      const results = await storage.getResearchResults(req.params.matterId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch research results" });
    }
  });

  app.post("/api/matters/:matterId/research", async (req, res) => {
    try {
      const data = insertResearchResultSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const result = await storage.createResearchResult(data);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create research result" });
    }
  });
}
