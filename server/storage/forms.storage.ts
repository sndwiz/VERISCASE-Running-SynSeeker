import { db } from "./base";
import * as tables from "@shared/models/tables";
import type { ClientForm, InsertClientForm, ClientFormSubmission, InsertClientFormSubmission } from "@shared/schema";
import { randomUUID } from "crypto";

export class FormsStorage {
  private clientFormsCache: Map<string, ClientForm> = new Map();
  private clientFormSubmissionsCache: Map<string, ClientFormSubmission> = new Map();

  async getClientForms(): Promise<ClientForm[]> {
    return Array.from(this.clientFormsCache.values()).filter(f => f.isActive);
  }

  async getClientForm(id: string): Promise<ClientForm | undefined> {
    return this.clientFormsCache.get(id);
  }

  async createClientForm(data: InsertClientForm): Promise<ClientForm> {
    const now = new Date().toISOString();
    const form: ClientForm = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      formFields: data.formFields || [],
      isPublic: data.isPublic ?? false,
      requiresSignature: data.requiresSignature ?? false,
      instructions: data.instructions || "",
      thankYouMessage: data.thankYouMessage || "Thank you for your submission.",
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.clientFormsCache.set(form.id, form);
    return form;
  }

  async updateClientForm(id: string, data: Partial<ClientForm>): Promise<ClientForm | undefined> {
    const form = this.clientFormsCache.get(id);
    if (!form) return undefined;
    const updated = { ...form, ...data, updatedAt: new Date().toISOString() };
    this.clientFormsCache.set(id, updated);
    return updated;
  }

  async deleteClientForm(id: string): Promise<boolean> {
    return this.clientFormsCache.delete(id);
  }

  async getClientFormSubmissions(formId?: string): Promise<ClientFormSubmission[]> {
    const submissions = Array.from(this.clientFormSubmissionsCache.values());
    if (formId) return submissions.filter(s => s.formId === formId);
    return submissions;
  }

  async createClientFormSubmission(data: InsertClientFormSubmission): Promise<ClientFormSubmission> {
    const submission: ClientFormSubmission = {
      id: randomUUID(),
      formId: data.formId,
      matterId: data.matterId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      submittedData: data.submittedData,
      signature: data.signature,
      signedAt: data.signature ? new Date().toISOString() : undefined,
      submittedAt: new Date().toISOString(),
      reviewed: false,
    };
    this.clientFormSubmissionsCache.set(submission.id, submission);
    return submission;
  }
}
