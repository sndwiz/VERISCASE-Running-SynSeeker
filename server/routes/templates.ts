import type { Express } from "express";
import { db } from "../db";
import { templates, templateContents, templateUsageLog } from "@shared/models/tables";
import { insertTemplateSchema, insertTemplateContentSchema, insertTemplateUsageSchema } from "@shared/schema";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import { getUserId } from "../utils/auth";

export function registerTemplateRoutes(app: Express): void {
  app.get("/api/templates", async (req, res) => {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(templates).where(eq(templates.type, "email"));
      if (Number(existing[0]?.count || 0) === 0) {
        const seedUserId = getUserId(req) || "system-seed";
        const emailTemplates = getEmailTemplateSeeds();
        for (const tpl of emailTemplates) {
          const [template] = await db.insert(templates).values({
            type: "email",
            scopeType: "global",
            name: tpl.name,
            description: tpl.useWhen,
            category: tpl.category,
            tagsJson: tpl.tags,
            createdByUserId: seedUserId,
            status: "active",
          }).returning();
          await db.insert(templateContents).values({
            templateId: template.id,
            contentJson: { subject: tpl.subject, body: tpl.body, placeholders: tpl.placeholders },
          });
        }
      }

      const { type, category, q, status } = req.query;
      let query = db.select().from(templates).orderBy(desc(templates.updatedAt));

      const conditions: any[] = [];
      if (type && typeof type === "string") conditions.push(eq(templates.type, type));
      if (category && typeof category === "string") conditions.push(eq(templates.category, category));
      if (status && typeof status === "string") conditions.push(eq(templates.status, status));
      else conditions.push(eq(templates.status, "active"));
      if (q && typeof q === "string") conditions.push(ilike(templates.name, `%${q}%`));

      const result = conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const [template] = await db.select().from(templates).where(eq(templates.id, req.params.id));
      if (!template) return res.status(404).json({ error: "Template not found" });

      const [content] = await db.select().from(templateContents).where(eq(templateContents.templateId, req.params.id));
      const usageCount = await db.select({ count: sql<number>`count(*)` }).from(templateUsageLog).where(eq(templateUsageLog.templateId, req.params.id));

      res.json({ ...template, content: content?.contentJson || {}, usageCount: Number(usageCount[0]?.count || 0) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertTemplateSchema.parse(req.body);
      const contentData = req.body.content || {};

      const [template] = await db.insert(templates).values({
        ...parsed,
        createdByUserId: userId,
      }).returning();

      await db.insert(templateContents).values({
        templateId: template.id,
        contentJson: contentData,
      });

      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: "Invalid template data", details: error.errors });
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const updates: any = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.category) updates.category = req.body.category;
      if (req.body.tagsJson) updates.tagsJson = req.body.tagsJson;
      if (req.body.status) updates.status = req.body.status;
      updates.updatedAt = new Date();

      const [template] = await db.update(templates).set(updates).where(eq(templates.id, req.params.id)).returning();
      if (!template) return res.status(404).json({ error: "Template not found" });

      if (req.body.content !== undefined) {
        await db.delete(templateContents).where(eq(templateContents.templateId, req.params.id));
        await db.insert(templateContents).values({ templateId: req.params.id, contentJson: req.body.content });
      }

      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const [template] = await db.update(templates).set({ status: "archived" }).where(eq(templates.id, req.params.id)).returning();
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive template" });
    }
  });

  app.post("/api/templates/:id/use", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertTemplateUsageSchema.parse({ templateId: req.params.id, ...req.body });

      await db.insert(templateUsageLog).values({
        ...parsed,
        usedByUserId: userId,
      });

      const [content] = await db.select().from(templateContents).where(eq(templateContents.templateId, req.params.id));
      res.json({ success: true, content: content?.contentJson || {} });
    } catch (error) {
      res.status(500).json({ error: "Failed to log template usage" });
    }
  });

  app.post("/api/templates/seed", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const existing = await db.select({ count: sql<number>`count(*)` }).from(templates).where(eq(templates.type, "email"));
      if (Number(existing[0]?.count || 0) >= 20) {
        return res.json({ message: "Email templates already seeded", count: Number(existing[0]?.count) });
      }

      const emailTemplates = getEmailTemplateSeeds();
      let count = 0;

      for (const tpl of emailTemplates) {
        const [template] = await db.insert(templates).values({
          type: "email",
          scopeType: "global",
          name: tpl.name,
          description: tpl.useWhen,
          category: tpl.category,
          tagsJson: tpl.tags,
          createdByUserId: userId,
          status: "active",
        }).returning();

        await db.insert(templateContents).values({
          templateId: template.id,
          contentJson: { subject: tpl.subject, body: tpl.body, placeholders: tpl.placeholders },
        });
        count++;
      }

      res.json({ message: `Seeded ${count} email templates`, count });
    } catch (error) {
      console.error("Failed to seed templates:", error);
      res.status(500).json({ error: "Failed to seed templates" });
    }
  });
}

function getEmailTemplateSeeds() {
  return [
    {
      name: "Intake Welcome + Next Steps",
      tags: ["intake", "client-comms", "litigation", "medical"],
      category: "intake",
      useWhen: "New client signs / decides to proceed.",
      subject: "Next steps for {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

Thanks for trusting us with {{MATTER_NAME}}. Here's what we'll do next and what we need from you to keep things moving quickly:

1) Documents & details
Please upload any relevant documents (photos, bills, letters, discharge paperwork, insurance info) here: {{UPLOAD_LINK}}

2) Medical treatment info (if applicable)
Send us:
- provider names + locations
- dates of treatment
- any upcoming appointments

3) Communication
We'll keep you updated as major milestones happen. If something changes (symptoms, providers, insurance, new contact from the other side), reply here and let us know.

If you have questions, you can reach us at {{PHONE_NUMBER}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "UPLOAD_LINK", "PHONE_NUMBER", "SIGNATURE"],
    },
    {
      name: "Medical Treatment Timeline Request",
      tags: ["medical", "litigation", "evidence", "client-comms"],
      category: "medical",
      useWhen: "Need a clean treatment chronology early.",
      subject: "Quick request: your treatment timeline for {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

To build your case correctly, we need a simple timeline of your treatment. Please reply with:
1. First date you sought care after the incident:
2. Every provider you've seen (clinic/hospital/doctor/PT/chiro/etc.):
3. Dates of visits (approx is okay if you don't know exactly):
4. Any upcoming appointments:
5. Current symptoms and what's improved/worsened:

If it's easier, you can upload screenshots/records here: {{UPLOAD_LINK}}

Thanks - this helps us avoid gaps and prevents the other side from steering the story.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "UPLOAD_LINK", "SIGNATURE"],
    },
    {
      name: "HIPAA Authorization Request",
      tags: ["medical", "records", "client-comms"],
      category: "medical",
      useWhen: "You need signed releases to request records/billing.",
      subject: "Authorization needed to request your medical records",
      body: `Hi {{CLIENT_FIRST_NAME}},

We're ready to request your medical records and billing. Please complete and sign the attached HIPAA authorizations.

Instructions:
1. Review and sign where marked
2. Return by {{DEADLINE_DATE}}
3. If you prefer, upload signed copies here: {{UPLOAD_LINK}}

Once we receive these, we'll request records, imaging, and billing from the listed providers.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "DEADLINE_DATE", "UPLOAD_LINK", "SIGNATURE"],
    },
    {
      name: "Missing Records Follow-Up (Client)",
      tags: ["medical", "records", "follow-up"],
      category: "follow-up",
      useWhen: "You're missing provider info or documents.",
      subject: "Still need a few items for {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

We're missing a few items needed to move your case forward:
- {{MISSING_ITEM_1}}
- {{MISSING_ITEM_2}}
- {{MISSING_ITEM_3}}

Please reply with the info or upload here: {{UPLOAD_LINK}} by {{DEADLINE_DATE}}.

If you're not sure how to get something, tell us what you have and we'll guide you.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "UPLOAD_LINK", "DEADLINE_DATE", "MISSING_ITEM_1", "MISSING_ITEM_2", "MISSING_ITEM_3", "SIGNATURE"],
    },
    {
      name: "Evidence Preservation Notice",
      tags: ["litigation", "preservation", "evidence"],
      category: "litigation",
      useWhen: "You need to preserve video/logs/records.",
      subject: "Evidence Preservation Notice - {{MATTER_NAME}}",
      body: `To Whom It May Concern,

Our office represents {{CLIENT_NAME}} regarding {{INCIDENT_DESCRIPTION}} on or about {{INCIDENT_DATE}} at {{INCIDENT_LOCATION}}.

Please preserve all evidence potentially relevant to this matter, including but not limited to:
- surveillance footage (all angles/time windows)
- incident reports and internal communications
- logs, access records, maintenance records (if applicable)
- photographs, witness statements, and call recordings

Do not delete, overwrite, or modify such evidence. Please confirm preservation in writing.

Sincerely,
{{SIGNATURE}}`,
      placeholders: ["CLIENT_NAME", "MATTER_NAME", "INCIDENT_DESCRIPTION", "INCIDENT_DATE", "INCIDENT_LOCATION", "SIGNATURE"],
    },
    {
      name: "Notice of Representation",
      tags: ["litigation", "insurance", "client-comms"],
      category: "litigation",
      useWhen: "You notify adjuster/counsel to stop contacting client.",
      subject: "Notice of Representation - {{CLIENT_NAME}} / {{MATTER_NAME}}",
      body: `Hello,

Our office represents {{CLIENT_NAME}} regarding {{MATTER_NAME}}. Please direct all communications to our office. Do not contact our client directly.

If you have an open claim number, please provide it. If not, please open a file and confirm the assigned adjuster/contact.

Thank you,
{{SIGNATURE}}`,
      placeholders: ["CLIENT_NAME", "MATTER_NAME", "SIGNATURE"],
    },
    {
      name: "Demand Package Status Update",
      tags: ["medical", "litigation", "client-comms"],
      category: "client-comms",
      useWhen: "Keep client calm while assembling demand.",
      subject: "Update on your case: {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

Quick update: we're actively building your demand package. This includes:
- medical records and billing
- treatment timeline and impact summary
- supporting documentation (photos, wage loss, etc.)

Right now, we're waiting on: {{WAITING_ON_ITEMS}}.

Next update by: {{NEXT_UPDATE_DATE}}.
If anything changes medically or you receive new bills, please send them to {{UPLOAD_LINK}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "WAITING_ON_ITEMS", "NEXT_UPDATE_DATE", "UPLOAD_LINK", "SIGNATURE"],
    },
    {
      name: "Settlement Offer Received - Client Update",
      tags: ["settlement", "client-comms", "medical"],
      category: "settlement",
      useWhen: "Offer arrives; you want structured reply.",
      subject: "Settlement offer update for {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

We received a settlement offer in your case. The offer is: {{OFFER_AMOUNT}}.

Next steps:
1. We will review it against medical bills, treatment, and case risk factors.
2. We'll discuss your goals and whether counter-offer makes sense.

Please tell us:
- Are you still treating?
- Any new bills or providers since our last update?
- Any major scheduling constraints this week for a call?

We can set a call here: {{SCHEDULING_LINK}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "OFFER_AMOUNT", "SCHEDULING_LINK", "SIGNATURE"],
    },
    {
      name: "Wage Loss Documentation Request",
      tags: ["damages", "litigation", "medical"],
      category: "damages",
      useWhen: "You need wage loss proof.",
      subject: "Wage loss documents needed - {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

To document wage loss, please send any of the following that apply:
- pay stubs (before and after incident)
- employer letter verifying missed time/duties
- tax returns (if self-employed)
- disability/FMLA paperwork

Upload here: {{UPLOAD_LINK}} by {{DEADLINE_DATE}}.

If you'd like, share your employer contact info and we can provide a verification form.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "UPLOAD_LINK", "DEADLINE_DATE", "SIGNATURE"],
    },
    {
      name: "Discovery Sent - Client Update",
      tags: ["discovery", "litigation", "client-comms"],
      category: "discovery",
      useWhen: "You've served discovery; explain what it means.",
      subject: "Discovery update - {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

We served discovery in your case. This is the formal process of exchanging information. The other side will likely request documents and may ask written questions.

If you receive anything directly, forward it to us immediately. Do not respond on your own.

We'll contact you if we need your input to answer requests.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "SIGNATURE"],
    },
    {
      name: "Client Discovery Responses Needed",
      tags: ["discovery", "client-comms", "litigation"],
      category: "discovery",
      useWhen: "You need client's answers/documents quickly.",
      subject: "Your discovery responses needed by {{DEADLINE_DATE}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

We need your help to complete discovery responses. Please upload or send the following by {{DEADLINE_DATE}}:
- {{REQUEST_1}}
- {{REQUEST_2}}
- {{REQUEST_3}}

Upload here: {{UPLOAD_LINK}}.

If you don't have an item, tell us "not available" rather than leaving it unanswered.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "DEADLINE_DATE", "UPLOAD_LINK", "REQUEST_1", "REQUEST_2", "REQUEST_3", "SIGNATURE"],
    },
    {
      name: "Deposition Scheduling (Request)",
      tags: ["deposition", "litigation"],
      category: "deposition",
      useWhen: "Coordinating depo dates.",
      subject: "Deposition scheduling - {{CASE_NUMBER}}",
      body: `Counsel,

We are available to schedule {{DEPONENT_NAME}}'s deposition. Please provide your availability for the following windows:
- {{DATE_WINDOW_1}}
- {{DATE_WINDOW_2}}
- {{DATE_WINDOW_3}}

Please also confirm whether you prefer remote or in-person and any expected duration.

Regards,
{{SIGNATURE}}`,
      placeholders: ["CASE_NUMBER", "DEPONENT_NAME", "DATE_WINDOW_1", "DATE_WINDOW_2", "DATE_WINDOW_3", "SIGNATURE"],
    },
    {
      name: "Deposition Prep - What to Expect",
      tags: ["deposition", "client-comms", "litigation"],
      category: "deposition",
      useWhen: "Client depo is set; prep them.",
      subject: "Deposition prep for {{MATTER_NAME}} - next steps",
      body: `Hi {{CLIENT_FIRST_NAME}},

Your deposition is scheduled for {{DEPOSITION_DATE}} at {{DEPOSITION_LOCATION}}.

We'll meet beforehand to prepare. Here's the short version of what matters:
- Tell the truth; don't guess
- Keep answers tight and responsive
- If you don't understand a question, say so
- If you don't remember, say so

Please send us anything new since we last spoke (treatment, bills, symptoms, communications) here: {{UPLOAD_LINK}}.

We'll schedule prep here: {{SCHEDULING_LINK}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "DEPOSITION_DATE", "DEPOSITION_LOCATION", "UPLOAD_LINK", "SCHEDULING_LINK", "SIGNATURE"],
    },
    {
      name: "IME Scheduled - Client Guidance",
      tags: ["medical", "litigation", "client-comms"],
      category: "medical",
      useWhen: "Defense IME occurs.",
      subject: "IME scheduled - important guidance",
      body: `Hi {{CLIENT_FIRST_NAME}},

An IME (Independent Medical Exam) is scheduled for {{IME_DATE}} at {{IME_LOCATION}}.

Important guidance:
- Be polite and factual
- Do not exaggerate symptoms
- Do not volunteer extra information beyond what's asked
- If anything feels improper, note it and tell us immediately after

If you receive any paperwork before/after, upload it here: {{UPLOAD_LINK}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "IME_DATE", "IME_LOCATION", "UPLOAD_LINK", "SIGNATURE"],
    },
    {
      name: "Provider Records Follow-Up",
      tags: ["records", "medical", "litigation"],
      category: "medical",
      useWhen: "Provider is slow; you need status.",
      subject: "Follow-up: records request for {{CLIENT_NAME}} ({{DOB_OR_ID}})",
      body: `Hello,

Following up on our records request for {{CLIENT_NAME}}. Please confirm:
- date request received
- estimated completion date
- whether any fees are required prior to release

If you need anything from us to process, please advise.

Thank you,
{{SIGNATURE}}`,
      placeholders: ["CLIENT_NAME", "DOB_OR_ID", "SIGNATURE"],
    },
    {
      name: "Expert Review Request",
      tags: ["medical", "expert", "litigation"],
      category: "expert",
      useWhen: "You want an expert opinion on records.",
      subject: "Request for expert review - {{MATTER_NAME}}",
      body: `Hi {{EXPERT_OR_PARTNER_NAME}},

We'd like a review of the attached materials for {{MATTER_NAME}}. Key questions:
1. {{QUESTION_1}}
2. {{QUESTION_2}}
3. {{QUESTION_3}}

Incident date: {{INCIDENT_DATE}}
Treatment summary: {{TREATMENT_SUMMARY_SHORT}}

Please confirm timeline and any initial concerns.

{{SIGNATURE}}`,
      placeholders: ["EXPERT_OR_PARTNER_NAME", "MATTER_NAME", "QUESTION_1", "QUESTION_2", "QUESTION_3", "INCIDENT_DATE", "TREATMENT_SUMMARY_SHORT", "SIGNATURE"],
    },
    {
      name: "Client Litigation Hold Instructions",
      tags: ["litigation", "client-comms", "preservation"],
      category: "litigation",
      useWhen: "You need client to preserve their own evidence.",
      subject: "Important: preserve evidence for {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

Please preserve any evidence related to your case. Do not delete or edit:
- texts, emails, social messages related to the incident
- photos/videos
- call logs
- social media posts about the incident or injuries
- receipts or records connected to treatment or expenses

If you have relevant screenshots or exports, upload them here: {{UPLOAD_LINK}}.

If you're unsure whether something matters, keep it and ask us.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "UPLOAD_LINK", "SIGNATURE"],
    },
    {
      name: "Social Media Guidance",
      tags: ["litigation", "client-comms", "risk"],
      category: "risk",
      useWhen: "You want to prevent self-inflicted damage.",
      subject: "Social media guidance while your case is pending",
      body: `Hi {{CLIENT_FIRST_NAME}},

A quick but important note: while your case is pending, avoid posting about:
- the incident
- your injuries, treatment, or recovery
- activities that could be misinterpreted
- comments about the other party

Even "private" posts can become evidence. If you have questions about a post, ask before posting.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "SIGNATURE"],
    },
    {
      name: "Client Approval Needed - Filing/Service",
      tags: ["litigation", "client-comms"],
      category: "litigation",
      useWhen: "You need written approval to proceed.",
      subject: "Approval needed to proceed - {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

We're ready to proceed with {{NEXT_STEP_DESCRIPTION}}. Please reply "APPROVED" to authorize us to move forward, or let us know if you'd like to discuss first.

If you'd like a call, schedule here: {{SCHEDULING_LINK}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "NEXT_STEP_DESCRIPTION", "SCHEDULING_LINK", "SIGNATURE"],
    },
    {
      name: "Case Status Update (Client)",
      tags: ["client-comms", "litigation", "medical"],
      category: "client-comms",
      useWhen: "Regular updates to reduce anxiety and inbound calls.",
      subject: "Status update - {{MATTER_NAME}}",
      body: `Hi {{CLIENT_FIRST_NAME}},

Status update as of today:
- Current phase: {{CASE_PHASE}}
- Most recent action: {{LAST_ACTION}}
- What we're waiting on: {{WAITING_ON}}
- Next expected step: {{NEXT_STEP}}
- Next update: {{NEXT_UPDATE_DATE}}

If you have new treatment, bills, or major changes, upload here: {{UPLOAD_LINK}}.

{{SIGNATURE}}`,
      placeholders: ["CLIENT_FIRST_NAME", "MATTER_NAME", "CASE_PHASE", "LAST_ACTION", "WAITING_ON", "NEXT_STEP", "NEXT_UPDATE_DATE", "UPLOAD_LINK", "SIGNATURE"],
    },
  ];
}
