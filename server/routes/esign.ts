import type { Express, Request, Response } from "express";
import { db } from "../db";
import { esignEnvelopes, esignSigners, esignAuditTrail } from "@shared/models/tables";
import { eq, desc, and, sql, count } from "drizzle-orm";
import crypto from "crypto";

export function registerEsignRoutes(app: Express): void {
  app.get("/api/esign/stats", async (_req: Request, res: Response) => {
    try {
      const [pending, completed, declined, total] = await Promise.all([
        db.select({ count: count() }).from(esignEnvelopes).where(
          sql`${esignEnvelopes.status} IN ('sent', 'partially_signed')`
        ),
        db.select({ count: count() }).from(esignEnvelopes).where(eq(esignEnvelopes.status, "completed")),
        db.select({ count: count() }).from(esignEnvelopes).where(
          sql`${esignEnvelopes.status} IN ('declined', 'expired')`
        ),
        db.select({ count: count() }).from(esignEnvelopes),
      ]);
      res.json({
        pending: pending[0]?.count ?? 0,
        completed: completed[0]?.count ?? 0,
        declined: declined[0]?.count ?? 0,
        total: total[0]?.count ?? 0,
      });
    } catch (error) {
      console.error("E-Sign stats error:", error);
      res.status(500).json({ error: "Failed to fetch e-sign stats" });
    }
  });

  app.get("/api/esign/envelopes", async (req: Request, res: Response) => {
    try {
      const { status, matterId, clientId } = req.query;
      const conditions = [];
      if (status && status !== "all") {
        if (status === "awaiting") {
          conditions.push(sql`${esignEnvelopes.status} IN ('sent', 'partially_signed')`);
        } else if (status === "declined_expired") {
          conditions.push(sql`${esignEnvelopes.status} IN ('declined', 'expired')`);
        } else {
          conditions.push(eq(esignEnvelopes.status, status as string));
        }
      }
      if (matterId) conditions.push(eq(esignEnvelopes.matterId, matterId as string));
      if (clientId) conditions.push(eq(esignEnvelopes.clientId, clientId as string));

      const envelopes = await db
        .select()
        .from(esignEnvelopes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(esignEnvelopes.createdAt));

      const envelopeIds = envelopes.map(e => e.id);
      let signersByEnvelope: Record<string, any[]> = {};
      if (envelopeIds.length > 0) {
        const allSigners = await db
          .select()
          .from(esignSigners)
          .where(sql`${esignSigners.envelopeId} IN ${envelopeIds}`);
        for (const s of allSigners) {
          if (!signersByEnvelope[s.envelopeId]) signersByEnvelope[s.envelopeId] = [];
          signersByEnvelope[s.envelopeId].push(s);
        }
      }

      const result = envelopes.map(e => ({
        ...e,
        signers: signersByEnvelope[e.id] || [],
      }));
      res.json(result);
    } catch (error) {
      console.error("E-Sign list error:", error);
      res.status(500).json({ error: "Failed to fetch envelopes" });
    }
  });

  app.post("/api/esign/envelopes", async (req: Request, res: Response) => {
    try {
      const { title, documentName, message, matterId, clientId, expiresAt, signers } = req.body;
      const user = (req as any).user;
      const createdBy = user?.id || "system";
      const createdByName = user?.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user?.email || "System";

      const [envelope] = await db.insert(esignEnvelopes).values({
        title,
        documentName,
        message: message || null,
        matterId: matterId || null,
        clientId: clientId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "draft",
        createdBy,
        createdByName,
      }).returning();

      if (signers && Array.isArray(signers) && signers.length > 0) {
        const signerValues = signers.map((s: any, idx: number) => ({
          envelopeId: envelope.id,
          name: s.name,
          email: s.email,
          role: s.role || null,
          order: idx + 1,
          status: "pending",
        }));
        await db.insert(esignSigners).values(signerValues);
      }

      await db.insert(esignAuditTrail).values({
        envelopeId: envelope.id,
        action: "created",
        actorName: createdByName,
        actorEmail: user?.email || null,
        ipAddress: req.ip || null,
        details: `Envelope "${title}" created`,
      });

      const createdSigners = await db
        .select()
        .from(esignSigners)
        .where(eq(esignSigners.envelopeId, envelope.id));

      res.status(201).json({ ...envelope, signers: createdSigners });
    } catch (error) {
      console.error("E-Sign create error:", error);
      res.status(500).json({ error: "Failed to create envelope" });
    }
  });

  app.get("/api/esign/envelopes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [envelope] = await db.select().from(esignEnvelopes).where(eq(esignEnvelopes.id, id));
      if (!envelope) return res.status(404).json({ error: "Envelope not found" });

      const [signers, auditTrail] = await Promise.all([
        db.select().from(esignSigners).where(eq(esignSigners.envelopeId, id)).orderBy(esignSigners.order),
        db.select().from(esignAuditTrail).where(eq(esignAuditTrail.envelopeId, id)).orderBy(desc(esignAuditTrail.createdAt)),
      ]);

      res.json({ ...envelope, signers, auditTrail });
    } catch (error) {
      console.error("E-Sign detail error:", error);
      res.status(500).json({ error: "Failed to fetch envelope" });
    }
  });

  app.patch("/api/esign/envelopes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, message, title, documentName } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (message !== undefined) updates.message = message;
      if (title) updates.title = title;
      if (documentName) updates.documentName = documentName;

      const [updated] = await db.update(esignEnvelopes).set(updates).where(eq(esignEnvelopes.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Envelope not found" });
      res.json(updated);
    } catch (error) {
      console.error("E-Sign update error:", error);
      res.status(500).json({ error: "Failed to update envelope" });
    }
  });

  app.post("/api/esign/envelopes/:id/send", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [envelope] = await db.select().from(esignEnvelopes).where(eq(esignEnvelopes.id, id));
      if (!envelope) return res.status(404).json({ error: "Envelope not found" });

      const signers = await db.select().from(esignSigners).where(eq(esignSigners.envelopeId, id));
      if (signers.length === 0) return res.status(400).json({ error: "No signers added to envelope" });

      for (const signer of signers) {
        const token = crypto.randomUUID();
        await db.update(esignSigners)
          .set({ signingToken: token, status: "sent" })
          .where(eq(esignSigners.id, signer.id));
      }

      await db.update(esignEnvelopes).set({ status: "sent", updatedAt: new Date() }).where(eq(esignEnvelopes.id, id));

      const user = (req as any).user;
      const actorName = user?.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user?.email || "System";

      await db.insert(esignAuditTrail).values({
        envelopeId: id,
        action: "sent",
        actorName,
        actorEmail: user?.email || null,
        ipAddress: req.ip || null,
        details: `Envelope sent to ${signers.length} signer(s)`,
      });

      const updatedSigners = await db.select().from(esignSigners).where(eq(esignSigners.envelopeId, id));
      res.json({ ...envelope, status: "sent", signers: updatedSigners });
    } catch (error) {
      console.error("E-Sign send error:", error);
      res.status(500).json({ error: "Failed to send envelope" });
    }
  });

  app.post("/api/esign/envelopes/:id/void", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(esignEnvelopes)
        .set({ status: "voided", updatedAt: new Date() })
        .where(eq(esignEnvelopes.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Envelope not found" });

      const user = (req as any).user;
      const actorName = user?.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user?.email || "System";

      await db.insert(esignAuditTrail).values({
        envelopeId: id,
        action: "voided",
        actorName,
        actorEmail: user?.email || null,
        ipAddress: req.ip || null,
        details: req.body.reason || "Envelope voided",
      });

      res.json(updated);
    } catch (error) {
      console.error("E-Sign void error:", error);
      res.status(500).json({ error: "Failed to void envelope" });
    }
  });

  app.post("/api/esign/envelopes/:id/signers/:signerId/sign", async (req: Request, res: Response) => {
    try {
      const { id, signerId } = req.params;
      const { signatureData } = req.body;

      const [signer] = await db.select().from(esignSigners)
        .where(and(eq(esignSigners.id, signerId), eq(esignSigners.envelopeId, id)));
      if (!signer) return res.status(404).json({ error: "Signer not found" });

      await db.update(esignSigners).set({
        status: "signed",
        signedAt: new Date(),
        signatureData: signatureData || null,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      }).where(eq(esignSigners.id, signerId));

      await db.insert(esignAuditTrail).values({
        envelopeId: id,
        action: "signed",
        actorName: signer.name,
        actorEmail: signer.email,
        ipAddress: req.ip || null,
        details: `${signer.name} signed the document`,
      });

      const allSigners = await db.select().from(esignSigners).where(eq(esignSigners.envelopeId, id));
      const allSigned = allSigners.every(s => s.status === "signed");

      if (allSigned) {
        await db.update(esignEnvelopes).set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(esignEnvelopes.id, id));

        await db.insert(esignAuditTrail).values({
          envelopeId: id,
          action: "completed",
          actorName: "System",
          details: "All signers have signed. Envelope completed.",
        });
      } else {
        const signedCount = allSigners.filter(s => s.status === "signed").length;
        if (signedCount > 0 && signedCount < allSigners.length) {
          await db.update(esignEnvelopes).set({
            status: "partially_signed",
            updatedAt: new Date(),
          }).where(eq(esignEnvelopes.id, id));
        }
      }

      res.json({ success: true, allSigned });
    } catch (error) {
      console.error("E-Sign sign error:", error);
      res.status(500).json({ error: "Failed to record signature" });
    }
  });

  app.post("/api/esign/envelopes/:id/signers/:signerId/decline", async (req: Request, res: Response) => {
    try {
      const { id, signerId } = req.params;
      const { reason } = req.body;

      const [signer] = await db.select().from(esignSigners)
        .where(and(eq(esignSigners.id, signerId), eq(esignSigners.envelopeId, id)));
      if (!signer) return res.status(404).json({ error: "Signer not found" });

      await db.update(esignSigners).set({
        status: "declined",
        declinedAt: new Date(),
        declineReason: reason || null,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      }).where(eq(esignSigners.id, signerId));

      await db.update(esignEnvelopes).set({
        status: "declined",
        updatedAt: new Date(),
      }).where(eq(esignEnvelopes.id, id));

      await db.insert(esignAuditTrail).values({
        envelopeId: id,
        action: "declined",
        actorName: signer.name,
        actorEmail: signer.email,
        ipAddress: req.ip || null,
        details: reason ? `${signer.name} declined: ${reason}` : `${signer.name} declined to sign`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("E-Sign decline error:", error);
      res.status(500).json({ error: "Failed to decline signature" });
    }
  });

  app.get("/api/esign/envelopes/:id/audit-trail", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const trail = await db
        .select()
        .from(esignAuditTrail)
        .where(eq(esignAuditTrail.envelopeId, id))
        .orderBy(desc(esignAuditTrail.createdAt));
      res.json(trail);
    } catch (error) {
      console.error("E-Sign audit trail error:", error);
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  });
}
