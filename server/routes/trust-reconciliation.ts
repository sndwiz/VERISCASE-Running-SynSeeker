import type { Express } from "express";
import { db } from "../db";
import { trustReconciliationBatches, bankStatementEntries, trustTransactions, clients } from "@shared/models/tables";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";

const createBatchSchema = z.object({
  name: z.string().min(1),
  bankAccountName: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  bankStatementBalance: z.number(),
});

const updateBatchSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  adjustments: z.array(z.any()).optional(),
  bankStatementBalance: z.number().optional(),
  name: z.string().optional(),
});

const bankEntrySchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  reference: z.string().optional(),
});

export function registerTrustReconciliationRoutes(app: Express): void {
  app.get("/api/trust/reconciliation", async (_req, res) => {
    try {
      const batches = await db
        .select()
        .from(trustReconciliationBatches)
        .orderBy(desc(trustReconciliationBatches.createdAt));
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reconciliation batches" });
    }
  });

  app.post("/api/trust/reconciliation", async (req, res) => {
    try {
      const dbUser = req.dbUser;
      const data = createBatchSchema.parse(req.body);
      const [batch] = await db
        .insert(trustReconciliationBatches)
        .values({
          ...data,
          createdBy: dbUser?.id || "unknown",
        })
        .returning();
      res.status(201).json(batch);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create reconciliation batch" });
    }
  });

  app.get("/api/trust/reconciliation/:id", async (req, res) => {
    try {
      const [batch] = await db
        .select()
        .from(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      if (!batch) return res.status(404).json({ error: "Batch not found" });

      const entries = await db
        .select()
        .from(bankStatementEntries)
        .where(eq(bankStatementEntries.batchId, batch.id))
        .orderBy(bankStatementEntries.date);

      const transactions = await db
        .select()
        .from(trustTransactions)
        .where(
          and(
            gte(trustTransactions.date, batch.periodStart),
            lte(trustTransactions.date, batch.periodEnd)
          )
        )
        .orderBy(trustTransactions.date);

      res.json({ ...batch, entries, transactions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reconciliation batch" });
    }
  });

  app.patch("/api/trust/reconciliation/:id", async (req, res) => {
    try {
      const data = updateBatchSchema.parse(req.body);
      const [batch] = await db
        .update(trustReconciliationBatches)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(trustReconciliationBatches.id, req.params.id))
        .returning();
      if (!batch) return res.status(404).json({ error: "Batch not found" });
      res.json(batch);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to update batch" });
    }
  });

  app.delete("/api/trust/reconciliation/:id", async (req, res) => {
    try {
      const [batch] = await db
        .select()
        .from(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      if (!batch) return res.status(404).json({ error: "Batch not found" });
      if (batch.status !== "draft") {
        return res.status(400).json({ error: "Only draft batches can be deleted" });
      }
      await db
        .delete(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete batch" });
    }
  });

  app.post("/api/trust/reconciliation/:id/entries", async (req, res) => {
    try {
      const entriesData = z.array(bankEntrySchema).parse(req.body);
      const [batch] = await db
        .select()
        .from(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      if (!batch) return res.status(404).json({ error: "Batch not found" });

      const inserted = await db
        .insert(bankStatementEntries)
        .values(
          entriesData.map((e) => ({
            batchId: batch.id,
            date: e.date,
            description: e.description,
            amount: e.amount,
            reference: e.reference || null,
          }))
        )
        .returning();
      res.status(201).json(inserted);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to import bank statement entries" });
    }
  });

  app.post("/api/trust/reconciliation/:id/auto-match", async (req, res) => {
    try {
      const [batch] = await db
        .select()
        .from(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      if (!batch) return res.status(404).json({ error: "Batch not found" });

      const entries = await db
        .select()
        .from(bankStatementEntries)
        .where(
          and(
            eq(bankStatementEntries.batchId, batch.id),
            eq(bankStatementEntries.matchStatus, "unmatched")
          )
        );

      const transactions = await db
        .select()
        .from(trustTransactions)
        .where(
          and(
            gte(trustTransactions.date, batch.periodStart),
            lte(trustTransactions.date, batch.periodEnd)
          )
        );

      const matchedTxIds = new Set<string>();
      const alreadyMatched = await db
        .select()
        .from(bankStatementEntries)
        .where(
          and(
            eq(bankStatementEntries.batchId, batch.id),
            eq(bankStatementEntries.matchStatus, "matched")
          )
        );
      alreadyMatched.forEach((e) => {
        if (e.matchedTransactionId) matchedTxIds.add(e.matchedTransactionId);
      });

      let matchCount = 0;
      for (const entry of entries) {
        const match = transactions.find(
          (tx) =>
            !matchedTxIds.has(tx.id) &&
            Math.abs(Math.abs(tx.amount) - Math.abs(entry.amount)) < 0.01 &&
            tx.date === entry.date
        );
        if (match) {
          await db
            .update(bankStatementEntries)
            .set({
              matchedTransactionId: match.id,
              matchStatus: "matched",
            })
            .where(eq(bankStatementEntries.id, entry.id));
          matchedTxIds.add(match.id);
          matchCount++;
        }
      }

      res.json({ matched: matchCount, total: entries.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to auto-match entries" });
    }
  });

  app.patch("/api/trust/reconciliation/:id/entries/:entryId/match", async (req, res) => {
    try {
      const { transactionId } = req.body;
      const [entry] = await db
        .select()
        .from(bankStatementEntries)
        .where(
          and(
            eq(bankStatementEntries.id, req.params.entryId),
            eq(bankStatementEntries.batchId, req.params.id)
          )
        );
      if (!entry) return res.status(404).json({ error: "Entry not found" });

      if (transactionId) {
        const [tx] = await db
          .select()
          .from(trustTransactions)
          .where(eq(trustTransactions.id, transactionId));
        if (!tx) return res.status(404).json({ error: "Transaction not found" });

        const [updated] = await db
          .update(bankStatementEntries)
          .set({
            matchedTransactionId: transactionId,
            matchStatus: "matched",
          })
          .where(eq(bankStatementEntries.id, req.params.entryId))
          .returning();
        res.json(updated);
      } else {
        const [updated] = await db
          .update(bankStatementEntries)
          .set({
            matchedTransactionId: null,
            matchStatus: "unmatched",
          })
          .where(eq(bankStatementEntries.id, req.params.entryId))
          .returning();
        res.json(updated);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to match entry" });
    }
  });

  app.post("/api/trust/reconciliation/:id/finalize", async (req, res) => {
    try {
      const [batch] = await db
        .select()
        .from(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      if (!batch) return res.status(404).json({ error: "Batch not found" });

      const transactions = await db
        .select()
        .from(trustTransactions)
        .where(
          and(
            gte(trustTransactions.date, batch.periodStart),
            lte(trustTransactions.date, batch.periodEnd)
          )
        );

      let bookBalance = 0;
      const clientBalances = new Map<string, number>();
      for (const tx of transactions) {
        const isDebit = tx.type === "withdrawal" || tx.type === "transfer-out" || tx.type === "fee";
        const signedAmount = isDebit ? -tx.amount : tx.amount;
        bookBalance += signedAmount;

        const current = clientBalances.get(tx.clientId) || 0;
        clientBalances.set(tx.clientId, current + signedAmount);
      }

      const clientLedgerTotal = Array.from(clientBalances.values()).reduce((sum, v) => sum + v, 0);

      const adjustmentsArr = (batch.adjustments as any[]) || [];
      const adjustmentTotal = adjustmentsArr.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

      const bankBalance = batch.bankStatementBalance;
      const difference = Math.abs(bankBalance - (bookBalance + adjustmentTotal));

      const dbUser = req.dbUser;

      if (difference < 0.01) {
        const [updated] = await db
          .update(trustReconciliationBatches)
          .set({
            status: "reconciled",
            bookBalance,
            clientLedgerTotal,
            reconciledAt: new Date(),
            reconciledBy: dbUser?.id || "unknown",
            updatedAt: new Date(),
          })
          .where(eq(trustReconciliationBatches.id, batch.id))
          .returning();
        res.json({ status: "reconciled", batch: updated, difference: 0 });
      } else {
        const [updated] = await db
          .update(trustReconciliationBatches)
          .set({
            status: "unbalanced",
            bookBalance,
            clientLedgerTotal,
            updatedAt: new Date(),
          })
          .where(eq(trustReconciliationBatches.id, batch.id))
          .returning();
        res.json({
          status: "unbalanced",
          batch: updated,
          difference,
          bankBalance,
          bookBalance,
          clientLedgerTotal,
          adjustmentTotal,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to finalize reconciliation" });
    }
  });

  app.get("/api/trust/reconciliation/:id/report", async (req, res) => {
    try {
      const [batch] = await db
        .select()
        .from(trustReconciliationBatches)
        .where(eq(trustReconciliationBatches.id, req.params.id));
      if (!batch) return res.status(404).json({ error: "Batch not found" });

      const entries = await db
        .select()
        .from(bankStatementEntries)
        .where(eq(bankStatementEntries.batchId, batch.id))
        .orderBy(bankStatementEntries.date);

      const transactions = await db
        .select()
        .from(trustTransactions)
        .where(
          and(
            gte(trustTransactions.date, batch.periodStart),
            lte(trustTransactions.date, batch.periodEnd)
          )
        )
        .orderBy(trustTransactions.date);

      const allClients = await db.select().from(clients);
      const clientMap = new Map(allClients.map((c) => [c.id, c.name]));

      let bookBalance = 0;
      const clientBalances = new Map<string, number>();
      for (const tx of transactions) {
        const isDebit = tx.type === "withdrawal" || tx.type === "transfer-out" || tx.type === "fee";
        const signedAmount = isDebit ? -tx.amount : tx.amount;
        bookBalance += signedAmount;

        const current = clientBalances.get(tx.clientId) || 0;
        clientBalances.set(tx.clientId, current + signedAmount);
      }

      const clientLedgerTotal = Array.from(clientBalances.values()).reduce((sum, v) => sum + v, 0);
      const adjustmentsArr = (batch.adjustments as any[]) || [];
      const adjustmentTotal = adjustmentsArr.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

      const matchedEntries = entries.filter((e) => e.matchStatus === "matched").length;
      const unmatchedEntries = entries.filter((e) => e.matchStatus === "unmatched").length;

      const clientLedgerDetails = Array.from(clientBalances.entries()).map(([clientId, balance]) => ({
        clientId,
        clientName: clientMap.get(clientId) || clientId,
        balance,
      }));

      res.json({
        batch: {
          id: batch.id,
          name: batch.name,
          bankAccountName: batch.bankAccountName,
          periodStart: batch.periodStart,
          periodEnd: batch.periodEnd,
          status: batch.status,
          reconciledAt: batch.reconciledAt,
          reconciledBy: batch.reconciledBy,
        },
        threeWayBalance: {
          bankStatementBalance: batch.bankStatementBalance,
          bookBalance,
          clientLedgerTotal,
          adjustmentTotal,
          difference: Math.abs(batch.bankStatementBalance - (bookBalance + adjustmentTotal)),
          isBalanced: Math.abs(batch.bankStatementBalance - (bookBalance + adjustmentTotal)) < 0.01,
        },
        entries: {
          total: entries.length,
          matched: matchedEntries,
          unmatched: unmatchedEntries,
          items: entries,
        },
        transactions: {
          total: transactions.length,
          items: transactions,
        },
        clientLedger: {
          total: clientLedgerTotal,
          clients: clientLedgerDetails,
        },
        adjustments: adjustmentsArr,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate reconciliation report" });
    }
  });
}
