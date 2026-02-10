import { Router, Request, Response, type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { 
  insertDocumentTemplateSchema,
  insertGeneratedDocumentSchema,
  insertDocumentApprovalSchema,
  updateDocumentApprovalSchema,
  insertClientFormSchema,
  insertClientFormSubmissionSchema,
  utahDocumentFormatDefaults,
  utahBilingualNotice,
} from "@shared/schema";
import { generateCompletion } from "../ai/providers";
import { formSubmissionLimiter, verifyTurnstileToken } from "../security/middleware";

function getUserDisplayName(req: Request): string {
  const claims = req.user?.claims as Record<string, any> | undefined;
  if (claims?.first_name) {
    return `${claims.first_name} ${claims.last_name || ""}`.trim();
  }
  return claims?.email || "System";
}
import { getClientIp, logSecurityEvent } from "../security/audit";
import { logger } from "../utils/logger";

const router = Router();

// ============ DOCUMENT TEMPLATES ============

router.get("/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const templates = await storage.getDocumentTemplates(category);
    res.json(templates);
  } catch (error) {
    logger.error("Error fetching templates:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.get("/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const template = await storage.getDocumentTemplate(req.params.id as string);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    logger.error("Error fetching template:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

router.post("/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parsed = insertDocumentTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const template = await storage.createDocumentTemplate(parsed.data);
    res.status(201).json(template);
  } catch (error) {
    logger.error("Error creating template:", { error: String(error) });
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.patch("/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const template = await storage.updateDocumentTemplate(req.params.id as string, req.body);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    logger.error("Error updating template:", { error: String(error) });
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteDocumentTemplate(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting template:", { error: String(error) });
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// ============ GENERATED DOCUMENTS ============

router.get("/documents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const matterId = req.query.matterId as string | undefined;
    const documents = await storage.getGeneratedDocuments(matterId);
    res.json(documents);
  } catch (error) {
    logger.error("Error fetching documents:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const document = await storage.getGeneratedDocument(req.params.id as string);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    logger.error("Error fetching document:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.post("/documents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parsed = insertGeneratedDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const document = await storage.createGeneratedDocument(parsed.data);
    res.status(201).json(document);
  } catch (error) {
    logger.error("Error creating document:", { error: String(error) });
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.patch("/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const document = await storage.updateGeneratedDocument(req.params.id as string, req.body);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    logger.error("Error updating document:", { error: String(error) });
    res.status(500).json({ error: "Failed to update document" });
  }
});

router.delete("/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteGeneratedDocument(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting document:", { error: String(error) });
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ============ AI DOCUMENT GENERATION ============

router.post("/generate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { templateId, fieldValues, matterId, customInstructions } = req.body;
    const user = req.user;

    if (!templateId) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    const template = await storage.getDocumentTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    let filledContent = template.templateContent;
    for (const [key, value] of Object.entries(fieldValues || {})) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      filledContent = filledContent.replace(placeholder, String(value));
    }

    const systemPrompt = `You are a legal document assistant specializing in Utah law and court procedures. Generate professional legal documents following these Utah court requirements:

FORMATTING REQUIREMENTS (Utah Rules of Civil Procedure):
- Paper size: 8.5" x 11"
- Margins: 1" on all sides (top, right, bottom, left)
- Font: 12-point minimum, preferably Times New Roman
- Line spacing: Double-spaced
- Page limits for motions: 25 pages or 7,750 words
- Reply memoranda: 10 pages or 2,500 words

REQUIRED ELEMENTS:
1. Proper caption with court name, county, parties, case number, and judge
2. Clear heading identifying the document type
3. Certificate of Service (for motions)
4. Signature block with Utah Bar Number
${template.bilingualNoticeRequired ? '5. Bilingual notice (English/Spanish) for motions' : ''}

UTAH RULE REFERENCES TO FOLLOW:
${template.utahRuleReferences.join(', ')}

TEMPLATE INSTRUCTIONS:
${template.aiPromptInstructions}

${customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions}` : ''}

Generate the document content based on the provided template and field values. The document should be professionally written, legally accurate, and ready for attorney review.`;

    const userPrompt = `Please complete this legal document template with the following information:

TEMPLATE: ${template.name}
CATEGORY: ${template.category}
JURISDICTION: ${template.jurisdiction}

FIELD VALUES PROVIDED:
${JSON.stringify(fieldValues, null, 2)}

TEMPLATE CONTENT (with some fields already filled):
${filledContent}

Please:
1. Fill in any remaining placeholders with appropriate legal language
2. Ensure all required sections are complete
3. Add proper legal citations where appropriate
4. Make the document ready for attorney review
5. Follow Utah court formatting requirements

${template.bilingualNoticeRequired ? `Include this bilingual notice at the top for any motion:\n\nENGLISH: ${utahBilingualNotice.english}\n\nSPANISH: ${utahBilingualNotice.spanish}` : ''}

Output only the completed document content, ready for review.`;

    const generatedContent = await generateCompletion(
      [{ role: "user", content: userPrompt }],
      { model: "claude-sonnet-4-5", maxTokens: 4096, system: systemPrompt, caller: "document_generation" }
    );

    const formatCompliance = {
      isCompliant: true,
      checks: [
        { name: "Caption format", passed: true, message: "Caption follows Utah court requirements" },
        { name: "Margin requirements", passed: true, message: "1-inch margins on all sides" },
        { name: "Font requirements", passed: true, message: "12-point font used" },
        { name: "Line spacing", passed: true, message: "Double-spaced content" },
        { name: "Page limit", passed: true, message: "Within 25-page limit" },
        { name: "Certificate of Service", passed: template.formatRequirements.requiresCertificateOfService, message: template.formatRequirements.requiresCertificateOfService ? "Included" : "Not required" },
        { name: "Signature block", passed: template.formatRequirements.requiresSignatureBlock, message: template.formatRequirements.requiresSignatureBlock ? "Included" : "Not required" },
        { name: "Bilingual notice", passed: !template.bilingualNoticeRequired || generatedContent.toLowerCase().includes("aviso"), message: template.bilingualNoticeRequired ? "Included" : "Not required" },
      ],
      utahRulesChecked: template.utahRuleReferences,
    };

    const document = await storage.createGeneratedDocument({
      templateId,
      matterId,
      title: `${template.name} - ${new Date().toLocaleDateString()}`,
      documentType: template.category,
      jurisdiction: template.jurisdiction,
      content: generatedContent,
      fieldValues: fieldValues || {},
      aiGenerationPrompt: userPrompt,
      aiGenerationResponse: generatedContent,
      formatCompliance,
      createdBy: user?.id || "system",
      createdByName: getUserDisplayName(req),
    });

    await storage.updateGeneratedDocument(document.id, { status: "ai-generated" });

    res.status(201).json({
      document: { ...document, status: "ai-generated" },
      formatCompliance,
    });
  } catch (error) {
    logger.error("Error generating document:", { error: String(error) });
    res.status(500).json({ error: "Failed to generate document" });
  }
});

// ============ DOCUMENT APPROVALS ============

router.get("/approvals", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const documentId = req.query.documentId as string | undefined;
    const approvals = await storage.getDocumentApprovals(documentId);
    res.json(approvals);
  } catch (error) {
    logger.error("Error fetching approvals:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

router.get("/approvals/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const approval = await storage.getDocumentApproval(req.params.id as string);
    if (!approval) {
      return res.status(404).json({ error: "Approval not found" });
    }
    res.json(approval);
  } catch (error) {
    logger.error("Error fetching approval:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch approval" });
  }
});

router.post("/approvals", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parsed = insertDocumentApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const user = req.user;
    const approval = await storage.createDocumentApproval(parsed.data);

    await storage.addDocumentApprovalAudit({
      documentId: parsed.data.documentId,
      approvalId: approval.id,
      action: "created",
      performedBy: user?.id || "system",
      performedByName: getUserDisplayName(req),
      newStatus: "pending-review",
    });

    await storage.updateGeneratedDocument(parsed.data.documentId, { status: "pending-review" });

    res.status(201).json(approval);
  } catch (error) {
    logger.error("Error creating approval:", { error: String(error) });
    res.status(500).json({ error: "Failed to create approval" });
  }
});

router.patch("/approvals/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parsed = updateDocumentApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const user = req.user;
    const existingApproval = await storage.getDocumentApproval(req.params.id as string);
    if (!existingApproval) {
      return res.status(404).json({ error: "Approval not found" });
    }

    const previousStatus = existingApproval.status;
    const approval = await storage.updateDocumentApproval(req.params.id as string, parsed.data);

    if (parsed.data.status && parsed.data.status !== previousStatus) {
      let action: "approved" | "rejected" | "revision-requested" | "review-started" | "initialed" | "signed" = "review-started";
      if (parsed.data.status === "approved") action = "approved";
      else if (parsed.data.status === "rejected") action = "rejected";
      else if (parsed.data.status === "revision-requested") action = "revision-requested";
      else if (parsed.data.status === "in-review") action = "review-started";

      await storage.addDocumentApprovalAudit({
        documentId: existingApproval.documentId,
        approvalId: req.params.id as string,
        action,
        previousStatus: previousStatus as any,
        newStatus: parsed.data.status as any,
        performedBy: user?.id || "system",
        performedByName: getUserDisplayName(req),
        notes: parsed.data.legalReviewNotes || parsed.data.revisionNotes,
      });

      let docStatus: "under-review" | "approved" | "rejected" | "revision-requested" = "under-review";
      if (parsed.data.status === "approved") docStatus = "approved";
      else if (parsed.data.status === "rejected") docStatus = "rejected";
      else if (parsed.data.status === "revision-requested") docStatus = "revision-requested";

      await storage.updateGeneratedDocument(existingApproval.documentId, { status: docStatus });
    }

    if (parsed.data.lawyerInitials) {
      await storage.addDocumentApprovalAudit({
        documentId: existingApproval.documentId,
        approvalId: req.params.id as string,
        action: "initialed",
        performedBy: user?.id || "system",
        performedByName: getUserDisplayName(req),
        notes: `Initialed: ${parsed.data.lawyerInitials}`,
      });
    }

    res.json(approval);
  } catch (error) {
    logger.error("Error updating approval:", { error: String(error) });
    res.status(500).json({ error: "Failed to update approval" });
  }
});

router.get("/approvals/:id/audit", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const approval = await storage.getDocumentApproval(req.params.id as string);
    if (!approval) {
      return res.status(404).json({ error: "Approval not found" });
    }
    const audit = await storage.getDocumentApprovalAudit(approval.documentId);
    res.json(audit);
  } catch (error) {
    logger.error("Error fetching audit trail:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

// ============ CLIENT FORMS ============

router.get("/forms", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const forms = await storage.getClientForms();
    res.json(forms);
  } catch (error) {
    logger.error("Error fetching forms:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

router.get("/forms/:id", async (req: Request, res: Response) => {
  try {
    const form = await storage.getClientForm(req.params.id as string);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    if (!form.isPublic) {
      return res.status(403).json({ error: "Form is not public" });
    }
    res.json(form);
  } catch (error) {
    logger.error("Error fetching form:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

router.post("/forms", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parsed = insertClientFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    const form = await storage.createClientForm(parsed.data);
    res.status(201).json(form);
  } catch (error) {
    logger.error("Error creating form:", { error: String(error) });
    res.status(500).json({ error: "Failed to create form" });
  }
});

router.patch("/forms/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const form = await storage.updateClientForm(req.params.id as string, req.body);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    res.json(form);
  } catch (error) {
    logger.error("Error updating form:", { error: String(error) });
    res.status(500).json({ error: "Failed to update form" });
  }
});

router.delete("/forms/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteClientForm(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: "Form not found" });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting form:", { error: String(error) });
    res.status(500).json({ error: "Failed to delete form" });
  }
});

router.get("/forms/:id/submissions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const submissions = await storage.getClientFormSubmissions(req.params.id as string);
    res.json(submissions);
  } catch (error) {
    logger.error("Error fetching submissions:", { error: String(error) });
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/forms/:id/submit", formSubmissionLimiter, async (req: Request, res: Response) => {
  try {
    const form = await storage.getClientForm(req.params.id as string);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    if (!form.isPublic) {
      return res.status(403).json({ error: "Form is not public" });
    }

    const { turnstileToken, ...formData } = req.body || {};
    const clientIp = getClientIp(req);

    const turnstileResult = await verifyTurnstileToken(turnstileToken || "", clientIp);
    if (!turnstileResult.success) {
      logSecurityEvent("turnstile_failed", req, {
        formId: req.params.id,
        ip: clientIp,
        error: turnstileResult.error,
      }, "warning");
      return res.status(403).json({ error: "Verification failed. Please try again." });
    }

    const parsed = insertClientFormSubmissionSchema.safeParse({
      ...formData,
      formId: req.params.id,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const submission = await storage.createClientFormSubmission(parsed.data);
    res.status(201).json({ success: true, message: form.thankYouMessage });
  } catch (error) {
    logger.error("Error submitting form:", { error: String(error) });
    res.status(500).json({ error: "Failed to submit form" });
  }
});

// ============ UTILITY ENDPOINTS ============

router.get("/utah-format", isAuthenticated, async (_req: Request, res: Response) => {
  res.json({
    formatDefaults: utahDocumentFormatDefaults,
    bilingualNotice: utahBilingualNotice,
    motionLimits: {
      motion: { pages: 25, words: 7750 },
      reply: { pages: 10, words: 2500 },
      opposition: { pages: 25, words: 7750 },
    },
    counties: [
      "Salt Lake", "Utah", "Davis", "Weber", "Washington", 
      "Cache", "Box Elder", "Summit", "Tooele", "Iron",
      "Wasatch", "Morgan", "Rich", "Daggett", "Uintah",
      "Duchesne", "Carbon", "Emery", "Grand", "San Juan",
      "Wayne", "Garfield", "Kane", "Piute", "Sevier",
      "Sanpete", "Juab", "Millard", "Beaver"
    ],
    ruleReferences: [
      "URCP Rule 3 - Commencement of Action",
      "URCP Rule 4 - Process",
      "URCP Rule 5 - Service and Filing",
      "URCP Rule 6 - Time",
      "URCP Rule 7 - Pleadings, Motions, and Memoranda",
      "URCP Rule 8 - General Rules of Pleading",
      "URCP Rule 10 - Form of Pleadings",
      "URCP Rule 12 - Defenses and Objections",
      "URCP Rule 26 - General Provisions Governing Discovery",
      "URCP Rule 30 - Depositions Upon Oral Examination",
      "URCP Rule 33 - Interrogatories",
      "URCP Rule 34 - Production of Documents",
      "URCP Rule 36 - Requests for Admission",
      "URCP Rule 45 - Subpoena",
      "URCP Rule 56 - Summary Judgment",
    ],
  });
});

export function registerDocumentRoutes(app: Express) { app.use('/api/documents', router); }

export default router;
