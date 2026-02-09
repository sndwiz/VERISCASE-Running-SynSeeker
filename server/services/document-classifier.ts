import { generateCompletion } from "../ai/providers";

export interface ClassificationResult {
  docType: string;
  docSubtype: string | null;
  docCategory: string;
  confidence: number;
  filedDate: string | null;
  servedDate: string | null;
  hearingDate: string | null;
  responseDeadlineAnchor: string | null;
  partiesInvolved: string[];
  extractedFacts: Record<string, any>;
  relatedDocReference: string | null;
}

const DOCUMENT_TYPES = [
  "Complaint/Petition",
  "Summons",
  "Proof/Certificate of Service",
  "Answer",
  "Motion",
  "Notice",
  "Order",
  "Discovery Request",
  "Discovery Response",
  "Disclosure/Initial Disclosures",
  "Subpoena",
  "Settlement/Stipulation",
  "Scheduling Order",
  "Filing Confirmation",
  "Other",
];

const MOTION_SUBTYPES = [
  "MSJ (Motion for Summary Judgment)",
  "MTD (Motion to Dismiss)",
  "Motion to Compel",
  "Motion for Protective Order",
  "Motion in Limine",
  "Motion to Continue",
  "Motion to Withdraw",
  "Other Motion",
];

const DISCOVERY_SUBTYPES = [
  "Interrogatories",
  "Requests for Production (RFP)",
  "Requests for Admission (RFA)",
  "Notice of Service",
  "Deposition Notice",
  "Subpoena Duces Tecum",
];

const NOTICE_SUBTYPES = [
  "Notice of Hearing",
  "Notice of Deposition",
  "Notice of Appearance",
  "Notice of Withdrawal",
  "Other Notice",
];

const DOC_CATEGORY_MAP: Record<string, string> = {
  "Complaint/Petition": "pleading",
  "Summons": "pleading",
  "Answer": "pleading",
  "Motion": "motion",
  "Order": "order-ruling",
  "Scheduling Order": "order-ruling",
  "Notice": "correspondence",
  "Discovery Request": "discovery",
  "Discovery Response": "discovery",
  "Disclosure/Initial Disclosures": "discovery",
  "Proof/Certificate of Service": "admin-operations",
  "Subpoena": "discovery",
  "Settlement/Stipulation": "pleading",
  "Filing Confirmation": "admin-operations",
  "Other": "admin-operations",
};

export async function classifyDocument(
  text: string,
  fileName: string,
  matterContext?: { caseNumber?: string; courtName?: string; parties?: string[] }
): Promise<ClassificationResult> {
  try {
    const systemPrompt = `You are a legal document classifier. Analyze the provided document text and classify it.

DOCUMENT TYPES (choose one):
${DOCUMENT_TYPES.map((t) => `- ${t}`).join("\n")}

MOTION SUBTYPES (if type is "Motion"):
${MOTION_SUBTYPES.map((t) => `- ${t}`).join("\n")}

DISCOVERY SUBTYPES (if type is "Discovery Request" or "Discovery Response"):
${DISCOVERY_SUBTYPES.map((t) => `- ${t}`).join("\n")}

NOTICE SUBTYPES (if type is "Notice"):
${NOTICE_SUBTYPES.map((t) => `- ${t}`).join("\n")}

DISCOVERY RECOGNITION RULES:
- If title/text includes "Interrogatories" -> Discovery Request, subtype "Interrogatories"
- If title/text includes "Requests for Production" or "RFP" -> Discovery Request, subtype "Requests for Production (RFP)"
- If title/text includes "Requests for Admission" or "RFA" -> Discovery Request, subtype "Requests for Admission (RFA)"
- If title/text includes "Notice of Service" -> Discovery Request, subtype "Notice of Service"
- If title/text includes "Responses and Objections" -> Discovery Response
- If both request and response language appear -> classify as Discovery Response and link to originating request

GREEN FILING / E-FILING DETECTION:
- If document appears to be a filing receipt/confirmation page, classify as "Filing Confirmation"
- Extract: exact filed timestamp, document title as filed, served parties list

Return a JSON object with these fields:
{
  "docType": "one of the document types above",
  "docSubtype": "subtype if applicable, null otherwise",
  "confidence": 0.0-1.0,
  "filedDate": "YYYY-MM-DD or null",
  "servedDate": "YYYY-MM-DD or null",
  "hearingDate": "YYYY-MM-DD or null",
  "responseDeadlineAnchor": "YYYY-MM-DD - the date from which response deadlines should be computed, usually the service date",
  "partiesInvolved": ["party names mentioned"],
  "extractedFacts": {
    "judge": "judge name if found",
    "court": "court name if found",
    "caseNumber": "case number if found",
    "attorney": "attorney name if found",
    "certificateOfService": true/false,
    "filedTimestamp": "exact timestamp if filing confirmation",
    "documentTitleAsFiled": "title from filing confirmation",
    "servedPartiesList": ["parties served from confirmation"],
    "discoverySetNumber": "e.g. 'First Set' if applicable",
    "motionTitle": "full motion title if applicable"
  },
  "relatedDocReference": "reference to related document, e.g. 'Plaintiff's First Set of Interrogatories'"
}

Return ONLY valid JSON, no other text.`;

    const contextInfo = matterContext
      ? `\nMATTER CONTEXT: Case #${matterContext.caseNumber || "unknown"}, Court: ${matterContext.courtName || "unknown"}, Known parties: ${(matterContext.parties || []).join(", ")}`
      : "";

    const userPrompt = `Classify this legal document.

FILE NAME: ${fileName}
${contextInfo}

DOCUMENT TEXT (first 8000 chars):
${text.substring(0, 8000)}`;

    const responseText = await generateCompletion(
      [{ role: "user", content: userPrompt }],
      { model: "claude-sonnet-4-20250514", maxTokens: 1024, system: systemPrompt, caller: "document_classifier" }
    );

    let parsed: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      parsed = {
        docType: "Other",
        docSubtype: null,
        confidence: 0.3,
        filedDate: null,
        servedDate: null,
        hearingDate: null,
        responseDeadlineAnchor: null,
        partiesInvolved: [],
        extractedFacts: {},
        relatedDocReference: null,
      };
    }

    const result: ClassificationResult = {
      docType: parsed.docType || "Other",
      docSubtype: parsed.docSubtype || null,
      docCategory: DOC_CATEGORY_MAP[parsed.docType] || "admin-operations",
      confidence: parsed.confidence || 0.5,
      filedDate: parsed.filedDate || null,
      servedDate: parsed.servedDate || null,
      hearingDate: parsed.hearingDate || null,
      responseDeadlineAnchor: parsed.responseDeadlineAnchor || parsed.servedDate || null,
      partiesInvolved: parsed.partiesInvolved || [],
      extractedFacts: parsed.extractedFacts || {},
      relatedDocReference: parsed.relatedDocReference || null,
    };

    return result;
  } catch (error: any) {
    return {
      docType: "Other",
      docSubtype: null,
      docCategory: "admin-operations",
      confidence: 0,
      filedDate: null,
      servedDate: null,
      hearingDate: null,
      responseDeadlineAnchor: null,
      partiesInvolved: [],
      extractedFacts: { classificationError: error.message },
      relatedDocReference: null,
    };
  }
}

export function classifyByFileName(fileName: string): Partial<ClassificationResult> {
  const lower = fileName.toLowerCase();

  if (/complaint|petition/i.test(lower)) return { docType: "Complaint/Petition", docCategory: "pleading" };
  if (/summons/i.test(lower)) return { docType: "Summons", docCategory: "pleading" };
  if (/answer/i.test(lower)) return { docType: "Answer", docCategory: "pleading" };
  if (/certificate.?of.?service|proof.?of.?service/i.test(lower)) return { docType: "Proof/Certificate of Service", docCategory: "admin-operations" };
  if (/motion.?to.?compel/i.test(lower)) return { docType: "Motion", docSubtype: "Motion to Compel", docCategory: "motion" };
  if (/motion.?for.?summary/i.test(lower)) return { docType: "Motion", docSubtype: "MSJ (Motion for Summary Judgment)", docCategory: "motion" };
  if (/motion.?to.?dismiss/i.test(lower)) return { docType: "Motion", docSubtype: "MTD (Motion to Dismiss)", docCategory: "motion" };
  if (/motion/i.test(lower)) return { docType: "Motion", docCategory: "motion" };
  if (/interrogator/i.test(lower)) return { docType: "Discovery Request", docSubtype: "Interrogatories", docCategory: "discovery" };
  if (/request.?for.?production|rfp/i.test(lower)) return { docType: "Discovery Request", docSubtype: "Requests for Production (RFP)", docCategory: "discovery" };
  if (/request.?for.?admission|rfa/i.test(lower)) return { docType: "Discovery Request", docSubtype: "Requests for Admission (RFA)", docCategory: "discovery" };
  if (/responses?.?and.?objection/i.test(lower)) return { docType: "Discovery Response", docCategory: "discovery" };
  if (/notice.?of.?hearing/i.test(lower)) return { docType: "Notice", docSubtype: "Notice of Hearing", docCategory: "correspondence" };
  if (/notice.?of.?depo/i.test(lower)) return { docType: "Notice", docSubtype: "Notice of Deposition", docCategory: "correspondence" };
  if (/notice/i.test(lower)) return { docType: "Notice", docCategory: "correspondence" };
  if (/order/i.test(lower)) return { docType: "Order", docCategory: "order-ruling" };
  if (/scheduling.?order/i.test(lower)) return { docType: "Scheduling Order", docCategory: "order-ruling" };
  if (/subpoena/i.test(lower)) return { docType: "Subpoena", docCategory: "discovery" };
  if (/stipulat|settlem/i.test(lower)) return { docType: "Settlement/Stipulation", docCategory: "pleading" };
  if (/disclosure/i.test(lower)) return { docType: "Disclosure/Initial Disclosures", docCategory: "discovery" };

  return {};
}
