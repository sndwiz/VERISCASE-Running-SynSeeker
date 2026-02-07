import type { Express } from "express";
import { storage } from "../storage";

export function registerDataLinkageRoutes(app: Express): void {
  app.get("/api/data-linkage/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const matters = await storage.getMatters(clientId);
      const boards = await storage.getBoardsByClient(clientId);
      const expenses = await storage.getExpenses({ clientId });
      const invoices = await storage.getInvoices({ clientId });
      const payments = await storage.getPayments({ clientId });
      const trustTransactions = await storage.getTrustTransactions({ clientId });

      const allTimeEntries = await storage.getTimeEntries();
      const matterIds = new Set(matters.map(m => m.id));
      const timeEntries = allTimeEntries.filter(e => matterIds.has(e.matterId));

      const contactsByMatter: Record<string, any[]> = {};
      const timelineByMatter: Record<string, any[]> = {};
      const evidenceByMatter: Record<string, any[]> = {};

      await Promise.all(matters.map(async (matter) => {
        const [contacts, timeline, evidence] = await Promise.all([
          storage.getMatterContacts(matter.id),
          storage.getTimelineEvents(matter.id),
          storage.getEvidenceVaultFiles(matter.id),
        ]);
        contactsByMatter[matter.id] = contacts;
        timelineByMatter[matter.id] = timeline;
        evidenceByMatter[matter.id] = evidence;
      }));

      const billableHours = timeEntries
        .filter(e => e.billableStatus === "billable")
        .reduce((sum, e) => sum + e.hours, 0);
      const wip = timeEntries
        .filter(e => e.billableStatus === "billable")
        .reduce((sum, e) => sum + e.hours * (e.hourlyRate || 350), 0);
      const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
      const outstanding = invoices
        .filter(i => !["paid", "void", "write-off"].includes(i.status))
        .reduce((sum, i) => sum + i.balanceDue, 0);

      res.json({
        client,
        summary: {
          matterCount: matters.length,
          boardCount: boards.length,
          totalContacts: Object.values(contactsByMatter).flat().length,
          totalTimelineEvents: Object.values(timelineByMatter).flat().length,
          totalEvidence: Object.values(evidenceByMatter).flat().length,
          totalTimeEntries: timeEntries.length,
          billableHours,
          wip,
          totalBilled,
          totalPaid,
          outstanding,
          expenseCount: expenses.length,
          invoiceCount: invoices.length,
        },
        matters: matters.map(matter => ({
          ...matter,
          board: boards.find(b => b.matterId === matter.id) || null,
          contacts: contactsByMatter[matter.id] || [],
          timeline: timelineByMatter[matter.id] || [],
          evidence: evidenceByMatter[matter.id] || [],
          timeEntries: timeEntries.filter(e => e.matterId === matter.id),
          expenses: expenses.filter(e => e.matterId === matter.id),
          invoices: invoices.filter(i => i.matterId === matter.id),
        })),
        billing: {
          expenses,
          invoices,
          payments,
          trustTransactions,
          timeEntries,
        },
        boards,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client data linkage" });
    }
  });

  app.get("/api/data-linkage/matter/:matterId", async (req, res) => {
    try {
      const { matterId } = req.params;
      const matter = await storage.getMatter(matterId);
      if (!matter) return res.status(404).json({ error: "Matter not found" });

      const client = await storage.getClient(matter.clientId);
      const [boards, contacts, timeline, evidence, timeEntries, expenses, invoices] = await Promise.all([
        storage.getBoardsByMatter(matterId),
        storage.getMatterContacts(matterId),
        storage.getTimelineEvents(matterId),
        storage.getEvidenceVaultFiles(matterId),
        storage.getTimeEntries(matterId),
        storage.getExpenses({ matterId }),
        storage.getInvoices({ matterId }),
      ]);

      const billableEntries = timeEntries.filter(e => e.billableStatus === "billable");
      const billableHours = billableEntries.reduce((sum, e) => sum + e.hours, 0);
      const wip = billableEntries.reduce((sum, e) => sum + e.hours * (e.hourlyRate || 350), 0);
      const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      res.json({
        matter,
        client: client || null,
        summary: {
          contactCount: contacts.length,
          timelineEventCount: timeline.length,
          evidenceCount: evidence.length,
          boardCount: boards.length,
          timeEntryCount: timeEntries.length,
          billableHours,
          wip,
          totalBilled,
          totalExpenses,
          invoiceCount: invoices.length,
        },
        contacts,
        timeline,
        evidence,
        boards,
        billing: {
          timeEntries,
          expenses,
          invoices,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter data linkage" });
    }
  });

  app.get("/api/data-linkage/spreadsheet", async (req, res) => {
    try {
      const clients = await storage.getClients();
      const allMatters = await storage.getMatters();
      const allTimeEntries = await storage.getTimeEntries();
      const allExpenses = await storage.getExpenses({});
      const allInvoices = await storage.getInvoices({});
      const allBoards = await storage.getBoards();

      const rows = [];

      for (const client of clients) {
        const clientMatters = allMatters.filter(m => m.clientId === client.id);
        const clientMatterIds = new Set(clientMatters.map(m => m.id));
        const clientTimeEntries = allTimeEntries.filter(e => clientMatterIds.has(e.matterId));
        const clientExpenses = allExpenses.filter(e => e.clientId === client.id);
        const clientInvoices = allInvoices.filter(i => i.clientId === client.id);
        const clientBoards = allBoards.filter(b => b.clientId === client.id);

        const billableHours = clientTimeEntries
          .filter(e => e.billableStatus === "billable")
          .reduce((sum, e) => sum + e.hours, 0);
        const wip = clientTimeEntries
          .filter(e => e.billableStatus === "billable")
          .reduce((sum, e) => sum + e.hours * (e.hourlyRate || 350), 0);
        const totalBilled = clientInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPaid = clientInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
        const totalExpenses = clientExpenses.reduce((sum, e) => sum + e.amount, 0);

        rows.push({
          entityType: "client",
          id: client.id,
          name: client.name,
          matters: clientMatters.length,
          boards: clientBoards.length,
          timeEntries: clientTimeEntries.length,
          billableHours,
          wip,
          expenses: totalExpenses,
          totalBilled,
          totalPaid,
          outstanding: totalBilled - totalPaid,
          matterBreakdown: clientMatters.map(m => {
            const mTimeEntries = clientTimeEntries.filter(e => e.matterId === m.id);
            const mExpenses = clientExpenses.filter(e => e.matterId === m.id);
            const mInvoices = clientInvoices.filter(i => i.matterId === m.id);
            const mBillable = mTimeEntries
              .filter(e => e.billableStatus === "billable")
              .reduce((sum, e) => sum + e.hours, 0);
            return {
              id: m.id,
              name: m.name,
              status: m.status,
              timeEntries: mTimeEntries.length,
              billableHours: mBillable,
              wip: mTimeEntries
                .filter(e => e.billableStatus === "billable")
                .reduce((sum, e) => sum + e.hours * (e.hourlyRate || 350), 0),
              expenses: mExpenses.reduce((sum, e) => sum + e.amount, 0),
              billed: mInvoices.reduce((sum, i) => sum + i.totalAmount, 0),
            };
          }),
        });
      }

      res.json({
        generatedAt: new Date().toISOString(),
        totalClients: clients.length,
        totalMatters: allMatters.length,
        totalTimeEntries: allTimeEntries.length,
        totalExpenses: allExpenses.length,
        totalInvoices: allInvoices.length,
        totalBoards: allBoards.length,
        rows,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate spreadsheet view" });
    }
  });

  app.get("/api/data-linkage/verify", async (req, res) => {
    try {
      const clients = await storage.getClients();
      const matters = await storage.getMatters();
      const timeEntries = await storage.getTimeEntries();
      const expenses = await storage.getExpenses({});
      const invoices = await storage.getInvoices({});
      const boards = await storage.getBoards();

      const issues: string[] = [];

      const clientIds = new Set(clients.map(c => c.id));
      for (const matter of matters) {
        if (!clientIds.has(matter.clientId)) {
          issues.push(`Matter "${matter.name}" (${matter.id}) references missing client ${matter.clientId}`);
        }
      }

      const matterIds = new Set(matters.map(m => m.id));
      for (const entry of timeEntries) {
        if (!matterIds.has(entry.matterId)) {
          issues.push(`Time entry ${entry.id} references missing matter ${entry.matterId}`);
        }
      }

      for (const expense of expenses) {
        if (!clientIds.has(expense.clientId)) {
          issues.push(`Expense ${expense.id} references missing client ${expense.clientId}`);
        }
        if (!matterIds.has(expense.matterId)) {
          issues.push(`Expense ${expense.id} references missing matter ${expense.matterId}`);
        }
      }

      for (const invoice of invoices) {
        if (!clientIds.has(invoice.clientId)) {
          issues.push(`Invoice ${invoice.invoiceNumber} references missing client ${invoice.clientId}`);
        }
        if (invoice.matterId && !matterIds.has(invoice.matterId)) {
          issues.push(`Invoice ${invoice.invoiceNumber} references missing matter ${invoice.matterId}`);
        }
      }

      for (const board of boards) {
        if (board.clientId && !clientIds.has(board.clientId)) {
          issues.push(`Board "${board.name}" references missing client ${board.clientId}`);
        }
        if (board.matterId && !matterIds.has(board.matterId)) {
          issues.push(`Board "${board.name}" references missing matter ${board.matterId}`);
        }
      }

      const mattersWithBoards = new Set(boards.filter(b => b.matterId).map(b => b.matterId));
      const mattersWithoutBoards = matters.filter(m => !mattersWithBoards.has(m.id));
      if (mattersWithoutBoards.length > 0) {
        for (const m of mattersWithoutBoards) {
          issues.push(`Matter "${m.name}" (${m.id}) has no associated board`);
        }
      }

      res.json({
        status: issues.length === 0 ? "healthy" : "issues_found",
        issueCount: issues.length,
        issues,
        entityCounts: {
          clients: clients.length,
          matters: matters.length,
          timeEntries: timeEntries.length,
          expenses: expenses.length,
          invoices: invoices.length,
          boards: boards.length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify data linkage" });
    }
  });
}
