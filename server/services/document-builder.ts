import { db } from "../db";
import { eq } from "drizzle-orm";
import { matters, caseFilings } from "@shared/models/tables";

export interface DraftDocument {
  title: string;
  templateType: string;
  content: string;
  linkedFilingId: string | null;
  linkedDeadlineId: string | null;
  matterId: string;
}

interface MatterCaption {
  courtName: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  judge: string;
}

async function getMatterCaption(matterId: string): Promise<MatterCaption> {
  const [matter] = await db.select().from(matters).where(eq(matters.id, matterId)).limit(1);

  return {
    courtName: matter?.courtName || "[COURT NAME]",
    caseNumber: matter?.caseNumber || "[CASE NUMBER]",
    plaintiff: "[PLAINTIFF NAME]",
    defendant: "[DEFENDANT NAME]",
    judge: "[JUDGE NAME]",
  };
}

function generateCaptionBlock(caption: MatterCaption): string {
  return `IN THE ${caption.courtName.toUpperCase()}
__________________________________________

${caption.plaintiff},
    Plaintiff,

vs.                                          Case No. ${caption.caseNumber}
                                             Judge: ${caption.judge}
${caption.defendant},
    Defendant.

__________________________________________`;
}

export async function generateDiscoveryResponseDraft(
  matterId: string,
  triggerFilingId: string,
  deadlineId: string | null
): Promise<DraftDocument> {
  const caption = await getMatterCaption(matterId);
  const captionBlock = generateCaptionBlock(caption);

  const [triggerFiling] = await db.select().from(caseFilings)
    .where(eq(caseFilings.id, triggerFilingId)).limit(1);

  const discoveryType = triggerFiling?.docSubtype || "Discovery Requests";
  const facts = (triggerFiling?.extractedFacts || {}) as Record<string, any>;
  const setNumber = facts.discoverySetNumber || "First Set";

  const content = `${captionBlock}

DEFENDANT'S RESPONSES AND OBJECTIONS TO
PLAINTIFF'S ${setNumber.toUpperCase()} OF ${discoveryType.toUpperCase()}

__________________________________________

COMES NOW, Defendant ${caption.defendant}, by and through undersigned counsel, and hereby responds and objects to Plaintiff's ${setNumber} of ${discoveryType}, as follows:

PRELIMINARY STATEMENT

[Describe any preliminary matters, standing objections, or privilege log references.]

GENERAL OBJECTIONS

1. Defendant objects to each request to the extent it seeks information protected by attorney-client privilege, work product doctrine, or any other applicable privilege or immunity.

2. Defendant objects to each request to the extent it is overly broad, unduly burdensome, vague, ambiguous, or seeks information not relevant to any party's claim or defense or proportional to the needs of the case.

3. Defendant objects to each request to the extent it seeks confidential, proprietary, or trade secret information without adequate protective order in place.

4. Defendant objects to each request to the extent it seeks information equally available to Plaintiff through other means.

5. [Add additional general objections as applicable.]

SPECIFIC RESPONSES

REQUEST NO. 1:
[Copy the text of Request No. 1]

RESPONSE TO REQUEST NO. 1:
Subject to and without waiving the foregoing general objections, Defendant responds as follows:
[Draft response here.]

REQUEST NO. 2:
[Copy the text of Request No. 2]

RESPONSE TO REQUEST NO. 2:
Subject to and without waiving the foregoing general objections, Defendant responds as follows:
[Draft response here.]

REQUEST NO. 3:
[Copy the text of Request No. 3]

RESPONSE TO REQUEST NO. 3:
Subject to and without waiving the foregoing general objections, Defendant responds as follows:
[Draft response here.]

[Continue for all requests...]

VERIFICATION

[If required by rule, include verification language.]

DATED this _____ day of _____________, 20__.

                                    Respectfully submitted,

                                    _________________________
                                    [ATTORNEY NAME]
                                    [FIRM NAME]
                                    [ADDRESS]
                                    [PHONE]
                                    [EMAIL]
                                    Attorney for Defendant

CERTIFICATE OF SERVICE

I hereby certify that on the _____ day of _____________, 20__, a true and correct copy of the foregoing was served upon the following:

    [OPPOSING COUNSEL NAME]
    [FIRM NAME]
    [ADDRESS]
    [EMAIL]

via [electronic filing / email / hand delivery / U.S. Mail].

                                    _________________________

SOURCE DOCUMENT REFERENCE:
- Triggering Document: ${triggerFiling?.originalFileName || "[SOURCE DOCUMENT]"}
- Filed/Served Date: ${triggerFiling?.servedDate || triggerFiling?.filedDate || "[DATE]"}
- Discovery Set: ${setNumber}
`;

  return {
    title: `DRAFT - Responses to ${discoveryType} (${setNumber})`,
    templateType: "discovery_response",
    content,
    linkedFilingId: triggerFilingId,
    linkedDeadlineId: deadlineId,
    matterId,
  };
}

export async function generateOppositionDraft(
  matterId: string,
  triggerFilingId: string,
  deadlineId: string | null
): Promise<DraftDocument> {
  const caption = await getMatterCaption(matterId);
  const captionBlock = generateCaptionBlock(caption);

  const [triggerFiling] = await db.select().from(caseFilings)
    .where(eq(caseFilings.id, triggerFilingId)).limit(1);

  const motionFacts = (triggerFiling?.extractedFacts || {}) as Record<string, any>;
  const motionTitle = motionFacts.motionTitle
    || triggerFiling?.docSubtype
    || "Motion";

  const content = `${captionBlock}

DEFENDANT'S MEMORANDUM IN OPPOSITION TO
PLAINTIFF'S ${motionTitle.toUpperCase()}

__________________________________________

Defendant ${caption.defendant}, by and through undersigned counsel, respectfully submits this Memorandum in Opposition to Plaintiff's ${motionTitle} and states as follows:

I. INTRODUCTION

[Provide a brief overview of the motion being opposed and the basis for the opposition. Summarize the key reasons the motion should be denied.]

II. STATEMENT OF RELEVANT FACTS

[Set forth the material facts relevant to the opposition. Cite to the record where applicable.]

1. [Fact 1.]

2. [Fact 2.]

3. [Fact 3.]

III. LEGAL STANDARD

[Set forth the applicable legal standard for the type of motion being opposed.]

IV. ARGUMENT

A. [First Argument Heading]

[Develop the first argument for why the motion should be denied. Cite relevant case law and statutory authority.]

B. [Second Argument Heading]

[Develop the second argument. Include factual analysis tied to the legal standard.]

C. [Third Argument Heading]

[Additional arguments as applicable.]

V. CONCLUSION

WHEREFORE, Defendant respectfully requests that the Court deny Plaintiff's ${motionTitle} in its entirety, and for such other and further relief as the Court deems just and proper.

DATED this _____ day of _____________, 20__.

                                    Respectfully submitted,

                                    _________________________
                                    [ATTORNEY NAME]
                                    [FIRM NAME]
                                    [ADDRESS]
                                    [PHONE]
                                    [EMAIL]
                                    Attorney for Defendant

CERTIFICATE OF SERVICE

I hereby certify that on the _____ day of _____________, 20__, a true and correct copy of the foregoing was served upon the following:

    [OPPOSING COUNSEL NAME]
    [FIRM NAME]
    [ADDRESS]
    [EMAIL]

via [electronic filing / email / hand delivery / U.S. Mail].

                                    _________________________

SOURCE DOCUMENT REFERENCE:
- Opposing Motion: ${triggerFiling?.originalFileName || "[SOURCE DOCUMENT]"}
- Filed Date: ${triggerFiling?.filedDate || "[DATE]"}
- Motion Type: ${motionTitle}
`;

  return {
    title: `DRAFT - Opposition to ${motionTitle}`,
    templateType: "opposition",
    content,
    linkedFilingId: triggerFilingId,
    linkedDeadlineId: deadlineId,
    matterId,
  };
}

export async function generateDraftForAction(
  matterId: string,
  actionType: string,
  requiredDocType: string | null,
  filingId: string | null,
  deadlineId: string | null
): Promise<DraftDocument | null> {
  if (!filingId) return null;

  const docType = requiredDocType || "";

  if (docType === "Discovery Response" || actionType === "respond") {
    return generateDiscoveryResponseDraft(matterId, filingId, deadlineId);
  }

  if (docType === "Motion" || actionType === "file") {
    const [filing] = await db.select().from(caseFilings)
      .where(eq(caseFilings.id, filingId)).limit(1);
    if (filing && filing.docType === "Motion") {
      return generateOppositionDraft(matterId, filingId, deadlineId);
    }
  }

  return null;
}
