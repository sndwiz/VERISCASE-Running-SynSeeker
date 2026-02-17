import type { Express, Request, Response } from "express";
import { db } from "../db";
import { integrationConnections, syncedEmails } from "@shared/models/tables";
import { eq, desc, and, sql } from "drizzle-orm";

export function registerIntegrationRoutes(app: Express): void {
  app.get("/api/integrations", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || "system";
      const connections = await db
        .select()
        .from(integrationConnections)
        .where(eq(integrationConnections.userId, userId))
        .orderBy(desc(integrationConnections.createdAt));

      res.json(connections);
    } catch (error) {
      console.error("Integrations list error:", error);
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations/connect", async (req: Request, res: Response) => {
    try {
      const { provider, type, accountEmail, settings } = req.body;
      const user = (req as any).user;
      const userId = user?.id || "system";

      if (!provider || !type) {
        return res.status(400).json({ error: "Provider and type are required" });
      }

      const existing = await db
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.userId, userId),
            eq(integrationConnections.provider, provider),
            eq(integrationConnections.type, type)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(integrationConnections)
          .set({
            status: "connected",
            accountEmail: accountEmail || existing[0].accountEmail,
            settings: settings || existing[0].settings,
            updatedAt: new Date(),
          })
          .where(eq(integrationConnections.id, existing[0].id))
          .returning();
        return res.json(updated);
      }

      const [connection] = await db
        .insert(integrationConnections)
        .values({
          provider,
          type,
          userId,
          accountEmail: accountEmail || null,
          status: "connected",
          settings: settings || {},
        })
        .returning();

      res.json(connection);
    } catch (error) {
      console.error("Integration connect error:", error);
      res.status(500).json({ error: "Failed to connect integration" });
    }
  });

  app.delete("/api/integrations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [updated] = await db
        .update(integrationConnections)
        .set({ status: "disconnected", updatedAt: new Date() })
        .where(eq(integrationConnections.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Integration not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Integration disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect integration" });
    }
  });

  app.post("/api/integrations/:id/sync", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [connection] = await db
        .select()
        .from(integrationConnections)
        .where(eq(integrationConnections.id, id));

      if (!connection) {
        return res.status(404).json({ error: "Integration not found" });
      }

      console.log(`[Sync] Triggering sync for ${connection.provider} ${connection.type} (ID: ${id})`);

      const [updated] = await db
        .update(integrationConnections)
        .set({
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, id))
        .returning();

      res.json({
        success: true,
        message: `Sync triggered for ${connection.provider} ${connection.type}. In production, this would connect to the ${connection.provider} API to pull emails/calendar events.`,
        connection: updated,
      });
    } catch (error) {
      console.error("Integration sync error:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  app.get("/api/integrations/emails", async (req: Request, res: Response) => {
    try {
      const { matterId, connectionId } = req.query;
      const conditions = [];
      if (matterId) conditions.push(eq(syncedEmails.matterId, matterId as string));
      if (connectionId) conditions.push(eq(syncedEmails.connectionId, connectionId as string));

      const emails = await db
        .select()
        .from(syncedEmails)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(syncedEmails.receivedAt))
        .limit(100);

      res.json(emails);
    } catch (error) {
      console.error("Synced emails error:", error);
      res.status(500).json({ error: "Failed to fetch synced emails" });
    }
  });

  app.get("/api/integrations/status", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || "system";

      const connections = await db
        .select()
        .from(integrationConnections)
        .where(eq(integrationConnections.userId, userId));

      const statusMap: Record<string, any> = {};
      connections.forEach((c) => {
        statusMap[`${c.provider}_${c.type}`] = {
          id: c.id,
          provider: c.provider,
          type: c.type,
          status: c.status,
          accountEmail: c.accountEmail,
          lastSyncAt: c.lastSyncAt,
          settings: c.settings,
        };
      });

      const twilioConfigured = !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      );

      res.json({
        connections: statusMap,
        sms: {
          configured: twilioConfigured,
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
        },
      });
    } catch (error) {
      console.error("Integration status error:", error);
      res.status(500).json({ error: "Failed to fetch integration status" });
    }
  });

  app.get("/api/integrations/accounting/status", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || "system";

      const connections = await db
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.userId, userId),
            eq(integrationConnections.type, "accounting")
          )
        );

      const quickbooks = connections.find((c) => c.provider === "quickbooks");
      const xero = connections.find((c) => c.provider === "xero");

      res.json({
        quickbooks: quickbooks
          ? { connected: quickbooks.status === "connected", accountEmail: quickbooks.accountEmail, lastSyncAt: quickbooks.lastSyncAt, id: quickbooks.id }
          : { connected: false },
        xero: xero
          ? { connected: xero.status === "connected", accountEmail: xero.accountEmail, lastSyncAt: xero.lastSyncAt, id: xero.id }
          : { connected: false },
      });
    } catch (error) {
      console.error("Accounting status error:", error);
      res.status(500).json({ error: "Failed to fetch accounting status" });
    }
  });

  app.post("/api/integrations/accounting/sync-invoices", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user?.id || "system";

      const connections = await db
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.userId, userId),
            eq(integrationConnections.type, "accounting"),
            eq(integrationConnections.status, "connected")
          )
        );

      if (connections.length === 0) {
        return res.status(400).json({ error: "No accounting integration connected" });
      }

      const connection = connections[0];
      console.log(`[Accounting Sync] Would sync invoices to ${connection.provider} for user ${userId}`);

      await db
        .update(integrationConnections)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(integrationConnections.id, connection.id));

      res.json({
        success: true,
        provider: connection.provider,
        message: `Invoice sync triggered for ${connection.provider}. In production, this would push invoices and payments to your ${connection.provider} account.`,
        syncedAt: new Date().toISOString(),
        summary: {
          invoicesSynced: 0,
          paymentsSynced: 0,
          errors: 0,
        },
      });
    } catch (error) {
      console.error("Invoice sync error:", error);
      res.status(500).json({ error: "Failed to sync invoices" });
    }
  });

  app.get("/api/integrations/accounting/chart-of-accounts", async (_req: Request, res: Response) => {
    try {
      res.json({
        accounts: [
          { code: "4000", name: "Legal Services Revenue", type: "income", mappedTo: "invoices" },
          { code: "4010", name: "Consultation Fees", type: "income", mappedTo: "time_entries" },
          { code: "4020", name: "Filing Fees (Reimbursable)", type: "income", mappedTo: "expenses" },
          { code: "1200", name: "Accounts Receivable", type: "asset", mappedTo: "outstanding_invoices" },
          { code: "1100", name: "Trust Account (IOLTA)", type: "asset", mappedTo: "trust_transactions" },
          { code: "2000", name: "Accounts Payable", type: "liability", mappedTo: "vendor_bills" },
          { code: "5000", name: "Operating Expenses", type: "expense", mappedTo: "firm_expenses" },
          { code: "5010", name: "Court Filing Fees", type: "expense", mappedTo: "filing_expenses" },
          { code: "5020", name: "Expert Witness Fees", type: "expense", mappedTo: "expert_expenses" },
          { code: "5030", name: "Travel & Deposition Costs", type: "expense", mappedTo: "travel_expenses" },
        ],
        message: "Default chart of accounts mapping for legal practice. Configure mappings in your accounting integration settings.",
      });
    } catch (error) {
      console.error("Chart of accounts error:", error);
      res.status(500).json({ error: "Failed to fetch chart of accounts" });
    }
  });
}
