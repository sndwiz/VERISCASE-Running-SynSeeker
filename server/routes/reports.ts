import { Router, type Request, type Response, type Express } from "express";
import { storage } from "../storage";
import { getAIOpsRecords, getAIOpsSummary } from "../ai/ai-ops";

const router = Router();

interface ReportColumn {
  key: string;
  label: string;
  type: "string" | "number" | "currency" | "date" | "badge";
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryColor: string;
  columns: ReportColumn[];
  getData: () => Promise<{
    summary: Record<string, { label: string; value: string; prefix?: string }>;
    rows: any[];
    totalRows: number;
  }>;
}

const reportDefinitions: ReportDefinition[] = [
  {
    id: "accounts-receivable",
    name: "Accounts Receivable",
    description: "Unpaid and overdue invoices by client and matter with outstanding balances",
    category: "Billing",
    categoryColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    columns: [
      { key: "invoiceNumber", label: "Invoice #", type: "string" },
      { key: "clientName", label: "Client", type: "string" },
      { key: "matterName", label: "Matter", type: "string" },
      { key: "issueDate", label: "Issue Date", type: "date" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "status", label: "Status", type: "badge" },
      { key: "totalAmount", label: "Total", type: "currency" },
      { key: "paidAmount", label: "Paid", type: "currency" },
      { key: "balanceDue", label: "Balance Due", type: "currency" },
    ],
    getData: async () => {
      const [invoices, clients, matters] = await Promise.all([
        storage.getInvoices({}),
        storage.getClients(),
        storage.getMatters(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const matterMap = new Map(matters.map((m) => [m.id, m.name]));
      const unpaid = invoices.filter((i) => !["paid", "void", "write-off"].includes(i.status));
      const totalOutstanding = unpaid.reduce((s, i) => s + i.balanceDue, 0);
      const overdueCount = unpaid.filter((i) => i.status === "overdue").length;
      const overdueAmount = unpaid.filter((i) => i.status === "overdue").reduce((s, i) => s + i.balanceDue, 0);
      return {
        summary: {
          totalOutstanding: { label: "Total Outstanding", value: totalOutstanding.toFixed(2), prefix: "$" },
          invoiceCount: { label: "Unpaid Invoices", value: String(unpaid.length) },
          overdueCount: { label: "Overdue", value: String(overdueCount) },
          overdueAmount: { label: "Overdue Amount", value: overdueAmount.toFixed(2), prefix: "$" },
        },
        rows: unpaid.map((i) => ({
          invoiceNumber: i.invoiceNumber,
          clientName: clientMap.get(i.clientId) || i.clientId,
          matterName: i.matterId ? matterMap.get(i.matterId) || i.matterId : "-",
          issueDate: i.issueDate,
          dueDate: i.dueDate,
          status: i.status,
          totalAmount: i.totalAmount,
          paidAmount: i.paidAmount,
          balanceDue: i.balanceDue,
        })),
        totalRows: unpaid.length,
      };
    },
  },
  {
    id: "ar-aging",
    name: "AR Aging",
    description: "Outstanding balances grouped by age brackets (1-30, 31-60, 61-90, 90+ days)",
    category: "Billing",
    categoryColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    columns: [
      { key: "clientName", label: "Client", type: "string" },
      { key: "invoiceNumber", label: "Invoice #", type: "string" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "daysOverdue", label: "Days Overdue", type: "number" },
      { key: "agingBucket", label: "Aging Bucket", type: "badge" },
      { key: "balanceDue", label: "Balance Due", type: "currency" },
    ],
    getData: async () => {
      const [invoices, clients] = await Promise.all([
        storage.getInvoices({}),
        storage.getClients(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const now = new Date();
      const unpaid = invoices.filter((i) => !["paid", "void", "write-off"].includes(i.status));
      const rows = unpaid.map((i) => {
        const due = new Date(i.dueDate);
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        let agingBucket = "Current";
        if (daysOverdue > 90) agingBucket = "90+ Days";
        else if (daysOverdue > 60) agingBucket = "61-90 Days";
        else if (daysOverdue > 30) agingBucket = "31-60 Days";
        else if (daysOverdue > 0) agingBucket = "1-30 Days";
        return {
          clientName: clientMap.get(i.clientId) || i.clientId,
          invoiceNumber: i.invoiceNumber,
          dueDate: i.dueDate,
          daysOverdue,
          agingBucket,
          balanceDue: i.balanceDue,
        };
      });
      const buckets: Record<string, number> = { Current: 0, "1-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0 };
      rows.forEach((r) => { buckets[r.agingBucket] = (buckets[r.agingBucket] || 0) + r.balanceDue; });
      return {
        summary: {
          current: { label: "Current", value: buckets["Current"].toFixed(2), prefix: "$" },
          days1to30: { label: "1-30 Days", value: buckets["1-30 Days"].toFixed(2), prefix: "$" },
          days31to60: { label: "31-60 Days", value: buckets["31-60 Days"].toFixed(2), prefix: "$" },
          days61to90: { label: "61-90 Days", value: buckets["61-90 Days"].toFixed(2), prefix: "$" },
          days90plus: { label: "90+ Days", value: buckets["90+ Days"].toFixed(2), prefix: "$" },
        },
        rows,
        totalRows: rows.length,
      };
    },
  },
  {
    id: "billing-summary",
    name: "Billing Summary",
    description: "Invoice totals, payments received, and outstanding balances overview",
    category: "Billing",
    categoryColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    columns: [
      { key: "invoiceNumber", label: "Invoice #", type: "string" },
      { key: "clientName", label: "Client", type: "string" },
      { key: "issueDate", label: "Issue Date", type: "date" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "status", label: "Status", type: "badge" },
      { key: "totalAmount", label: "Total", type: "currency" },
      { key: "paidAmount", label: "Paid", type: "currency" },
      { key: "balanceDue", label: "Balance", type: "currency" },
    ],
    getData: async () => {
      const [invoices, clients] = await Promise.all([
        storage.getInvoices({}),
        storage.getClients(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
      const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
      const outstanding = invoices.filter((i) => !["paid", "void", "write-off"].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0);
      return {
        summary: {
          totalInvoiced: { label: "Total Invoiced", value: totalInvoiced.toFixed(2), prefix: "$" },
          totalPaid: { label: "Total Paid", value: totalPaid.toFixed(2), prefix: "$" },
          outstanding: { label: "Outstanding", value: outstanding.toFixed(2), prefix: "$" },
          invoiceCount: { label: "Invoices", value: String(invoices.length) },
        },
        rows: invoices.map((i) => ({
          invoiceNumber: i.invoiceNumber,
          clientName: clientMap.get(i.clientId) || i.clientId,
          issueDate: i.issueDate,
          dueDate: i.dueDate,
          status: i.status,
          totalAmount: i.totalAmount,
          paidAmount: i.paidAmount,
          balanceDue: i.balanceDue,
        })),
        totalRows: invoices.length,
      };
    },
  },
  {
    id: "payment-report",
    name: "Payment Report",
    description: "All payments received with method, date, and amounts",
    category: "Billing",
    categoryColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "clientName", label: "Client", type: "string" },
      { key: "method", label: "Method", type: "badge" },
      { key: "reference", label: "Reference", type: "string" },
      { key: "notes", label: "Notes", type: "string" },
      { key: "amount", label: "Amount", type: "currency" },
    ],
    getData: async () => {
      const [payments, clients] = await Promise.all([
        storage.getPayments({}),
        storage.getClients(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const total = payments.reduce((s, p) => s + p.amount, 0);
      const methods: Record<string, number> = {};
      payments.forEach((p) => { methods[p.method] = (methods[p.method] || 0) + 1; });
      const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
      return {
        summary: {
          totalReceived: { label: "Total Received", value: total.toFixed(2), prefix: "$" },
          paymentCount: { label: "Payments", value: String(payments.length) },
          topMethod: { label: "Top Method", value: topMethod ? topMethod[0] : "N/A" },
        },
        rows: payments.map((p) => ({
          date: p.date,
          clientName: clientMap.get(p.clientId) || p.clientId,
          method: p.method,
          reference: p.reference || "-",
          notes: p.notes || "-",
          amount: p.amount,
        })),
        totalRows: payments.length,
      };
    },
  },
  {
    id: "trust-transactions",
    name: "Trust Transactions",
    description: "Trust account activity including deposits, withdrawals, and running balances",
    category: "Billing",
    categoryColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "clientName", label: "Client", type: "string" },
      { key: "type", label: "Type", type: "badge" },
      { key: "description", label: "Description", type: "string" },
      { key: "reference", label: "Reference", type: "string" },
      { key: "amount", label: "Amount", type: "currency" },
      { key: "runningBalance", label: "Balance", type: "currency" },
    ],
    getData: async () => {
      const [transactions, clients] = await Promise.all([
        storage.getTrustTransactions({}),
        storage.getClients(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const deposits = transactions.filter((t) => t.type === "deposit" || t.type === "transfer-in").reduce((s, t) => s + t.amount, 0);
      const withdrawals = transactions.filter((t) => t.type === "withdrawal" || t.type === "transfer-out" || t.type === "fee").reduce((s, t) => s + t.amount, 0);
      return {
        summary: {
          totalDeposits: { label: "Total Deposits", value: deposits.toFixed(2), prefix: "$" },
          totalWithdrawals: { label: "Total Withdrawals", value: withdrawals.toFixed(2), prefix: "$" },
          netBalance: { label: "Net Balance", value: (deposits - withdrawals).toFixed(2), prefix: "$" },
          transactionCount: { label: "Transactions", value: String(transactions.length) },
        },
        rows: transactions.map((t) => ({
          date: t.date,
          clientName: clientMap.get(t.clientId) || t.clientId,
          type: t.type,
          description: t.description || "-",
          reference: t.reference || "-",
          amount: t.amount,
          runningBalance: t.runningBalance,
        })),
        totalRows: transactions.length,
      };
    },
  },
  {
    id: "user-productivity",
    name: "User Productivity",
    description: "Time entries by user showing billable hours, non-billable hours, and values",
    category: "Productivity",
    categoryColor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    columns: [
      { key: "userName", label: "User", type: "string" },
      { key: "billableHours", label: "Billable Hours", type: "number" },
      { key: "nonBillableHours", label: "Non-Billable Hours", type: "number" },
      { key: "totalHours", label: "Total Hours", type: "number" },
      { key: "billableValue", label: "Billable Value", type: "currency" },
      { key: "utilizationRate", label: "Utilization %", type: "string" },
    ],
    getData: async () => {
      const entries = await storage.getTimeEntries();
      const byUser: Record<string, { billable: number; nonBillable: number; value: number; name: string }> = {};
      entries.forEach((e) => {
        if (!byUser[e.userId]) byUser[e.userId] = { billable: 0, nonBillable: 0, value: 0, name: e.userName };
        if (e.billableStatus === "billable") {
          byUser[e.userId].billable += e.hours;
          byUser[e.userId].value += e.hours * (e.hourlyRate || 350);
        } else {
          byUser[e.userId].nonBillable += e.hours;
        }
      });
      const rows = Object.values(byUser).map((u) => ({
        userName: u.name,
        billableHours: Math.round(u.billable * 100) / 100,
        nonBillableHours: Math.round(u.nonBillable * 100) / 100,
        totalHours: Math.round((u.billable + u.nonBillable) * 100) / 100,
        billableValue: Math.round(u.value * 100) / 100,
        utilizationRate: u.billable + u.nonBillable > 0 ? `${Math.round((u.billable / (u.billable + u.nonBillable)) * 100)}%` : "0%",
      }));
      const totalBillable = rows.reduce((s, r) => s + r.billableHours, 0);
      const totalValue = rows.reduce((s, r) => s + r.billableValue, 0);
      return {
        summary: {
          totalBillable: { label: "Total Billable Hours", value: totalBillable.toFixed(1) },
          totalValue: { label: "Total Billable Value", value: totalValue.toFixed(2), prefix: "$" },
          userCount: { label: "Users", value: String(rows.length) },
        },
        rows,
        totalRows: rows.length,
      };
    },
  },
  {
    id: "client-productivity",
    name: "Client Productivity",
    description: "Time spent per client showing billable vs non-billable hours breakdown",
    category: "Productivity",
    categoryColor: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    columns: [
      { key: "clientName", label: "Client", type: "string" },
      { key: "billableHours", label: "Billable Hours", type: "number" },
      { key: "nonBillableHours", label: "Non-Billable Hours", type: "number" },
      { key: "totalHours", label: "Total Hours", type: "number" },
      { key: "billableValue", label: "Billable Value", type: "currency" },
      { key: "matterCount", label: "Matters", type: "number" },
    ],
    getData: async () => {
      const [entries, matters, clients] = await Promise.all([
        storage.getTimeEntries(),
        storage.getMatters(),
        storage.getClients(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const matterToClient = new Map(matters.map((m) => [m.id, m.clientId]));
      const byClient: Record<string, { billable: number; nonBillable: number; value: number; matters: Set<string> }> = {};
      entries.forEach((e) => {
        const clientId = matterToClient.get(e.matterId) || "unknown";
        if (!byClient[clientId]) byClient[clientId] = { billable: 0, nonBillable: 0, value: 0, matters: new Set() };
        byClient[clientId].matters.add(e.matterId);
        if (e.billableStatus === "billable") {
          byClient[clientId].billable += e.hours;
          byClient[clientId].value += e.hours * (e.hourlyRate || 350);
        } else {
          byClient[clientId].nonBillable += e.hours;
        }
      });
      const rows = Object.entries(byClient).map(([cid, d]) => ({
        clientName: clientMap.get(cid) || cid,
        billableHours: Math.round(d.billable * 100) / 100,
        nonBillableHours: Math.round(d.nonBillable * 100) / 100,
        totalHours: Math.round((d.billable + d.nonBillable) * 100) / 100,
        billableValue: Math.round(d.value * 100) / 100,
        matterCount: d.matters.size,
      }));
      return {
        summary: {
          clientCount: { label: "Clients", value: String(rows.length) },
          totalHours: { label: "Total Hours", value: rows.reduce((s, r) => s + r.totalHours, 0).toFixed(1) },
          totalValue: { label: "Total Value", value: rows.reduce((s, r) => s + r.billableValue, 0).toFixed(2), prefix: "$" },
        },
        rows,
        totalRows: rows.length,
      };
    },
  },
  {
    id: "matter-status",
    name: "Matter Status",
    description: "All matters with current status, phase, practice area, and key dates",
    category: "Cases",
    categoryColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    columns: [
      { key: "name", label: "Matter", type: "string" },
      { key: "clientName", label: "Client", type: "string" },
      { key: "caseNumber", label: "Case #", type: "string" },
      { key: "status", label: "Status", type: "badge" },
      { key: "practiceArea", label: "Practice Area", type: "string" },
      { key: "currentPhase", label: "Phase", type: "string" },
      { key: "openedDate", label: "Opened", type: "date" },
      { key: "matterType", label: "Type", type: "string" },
    ],
    getData: async () => {
      const [matters, clients] = await Promise.all([
        storage.getMatters(),
        storage.getClients(),
      ]);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      const statusCounts: Record<string, number> = {};
      matters.forEach((m) => { statusCounts[m.status] = (statusCounts[m.status] || 0) + 1; });
      return {
        summary: {
          totalMatters: { label: "Total Matters", value: String(matters.length) },
          active: { label: "Active", value: String(statusCounts["active"] || 0) },
          pending: { label: "Pending", value: String(statusCounts["pending"] || 0) },
          closed: { label: "Closed", value: String(statusCounts["closed"] || 0) },
        },
        rows: matters.map((m) => ({
          name: m.name,
          clientName: clientMap.get(m.clientId) || m.clientId,
          caseNumber: m.caseNumber || "-",
          status: m.status,
          practiceArea: m.practiceArea || "-",
          currentPhase: m.currentPhase || "-",
          openedDate: m.openedDate,
          matterType: m.matterType,
        })),
        totalRows: matters.length,
      };
    },
  },
  {
    id: "matter-activity",
    name: "Matter Activity",
    description: "Recent activity across matters including time entries, expenses, and updates",
    category: "Cases",
    categoryColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "matterName", label: "Matter", type: "string" },
      { key: "activityType", label: "Type", type: "badge" },
      { key: "description", label: "Description", type: "string" },
      { key: "user", label: "User", type: "string" },
      { key: "value", label: "Value", type: "currency" },
    ],
    getData: async () => {
      const [entries, expenses, matters, clients] = await Promise.all([
        storage.getTimeEntries(),
        storage.getExpenses({}),
        storage.getMatters(),
        storage.getClients(),
      ]);
      const matterMap = new Map(matters.map((m) => [m.id, m.name]));
      const activities: any[] = [];
      entries.forEach((e) => {
        activities.push({
          date: e.date,
          matterName: matterMap.get(e.matterId) || e.matterId,
          activityType: "Time Entry",
          description: e.description,
          user: e.userName,
          value: e.billableStatus === "billable" ? e.hours * (e.hourlyRate || 350) : 0,
        });
      });
      expenses.forEach((e) => {
        activities.push({
          date: e.date,
          matterName: matterMap.get(e.matterId) || e.matterId,
          activityType: "Expense",
          description: e.description,
          user: e.createdBy,
          value: e.amount,
        });
      });
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        summary: {
          totalActivities: { label: "Total Activities", value: String(activities.length) },
          timeEntries: { label: "Time Entries", value: String(entries.length) },
          expenseEntries: { label: "Expenses", value: String(expenses.length) },
        },
        rows: activities,
        totalRows: activities.length,
      };
    },
  },
  {
    id: "deadline-compliance",
    name: "Deadline Compliance",
    description: "Upcoming and missed deadlines from calendar events and matters",
    category: "Cases",
    categoryColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    columns: [
      { key: "title", label: "Event", type: "string" },
      { key: "matterName", label: "Matter", type: "string" },
      { key: "eventType", label: "Type", type: "badge" },
      { key: "startDate", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "badge" },
      { key: "daysUntil", label: "Days Until", type: "number" },
    ],
    getData: async () => {
      const [events, matters] = await Promise.all([
        storage.getCalendarEvents(),
        storage.getMatters(),
      ]);
      const matterMap = new Map(matters.map((m) => [m.id, m.name]));
      const now = new Date();
      const deadlineTypes = ["deadline", "court-date", "hearing", "filing", "deposition"];
      const deadlines = events.filter((e) => deadlineTypes.includes(e.eventType));
      const rows = deadlines.map((e) => {
        const eventDate = new Date(e.startDate);
        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let status = "upcoming";
        if (daysUntil < 0) status = "missed";
        else if (daysUntil <= 7) status = "due-soon";
        return {
          title: e.title,
          matterName: e.matterId ? matterMap.get(e.matterId) || e.matterId : "-",
          eventType: e.eventType,
          startDate: e.startDate,
          status,
          daysUntil,
        };
      });
      const missed = rows.filter((r) => r.status === "missed").length;
      const dueSoon = rows.filter((r) => r.status === "due-soon").length;
      return {
        summary: {
          totalDeadlines: { label: "Total Deadlines", value: String(rows.length) },
          missed: { label: "Missed", value: String(missed) },
          dueSoon: { label: "Due Soon (7 days)", value: String(dueSoon) },
          upcoming: { label: "Upcoming", value: String(rows.length - missed - dueSoon) },
        },
        rows,
        totalRows: rows.length,
      };
    },
  },
  {
    id: "ai-usage",
    name: "AI Usage",
    description: "AI operation records with model, cost, latency, and status details",
    category: "AI Operations",
    categoryColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    columns: [
      { key: "timestamp", label: "Time", type: "date" },
      { key: "model", label: "Model", type: "string" },
      { key: "operation", label: "Operation", type: "string" },
      { key: "provider", label: "Provider", type: "badge" },
      { key: "status", label: "Status", type: "badge" },
      { key: "latencyMs", label: "Latency (ms)", type: "number" },
      { key: "inputTokensEst", label: "Input Tokens", type: "number" },
      { key: "outputTokensEst", label: "Output Tokens", type: "number" },
      { key: "costEstUsd", label: "Cost", type: "currency" },
    ],
    getData: async () => {
      const records = getAIOpsRecords(200, 0);
      const summary = getAIOpsSummary();
      return {
        summary: {
          totalCalls: { label: "Total Calls", value: String(summary.totalCalls) },
          totalCost: { label: "Total Cost", value: summary.totalCostUsd.toFixed(4), prefix: "$" },
          avgLatency: { label: "Avg Latency", value: `${summary.avgLatencyMs}ms` },
          successRate: { label: "Success Rate", value: `${summary.successRate.toFixed(1)}%` },
        },
        rows: records.map((r) => ({
          timestamp: r.timestamp,
          model: r.model,
          operation: r.operation,
          provider: r.provider,
          status: r.status,
          latencyMs: r.latencyMs,
          inputTokensEst: r.inputTokensEst,
          outputTokensEst: r.outputTokensEst,
          costEstUsd: r.costEstUsd,
        })),
        totalRows: records.length,
      };
    },
  },
  {
    id: "ai-cost-summary",
    name: "AI Cost Summary",
    description: "Cost breakdown by model and operation type with usage statistics",
    category: "AI Operations",
    categoryColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    columns: [
      { key: "model", label: "Model", type: "string" },
      { key: "calls", label: "Calls", type: "number" },
      { key: "costUsd", label: "Cost", type: "currency" },
      { key: "avgLatencyMs", label: "Avg Latency (ms)", type: "number" },
      { key: "errorCount", label: "Errors", type: "number" },
      { key: "errorRate", label: "Error Rate", type: "string" },
    ],
    getData: async () => {
      const summary = getAIOpsSummary();
      const rows = Object.entries(summary.byModel).map(([model, data]) => ({
        model,
        calls: data.calls,
        costUsd: Math.round(data.costUsd * 10000) / 10000,
        avgLatencyMs: data.avgLatencyMs,
        errorCount: data.errorCount,
        errorRate: data.calls > 0 ? `${((data.errorCount / data.calls) * 100).toFixed(1)}%` : "0%",
      }));
      return {
        summary: {
          totalCost: { label: "Total Cost", value: summary.totalCostUsd.toFixed(4), prefix: "$" },
          totalCalls: { label: "Total Calls", value: String(summary.totalCalls) },
          models: { label: "Models Used", value: String(rows.length) },
          last24hCost: { label: "Last 24h Cost", value: summary.last24hCostUsd.toFixed(4), prefix: "$" },
        },
        rows,
        totalRows: rows.length,
      };
    },
  },
  {
    id: "calendar-events",
    name: "Calendar Events",
    description: "Calendar events organized by matter and event type",
    category: "Compliance",
    categoryColor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    columns: [
      { key: "title", label: "Title", type: "string" },
      { key: "matterName", label: "Matter", type: "string" },
      { key: "eventType", label: "Type", type: "badge" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "location", label: "Location", type: "string" },
      { key: "allDay", label: "All Day", type: "string" },
    ],
    getData: async () => {
      const [events, matters] = await Promise.all([
        storage.getCalendarEvents(),
        storage.getMatters(),
      ]);
      const matterMap = new Map(matters.map((m) => [m.id, m.name]));
      const typeCounts: Record<string, number> = {};
      events.forEach((e) => { typeCounts[e.eventType] = (typeCounts[e.eventType] || 0) + 1; });
      return {
        summary: {
          totalEvents: { label: "Total Events", value: String(events.length) },
          courtDates: { label: "Court Dates", value: String(typeCounts["court-date"] || 0) },
          deadlines: { label: "Deadlines", value: String(typeCounts["deadline"] || 0) },
          hearings: { label: "Hearings", value: String(typeCounts["hearing"] || 0) },
        },
        rows: events.map((e) => ({
          title: e.title,
          matterName: e.matterId ? matterMap.get(e.matterId) || e.matterId : "-",
          eventType: e.eventType,
          startDate: e.startDate,
          endDate: e.endDate || "-",
          location: e.location || "-",
          allDay: e.allDay ? "Yes" : "No",
        })),
        totalRows: events.length,
      };
    },
  },
  {
    id: "evidence-chain",
    name: "Evidence Chain",
    description: "Evidence vault items with custody chain status and integrity verification",
    category: "Compliance",
    categoryColor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    columns: [
      { key: "originalName", label: "File Name", type: "string" },
      { key: "matterName", label: "Matter", type: "string" },
      { key: "evidenceType", label: "Type", type: "badge" },
      { key: "confidentiality", label: "Confidentiality", type: "badge" },
      { key: "uploadedAt", label: "Uploaded", type: "date" },
      { key: "custodyEvents", label: "Custody Events", type: "number" },
      { key: "hashVerified", label: "Hash Verified", type: "string" },
    ],
    getData: async () => {
      const matters = await storage.getMatters();
      const allFiles: any[] = [];
      const matterMap = new Map(matters.map((m) => [m.id, m.name]));
      for (const matter of matters) {
        try {
          const files = await storage.getEvidenceVaultFiles(matter.id);
          files.forEach((f) => {
            allFiles.push({
              originalName: f.originalName,
              matterName: matterMap.get(f.matterId) || f.matterId,
              evidenceType: f.evidenceType,
              confidentiality: f.confidentiality,
              uploadedAt: f.uploadedAt,
              custodyEvents: f.chainOfCustody?.length || 0,
              hashVerified: f.originalHash ? "Verified" : "Pending",
            });
          });
        } catch (_e) {}
      }
      const confCounts: Record<string, number> = {};
      allFiles.forEach((f) => { confCounts[f.confidentiality] = (confCounts[f.confidentiality] || 0) + 1; });
      return {
        summary: {
          totalFiles: { label: "Total Files", value: String(allFiles.length) },
          privileged: { label: "Privileged", value: String(confCounts["privileged"] || 0) },
          confidential: { label: "Confidential", value: String(confCounts["confidential"] || 0) },
          verified: { label: "Hash Verified", value: String(allFiles.filter((f) => f.hashVerified === "Verified").length) },
        },
        rows: allFiles,
        totalRows: allFiles.length,
      };
    },
  },
];

router.get("/api/reports/catalog", (_req: Request, res: Response) => {
  const catalog = reportDefinitions.map(({ getData, ...rest }) => rest);
  res.json(catalog);
});

router.get("/api/reports/:reportId/data", async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = reportDefinitions.find((r) => r.id === reportId);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const sortBy = req.query.sortBy as string | undefined;
    const sortDir = (req.query.sortDir as string) || "asc";
    const groupBy = req.query.groupBy as string | undefined;
    const filter = req.query.filter as string | undefined;

    const data = await report.getData();
    let rows = data.rows;

    if (filter) {
      const filterLower = filter.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(filterLower)
        )
      );
    }

    if (sortBy) {
      rows = [...rows].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "desc" ? bVal - aVal : aVal - bVal;
        }
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDir === "desc" ? -comparison : comparison;
      });
    }

    const totalRows = rows.length;
    const startIdx = (page - 1) * pageSize;
    const pagedRows = rows.slice(startIdx, startIdx + pageSize);

    res.json({
      summary: data.summary,
      columns: report.columns,
      rows: pagedRows,
      totalRows,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows / pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export function registerReportsRoutes(app: Express) {
  app.use(router);
}
