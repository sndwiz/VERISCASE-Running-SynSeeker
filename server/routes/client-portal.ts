import type { Express } from "express";
import { db } from "../db";
import { clientPortalAccess, clientPortalMessages, sharedDocuments } from "@shared/models/tables";
import { handler, notFound } from "../utils/route-handler";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";

export function registerClientPortalRoutes(app: Express): void {
  app.get("/api/client-portal/stats", handler(async (_req, res) => {
    const [activePortals, unreadMessages, sharedDocsCount, recentMessages] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(clientPortalAccess).where(eq(clientPortalAccess.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(clientPortalMessages).where(eq(clientPortalMessages.isRead, false)),
      db.select({ count: sql<number>`count(*)::int` }).from(sharedDocuments).where(eq(sharedDocuments.isActive, true)),
      db.select().from(clientPortalMessages).orderBy(desc(clientPortalMessages.createdAt)).limit(10),
    ]);
    res.json({
      activePortals: activePortals[0]?.count ?? 0,
      unreadMessages: unreadMessages[0]?.count ?? 0,
      sharedDocuments: sharedDocsCount[0]?.count ?? 0,
      recentMessages,
    });
  }));

  app.get("/api/client-portal/access", handler(async (_req, res) => {
    const records = await db.select().from(clientPortalAccess).orderBy(desc(clientPortalAccess.createdAt));
    res.json(records);
  }));

  app.post("/api/client-portal/access", handler(async (req, res) => {
    const { clientId, email, name, permissions } = req.body;
    if (!clientId || !email || !name) {
      return void res.status(400).json({ error: "clientId, email, and name are required" });
    }
    const accessToken = crypto.randomUUID();
    const [record] = await db.insert(clientPortalAccess).values({
      clientId,
      email,
      name,
      accessToken,
      permissions: permissions || ["view_matters", "view_invoices", "messaging", "view_documents"],
    }).returning();
    res.status(201).json(record);
  }));

  app.patch("/api/client-portal/access/:id", handler(async (req, res) => {
    const { id } = req.params;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.permissions !== undefined) updates.permissions = req.body.permissions;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.name !== undefined) updates.name = req.body.name;
    const [record] = await db.update(clientPortalAccess).set(updates).where(eq(clientPortalAccess.id, id)).returning();
    if (!record) return notFound(res, "Portal access record");
    res.json(record);
  }));

  app.delete("/api/client-portal/access/:id", handler(async (req, res) => {
    const [deleted] = await db.delete(clientPortalAccess).where(eq(clientPortalAccess.id, req.params.id)).returning();
    if (!deleted) return notFound(res, "Portal access record");
    res.status(204).send();
  }));

  app.get("/api/client-portal/messages", handler(async (req, res) => {
    const { clientId, matterId } = req.query;
    let conditions = [];
    if (clientId) conditions.push(eq(clientPortalMessages.clientId, clientId as string));
    if (matterId) conditions.push(eq(clientPortalMessages.matterId, matterId as string));
    const messages = conditions.length > 0
      ? await db.select().from(clientPortalMessages).where(and(...conditions)).orderBy(desc(clientPortalMessages.createdAt))
      : await db.select().from(clientPortalMessages).orderBy(desc(clientPortalMessages.createdAt));
    res.json(messages);
  }));

  app.post("/api/client-portal/messages", handler(async (req, res) => {
    const { clientId, matterId, senderName, senderId, subject, content, senderType } = req.body;
    if (!clientId || !content || !senderName || !senderId) {
      return void res.status(400).json({ error: "clientId, content, senderName, and senderId are required" });
    }
    const [message] = await db.insert(clientPortalMessages).values({
      clientId,
      matterId: matterId || null,
      senderType: senderType || "firm",
      senderName,
      senderId,
      subject: subject || null,
      content,
    }).returning();
    res.status(201).json(message);
  }));

  app.patch("/api/client-portal/messages/:id/read", handler(async (req, res) => {
    const [message] = await db.update(clientPortalMessages).set({ isRead: true }).where(eq(clientPortalMessages.id, req.params.id)).returning();
    if (!message) return notFound(res, "Message");
    res.json(message);
  }));

  app.get("/api/client-portal/documents", handler(async (req, res) => {
    const { clientId } = req.query;
    const docs = clientId
      ? await db.select().from(sharedDocuments).where(eq(sharedDocuments.clientId, clientId as string)).orderBy(desc(sharedDocuments.createdAt))
      : await db.select().from(sharedDocuments).orderBy(desc(sharedDocuments.createdAt));
    res.json(docs);
  }));

  app.post("/api/client-portal/documents", handler(async (req, res) => {
    const { clientId, matterId, fileName, fileSize, mimeType, description, sharedBy, sharedByName } = req.body;
    if (!clientId || !fileName || !sharedBy || !sharedByName) {
      return void res.status(400).json({ error: "clientId, fileName, sharedBy, and sharedByName are required" });
    }
    const [doc] = await db.insert(sharedDocuments).values({
      clientId,
      matterId: matterId || null,
      fileName,
      fileSize: fileSize || 0,
      mimeType: mimeType || null,
      description: description || null,
      sharedBy,
      sharedByName,
    }).returning();
    res.status(201).json(doc);
  }));

  app.delete("/api/client-portal/documents/:id", handler(async (req, res) => {
    const [deleted] = await db.delete(sharedDocuments).where(eq(sharedDocuments.id, req.params.id)).returning();
    if (!deleted) return notFound(res, "Shared document");
    res.status(204).send();
  }));
}
