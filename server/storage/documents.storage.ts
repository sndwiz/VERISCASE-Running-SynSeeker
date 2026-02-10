import { db } from "./base";
import * as tables from "@shared/models/tables";
import type { DocumentTemplate, InsertDocumentTemplate, GeneratedDocument, InsertGeneratedDocument, DocumentApproval, InsertDocumentApproval, UpdateDocumentApproval, DocumentApprovalAudit } from "@shared/schema";
import { randomUUID } from "crypto";

export class DocumentsStorage {
  private documentTemplatesCache: Map<string, DocumentTemplate> = new Map();
  private generatedDocumentsCache: Map<string, GeneratedDocument> = new Map();
  private documentApprovalsCache: Map<string, DocumentApproval> = new Map();
  private documentApprovalAuditsCache: Map<string, DocumentApprovalAudit> = new Map();
  private documentTemplatesInitialized = false;

  private initializeDocumentTemplates() {
    if (this.documentTemplatesInitialized) return;
    
    const utahFormatDefaults = {
      paperSize: "8.5x11" as const,
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
      fontSize: 12,
      fontFamily: "Times New Roman",
      lineSpacing: "double" as const,
      requiresCaption: true,
      requiresCertificateOfService: true,
      requiresSignatureBlock: true,
      requiresBilingualNotice: true,
    };

    const templates: DocumentTemplate[] = [
      {
        id: "tpl-motion-continuance",
        name: "Motion for Continuance",
        description: "Request to postpone a scheduled hearing, trial, or deadline in Utah courts",
        category: "motions",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION FOR CONTINUANCE

{{movingParty}}, by and through counsel, hereby moves this Court for an order continuing the {{eventType}} currently scheduled for {{currentDate}}.

STATEMENT OF FACTS

{{factStatement}}

GROUNDS FOR CONTINUANCE

{{groundsForContinuance}}

PROPOSED NEW DATE

{{movingParty}} respectfully requests that the {{eventType}} be rescheduled to {{proposedDate}}, or such other date as the Court deems appropriate.

GOOD CAUSE

Good cause exists for this continuance because: {{goodCauseStatement}}

WHEREFORE, {{movingParty}} respectfully requests that this Court grant this Motion and continue the {{eventType}} to {{proposedDate}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Attorney for {{representedParty}}

CERTIFICATE OF SERVICE

I hereby certify that on {{serviceDate}}, I served a true and correct copy of the foregoing MOTION FOR CONTINUANCE upon the following:

{{opposingCounselInfo}}

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true, placeholder: "Third District Court" },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["Plaintiff", "Defendant"] },
          { id: "eventType", name: "eventType", label: "Event Type", type: "select", required: true, options: ["hearing", "trial", "deposition"] },
          { id: "currentDate", name: "currentDate", label: "Current Date", type: "date", required: true },
          { id: "proposedDate", name: "proposedDate", label: "Proposed Date", type: "date", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 7", "URCP Rule 6"],
        formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
        bilingualNoticeRequired: true,
        aiPromptInstructions: "Generate a professional motion for continuance following Utah Rules of Civil Procedure.",
        tags: ["motion", "continuance", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-motion-dismiss",
        name: "Motion to Dismiss",
        description: "Motion to dismiss under Utah Rules of Civil Procedure Rule 12(b)",
        category: "motions",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION TO DISMISS

{{movingParty}}, by and through counsel, hereby moves this Court pursuant to Utah Rule of Civil Procedure 12(b)({{dismissalBasis}}) for an order dismissing {{dismissTarget}}.

MEMORANDUM IN SUPPORT

I. INTRODUCTION

{{introduction}}

II. STATEMENT OF FACTS

{{factStatement}}

III. ARGUMENT

{{legalArgument}}

IV. CONCLUSION

For the reasons set forth above, {{movingParty}} respectfully requests that this Court grant this Motion and dismiss {{dismissTarget}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{representedParty}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "dismissalBasis", name: "dismissalBasis", label: "Dismissal Basis", type: "select", required: true, options: ["1 - Lack of jurisdiction", "6 - Failure to state a claim"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 12(b)", "URCP Rule 7"],
        formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
        bilingualNoticeRequired: true,
        aiPromptInstructions: "Generate a motion to dismiss following Utah Rules of Civil Procedure Rule 12(b).",
        tags: ["motion", "dismiss", "12(b)"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-civil-complaint",
        name: "Civil Complaint",
        description: "Initial complaint for civil action in Utah courts",
        category: "pleadings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT

Plaintiff {{plaintiffName}}, by and through counsel, hereby complains against Defendant as follows:

PARTIES

1. Plaintiff is {{plaintiffDescription}}.
2. Defendant is {{defendantDescription}}.

JURISDICTION AND VENUE

3. This Court has jurisdiction pursuant to {{jurisdictionBasis}}.
4. Venue is proper because {{venueBasis}}.

FACTUAL ALLEGATIONS

{{factualAllegations}}

CAUSES OF ACTION

{{causesOfAction}}

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests judgment against Defendant for:
1. Compensatory damages;
2. Costs and attorney's fees; and
3. Such other relief as the Court deems just.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 3", "URCP Rule 8", "URCP Rule 10"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a civil complaint following Utah Rules of Civil Procedure.",
        tags: ["pleading", "complaint", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-answer",
        name: "Answer to Complaint",
        description: "Defendant's answer to plaintiff's complaint",
        category: "pleadings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

ANSWER TO COMPLAINT

Defendant {{defendantName}}, by and through counsel, answers Plaintiff's Complaint as follows:

GENERAL DENIAL

Defendant denies each allegation except as specifically admitted herein.

SPECIFIC RESPONSES

{{specificResponses}}

AFFIRMATIVE DEFENSES

{{affirmativeDefenses}}

PRAYER FOR RELIEF

WHEREFORE, Defendant requests:
1. Dismissal of Plaintiff's Complaint with prejudice;
2. Costs and attorney's fees; and
3. Such other relief as the Court deems just.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Defendant`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "URCP Rule 12"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate an answer to complaint following Utah Rules of Civil Procedure.",
        tags: ["pleading", "answer", "defense"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-subpoena",
        name: "Subpoena",
        description: "Subpoena for witness testimony or document production",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

SUBPOENA

TO: {{subpoenaRecipient}}
    {{recipientAddress}}

YOU ARE COMMANDED:

{{subpoenaType}}

{{specificInstructions}}

Failure to comply may result in contempt of court.

DATED this {{day}} day of {{month}}, {{year}}.

BY THE COURT:
_____________________________
Clerk of Court

ISSUED BY:
_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{representedParty}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "subpoenaRecipient", name: "subpoenaRecipient", label: "Recipient", type: "text", required: true },
          { id: "subpoenaType", name: "subpoenaType", label: "Type", type: "select", required: true, options: ["Testify at hearing", "Testify at deposition", "Produce documents"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 45"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a subpoena following Utah Rules of Civil Procedure Rule 45.",
        tags: ["discovery", "subpoena"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ CIVIL LITIGATION FORMS ============
      {
        id: "tpl-civil-cover-sheet",
        name: "Civil Filing Cover Sheet",
        description: "Required cover sheet for filing civil actions in Utah District Court (Form 1000GE)",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `CIVIL FILING COVER SHEET
Utah District Court (Form 1000GE)

CASE INFORMATION:
Court: {{courtName}}
County: {{courtCounty}}

PARTY INFORMATION:
Plaintiff(s): {{plaintiffName}}
Plaintiff Attorney/Self-Represented: {{plaintiffAttorney}}
Bar Number: {{barNumber}}
Address: {{plaintiffAddress}}
Phone: {{plaintiffPhone}}
Email: {{plaintiffEmail}}

Defendant(s): {{defendantName}}
Defendant Attorney (if known): {{defendantAttorney}}

CASE TYPE (Check one):
{{caseType}}

TIER DESIGNATION (per URCP 26):
{{tierDesignation}}

RELATED CASES:
{{relatedCases}}

JURY DEMAND: {{juryDemand}}

I certify that the information provided is true and correct to the best of my knowledge.

Date: {{filingDate}}
Signature: _____________________________`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true, placeholder: "Third District Court" },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name(s)", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name(s)", type: "party", required: true },
          { id: "caseType", name: "caseType", label: "Case Type", type: "select", required: true, options: ["Contract", "Personal Injury - Motor Vehicle", "Personal Injury - Other", "Property Damage", "Medical Malpractice", "Product Liability", "Wrongful Death", "Other Tort", "Real Property", "Domestic Relations", "Probate", "Other Civil"] },
          { id: "tierDesignation", name: "tierDesignation", label: "Tier Designation", type: "select", required: true, options: ["Tier 1 (Up to $50,000)", "Tier 2 ($50,001-$300,000)", "Tier 3 (Over $300,000 or non-monetary)"] },
          { id: "juryDemand", name: "juryDemand", label: "Jury Demand", type: "select", required: true, options: ["Yes", "No"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 3", "URCP Rule 26"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a civil filing cover sheet following Utah District Court requirements.",
        tags: ["filing", "cover-sheet", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-summons-utah",
        name: "Summons (In Utah)",
        description: "Official summons for defendants located within Utah with 21-day response period (Form 1016GE)",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}

SUMMONS

THE STATE OF UTAH TO THE ABOVE-NAMED DEFENDANT(S):

You are hereby summoned and required to file an answer in writing to the Complaint which is filed with the Clerk of the Court in the above-entitled action, and to serve upon, or mail to, the Plaintiff's attorney at the address below, a copy of your answer within 21 days after service of this Summons upon you.

If you fail to do so, judgment by default will be taken against you for the relief demanded in the Complaint, which has been filed with the Clerk of this Court and a copy of which is hereto attached and herewith served upon you.

Plaintiff's Attorney:
{{attorneyName}}
{{firmName}}
{{firmAddress}}
{{firmPhone}}
{{firmEmail}}

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
Clerk of the Court

By: _____________________________
     Deputy Clerk`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "attorneyName", name: "attorneyName", label: "Attorney Name", type: "text", required: true },
          { id: "firmName", name: "firmName", label: "Firm Name", type: "text", required: true },
          { id: "firmAddress", name: "firmAddress", label: "Firm Address", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 4"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a summons for in-state service following Utah Rules of Civil Procedure Rule 4.",
        tags: ["summons", "service", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-proof-of-service",
        name: "Proof of Service",
        description: "Certificate proving proper service of summons and complaint (Form 1020GE)",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}

PROOF OF SERVICE

I, {{serverName}}, being first duly sworn, state:

1. I am over the age of 18 and am not a party to this action.

2. On {{serviceDate}}, at approximately {{serviceTime}}, I served the following documents:
   {{documentsServed}}

3. Service was made on: {{personServed}}
   
4. Location of service: {{serviceLocation}}

5. Method of service:
   {{serviceMethod}}

6. Description of person served:
   Sex: {{personSex}}
   Approximate Age: {{personAge}}
   Hair Color: {{personHair}}
   Height: {{personHeight}}
   Weight: {{personWeight}}

I declare under penalty of perjury under the laws of the State of Utah that the foregoing is true and correct.

Executed on {{executionDate}} at {{executionCity}}, Utah.

_____________________________
{{serverName}}
Process Server

SUBSCRIBED AND SWORN to before me this {{notaryDay}} day of {{notaryMonth}}, {{notaryYear}}.

_____________________________
Notary Public
My Commission Expires: {{commissionExpires}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "serverName", name: "serverName", label: "Process Server Name", type: "text", required: true },
          { id: "serviceDate", name: "serviceDate", label: "Date of Service", type: "date", required: true },
          { id: "personServed", name: "personServed", label: "Person Served", type: "text", required: true },
          { id: "serviceLocation", name: "serviceLocation", label: "Service Location", type: "text", required: true },
          { id: "serviceMethod", name: "serviceMethod", label: "Method of Service", type: "select", required: true, options: ["Personal service to defendant", "Personal service to agent", "Personal service to person of suitable age at dwelling", "Substituted service", "Service by mail with acknowledgment"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 4"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a proof of service affidavit following Utah Rules of Civil Procedure.",
        tags: ["service", "proof", "affidavit"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ PERSONAL INJURY / TORT TEMPLATES ============
      {
        id: "tpl-pi-complaint-negligence",
        name: "Personal Injury Complaint - General Negligence",
        description: "Comprehensive complaint for personal injury claims based on negligence theory",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR PERSONAL INJURY (NEGLIGENCE)

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant {{defendantName}} and alleges as follows:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of {{plaintiffCounty}} County, State of Utah.

2. Defendant {{defendantName}} is {{defendantDescription}}.

JURISDICTION AND VENUE

3. This Court has jurisdiction over this action pursuant to Utah Code § 78A-5-102.

4. Venue is proper in {{courtCounty}} County pursuant to Utah Code § 78B-3-307 because {{venueBasis}}.

FACTUAL ALLEGATIONS

5. On or about {{incidentDate}}, at approximately {{incidentTime}}, Plaintiff was {{plaintiffActivity}} at {{incidentLocation}}.

6. At that time and place, Defendant {{defendantConduct}}.

7. {{additionalFacts}}

FIRST CAUSE OF ACTION: NEGLIGENCE

8. Plaintiff incorporates by reference paragraphs 1 through 7 as if fully set forth herein.

9. Defendant owed a duty of care to Plaintiff to {{dutyDescription}}.

10. Defendant breached this duty by {{breachDescription}}.

11. As a direct and proximate result of Defendant's negligence, Plaintiff suffered the following injuries and damages:
    a. Physical injuries including but not limited to: {{physicalInjuries}}
    b. Pain and suffering, both past and continuing;
    c. Medical expenses incurred and to be incurred in the amount of {{medicalExpenses}};
    d. Lost wages and earning capacity in the amount of {{lostWages}};
    e. Property damage in the amount of {{propertyDamage}};
    f. Emotional distress and mental anguish;
    g. Loss of enjoyment of life;
    h. Such other damages as may be proven at trial.

12. At the time of the incident, Plaintiff was free of negligence or, alternatively, any negligence attributable to Plaintiff was less than that of Defendant.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff respectfully requests judgment against Defendant as follows:

1. Compensatory damages in an amount to be proven at trial but believed to exceed {{damageAmount}};
2. Special damages for medical expenses, lost wages, and other economic losses;
3. General damages for pain and suffering, emotional distress, and loss of enjoyment of life;
4. Pre-judgment and post-judgment interest as allowed by law;
5. Costs of suit incurred herein;
6. Such other and further relief as the Court deems just and proper.

DEMAND FOR JURY TRIAL

Plaintiff hereby demands a trial by jury on all issues so triable.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Telephone: {{firmPhone}}
Email: {{firmEmail}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "plaintiffCounty", name: "plaintiffCounty", label: "Plaintiff's County of Residence", type: "text", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "defendantDescription", name: "defendantDescription", label: "Defendant Description", type: "textarea", required: true, placeholder: "e.g., an individual residing in Salt Lake County, Utah" },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "incidentLocation", name: "incidentLocation", label: "Location of Incident", type: "text", required: true },
          { id: "physicalInjuries", name: "physicalInjuries", label: "Physical Injuries Sustained", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$50,000", "$100,000", "$300,000", "$500,000", "$1,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "URCP Rule 9", "Utah Code § 78B-3-106"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a comprehensive personal injury complaint based on negligence theory, following Utah Rules of Civil Procedure. Include specific factual allegations, clear duty-breach-causation-damages structure, and proper prayer for relief.",
        tags: ["complaint", "personal-injury", "negligence", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-pi-complaint-mva",
        name: "Motor Vehicle Accident Complaint",
        description: "Personal injury complaint for automobile accident cases with specific allegations for vehicle collisions",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR PERSONAL INJURY ARISING FROM MOTOR VEHICLE ACCIDENT

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant {{defendantName}} and alleges as follows:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of {{plaintiffCounty}} County, State of Utah.

2. Defendant {{defendantName}} is a resident of {{defendantCounty}} County, State of Utah.

3. At all times relevant hereto, Defendant was the owner and/or operator of a {{defendantVehicle}}.

JURISDICTION AND VENUE

4. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

5. Venue is proper in {{courtCounty}} County because the accident occurred in this county.

FACTUAL ALLEGATIONS

6. On {{accidentDate}}, at approximately {{accidentTime}}, Plaintiff was operating a {{plaintiffVehicle}} in a {{plaintiffDirection}} direction on {{roadName}} near {{accidentLocation}}.

7. At that time and place, Defendant was operating a {{defendantVehicle}} in a {{defendantDirection}} direction on {{defendantRoad}}.

8. Defendant negligently and carelessly operated the motor vehicle by:
   a. {{negligentAct1}}
   b. {{negligentAct2}}
   c. {{negligentAct3}}
   d. Failing to keep a proper lookout;
   e. Failing to maintain proper control of the vehicle;
   f. Driving in a manner that violated Utah traffic laws.

9. As a direct and proximate result of Defendant's negligence, Defendant's vehicle collided with Plaintiff's vehicle.

10. {{accidentDescription}}

FIRST CAUSE OF ACTION: NEGLIGENCE

11. Plaintiff incorporates by reference paragraphs 1 through 10 as if fully set forth herein.

12. Defendant owed Plaintiff a duty to operate the motor vehicle with reasonable care.

13. Defendant breached this duty by negligently operating the vehicle as described above.

14. As a direct and proximate result of Defendant's negligence, Plaintiff suffered:
    a. Bodily injuries including: {{injuries}}
    b. Past and future pain and suffering;
    c. Past medical expenses in the amount of \${{pastMedical}};
    d. Future medical expenses estimated at \${{futureMedical}};
    e. Lost wages in the amount of \${{lostWages}};
    f. Loss of future earning capacity;
    g. Property damage to Plaintiff's vehicle in the amount of \${{propertyDamage}};
    h. Emotional distress;
    i. Loss of enjoyment of life.

15. Utah is a comparative fault state pursuant to Utah Code § 78B-5-818. Plaintiff's fault, if any, is less than Defendant's fault.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests judgment against Defendant as follows:

1. Compensatory damages in excess of {{damageAmount}};
2. Special damages for medical expenses, lost wages, and property damage;
3. General damages for pain and suffering;
4. Pre-judgment and post-judgment interest;
5. Costs of suit;
6. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a trial by jury.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "accidentDate", name: "accidentDate", label: "Date of Accident", type: "date", required: true },
          { id: "accidentTime", name: "accidentTime", label: "Time of Accident", type: "text", required: true, placeholder: "e.g., 3:45 PM" },
          { id: "accidentLocation", name: "accidentLocation", label: "Accident Location", type: "text", required: true, placeholder: "e.g., 500 South and State Street, Salt Lake City" },
          { id: "plaintiffVehicle", name: "plaintiffVehicle", label: "Plaintiff's Vehicle", type: "text", required: true, placeholder: "e.g., 2020 Honda Accord" },
          { id: "defendantVehicle", name: "defendantVehicle", label: "Defendant's Vehicle", type: "text", required: true, placeholder: "e.g., 2019 Ford F-150" },
          { id: "injuries", name: "injuries", label: "Injuries Sustained", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$50,000", "$100,000", "$300,000", "$500,000", "$1,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "Utah Code § 78B-5-818", "Utah Code § 41-6a"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a comprehensive motor vehicle accident complaint including specific allegations of negligent driving, detailed description of the collision, injuries sustained, and damages claimed. Reference Utah's comparative fault statute.",
        tags: ["complaint", "personal-injury", "motor-vehicle", "auto-accident", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-pi-complaint-premises",
        name: "Premises Liability / Slip and Fall Complaint",
        description: "Personal injury complaint for slip and fall or dangerous premises conditions",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR PERSONAL INJURY (PREMISES LIABILITY)

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of Utah.

2. Defendant {{defendantName}} is {{defendantDescription}} and was at all relevant times the owner, operator, manager, or occupier of the premises located at {{premisesAddress}} ("the Premises").

JURISDICTION AND VENUE

3. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

4. Venue is proper in {{courtCounty}} County because the incident occurred in this county.

FACTUAL ALLEGATIONS

5. On {{incidentDate}}, at approximately {{incidentTime}}, Plaintiff was lawfully present on the Premises as a {{entrantStatus}}.

6. At that time and place, a dangerous condition existed on the Premises, specifically: {{dangerousCondition}}.

7. This dangerous condition was created by, known to, or should have been known to Defendant through the exercise of reasonable care.

8. Defendant failed to remedy the dangerous condition or adequately warn Plaintiff of its existence.

9. As a result of the dangerous condition, Plaintiff {{incidentDescription}}.

FIRST CAUSE OF ACTION: NEGLIGENCE (PREMISES LIABILITY)

10. Plaintiff incorporates paragraphs 1-9 by reference.

11. As the owner/operator/manager of the Premises, Defendant owed Plaintiff a duty to:
    a. Maintain the Premises in a reasonably safe condition;
    b. Inspect the Premises to discover dangerous conditions;
    c. Remedy dangerous conditions or warn of their existence;
    d. Exercise reasonable care to protect persons lawfully on the Premises.

12. Defendant breached these duties by:
    a. {{breachAct1}}
    b. {{breachAct2}}
    c. Failing to inspect or maintain the Premises;
    d. Failing to warn of the dangerous condition.

13. As a direct and proximate result of Defendant's negligence, Plaintiff suffered:
    a. Physical injuries including: {{injuries}}
    b. Pain and suffering;
    c. Medical expenses: \${{medicalExpenses}};
    d. Lost wages: \${{lostWages}};
    e. Emotional distress;
    f. Permanent impairment and disfigurement;
    g. Loss of enjoyment of life.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages exceeding {{damageAmount}};
2. Special and general damages;
3. Pre-judgment and post-judgment interest;
4. Costs of suit;
5. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "defendantDescription", name: "defendantDescription", label: "Defendant Description", type: "text", required: true, placeholder: "e.g., a Utah corporation doing business as..." },
          { id: "premisesAddress", name: "premisesAddress", label: "Premises Address", type: "text", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "entrantStatus", name: "entrantStatus", label: "Plaintiff's Status", type: "select", required: true, options: ["business invitee", "social guest", "licensee", "customer"] },
          { id: "dangerousCondition", name: "dangerousCondition", label: "Dangerous Condition", type: "textarea", required: true, placeholder: "e.g., wet floor without warning signs, broken step, ice accumulation" },
          { id: "injuries", name: "injuries", label: "Injuries Sustained", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$50,000", "$100,000", "$300,000", "$500,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "Utah Code § 78B-5-818"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a premises liability complaint including specific allegations about the dangerous condition, defendant's knowledge or constructive knowledge, and breach of duty to maintain safe premises.",
        tags: ["complaint", "personal-injury", "premises-liability", "slip-fall", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-wrongful-death-complaint",
        name: "Wrongful Death Complaint",
        description: "Complaint for wrongful death action under Utah Code § 78B-3-106",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}}, individually and as 
Personal Representative of the Estate 
of {{decedentName}}, deceased,
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR WRONGFUL DEATH

Plaintiff {{plaintiffName}}, individually and as Personal Representative of the Estate of {{decedentName}}, deceased, by and through counsel, complains against Defendant and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is {{plaintiffRelationship}} of {{decedentName}}, deceased, and brings this action individually and as the duly appointed Personal Representative of the Estate of {{decedentName}}.

2. {{decedentName}} ("Decedent") was a resident of {{decedentCounty}} County, Utah, at the time of death.

3. Decedent died on {{deathDate}}.

4. Defendant {{defendantName}} is {{defendantDescription}}.

5. The following persons are heirs of the Decedent entitled to damages under Utah Code § 78B-3-106:
   {{heirs}}

JURISDICTION AND VENUE

6. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

7. Venue is proper in {{courtCounty}} County.

FACTUAL ALLEGATIONS

8. On or about {{incidentDate}}, {{incidentDescription}}.

9. As a direct and proximate result of Defendant's wrongful act, neglect, or default, Decedent suffered fatal injuries and died on {{deathDate}}.

10. {{additionalFacts}}

FIRST CAUSE OF ACTION: WRONGFUL DEATH (Utah Code § 78B-3-106)

11. Plaintiff incorporates paragraphs 1-10 by reference.

12. Pursuant to Utah Code § 78B-3-106, when the death of a person is caused by the wrongful act or neglect of another, the heirs or personal representative may maintain an action for damages.

13. Defendant owed a duty of care to Decedent.

14. Defendant breached this duty by {{breachDescription}}.

15. As a direct and proximate result of Defendant's wrongful conduct, Decedent died.

16. Decedent's heirs have suffered and continue to suffer the following damages:
    a. Loss of financial support Decedent would have provided;
    b. Loss of love, companionship, comfort, care, and consortium;
    c. Loss of Decedent's services in the home;
    d. Funeral and burial expenses in the amount of \${{funeralExpenses}};
    e. Medical expenses incurred prior to death in the amount of \${{medicalExpenses}};
    f. Pain and suffering of Decedent prior to death;
    g. Loss of inheritance.

SECOND CAUSE OF ACTION: NEGLIGENCE

17. Plaintiff incorporates all previous paragraphs by reference.

18. Defendant was negligent in that Defendant failed to exercise reasonable care.

19. Said negligence was the proximate cause of Decedent's death.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages in excess of {{damageAmount}};
2. Special damages for funeral expenses and medical bills;
3. General damages for loss of consortium and companionship;
4. Pre-judgment and post-judgment interest;
5. Costs of suit;
6. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Personal Representative Name", type: "party", required: true },
          { id: "plaintiffRelationship", name: "plaintiffRelationship", label: "Relationship to Decedent", type: "select", required: true, options: ["the surviving spouse", "the surviving child", "the surviving parent", "a sibling"] },
          { id: "decedentName", name: "decedentName", label: "Decedent's Name", type: "party", required: true },
          { id: "deathDate", name: "deathDate", label: "Date of Death", type: "date", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "incidentDescription", name: "incidentDescription", label: "Description of Incident", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$300,000", "$500,000", "$1,000,000", "$2,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["Utah Code § 78B-3-106", "Utah Code § 78B-3-107", "URCP Rule 8"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a wrongful death complaint under Utah Code § 78B-3-106, including identification of heirs, description of the wrongful act causing death, and itemization of damages including economic losses and loss of consortium.",
        tags: ["complaint", "wrongful-death", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-medical-malpractice-complaint",
        name: "Medical Malpractice Complaint",
        description: "Complaint for medical malpractice/professional negligence with prelitigation requirements",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}}, {{defendantCredentials}},
    Defendant.

COMPLAINT FOR MEDICAL MALPRACTICE

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of Utah.

2. Defendant {{defendantName}} is a {{healthcareProviderType}} licensed to practice in Utah and was at all relevant times providing medical care to Plaintiff.

3. At all times relevant hereto, Defendant was acting within the course and scope of employment at {{facilityName}}.

JURISDICTION AND VENUE

4. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

5. Venue is proper in {{courtCounty}} County.

PRELITIGATION REQUIREMENTS

6. Plaintiff has complied with the prelitigation requirements of the Utah Health Care Malpractice Act, Utah Code § 78B-3-401 et seq.

7. Plaintiff has provided Defendant with the required Notice of Intent to Commence Action.

8. Plaintiff has obtained an affidavit from a qualified healthcare provider as required by Utah Code § 78B-3-423.

FACTUAL ALLEGATIONS

9. On or about {{treatmentDate}}, Plaintiff sought medical care from Defendant for {{medicalCondition}}.

10. Defendant undertook to provide medical care and treatment to Plaintiff, thereby establishing a physician-patient relationship.

11. In the course of providing such care, Defendant {{negligentActs}}.

12. {{additionalFacts}}

FIRST CAUSE OF ACTION: MEDICAL MALPRACTICE/PROFESSIONAL NEGLIGENCE

13. Plaintiff incorporates paragraphs 1-12 by reference.

14. Defendant owed Plaintiff a duty to provide medical care in accordance with the standard of care applicable to {{healthcareProviderType}} in the same or similar community.

15. Defendant breached the applicable standard of care by:
    a. {{breachAct1}}
    b. {{breachAct2}}
    c. {{breachAct3}}

16. As a direct and proximate result of Defendant's breach of the standard of care, Plaintiff suffered:
    a. Physical injuries including: {{injuries}}
    b. The need for additional medical treatment;
    c. Pain and suffering;
    d. Medical expenses of \${{medicalExpenses}};
    e. Lost wages of \${{lostWages}};
    f. Permanent impairment;
    g. Emotional distress.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages;
2. Special damages for medical expenses and lost wages;
3. General damages for pain and suffering;
4. Pre-judgment and post-judgment interest;
5. Costs of suit;
6. Such other relief as the Court deems just.

Note: Non-economic damages may be subject to the cap under Utah Code § 78B-3-410.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff

CERTIFICATE OF COMPLIANCE WITH PRELITIGATION REQUIREMENTS

I hereby certify that the prelitigation requirements of Utah Code § 78B-3-412 have been met prior to the filing of this Complaint.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Healthcare Provider Name", type: "party", required: true },
          { id: "defendantCredentials", name: "defendantCredentials", label: "Provider Credentials", type: "text", required: true, placeholder: "e.g., M.D., D.O., R.N." },
          { id: "healthcareProviderType", name: "healthcareProviderType", label: "Provider Type", type: "select", required: true, options: ["physician", "surgeon", "nurse practitioner", "registered nurse", "hospital", "medical clinic"] },
          { id: "facilityName", name: "facilityName", label: "Medical Facility", type: "text", required: true },
          { id: "treatmentDate", name: "treatmentDate", label: "Date of Treatment", type: "date", required: true },
          { id: "medicalCondition", name: "medicalCondition", label: "Medical Condition", type: "text", required: true },
          { id: "negligentActs", name: "negligentActs", label: "Negligent Acts", type: "textarea", required: true },
          { id: "injuries", name: "injuries", label: "Resulting Injuries", type: "textarea", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["Utah Code § 78B-3-401", "Utah Code § 78B-3-410", "Utah Code § 78B-3-412", "Utah Code § 78B-3-423"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a medical malpractice complaint including reference to Utah Health Care Malpractice Act prelitigation requirements, standard of care allegations, and specific acts of negligence. Note the non-economic damages cap.",
        tags: ["complaint", "medical-malpractice", "tort", "professional-negligence"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-product-liability-complaint",
        name: "Product Liability Complaint",
        description: "Complaint for defective product claims under negligence, strict liability, and breach of warranty theories",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{manufacturerName}}, {{distributorName}}, 
and {{retailerName}},
    Defendants.

COMPLAINT FOR PRODUCT LIABILITY

Plaintiff, by and through counsel, complains against Defendants and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of Utah.

2. Defendant {{manufacturerName}} ("Manufacturer") is a corporation that designed, manufactured, and/or assembled the {{productName}}.

3. Defendant {{distributorName}} ("Distributor") distributed the {{productName}}.

4. Defendant {{retailerName}} ("Retailer") sold the {{productName}} to Plaintiff.

5. Defendants are collectively referred to as "Defendants."

JURISDICTION AND VENUE

6. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

7. Venue is proper in {{courtCounty}} County.

FACTUAL ALLEGATIONS

8. On or about {{purchaseDate}}, Plaintiff purchased a {{productName}} ("the Product") from Retailer.

9. On {{incidentDate}}, while using the Product in a normal and foreseeable manner, {{incidentDescription}}.

10. The Product was defective in that: {{defectDescription}}.

11. The defect existed at the time the Product left Defendants' control.

12. As a result of the defect, Plaintiff suffered injuries and damages.

FIRST CAUSE OF ACTION: STRICT PRODUCT LIABILITY (Design Defect)

13. Plaintiff incorporates paragraphs 1-12 by reference.

14. The Product was defectively designed in that {{designDefect}}.

15. A reasonable alternative design existed that would have prevented Plaintiff's injuries.

16. The defective design rendered the Product unreasonably dangerous.

17. Plaintiff suffered damages as a direct and proximate result.

SECOND CAUSE OF ACTION: STRICT PRODUCT LIABILITY (Manufacturing Defect)

18. Plaintiff incorporates all previous paragraphs by reference.

19. The Product deviated from its intended design due to a manufacturing defect.

20. The manufacturing defect caused the Product to be unreasonably dangerous.

THIRD CAUSE OF ACTION: FAILURE TO WARN

21. Plaintiff incorporates all previous paragraphs by reference.

22. Defendants knew or should have known of the dangers associated with the Product.

23. Defendants failed to provide adequate warnings or instructions.

24. Adequate warnings would have prevented Plaintiff's injuries.

FOURTH CAUSE OF ACTION: NEGLIGENCE

25. Plaintiff incorporates all previous paragraphs by reference.

26. Defendants owed a duty of care in designing, manufacturing, and distributing the Product.

27. Defendants breached this duty.

28. Plaintiff was injured as a proximate result.

FIFTH CAUSE OF ACTION: BREACH OF WARRANTY

29. Plaintiff incorporates all previous paragraphs by reference.

30. Defendants made express and/or implied warranties regarding the Product.

31. The Product did not conform to these warranties.

32. Plaintiff was damaged as a result.

DAMAGES

33. As a result of Defendants' conduct, Plaintiff suffered:
    a. Physical injuries: {{injuries}}
    b. Medical expenses: \${{medicalExpenses}}
    c. Lost wages: \${{lostWages}}
    d. Pain and suffering
    e. Permanent impairment
    f. Property damage

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages exceeding {{damageAmount}};
2. Punitive damages for willful and wanton conduct;
3. Pre-judgment and post-judgment interest;
4. Costs of suit;
5. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "manufacturerName", name: "manufacturerName", label: "Manufacturer Name", type: "party", required: true },
          { id: "productName", name: "productName", label: "Product Name/Description", type: "text", required: true },
          { id: "purchaseDate", name: "purchaseDate", label: "Purchase Date", type: "date", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
          { id: "defectDescription", name: "defectDescription", label: "Defect Description", type: "textarea", required: true },
          { id: "injuries", name: "injuries", label: "Injuries", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$100,000", "$300,000", "$500,000", "$1,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["Utah Code § 78B-6-701", "URCP Rule 8"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a product liability complaint with multiple theories of recovery including strict liability, negligence, and breach of warranty. Include specific allegations about the product defect.",
        tags: ["complaint", "product-liability", "tort", "strict-liability"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ DISCOVERY TEMPLATES ============
      {
        id: "tpl-interrogatories-plaintiff",
        name: "Interrogatories - Plaintiff to Defendant",
        description: "Standard interrogatories from plaintiff to defendant for personal injury cases (Tier 2: 10 interrogatories)",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

PLAINTIFF'S FIRST SET OF INTERROGATORIES TO DEFENDANT

TO: {{defendantName}}, Defendant, and counsel of record:

Pursuant to Rules 26 and 33 of the Utah Rules of Civil Procedure, Plaintiff propounds the following Interrogatories to be answered under oath within twenty-eight (28) days.

DEFINITIONS AND INSTRUCTIONS

1. "You" or "Defendant" refers to {{defendantName}} and any agents, employees, representatives, or attorneys.

2. "Incident" refers to the events of {{incidentDate}} giving rise to this lawsuit.

3. "Document" includes all writings, recordings, and electronically stored information as defined in URCP 34.

INTERROGATORIES

INTERROGATORY NO. 1:
State your full legal name, all other names used, date of birth, current address, and all addresses for the past five years.

INTERROGATORY NO. 2:
State your employment history for the past ten years, including employer name, address, position, and dates of employment.

INTERROGATORY NO. 3:
Describe in detail your version of how the Incident occurred, including all actions taken by you before, during, and after the Incident.

INTERROGATORY NO. 4:
Identify all persons known to you who witnessed or have knowledge of the Incident, including their names, addresses, telephone numbers, and a summary of their knowledge.

INTERROGATORY NO. 5:
Identify all documents, photographs, videos, or other tangible evidence in your possession relating to the Incident.

INTERROGATORY NO. 6:
State whether you have given any written or recorded statements regarding the Incident and identify to whom such statements were given.

INTERROGATORY NO. 7:
Identify all insurance policies that may provide coverage for the claims in this lawsuit, including carrier name, policy number, and coverage limits.

INTERROGATORY NO. 8:
Have you ever been convicted of a crime? If so, state the nature of the crime, date, court, and disposition.

INTERROGATORY NO. 9:
Identify all expert witnesses you intend to call at trial, including their qualifications and the subject matter of their testimony.

INTERROGATORY NO. 10:
Describe any defenses you intend to assert in this action and the factual basis for each defense.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served a copy of these Interrogatories on Defendant's counsel by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 26", "URCP Rule 33"],
        formatRequirements: { ...utahFormatDefaults, requiresBilingualNotice: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate standard interrogatories for personal injury cases following URCP Rule 33. Stay within tier limits (10 interrogatories for Tier 2). Focus on incident facts, witnesses, insurance, and defenses.",
        tags: ["discovery", "interrogatories", "personal-injury"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-requests-production",
        name: "Requests for Production of Documents",
        description: "Standard requests for production in civil litigation (Tier 2: 10 requests)",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

{{partyRole}}'S FIRST SET OF REQUESTS FOR PRODUCTION OF DOCUMENTS

TO: {{opposingParty}}, and counsel of record:

Pursuant to Rules 26 and 34 of the Utah Rules of Civil Procedure, {{requestingParty}} requests that {{opposingParty}} produce the following documents for inspection and copying within twenty-eight (28) days.

DEFINITIONS

1. "Document" has the meaning set forth in URCP 34(a) and includes all writings, drawings, graphs, charts, photographs, recordings, and electronically stored information.

2. "Communication" includes all written, oral, and electronic communications.

3. "Incident" refers to the events of {{incidentDate}}.

INSTRUCTIONS

1. Produce all documents in your possession, custody, or control.
2. If any document is withheld on privilege grounds, provide a privilege log.
3. Produce documents as they are kept in the ordinary course of business.

REQUESTS FOR PRODUCTION

REQUEST NO. 1:
All documents relating to the Incident, including but not limited to reports, memoranda, notes, photographs, and videos.

REQUEST NO. 2:
All statements (written or recorded) made by any party or witness concerning the Incident.

REQUEST NO. 3:
All photographs, videos, diagrams, or other visual depictions of the scene of the Incident, any vehicles involved, or any injuries claimed.

REQUEST NO. 4:
All insurance policies, declarations pages, and correspondence with insurers relating to coverage for the claims in this lawsuit.

REQUEST NO. 5:
All documents constituting, referring to, or relating to any investigation of the Incident.

REQUEST NO. 6:
All communications between any parties or witnesses concerning the Incident.

REQUEST NO. 7:
All medical records, bills, and other documents relating to injuries claimed to have resulted from the Incident.

REQUEST NO. 8:
All documents relating to any prior incidents similar to the Incident at issue.

REQUEST NO. 9:
All documents supporting any defenses you intend to assert in this action.

REQUEST NO. 10:
All expert reports, opinions, or other documents prepared by any expert retained in connection with this lawsuit.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{requestingParty}}

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served these Requests by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "partyRole", name: "partyRole", label: "Requesting Party Role", type: "select", required: true, options: ["PLAINTIFF", "DEFENDANT"] },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 26", "URCP Rule 34"],
        formatRequirements: { ...utahFormatDefaults, requiresBilingualNotice: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate requests for production of documents following URCP Rule 34. Stay within tier limits. Focus on incident-related documents, insurance, medical records, and expert materials.",
        tags: ["discovery", "production", "documents"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-requests-admission",
        name: "Requests for Admission",
        description: "Requests for admission of facts and authenticity of documents (Tier 2: 10 requests)",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

{{partyRole}}'S FIRST SET OF REQUESTS FOR ADMISSION

TO: {{opposingParty}}, and counsel of record:

Pursuant to Rule 36 of the Utah Rules of Civil Procedure, {{requestingParty}} requests that {{opposingParty}} admit the truth of the following matters within twenty-eight (28) days.

IMPORTANT NOTICE: Pursuant to URCP 36(a)(3), if you fail to respond within 28 days, each matter will be deemed admitted.

REQUESTS FOR ADMISSION

REQUEST FOR ADMISSION NO. 1:
Admit that on {{incidentDate}}, you were present at {{incidentLocation}}.

REQUEST FOR ADMISSION NO. 2:
Admit that the Incident occurred on {{incidentDate}} at approximately {{incidentTime}}.

REQUEST FOR ADMISSION NO. 3:
Admit that at the time of the Incident, you owed a duty of care to {{plaintiffName}}.

REQUEST FOR ADMISSION NO. 4:
Admit that {{factToAdmit1}}.

REQUEST FOR ADMISSION NO. 5:
Admit that {{factToAdmit2}}.

REQUEST FOR ADMISSION NO. 6:
Admit that the document attached hereto as Exhibit A is a true and accurate copy of {{documentDescription}}.

REQUEST FOR ADMISSION NO. 7:
Admit that you have not identified any witnesses who would contradict {{plaintiffName}}'s account of the Incident.

REQUEST FOR ADMISSION NO. 8:
Admit that {{plaintiffName}} was injured as a result of the Incident.

REQUEST FOR ADMISSION NO. 9:
Admit that you have insurance coverage that may apply to the claims in this lawsuit.

REQUEST FOR ADMISSION NO. 10:
Admit that you have no evidence that {{plaintiffName}} was comparatively at fault for the Incident.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{requestingParty}}

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served these Requests by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "partyRole", name: "partyRole", label: "Requesting Party Role", type: "select", required: true, options: ["PLAINTIFF", "DEFENDANT"] },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
          { id: "incidentLocation", name: "incidentLocation", label: "Incident Location", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 36"],
        formatRequirements: { ...utahFormatDefaults, requiresBilingualNotice: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate requests for admission following URCP Rule 36. Stay within tier limits. Focus on key facts that may be undisputed and document authenticity. Include warning about deemed admitted if no response.",
        tags: ["discovery", "admission", "requests"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ SETTLEMENT / RESOLUTION TEMPLATES ============
      {
        id: "tpl-demand-letter",
        name: "Demand Letter",
        description: "Pre-litigation demand letter for personal injury claims",
        category: "correspondence",
        jurisdiction: "utah-district-court",
        templateContent: `{{firmName}}
{{firmAddress}}
{{firmPhone}} | {{firmEmail}}

{{letterDate}}

VIA CERTIFIED MAIL - RETURN RECEIPT REQUESTED

{{recipientName}}
{{recipientTitle}}
{{insuranceCompany}}
{{recipientAddress}}

Re:    Claimant: {{claimantName}}
       Date of Loss: {{incidentDate}}
       Claim Number: {{claimNumber}}
       Insured: {{insuredName}}
       Policy Number: {{policyNumber}}

Dear {{recipientName}}:

Please be advised that this firm represents {{claimantName}} in connection with injuries sustained on {{incidentDate}} as a result of {{incidentDescription}}.

STATEMENT OF FACTS

{{factStatement}}

LIABILITY

{{liabilityStatement}}

INJURIES AND TREATMENT

As a result of this incident, our client sustained the following injuries:

{{injuryDescription}}

Our client received treatment from the following providers:

{{treatmentProviders}}

DAMAGES

Our client has incurred the following damages:

Medical Expenses:
{{medicalExpensesList}}
TOTAL MEDICAL EXPENSES: \${{totalMedical}}

Lost Wages: \${{lostWages}}

DEMAND

Based on the foregoing, we hereby demand the sum of \${{demandAmount}} in full settlement of all claims arising from this incident.

This demand will remain open for {{responseDeadline}} days from the date of this letter. If we do not receive a satisfactory response, we are prepared to pursue all available legal remedies on behalf of our client.

Please direct all future correspondence regarding this matter to our office.

Sincerely,

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}

Enclosures: Medical records and bills`,
        requiredFields: [
          { id: "claimantName", name: "claimantName", label: "Claimant Name", type: "party", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "insuranceCompany", name: "insuranceCompany", label: "Insurance Company", type: "text", required: true },
          { id: "claimNumber", name: "claimNumber", label: "Claim Number", type: "text", required: true },
          { id: "insuredName", name: "insuredName", label: "Insured's Name", type: "party", required: true },
          { id: "incidentDescription", name: "incidentDescription", label: "Brief Incident Description", type: "textarea", required: true },
          { id: "injuryDescription", name: "injuryDescription", label: "Injury Description", type: "textarea", required: true },
          { id: "totalMedical", name: "totalMedical", label: "Total Medical Expenses", type: "text", required: true },
          { id: "demandAmount", name: "demandAmount", label: "Settlement Demand Amount", type: "text", required: true },
          { id: "responseDeadline", name: "responseDeadline", label: "Response Deadline (days)", type: "select", required: true, options: ["14", "21", "30", "45"] },
        ],
        optionalFields: [],
        utahRuleReferences: [],
        formatRequirements: { ...utahFormatDefaults, requiresCertificateOfService: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a professional demand letter for personal injury claims. Include clear statement of facts, liability analysis, itemized damages, and specific demand amount with response deadline.",
        tags: ["demand", "settlement", "correspondence"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-motion-summary-judgment",
        name: "Motion for Summary Judgment",
        description: "Motion for summary judgment under URCP Rule 56",
        category: "motions",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

{{movingParty}}'S MOTION FOR SUMMARY JUDGMENT

{{movingPartyName}}, by and through counsel, respectfully moves this Court for summary judgment pursuant to Rule 56 of the Utah Rules of Civil Procedure.

INTRODUCTION

{{introductionStatement}}

STATEMENT OF UNDISPUTED MATERIAL FACTS

1. {{fact1}}

2. {{fact2}}

3. {{fact3}}

4. {{fact4}}

5. {{fact5}}

ARGUMENT

I. LEGAL STANDARD

Summary judgment is appropriate when "there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law." URCP 56(a).

II. {{movingPartyName}} IS ENTITLED TO SUMMARY JUDGMENT

{{legalArgument}}

CONCLUSION

For the foregoing reasons, {{movingPartyName}} respectfully requests that this Court grant summary judgment in {{movingPartyName}}'s favor.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{movingPartyName}}

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served a copy of this Motion and Memorandum upon counsel for all parties by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["PLAINTIFF", "DEFENDANT"] },
          { id: "introductionStatement", name: "introductionStatement", label: "Introduction", type: "textarea", required: true },
          { id: "legalArgument", name: "legalArgument", label: "Legal Argument", type: "textarea", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 56", "URCP Rule 7"],
        formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
        bilingualNoticeRequired: true,
        aiPromptInstructions: "Generate a motion for summary judgment following URCP Rule 56 and Rule 7. Include statement of undisputed facts, legal standard, and detailed argument showing entitlement to judgment as a matter of law.",
        tags: ["motion", "summary-judgment", "dispositive"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-stipulated-dismissal",
        name: "Stipulated Motion to Dismiss with Prejudice",
        description: "Joint motion to dismiss case following settlement",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

STIPULATED MOTION TO DISMISS WITH PREJUDICE

The parties, by and through their respective counsel, hereby stipulate and move this Court to dismiss this action with prejudice pursuant to Rule 41(a)(2) of the Utah Rules of Civil Procedure.

STIPULATION

1. The parties have reached a full and final settlement of all claims in this action.

2. Each party shall bear its own costs and attorney's fees unless otherwise agreed.

3. All claims and counterclaims are hereby dismissed with prejudice.

4. This Court shall retain jurisdiction to enforce the terms of the parties' settlement agreement.

WHEREFORE, the parties respectfully request that this Court enter an Order dismissing this action with prejudice.

DATED this {{day}} day of {{month}}, {{year}}.

FOR PLAINTIFF:

_____________________________
{{plaintiffAttorney}}
Utah Bar No. {{plaintiffBarNumber}}
Attorney for Plaintiff

FOR DEFENDANT:

_____________________________
{{defendantAttorney}}
Utah Bar No. {{defendantBarNumber}}
Attorney for Defendant

ORDER

Based upon the foregoing Stipulated Motion, and good cause appearing:

IT IS HEREBY ORDERED that this action is DISMISSED WITH PREJUDICE. Each party shall bear its own costs and attorney's fees.

DATED this _____ day of _____________, ______.

_____________________________
District Court Judge`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "plaintiffAttorney", name: "plaintiffAttorney", label: "Plaintiff's Attorney", type: "text", required: true },
          { id: "plaintiffBarNumber", name: "plaintiffBarNumber", label: "Plaintiff's Attorney Bar No.", type: "text", required: true },
          { id: "defendantAttorney", name: "defendantAttorney", label: "Defendant's Attorney", type: "text", required: true },
          { id: "defendantBarNumber", name: "defendantBarNumber", label: "Defendant's Attorney Bar No.", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 41(a)(2)"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a stipulated motion to dismiss with prejudice following settlement. Include signature blocks for both parties' counsel and a proposed order.",
        tags: ["dismissal", "settlement", "stipulation"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    templates.forEach(t => this.documentTemplatesCache.set(t.id, t));
    this.documentTemplatesInitialized = true;
  }

  async getDocumentTemplates(category?: string): Promise<DocumentTemplate[]> {
    this.initializeDocumentTemplates();
    const templates = Array.from(this.documentTemplatesCache.values());
    if (category) {
      return templates.filter(t => t.category === category && t.isActive);
    }
    return templates.filter(t => t.isActive);
  }

  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    this.initializeDocumentTemplates();
    return this.documentTemplatesCache.get(id);
  }

  async createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate> {
    this.initializeDocumentTemplates();
    const now = new Date().toISOString();
    const template: DocumentTemplate = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      jurisdiction: data.jurisdiction,
      templateContent: data.templateContent,
      requiredFields: data.requiredFields || [],
      optionalFields: data.optionalFields || [],
      utahRuleReferences: data.utahRuleReferences || [],
      formatRequirements: data.formatRequirements || {
        paperSize: "8.5x11",
        margins: { top: 1, right: 1, bottom: 1, left: 1 },
        fontSize: 12,
        fontFamily: "Times New Roman",
        lineSpacing: "double",
        requiresCaption: true,
        requiresCertificateOfService: true,
        requiresSignatureBlock: true,
        requiresBilingualNotice: true,
      },
      bilingualNoticeRequired: data.bilingualNoticeRequired ?? true,
      sampleDocument: data.sampleDocument,
      aiPromptInstructions: data.aiPromptInstructions || "",
      tags: data.tags || [],
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.documentTemplatesCache.set(template.id, template);
    return template;
  }

  async updateDocumentTemplate(id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate | undefined> {
    this.initializeDocumentTemplates();
    const template = this.documentTemplatesCache.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...data, updatedAt: new Date().toISOString() };
    this.documentTemplatesCache.set(id, updated);
    return updated;
  }

  async deleteDocumentTemplate(id: string): Promise<boolean> {
    this.initializeDocumentTemplates();
    return this.documentTemplatesCache.delete(id);
  }

  async getGeneratedDocuments(matterId?: string): Promise<GeneratedDocument[]> {
    const docs = Array.from(this.generatedDocumentsCache.values());
    if (matterId) return docs.filter(d => d.matterId === matterId);
    return docs;
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined> {
    return this.generatedDocumentsCache.get(id);
  }

  async createGeneratedDocument(data: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const now = new Date().toISOString();
    const doc: GeneratedDocument = {
      id: randomUUID(),
      templateId: data.templateId,
      matterId: data.matterId,
      title: data.title,
      documentType: data.documentType,
      jurisdiction: data.jurisdiction,
      status: "draft",
      content: data.content,
      fieldValues: data.fieldValues || {},
      aiGenerationPrompt: data.aiGenerationPrompt,
      aiGenerationResponse: data.aiGenerationResponse,
      formatCompliance: data.formatCompliance || { isCompliant: false, checks: [], utahRulesChecked: [] },
      version: 1,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    this.generatedDocumentsCache.set(doc.id, doc);
    return doc;
  }

  async updateGeneratedDocument(id: string, data: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const doc = this.generatedDocumentsCache.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...data, updatedAt: new Date().toISOString() };
    this.generatedDocumentsCache.set(id, updated);
    return updated;
  }

  async deleteGeneratedDocument(id: string): Promise<boolean> {
    return this.generatedDocumentsCache.delete(id);
  }

  async getDocumentApprovals(documentId?: string): Promise<DocumentApproval[]> {
    const approvals = Array.from(this.documentApprovalsCache.values());
    if (documentId) return approvals.filter(a => a.documentId === documentId);
    return approvals;
  }

  async getDocumentApproval(id: string): Promise<DocumentApproval | undefined> {
    return this.documentApprovalsCache.get(id);
  }

  async createDocumentApproval(data: InsertDocumentApproval): Promise<DocumentApproval> {
    const now = new Date().toISOString();
    const approval: DocumentApproval = {
      id: randomUUID(),
      documentId: data.documentId,
      status: "pending",
      assignedReviewerId: data.assignedReviewerId,
      assignedReviewerName: data.assignedReviewerName,
      createdAt: now,
      updatedAt: now,
    };
    this.documentApprovalsCache.set(approval.id, approval);
    return approval;
  }

  async updateDocumentApproval(id: string, data: UpdateDocumentApproval): Promise<DocumentApproval | undefined> {
    const approval = this.documentApprovalsCache.get(id);
    if (!approval) return undefined;
    const updated: DocumentApproval = {
      ...approval,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.status === "approved" && data.lawyerInitials) {
      updated.approvalStamp = new Date().toISOString();
    }
    this.documentApprovalsCache.set(id, updated);
    return updated;
  }

  async addDocumentApprovalAudit(data: Partial<DocumentApprovalAudit>): Promise<DocumentApprovalAudit> {
    const audit: DocumentApprovalAudit = {
      id: randomUUID(),
      documentId: data.documentId || "",
      approvalId: data.approvalId || "",
      action: data.action || "created",
      performedBy: data.performedBy || "",
      performedByName: data.performedByName || "",
      performedAt: new Date().toISOString(),
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      notes: data.notes,
      ipAddress: data.ipAddress,
      metadata: data.metadata,
    };
    this.documentApprovalAuditsCache.set(audit.id, audit);
    return audit;
  }

  async getDocumentApprovalAudit(documentId: string): Promise<DocumentApprovalAudit[]> {
    return Array.from(this.documentApprovalAuditsCache.values())
      .filter(a => a.documentId === documentId)
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }
}
