import type { Express } from "express";
import { storage } from "../storage";
import {
  insertFileItemSchema,
  insertDocProfileSchema,
  insertFilingTagSchema,
  insertPeopleOrgSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerFilingRoutes(app: Express): void {
  app.get("/api/matters/:matterId/files", async (req, res) => {
    try {
      const files = await storage.getFileItemsWithProfiles(req.params.matterId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getFileItemWithProfile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  app.post("/api/matters/:matterId/files", async (req, res) => {
    try {
      const data = insertFileItemSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const file = await storage.createFileItem(data);
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create file" });
    }
  });

  app.patch("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.updateFileItem(req.params.id, req.body);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      await storage.deleteFileItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  app.get("/api/files/:fileId/profile", async (req, res) => {
    try {
      const profile = await storage.getDocProfile(req.params.fileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/files/:fileId/profile", async (req, res) => {
    try {
      const data = insertDocProfileSchema.parse({
        ...req.body,
        fileId: req.params.fileId,
      });
      const profile = await storage.createDocProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.patch("/api/files/:fileId/profile", async (req, res) => {
    try {
      const profile = await storage.updateDocProfile(req.params.fileId, req.body);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.delete("/api/files/:fileId/profile", async (req, res) => {
    try {
      await storage.deleteDocProfile(req.params.fileId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  app.get("/api/filing-tags", async (req, res) => {
    try {
      const tags = await storage.getFilingTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/filing-tags", async (req, res) => {
    try {
      const data = insertFilingTagSchema.parse(req.body);
      const tag = await storage.createFilingTag(data);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.delete("/api/filing-tags/:id", async (req, res) => {
    try {
      await storage.deleteFilingTag(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  app.get("/api/files/:fileId/tags", async (req, res) => {
    try {
      const tags = await storage.getFileItemTags(req.params.fileId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file tags" });
    }
  });

  app.post("/api/files/:fileId/tags/:tagId", async (req, res) => {
    try {
      await storage.addTagToFileItem(req.params.fileId, req.params.tagId);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to add tag to file" });
    }
  });

  app.delete("/api/files/:fileId/tags/:tagId", async (req, res) => {
    try {
      await storage.removeTagFromFileItem(req.params.fileId, req.params.tagId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove tag from file" });
    }
  });

  app.get("/api/matters/:matterId/people-orgs", async (req, res) => {
    try {
      const entities = await storage.getPeopleOrgs(req.params.matterId);
      res.json(entities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people/orgs" });
    }
  });

  app.get("/api/people-orgs", async (req, res) => {
    try {
      const matterId = req.query.matterId as string | undefined;
      const entities = await storage.getPeopleOrgs(matterId);
      res.json(entities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people/orgs" });
    }
  });

  app.post("/api/people-orgs", async (req, res) => {
    try {
      const data = insertPeopleOrgSchema.parse(req.body);
      const entity = await storage.createPeopleOrg(data);
      res.status(201).json(entity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create person/org" });
    }
  });

  app.patch("/api/people-orgs/:id", async (req, res) => {
    try {
      const entity = await storage.updatePeopleOrg(req.params.id, req.body);
      if (!entity) {
        return res.status(404).json({ error: "Person/org not found" });
      }
      res.json(entity);
    } catch (error) {
      res.status(500).json({ error: "Failed to update person/org" });
    }
  });

  app.delete("/api/people-orgs/:id", async (req, res) => {
    try {
      await storage.deletePeopleOrg(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete person/org" });
    }
  });
}
