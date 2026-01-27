import type { Express } from "express";
import { storage } from "../storage";
import {
  insertDetectiveNodeSchema,
  updateDetectiveNodeSchema,
  insertDetectiveConnectionSchema,
  updateDetectiveConnectionSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerDetectiveRoutes(app: Express): void {
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
}
