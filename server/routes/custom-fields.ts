import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../security/rbac";
import {
  insertCustomFieldDefinitionSchema,
  insertCustomFieldValueSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerCustomFieldRoutes(app: Express): void {
  app.get("/api/custom-fields", async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const definitions = await storage.getCustomFieldDefinitions(entityType);
      res.json(definitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field definitions" });
    }
  });

  app.post("/api/custom-fields", requireAdmin(), async (req, res) => {
    try {
      const data = insertCustomFieldDefinitionSchema.parse(req.body);
      const definition = await storage.createCustomFieldDefinition(data);
      res.status(201).json(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create custom field definition" });
    }
  });

  app.patch("/api/custom-fields/:id", requireAdmin(), async (req, res) => {
    try {
      const data = insertCustomFieldDefinitionSchema.partial().parse(req.body);
      const definition = await storage.updateCustomFieldDefinition(req.params.id as string, data);
      if (!definition) return res.status(404).json({ error: "Custom field definition not found" });
      res.json(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update custom field definition" });
    }
  });

  app.delete("/api/custom-fields/:id", requireAdmin(), async (req, res) => {
    try {
      await storage.deleteCustomFieldDefinition(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom field definition" });
    }
  });

  app.get("/api/custom-field-values/:entityId", async (req, res) => {
    try {
      const values = await storage.getCustomFieldValues(req.params.entityId);
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field values" });
    }
  });

  app.post("/api/custom-field-values", async (req, res) => {
    try {
      const data = insertCustomFieldValueSchema.parse(req.body);
      const value = await storage.setCustomFieldValue(data);
      res.status(201).json(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to set custom field value" });
    }
  });
}
