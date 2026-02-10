import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../security/rbac";
import {
  insertRoleSchema,
  insertMatterPermissionSchema,
  insertDocumentPermissionSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerRolesPermissionsRoutes(app: Express): void {
  app.get("/api/roles", async (_req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) return res.status(404).json({ error: "Role not found" });
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", requireAdmin(), async (req, res) => {
    try {
      const data = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(data);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.patch("/api/roles/:id", requireAdmin(), async (req, res) => {
    try {
      const data = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(req.params.id, data);
      if (!role) return res.status(404).json({ error: "Role not found" });
      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", requireAdmin(), async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) return res.status(404).json({ error: "Role not found" });
      if ((role as any).isSystem) {
        return res.status(400).json({ error: "Cannot delete system role" });
      }
      await storage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  app.get("/api/matter-permissions/:matterId", async (req, res) => {
    try {
      const permissions = await storage.getMatterPermissions(req.params.matterId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter permissions" });
    }
  });

  app.post("/api/matter-permissions", requireAdmin(), async (req, res) => {
    try {
      const data = insertMatterPermissionSchema.parse(req.body);
      const permission = await storage.setMatterPermission(data);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to set matter permission" });
    }
  });

  app.delete("/api/matter-permissions/:id", requireAdmin(), async (req, res) => {
    try {
      await storage.revokeMatterPermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke matter permission" });
    }
  });

  app.get("/api/document-permissions/:documentId", async (req, res) => {
    try {
      const permissions = await storage.getDocumentPermissions(req.params.documentId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document permissions" });
    }
  });

  app.post("/api/document-permissions", requireAdmin(), async (req, res) => {
    try {
      const data = insertDocumentPermissionSchema.parse(req.body);
      const permission = await storage.setDocumentPermission(data);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to set document permission" });
    }
  });

  app.delete("/api/document-permissions/:id", requireAdmin(), async (req, res) => {
    try {
      await storage.revokeDocumentPermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke document permission" });
    }
  });
}
