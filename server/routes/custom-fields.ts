import type { Express } from "express";
import { db } from "../db";
import { customFieldDefinitions, customFieldValues } from "@shared/models/tables";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

export function registerCustomFieldRoutes(app: Express): void {
  app.get("/api/custom-fields", async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const practiceArea = req.query.practiceArea as string | undefined;

      let conditions: any[] = [];
      if (entityType) conditions.push(eq(customFieldDefinitions.entityType, entityType));

      let rows;
      if (conditions.length > 0) {
        rows = await db.select().from(customFieldDefinitions).where(and(...conditions));
      } else {
        rows = await db.select().from(customFieldDefinitions);
      }

      if (practiceArea) {
        rows = rows.filter(r => !r.practiceArea || r.practiceArea === practiceArea);
      }

      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field definitions" });
    }
  });

  app.post("/api/custom-fields", async (req, res) => {
    try {
      const [row] = await db.insert(customFieldDefinitions).values({
        id: randomUUID(),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(row);
    } catch (error) {
      res.status(500).json({ error: "Failed to create custom field definition" });
    }
  });

  app.patch("/api/custom-fields/:id", async (req, res) => {
    try {
      const [row] = await db.update(customFieldDefinitions)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(customFieldDefinitions.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: "Custom field definition not found" });
      res.json(row);
    } catch (error) {
      res.status(500).json({ error: "Failed to update custom field definition" });
    }
  });

  app.delete("/api/custom-fields/:id", async (req, res) => {
    try {
      await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom field definition" });
    }
  });

  app.get("/api/custom-fields/values/:entityType/:entityId", async (req, res) => {
    try {
      const rows = await db.select().from(customFieldValues)
        .where(and(
          eq(customFieldValues.entityId, req.params.entityId),
        ));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field values" });
    }
  });

  app.put("/api/custom-fields/values/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { values } = req.body as { values: Array<{ fieldDefinitionId: string; value: string | null }> };

      if (!Array.isArray(values)) {
        return res.status(400).json({ error: "values must be an array" });
      }

      const results = [];
      for (const v of values) {
        const existing = await db.select().from(customFieldValues)
          .where(and(
            eq(customFieldValues.fieldDefinitionId, v.fieldDefinitionId),
            eq(customFieldValues.entityId, entityId),
          ))
          .limit(1);

        if (existing.length > 0) {
          const [updated] = await db.update(customFieldValues)
            .set({ value: v.value as any, updatedBy: "system", updatedAt: new Date() })
            .where(eq(customFieldValues.id, existing[0].id))
            .returning();
          results.push(updated);
        } else {
          const [inserted] = await db.insert(customFieldValues).values({
            id: randomUUID(),
            fieldDefinitionId: v.fieldDefinitionId,
            entityId,
            value: v.value as any,
            updatedBy: "system",
            updatedAt: new Date(),
          }).returning();
          results.push(inserted);
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to upsert custom field values" });
    }
  });

  app.get("/api/custom-field-values/:entityId", async (req, res) => {
    try {
      const rows = await db.select().from(customFieldValues)
        .where(eq(customFieldValues.entityId, req.params.entityId));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field values" });
    }
  });

  app.post("/api/custom-field-values", async (req, res) => {
    try {
      const [row] = await db.insert(customFieldValues).values({
        id: randomUUID(),
        ...req.body,
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(row);
    } catch (error) {
      res.status(500).json({ error: "Failed to set custom field value" });
    }
  });
}
