import { Express } from "express";
import { db } from "../db";
import { billingProfiles, billingReviewLogs, billingPipelineResults } from "@shared/models/tables";
import { insertBillingProfileSchema, insertBillingReviewLogSchema, insertBillingPipelineResultSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserId } from "../utils/auth";

export function registerBillingVerifierRoutes(app: Express) {
  app.get("/api/billing-verifier/profiles", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const profiles = await db
        .select()
        .from(billingProfiles)
        .where(eq(billingProfiles.userId, userId))
        .orderBy(desc(billingProfiles.updatedAt));

      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  app.get("/api/billing-verifier/profiles/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const id = req.params.id as string;
      const [profile] = await db
        .select()
        .from(billingProfiles)
        .where(and(eq(billingProfiles.id, id), eq(billingProfiles.userId, userId)));

      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/billing-verifier/profiles", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertBillingProfileSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const [profile] = await db
        .insert(billingProfiles)
        .values({ ...parsed.data, userId })
        .returning();

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.put("/api/billing-verifier/profiles/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const id = req.params.id as string;
      const parsed = insertBillingProfileSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const [updated] = await db
        .update(billingProfiles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(billingProfiles.id, id), eq(billingProfiles.userId, userId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Profile not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.delete("/api/billing-verifier/profiles/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const id = req.params.id as string;
      await db
        .delete(billingProfiles)
        .where(and(eq(billingProfiles.id, id), eq(billingProfiles.userId, userId)));

      res.json({ message: "Profile deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  app.post("/api/billing-verifier/reviews", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertBillingReviewLogSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const [log] = await db
        .insert(billingReviewLogs)
        .values({ ...parsed.data, userId })
        .returning();

      res.json(log);
    } catch (error) {
      res.status(500).json({ error: "Failed to save review log" });
    }
  });

  app.get("/api/billing-verifier/reviews", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const profileId = req.query.profileId as string | undefined;
      const conditions = [eq(billingReviewLogs.userId, userId)];
      if (profileId) conditions.push(eq(billingReviewLogs.profileId, profileId));

      const logs = await db
        .select()
        .from(billingReviewLogs)
        .where(and(...conditions))
        .orderBy(desc(billingReviewLogs.createdAt))
        .limit(20);

      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch review logs" });
    }
  });

  app.post("/api/billing-verifier/results", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertBillingPipelineResultSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const [result] = await db
        .insert(billingPipelineResults)
        .values({ ...parsed.data, userId })
        .returning();

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to save pipeline results" });
    }
  });

  app.get("/api/billing-verifier/results", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const profileId = req.query.profileId as string | undefined;
      const conditions = [eq(billingPipelineResults.userId, userId)];
      if (profileId) conditions.push(eq(billingPipelineResults.profileId, profileId));

      const results = await db
        .select()
        .from(billingPipelineResults)
        .where(and(...conditions))
        .orderBy(desc(billingPipelineResults.createdAt))
        .limit(10);

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  app.get("/api/billing-verifier/integration-status", async (_req, res) => {
    res.json({
      clio: { configured: !!process.env.CLIO_CLIENT_ID, connected: false },
      monday: { configured: !!process.env.MONDAY_API_TOKEN },
      hubspot: { configured: !!process.env.HUBSPOT_API_KEY },
    });
  });
}
