import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertBoardSchema,
  insertGroupSchema,
  insertTaskSchema,
  updateTaskSchema,
  updateBoardSchema,
  updateGroupSchema,
  insertAIConversationSchema,
  insertAIMessageSchema,
  insertClientSchema,
  updateClientSchema,
  insertMatterSchema,
  updateMatterSchema,
  insertMatterContactSchema,
  updateMatterContactSchema,
  insertEvidenceVaultFileSchema,
  updateEvidenceVaultFileSchema,
  insertOCRJobSchema,
  insertTimelineEventSchema,
  insertThreadSchema,
  updateThreadSchema,
  insertThreadMessageSchema,
  insertThreadDecisionSchema,
  insertResearchResultSchema,
  insertAutomationRuleSchema,
  updateAutomationRuleSchema,
  insertDetectiveNodeSchema,
  updateDetectiveNodeSchema,
  insertDetectiveConnectionSchema,
  updateDetectiveConnectionSchema,
} from "@shared/schema";
import { z } from "zod";
import { registerChatRoutes } from "./replit_integrations/chat/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ BOARDS ============

  // Get all boards
  app.get("/api/boards", async (_req, res) => {
    try {
      const boards = await storage.getBoards();
      res.json(boards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch boards" });
    }
  });

  // Get single board
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

  // Create board
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

  // Update board
  app.patch("/api/boards/:id", async (req, res) => {
    try {
      const data = updateBoardSchema.parse(req.body);
      const board = await storage.updateBoard(req.params.id, data);
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

  // Delete board
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

  // ============ GROUPS ============

  // Get groups for a board
  app.get("/api/boards/:boardId/groups", async (req, res) => {
    try {
      const groups = await storage.getGroups(req.params.boardId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // Create group
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

  // Update group
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

  // Delete group
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

  // ============ TASKS ============

  // Get tasks for a board
  app.get("/api/boards/:boardId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.params.boardId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get recent tasks
  app.get("/api/tasks/recent", async (_req, res) => {
    try {
      const tasks = await storage.getRecentTasks(10);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent tasks" });
    }
  });

  // Get single task
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

  // Create task
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

  // Update task
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

  // Delete task
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

  // ============ CLIENTS ============

  app.get("/api/clients", async (_req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const data = updateClientSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // ============ MATTERS ============

  app.get("/api/matters", async (req, res) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const matters = await storage.getMatters(clientId);
      res.json(matters);
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
      const data = insertMatterSchema.parse(req.body);
      const matter = await storage.createMatter(data);
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

  // ============ MATTER CONTACTS ============

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

  // ============ EVIDENCE VAULT ============

  app.get("/api/matters/:matterId/evidence", async (req, res) => {
    try {
      const files = await storage.getEvidenceVaultFiles(req.params.matterId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence files" });
    }
  });

  app.get("/api/evidence/:id", async (req, res) => {
    try {
      const file = await storage.getEvidenceVaultFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence file" });
    }
  });

  app.post("/api/matters/:matterId/evidence", async (req, res) => {
    try {
      const data = insertEvidenceVaultFileSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const file = await storage.createEvidenceVaultFile(data);
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create evidence file" });
    }
  });

  app.patch("/api/evidence/:id", async (req, res) => {
    try {
      const data = updateEvidenceVaultFileSchema.parse(req.body);
      // Note: Storage layer enforces immutability - only metadata fields can be updated
      const file = await storage.updateEvidenceVaultFile(req.params.id, data);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update evidence file" });
    }
  });

  // Add chain of custody entry (append-only audit trail)
  app.post("/api/evidence/:id/custody", async (req, res) => {
    try {
      const { action, by, notes } = req.body;
      if (!action || !by) {
        return res.status(400).json({ error: "action and by are required" });
      }
      const file = await storage.addChainOfCustodyEntry(req.params.id, action, by, notes);
      if (!file) {
        return res.status(404).json({ error: "Evidence file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to add custody entry" });
    }
  });

  // ============ OCR JOBS ============

  app.get("/api/ocr-jobs", async (req, res) => {
    try {
      const matterId = req.query.matterId as string | undefined;
      const jobs = await storage.getOCRJobs(matterId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR jobs" });
    }
  });

  app.get("/api/ocr-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getOCRJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "OCR job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OCR job" });
    }
  });

  app.post("/api/ocr-jobs", async (req, res) => {
    try {
      const data = insertOCRJobSchema.parse(req.body);
      const job = await storage.createOCRJob(data);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create OCR job" });
    }
  });

  // ============ TIMELINE ============

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

  // ============ THREADS ============

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

  // ============ RESEARCH ============

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

  // ============ AUTOMATIONS ============

  app.get("/api/boards/:boardId/automations", async (req, res) => {
    try {
      const rules = await storage.getAutomationRules(req.params.boardId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation rules" });
    }
  });

  app.get("/api/automations/:id", async (req, res) => {
    try {
      const rule = await storage.getAutomationRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation rule" });
    }
  });

  app.post("/api/boards/:boardId/automations", async (req, res) => {
    try {
      const data = insertAutomationRuleSchema.parse({
        ...req.body,
        boardId: req.params.boardId,
      });
      const rule = await storage.createAutomationRule(data);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create automation rule" });
    }
  });

  app.patch("/api/automations/:id", async (req, res) => {
    try {
      const data = updateAutomationRuleSchema.parse(req.body);
      const rule = await storage.updateAutomationRule(req.params.id, data);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update automation rule" });
    }
  });

  app.delete("/api/automations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAutomationRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete automation rule" });
    }
  });

  // ============ DETECTIVE BOARD ============

  app.get("/api/matters/:matterId/detective/nodes", async (req, res) => {
    try {
      const nodes = await storage.getDetectiveNodes(req.params.matterId);
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detective nodes" });
    }
  });

  app.post("/api/matters/:matterId/detective/nodes", async (req, res) => {
    try {
      const data = insertDetectiveNodeSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const node = await storage.createDetectiveNode(data);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create detective node" });
    }
  });

  app.patch("/api/detective/nodes/:id", async (req, res) => {
    try {
      const data = updateDetectiveNodeSchema.parse(req.body);
      const node = await storage.updateDetectiveNode(req.params.id, data);
      if (!node) {
        return res.status(404).json({ error: "Detective node not found" });
      }
      res.json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update detective node" });
    }
  });

  app.delete("/api/detective/nodes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDetectiveNode(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Detective node not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete detective node" });
    }
  });

  app.get("/api/matters/:matterId/detective/connections", async (req, res) => {
    try {
      const connections = await storage.getDetectiveConnections(req.params.matterId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detective connections" });
    }
  });

  app.post("/api/matters/:matterId/detective/connections", async (req, res) => {
    try {
      const data = insertDetectiveConnectionSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const connection = await storage.createDetectiveConnection(data);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create detective connection" });
    }
  });

  app.patch("/api/detective/connections/:id", async (req, res) => {
    try {
      const data = updateDetectiveConnectionSchema.parse(req.body);
      const connection = await storage.updateDetectiveConnection(req.params.id, data);
      if (!connection) {
        return res.status(404).json({ error: "Detective connection not found" });
      }
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update detective connection" });
    }
  });

  app.delete("/api/detective/connections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDetectiveConnection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Detective connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete detective connection" });
    }
  });

  // ============ AI CONVERSATIONS ============

  app.get("/api/ai/conversations", async (_req, res) => {
    try {
      const conversations = await storage.getAIConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI conversations" });
    }
  });

  app.get("/api/ai/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getAIConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getAIMessages(req.params.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/ai/conversations", async (req, res) => {
    try {
      const data = insertAIConversationSchema.parse(req.body);
      const conversation = await storage.createAIConversation(data);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/ai/conversations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAIConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/ai/conversations/:id/messages", async (req, res) => {
    try {
      const data = insertAIMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
      });
      const message = await storage.createAIMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Register Anthropic chat routes
  registerChatRoutes(app);

  return httpServer;
}
