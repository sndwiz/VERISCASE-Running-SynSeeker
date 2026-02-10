import { eq, desc, and, sql } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  TimeEntry,
  InsertTimeEntry,
  Expense,
  InsertExpense,
  Invoice,
  InsertInvoice,
  InvoiceLineItem,
  Payment,
  InsertPayment,
  TrustTransaction,
  InsertTrustTransaction,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class BillingStorage {

  async getTimeEntries(matterId?: string): Promise<TimeEntry[]> {
    const rows = matterId
      ? await db.select().from(tables.timeEntries).where(eq(tables.timeEntries.matterId, matterId)).orderBy(desc(tables.timeEntries.date))
      : await db.select().from(tables.timeEntries).orderBy(desc(tables.timeEntries.date));
    return rows.map(row => ({
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [row] = await db.select().from(tables.timeEntries).where(eq(tables.timeEntries.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry> {
    const now = new Date();
    const [row] = await db.insert(tables.timeEntries).values({
      matterId: data.matterId,
      taskId: data.taskId,
      userId: data.userId,
      userName: data.userName,
      date: data.date,
      hours: data.hours,
      description: data.description,
      billableStatus: data.billableStatus || "billable",
      hourlyRate: data.hourlyRate,
      activityCode: data.activityCode,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.timeEntries).set(updateWithTime).where(eq(tables.timeEntries.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    await db.delete(tables.timeEntries).where(eq(tables.timeEntries.id, id));
    return true;
  }

  async getExpenses(filters?: { clientId?: string; matterId?: string }): Promise<Expense[]> {
    let query = db.select().from(tables.expenses);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.expenses.clientId, filters.clientId));
    if (filters?.matterId) conditions.push(eq(tables.expenses.matterId, filters.matterId));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.expenses.date))
      : await query.orderBy(desc(tables.expenses.date));
    return rows.map(row => ({
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [row] = await db.select().from(tables.expenses).where(eq(tables.expenses.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.expenses).values({
      id,
      matterId: data.matterId,
      clientId: data.clientId,
      date: data.date,
      amount: data.amount,
      description: data.description,
      category: data.category,
      billable: data.billable ?? true,
      reimbursable: data.reimbursable ?? false,
      vendor: data.vendor || null,
      receiptUrl: data.receiptUrl || null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.expenses).set(updateWithTime).where(eq(tables.expenses.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteExpense(id: string): Promise<boolean> {
    await db.delete(tables.expenses).where(eq(tables.expenses.id, id));
    return true;
  }

  async getInvoices(filters?: { clientId?: string; matterId?: string }): Promise<Invoice[]> {
    let query = db.select().from(tables.invoices);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.invoices.clientId, filters.clientId));
    if (filters?.matterId) conditions.push(eq(tables.invoices.matterId, filters.matterId!));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.invoices.issueDate))
      : await query.orderBy(desc(tables.invoices.issueDate));
    return rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [row] = await db.select().from(tables.invoices).where(eq(tables.invoices.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const now = new Date();
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(tables.invoices);
    const invoiceNumber = `INV-${(Number(countResult[0]?.count) || 0) + 1001}`;
    const [row] = await db.insert(tables.invoices).values({
      id,
      invoiceNumber,
      clientId: data.clientId,
      matterId: data.matterId || null,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      status: data.status || "draft",
      lineItems: (data.lineItems as any) || [],
      subtotal: data.subtotal || 0,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount || 0,
      paidAmount: data.paidAmount || 0,
      balanceDue: data.balanceDue || 0,
      notes: data.notes || null,
      paymentTerms: data.paymentTerms || null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime: any = { ...updateData, updatedAt: new Date() };
    if (updateData.lineItems) updateWithTime.lineItems = updateData.lineItems as any;
    const [row] = await db.update(tables.invoices).set(updateWithTime).where(eq(tables.invoices.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(tables.invoices).where(eq(tables.invoices.id, id));
    return true;
  }

  async getPayments(filters?: { clientId?: string; invoiceId?: string }): Promise<Payment[]> {
    let query = db.select().from(tables.payments);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.payments.clientId, filters.clientId));
    if (filters?.invoiceId) conditions.push(eq(tables.payments.invoiceId, filters.invoiceId));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.payments.date))
      : await query.orderBy(desc(tables.payments.date));
    return rows.map(row => ({
      id: row.id,
      invoiceId: row.invoiceId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      method: row.method as any,
      reference: row.reference || undefined,
      notes: row.notes || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    }));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.payments).values({
      id,
      invoiceId: data.invoiceId,
      clientId: data.clientId,
      date: data.date,
      amount: data.amount,
      method: data.method,
      reference: data.reference || null,
      notes: data.notes || null,
      createdBy: data.createdBy,
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      method: row.method as any,
      reference: row.reference || undefined,
      notes: row.notes || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }

  async getTrustTransactions(filters?: { clientId?: string; matterId?: string }): Promise<TrustTransaction[]> {
    let query = db.select().from(tables.trustTransactions);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.trustTransactions.clientId, filters.clientId));
    if (filters?.matterId) conditions.push(eq(tables.trustTransactions.matterId, filters.matterId!));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.trustTransactions.date))
      : await query.orderBy(desc(tables.trustTransactions.date));
    return rows.map(row => ({
      id: row.id,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      date: row.date,
      amount: row.amount,
      type: row.type as any,
      description: row.description,
      reference: row.reference || undefined,
      runningBalance: row.runningBalance || 0,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    }));
  }

  async createTrustTransaction(data: InsertTrustTransaction): Promise<TrustTransaction> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.trustTransactions).values({
      id,
      clientId: data.clientId,
      matterId: data.matterId || null,
      date: data.date,
      amount: data.amount,
      type: data.type,
      description: data.description,
      reference: data.reference || null,
      runningBalance: data.runningBalance || 0,
      createdBy: data.createdBy,
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      date: row.date,
      amount: row.amount,
      type: row.type as any,
      description: row.description,
      reference: row.reference || undefined,
      runningBalance: row.runningBalance || 0,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }
}
