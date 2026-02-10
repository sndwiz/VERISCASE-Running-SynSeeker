import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../security/rbac";
import { insertPiiPolicySchema } from "@shared/schema";
import { z } from "zod";

const DEFAULT_PII_POLICY = {
  id: null,
  name: "Default PII Policy",
  description: "Default policy for PII detection and redaction",
  enabled: true,
  autoRedact: false,
  detectionCategories: ["ssn", "email", "phone", "address", "dob"],
  redactionStyle: "mask",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function registerPIIPolicyRoutes(app: Express): void {
  app.get("/api/pii-policies", async (_req, res) => {
    try {
      const policies = await storage.getPIIPolicies();
      if (policies && policies.length > 0) {
        res.json(policies[0]);
      } else {
        res.json(DEFAULT_PII_POLICY);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch PII policies" });
    }
  });

  app.get("/api/pii-policies/:id", async (req, res) => {
    try {
      const policy = await storage.getPIIPolicy(req.params.id);
      if (!policy) return res.status(404).json({ error: "PII policy not found" });
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch PII policy" });
    }
  });

  app.post("/api/pii-policies", requireAdmin(), async (req, res) => {
    try {
      const existing = await storage.getPIIPolicies();
      if (existing && existing.length > 0) {
        return res.json(existing[0]);
      }
      const data = insertPiiPolicySchema.parse(req.body);
      const policy = await storage.createPIIPolicy(data);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create PII policy" });
    }
  });

  app.patch("/api/pii-policies/:id", requireAdmin(), async (req, res) => {
    try {
      const data = insertPiiPolicySchema.partial().parse(req.body);
      const policy = await storage.updatePIIPolicy(req.params.id, data);
      if (!policy) return res.status(404).json({ error: "PII policy not found" });
      res.json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update PII policy" });
    }
  });
}
