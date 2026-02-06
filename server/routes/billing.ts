import type { Express } from "express";
import { storage } from "../storage";
import { insertExpenseSchema, updateExpenseSchema, insertInvoiceSchema, updateInvoiceSchema, insertPaymentSchema, insertTrustTransactionSchema } from "@shared/schema";
import { z } from "zod";

export function registerBillingRoutes(app: Express): void {
  // ============ EXPENSES ============
  app.get("/api/expenses", async (req, res) => {
    try {
      const { clientId, matterId } = req.query;
      const expenses = await storage.getExpenses({
        clientId: clientId as string | undefined,
        matterId: matterId as string | undefined,
      });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const body = {
        ...req.body,
        createdBy: dbUser?.id || req.body.createdBy || "unknown",
      };
      const data = insertExpenseSchema.parse(body);
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const data = updateExpenseSchema.parse(req.body);
      const expense = await storage.updateExpense(req.params.id, data);
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Expense not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ============ INVOICES ============
  app.get("/api/invoices", async (req, res) => {
    try {
      const { clientId, matterId } = req.query;
      const invoices = await storage.getInvoices({
        clientId: clientId as string | undefined,
        matterId: matterId as string | undefined,
      });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const body = {
        ...req.body,
        createdBy: dbUser?.id || req.body.createdBy || "unknown",
      };
      const data = insertInvoiceSchema.parse(body);
      const invoice = await storage.createInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const data = updateInvoiceSchema.parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, data);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Invoice not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // ============ PAYMENTS ============
  app.get("/api/payments", async (req, res) => {
    try {
      const { clientId, invoiceId } = req.query;
      const payments = await storage.getPayments({
        clientId: clientId as string | undefined,
        invoiceId: invoiceId as string | undefined,
      });
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const body = {
        ...req.body,
        createdBy: dbUser?.id || req.body.createdBy || "unknown",
      };
      const data = insertPaymentSchema.parse(body);
      const payment = await storage.createPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // ============ TRUST TRANSACTIONS ============
  app.get("/api/trust-transactions", async (req, res) => {
    try {
      const { clientId, matterId } = req.query;
      const transactions = await storage.getTrustTransactions({
        clientId: clientId as string | undefined,
        matterId: matterId as string | undefined,
      });
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trust transactions" });
    }
  });

  app.post("/api/trust-transactions", async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const body = {
        ...req.body,
        createdBy: dbUser?.id || req.body.createdBy || "unknown",
      };
      const data = insertTrustTransactionSchema.parse(body);
      const transaction = await storage.createTrustTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create trust transaction" });
    }
  });

  // ============ BILLING SUMMARY ============
  app.get("/api/billing/summary", async (req, res) => {
    try {
      const { clientId, matterId } = req.query;
      const filters = {
        clientId: clientId as string | undefined,
        matterId: matterId as string | undefined,
      };

      const [timeEntries, expenses, invoices, payments, trustTx] = await Promise.all([
        storage.getTimeEntries(filters.matterId),
        storage.getExpenses(filters),
        storage.getInvoices(filters),
        storage.getPayments({ clientId: filters.clientId }),
        storage.getTrustTransactions(filters),
      ]);

      const filteredTimeEntries = filters.clientId
        ? await (async () => {
            const clientMatters = await storage.getMatters(filters.clientId);
            const matterIds = new Set(clientMatters.map(m => m.id));
            const allEntries = await storage.getTimeEntries();
            return allEntries.filter(e => matterIds.has(e.matterId));
          })()
        : timeEntries;

      const billableHours = filteredTimeEntries
        .filter(e => e.billableStatus === "billable")
        .reduce((sum, e) => sum + e.hours, 0);
      const nonBillableHours = filteredTimeEntries
        .filter(e => e.billableStatus !== "billable")
        .reduce((sum, e) => sum + e.hours, 0);
      const wip = filteredTimeEntries
        .filter(e => e.billableStatus === "billable")
        .reduce((sum, e) => sum + e.hours * (e.hourlyRate || 350), 0);

      const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
      const outstanding = invoices
        .filter(i => !["paid", "void", "write-off"].includes(i.status))
        .reduce((sum, i) => sum + i.balanceDue, 0);
      const overdue = invoices
        .filter(i => i.status === "overdue")
        .reduce((sum, i) => sum + i.balanceDue, 0);

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const billableExpenses = expenses.filter(e => e.billable).reduce((sum, e) => sum + e.amount, 0);

      const trustDeposits = trustTx.filter(t => t.type === "deposit" || t.type === "transfer-in").reduce((sum, t) => sum + t.amount, 0);
      const trustWithdrawals = trustTx.filter(t => t.type === "withdrawal" || t.type === "transfer-out" || t.type === "fee").reduce((sum, t) => sum + t.amount, 0);
      const trustBalance = trustDeposits - trustWithdrawals;

      res.json({
        billableHours,
        nonBillableHours,
        totalHours: billableHours + nonBillableHours,
        wip,
        totalBilled,
        totalPaid,
        outstanding,
        overdue,
        totalExpenses,
        billableExpenses,
        trustBalance,
        trustDeposits,
        trustWithdrawals,
        invoiceCount: invoices.length,
        paidInvoiceCount: invoices.filter(i => i.status === "paid").length,
        overdueInvoiceCount: invoices.filter(i => i.status === "overdue").length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to compute billing summary" });
    }
  });
}
