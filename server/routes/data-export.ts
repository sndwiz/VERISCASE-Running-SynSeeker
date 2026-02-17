import type { Express } from "express";
import { db } from "../db";
import {
  clients,
  matters,
  matterContacts,
  timeEntries,
  expenses,
  invoices,
  payments,
  trustTransactions,
  calendarEvents,
  tasks,
  boards,
  groups,
  evidenceVaultFiles,
  threads,
  threadMessages,
  auditLogs,
  teamMembers,
} from "@shared/models/tables";
import { eq } from "drizzle-orm";

export function registerDataExportRoutes(app: Express): void {
  app.get("/api/export/full", async (_req, res) => {
    try {
      const [
        clientsData,
        mattersData,
        matterContactsData,
        timeEntriesData,
        expensesData,
        invoicesData,
        paymentsData,
        trustTransactionsData,
        calendarEventsData,
        tasksData,
        boardsData,
        groupsData,
        evidenceVaultFilesData,
        threadsData,
        threadMessagesData,
        auditLogsData,
        teamMembersData,
      ] = await Promise.all([
        db.select().from(clients),
        db.select().from(matters),
        db.select().from(matterContacts),
        db.select().from(timeEntries),
        db.select().from(expenses),
        db.select().from(invoices),
        db.select().from(payments),
        db.select().from(trustTransactions),
        db.select().from(calendarEvents),
        db.select().from(tasks),
        db.select().from(boards),
        db.select().from(groups),
        db.select().from(evidenceVaultFiles),
        db.select().from(threads),
        db.select().from(threadMessages),
        db.select().from(auditLogs),
        db.select().from(teamMembers),
      ]);

      const entityCounts = {
        clients: clientsData.length,
        matters: mattersData.length,
        matterContacts: matterContactsData.length,
        timeEntries: timeEntriesData.length,
        expenses: expensesData.length,
        invoices: invoicesData.length,
        payments: paymentsData.length,
        trustTransactions: trustTransactionsData.length,
        calendarEvents: calendarEventsData.length,
        tasks: tasksData.length,
        boards: boardsData.length,
        groups: groupsData.length,
        evidenceVaultFiles: evidenceVaultFilesData.length,
        threads: threadsData.length,
        threadMessages: threadMessagesData.length,
        auditLogs: auditLogsData.length,
        teamMembers: teamMembersData.length,
      };

      const totalRecords = Object.values(entityCounts).reduce((a, b) => a + b, 0);

      const exportData = {
        exportVersion: "1.0",
        exportDate: new Date().toISOString(),
        firmData: {
          clients: clientsData,
          matters: mattersData,
          matterContacts: matterContactsData,
          timeEntries: timeEntriesData,
          expenses: expensesData,
          invoices: invoicesData,
          payments: paymentsData,
          trustTransactions: trustTransactionsData,
          calendarEvents: calendarEventsData,
          tasks: tasksData,
          boards: boardsData,
          groups: groupsData,
          evidenceVaultFiles: evidenceVaultFilesData,
          threads: threadsData,
          threadMessages: threadMessagesData,
          auditLogs: auditLogsData,
          teamMembers: teamMembersData,
        },
        metadata: {
          totalRecords,
          entityCounts,
        },
      };

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Disposition", `attachment; filename="vericase-export-${dateStr}.json"`);
      res.setHeader("Content-Type", "application/json");
      res.json(exportData);
    } catch (error) {
      console.error("Full export error:", error);
      res.status(500).json({ error: "Failed to generate full export" });
    }
  });

  app.get("/api/export/matters/:matterId", async (req, res) => {
    try {
      const { matterId } = req.params;

      const [matterData] = await db.select().from(matters).where(eq(matters.id, matterId));
      if (!matterData) {
        return res.status(404).json({ error: "Matter not found" });
      }

      const [clientData] = await db.select().from(clients).where(eq(clients.id, matterData.clientId));

      const [
        contactsData,
        timeEntriesData,
        expensesData,
        calendarEventsData,
        evidenceData,
        threadsData,
        boardsData,
      ] = await Promise.all([
        db.select().from(matterContacts).where(eq(matterContacts.matterId, matterId)),
        db.select().from(timeEntries).where(eq(timeEntries.matterId, matterId)),
        db.select().from(expenses).where(eq(expenses.matterId, matterId)),
        db.select().from(calendarEvents).where(eq(calendarEvents.matterId, matterId)),
        db.select().from(evidenceVaultFiles).where(eq(evidenceVaultFiles.matterId, matterId)),
        db.select().from(threads).where(eq(threads.matterId, matterId)),
        db.select().from(boards).where(eq(boards.matterId, matterId)),
      ]);

      const threadIds = threadsData.map((t) => t.id);
      let messagesData: any[] = [];
      for (const threadId of threadIds) {
        const msgs = await db.select().from(threadMessages).where(eq(threadMessages.threadId, threadId));
        messagesData = messagesData.concat(msgs);
      }

      const boardIds = boardsData.map((b) => b.id);
      let groupsData: any[] = [];
      let tasksData: any[] = [];
      for (const boardId of boardIds) {
        const g = await db.select().from(groups).where(eq(groups.boardId, boardId));
        groupsData = groupsData.concat(g);
        const t = await db.select().from(tasks).where(eq(tasks.boardId, boardId));
        tasksData = tasksData.concat(t);
      }

      const exportData = {
        exportVersion: "1.0",
        exportDate: new Date().toISOString(),
        matterExport: {
          matter: matterData,
          client: clientData || null,
          contacts: contactsData,
          timeEntries: timeEntriesData,
          expenses: expensesData,
          calendarEvents: calendarEventsData,
          evidenceVaultFiles: evidenceData,
          threads: threadsData,
          threadMessages: messagesData,
          boards: boardsData,
          groups: groupsData,
          tasks: tasksData,
        },
      };

      const dateStr = new Date().toISOString().split("T")[0];
      const safeName = matterData.name.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 50);
      res.setHeader("Content-Disposition", `attachment; filename="vericase-matter-${safeName}-${dateStr}.json"`);
      res.setHeader("Content-Type", "application/json");
      res.json(exportData);
    } catch (error) {
      console.error("Matter export error:", error);
      res.status(500).json({ error: "Failed to export matter" });
    }
  });

  app.get("/api/export/csv/:entityType", async (req, res) => {
    try {
      const { entityType } = req.params;

      let data: any[] = [];
      let headers: string[] = [];

      switch (entityType) {
        case "clients": {
          data = await db.select().from(clients);
          headers = ["id", "name", "email", "phone", "company", "address", "notes", "createdAt"];
          break;
        }
        case "matters": {
          data = await db.select().from(matters);
          headers = ["id", "clientId", "name", "caseNumber", "matterType", "status", "practiceArea", "openedDate", "closedDate", "courtName", "judgeAssigned", "opposingCounsel", "createdAt"];
          break;
        }
        case "timeEntries": {
          data = await db.select().from(timeEntries);
          headers = ["id", "matterId", "userId", "userName", "date", "hours", "description", "billableStatus", "hourlyRate", "activityCode", "createdAt"];
          break;
        }
        case "invoices": {
          data = await db.select().from(invoices);
          headers = ["id", "invoiceNumber", "clientId", "matterId", "issueDate", "dueDate", "status", "subtotal", "taxRate", "taxAmount", "totalAmount", "paidAmount", "balanceDue", "createdAt"];
          break;
        }
        default:
          return res.status(400).json({ error: "Invalid entity type. Supported: clients, matters, timeEntries, invoices" });
      }

      const escapeCsvField = (val: any): string => {
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      let csv = headers.join(",") + "\n";
      for (const row of data) {
        const values = headers.map((h) => escapeCsvField(row[h]));
        csv += values.join(",") + "\n";
      }

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Disposition", `attachment; filename="vericase-${entityType}-${dateStr}.csv"`);
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ error: "Failed to generate CSV export" });
    }
  });
}
