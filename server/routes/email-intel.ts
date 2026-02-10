/**
 * VERICASE Email Intelligence Routes
 * 
 * Drop-in route module — register in server/routes/index.ts with:
 *   import { registerEmailIntelRoutes } from "./email-intel";
 *   registerEmailIntelRoutes(app);
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { analyzedEmails, adminAlerts, emailContacts } from "@shared/models/tables";
import { matters, clients } from "@shared/models/tables";
import { eq, desc, and, sql, ilike, inArray, or } from "drizzle-orm";
import { analyzeEmail, parseSenderAddress, extractCaseNumbers, UTAH_RULES } from "../services/email-intel-engine";
import type { EmailAnalysis, AdminAlertResult } from "../services/email-intel-engine";
import multer from "multer";
import { maybePageinate } from "../utils/pagination";

// Upload for .eml files
const emlUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "message/rfc822" || file.originalname.endsWith(".eml") || file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only .eml files are supported"));
    }
  },
});

export function registerEmailIntelRoutes(app: Express): void {

  // ════════════════════════════════════
  // EMAIL ANALYSIS
  // ════════════════════════════════════

  /**
   * POST /api/email-intel/analyze
   * Analyze email text or .eml file upload
   * Auto-links to matters by case number, creates admin alerts for Lauren
   */
  app.post("/api/email-intel/analyze", emlUpload.single("file"), async (req: Request, res: Response) => {
    try {
      let subject = "", body = "", sender = "", direction = "inbound", emailDate = new Date();
      let recipients: string[] = [], cc: string[] = [];

      if (req.file) {
        // Parse .eml file (basic extraction)
        const content = req.file.buffer.toString("utf-8");
        const lines = content.split("\n");
        let inBody = false;
        const headerLines: string[] = [];
        const bodyLines: string[] = [];

        for (const line of lines) {
          if (!inBody && line.trim() === "") { inBody = true; continue; }
          if (inBody) bodyLines.push(line);
          else headerLines.push(line);
        }

        const headers = headerLines.join("\n");
        body = bodyLines.join("\n").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        subject = headers.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || "(No Subject)";
        sender = headers.match(/^From:\s*(.+)$/mi)?.[1]?.trim() || "";
        const toMatch = headers.match(/^To:\s*(.+)$/mi)?.[1]?.trim();
        if (toMatch) recipients = toMatch.split(",").map(s => s.trim());
        const dateMatch = headers.match(/^Date:\s*(.+)$/mi)?.[1]?.trim();
        if (dateMatch) try { emailDate = new Date(dateMatch); } catch {}
      } else {
        // JSON body
        const data = req.body || {};
        subject = data.subject || "";
        body = data.body || "";
        sender = data.sender || "";
        direction = data.direction || "inbound";
        recipients = Array.isArray(data.recipients) ? data.recipients : 
                     typeof data.recipients === "string" ? data.recipients.split(",").map((s: string) => s.trim()) : [];
        cc = Array.isArray(data.cc) ? data.cc : [];
        if (data.date) try { emailDate = new Date(data.date); } catch {}
      }

      if (!body && !subject) {
        return res.status(400).json({ error: "Email body or subject required" });
      }

      // Run analysis
      const senderInfo = parseSenderAddress(sender);
      const analysis = analyzeEmail(subject, body, senderInfo.domain);

      // Auto-link to matter by case number
      let linkedMatterId: string | null = null;
      let linkedClientId: string | null = null;
      let autoLinked = false;

      if (analysis.caseNumbers.length > 0) {
        for (const cn of analysis.caseNumbers) {
          const [match] = await db
            .select({ id: matters.id, clientId: matters.clientId })
            .from(matters)
            .where(eq(matters.caseNumber, cn))
            .limit(1);
          if (match) {
            linkedMatterId = match.id;
            linkedClientId = match.clientId;
            autoLinked = true;
            break;
          }
        }
      }

      // If no case number match, try matching sender email to client
      if (!linkedClientId && senderInfo.email) {
        const [clientMatch] = await db
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.email, senderInfo.email))
          .limit(1);
        if (clientMatch) {
          linkedClientId = clientMatch.id;
        }
      }

      // Save analyzed email
      const [saved] = await db.insert(analyzedEmails).values({
        subject,
        sender,
        senderName: senderInfo.name,
        senderDomain: senderInfo.domain,
        recipients,
        cc,
        direction,
        emailDate,
        bodyText: body,
        bodyPreview: body.slice(0, 500),
        urgency: analysis.urgency,
        urgencyScore: analysis.urgencyScore,
        sentiment: analysis.sentiment,
        sentimentScores: analysis.sentimentScores,
        deceptionFlags: analysis.deceptionFlags,
        deceptionScore: analysis.deceptionScore,
        datesMentioned: analysis.datesMentioned,
        deadlines: analysis.deadlines,
        caseNumbers: analysis.caseNumbers,
        moneyAmounts: analysis.moneyAmounts,
        isLawyerComm: analysis.isLawyerComm,
        actionItems: analysis.actionItems,
        keyPhrases: analysis.keyPhrases,
        psychologicalProfile: analysis.psychologicalProfile,
        riskLevel: analysis.riskLevel,
        matterId: linkedMatterId,
        clientId: linkedClientId,
        autoLinked,
      }).returning();

      // Create admin alerts for Lauren
      if (analysis.adminAlerts.length > 0) {
        const alertValues = analysis.adminAlerts.map(a => ({
          emailId: saved.id,
          alertType: a.type,
          priority: a.priority,
          message: a.message,
          triggers: a.triggers,
          senderName: senderInfo.name,
          senderEmail: senderInfo.email,
          emailSubject: subject,
          matterId: linkedMatterId,
        }));
        await db.insert(adminAlerts).values(alertValues);
      }

      // Update/create contact intelligence
      await upsertContact(senderInfo.email, senderInfo.name, senderInfo.domain, analysis, linkedMatterId);

      res.json({
        email: saved,
        analysis,
        linking: {
          matterId: linkedMatterId,
          clientId: linkedClientId,
          autoLinked,
          caseNumbersFound: analysis.caseNumbers,
        },
        alertsCreated: analysis.adminAlerts.length,
      });
    } catch (error) {
      console.error("Email analysis error:", error);
      res.status(500).json({ error: "Failed to analyze email" });
    }
  });

  // ════════════════════════════════════
  // EMAIL INBOX
  // ════════════════════════════════════

  /** GET /api/email-intel/emails — list all analyzed emails */
  app.get("/api/email-intel/emails", async (req: Request, res: Response) => {
    try {
      const filter = req.query.filter as string | undefined;
      const matterId = req.query.matterId as string | undefined;
      const clientId = req.query.clientId as string | undefined;

      let conditions: any[] = [];
      if (filter === "alerts") conditions.push(sql`${analyzedEmails.riskLevel} IN ('high', 'critical')`);
      if (filter === "inbound") conditions.push(eq(analyzedEmails.direction, "inbound"));
      if (filter === "outbound") conditions.push(eq(analyzedEmails.direction, "outbound"));
      if (matterId) conditions.push(eq(analyzedEmails.matterId, matterId));
      if (clientId) conditions.push(eq(analyzedEmails.clientId, clientId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const emails = await db
        .select()
        .from(analyzedEmails)
        .where(where)
        .orderBy(desc(analyzedEmails.emailDate))
        .limit(100);

      res.json(maybePageinate(emails, req.query));
    } catch (error) {
      console.error("Email list error:", error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  /** GET /api/email-intel/emails/:id — single email detail */
  app.get("/api/email-intel/emails/:id", async (req: Request, res: Response) => {
    try {
      const emailId = req.params.id as string;
      const [email] = await db.select().from(analyzedEmails).where(eq(analyzedEmails.id, emailId));
      if (!email) return res.status(404).json({ error: "Email not found" });

      // Also grab alerts for this email
      const alerts = await db.select().from(adminAlerts).where(eq(adminAlerts.emailId, email.id));

      // If linked to matter, grab matter info
      let matter = null;
      if (email.matterId) {
        const [m] = await db.select().from(matters).where(eq(matters.id, email.matterId));
        matter = m || null;
      }

      res.json({ email, alerts, matter });
    } catch (error) {
      console.error("Email detail error:", error);
      res.status(500).json({ error: "Failed to fetch email" });
    }
  });

  /** POST /api/email-intel/emails/:id/link — manually link email to matter */
  app.post("/api/email-intel/emails/:id/link", async (req: Request, res: Response) => {
    try {
      const emailId = req.params.id as string;
      const { matterId } = req.body;
      if (!matterId) return res.status(400).json({ error: "matterId required" });

      const [matter] = await db.select().from(matters).where(eq(matters.id, matterId as string));
      if (!matter) return res.status(404).json({ error: "Matter not found" });

      const [updated] = await db
        .update(analyzedEmails)
        .set({ matterId, clientId: matter.clientId, autoLinked: false, updatedAt: new Date() })
        .where(eq(analyzedEmails.id, emailId))
        .returning();

      // Update alerts too
      await db
        .update(adminAlerts)
        .set({ matterId })
        .where(eq(adminAlerts.emailId, emailId));

      res.json(updated);
    } catch (error) {
      console.error("Link error:", error);
      res.status(500).json({ error: "Failed to link email" });
    }
  });

  // ════════════════════════════════════
  // LAUREN ADMIN ALERTS
  // ════════════════════════════════════

  /** GET /api/email-intel/alerts — get alerts for Lauren */
  app.get("/api/email-intel/alerts", async (req: Request, res: Response) => {
    try {
      const ack = req.query.acknowledged === "true";
      const alerts = await db
        .select()
        .from(adminAlerts)
        .where(eq(adminAlerts.acknowledged, ack))
        .orderBy(desc(adminAlerts.createdAt))
        .limit(50);

      const total = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(adminAlerts)
        .where(eq(adminAlerts.acknowledged, false));

      res.json({ alerts, pendingCount: total[0]?.count || 0 });
    } catch (error) {
      console.error("Alerts error:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  /** POST /api/email-intel/alerts/:id/acknowledge */
  app.post("/api/email-intel/alerts/:id/acknowledge", async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id as string;
      const [updated] = await db
        .update(adminAlerts)
        .set({ acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.body.acknowledgedBy || "Lauren" })
        .where(eq(adminAlerts.id, alertId))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  /** POST /api/email-intel/alerts/acknowledge-all */
  app.post("/api/email-intel/alerts/acknowledge-all", async (_req: Request, res: Response) => {
    try {
      await db
        .update(adminAlerts)
        .set({ acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: "Lauren" })
        .where(eq(adminAlerts.acknowledged, false));

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alerts" });
    }
  });

  // ════════════════════════════════════
  // CONTACT INTELLIGENCE
  // ════════════════════════════════════

  /** GET /api/email-intel/contacts — all contacts with intelligence */
  app.get("/api/email-intel/contacts", async (req: Request, res: Response) => {
    try {
      const contacts = await db
        .select()
        .from(emailContacts)
        .orderBy(desc(emailContacts.lastSeen))
        .limit(100);

      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  /** GET /api/email-intel/contacts/:email — contact detail */
  app.get("/api/email-intel/contacts/:email", async (req: Request, res: Response) => {
    try {
      const contactEmail = req.params.email as string;
      const [contact] = await db
        .select()
        .from(emailContacts)
        .where(eq(emailContacts.email, contactEmail));

      if (!contact) return res.status(404).json({ error: "Contact not found" });

      // Get all emails from this contact
      const emails = await db
        .select()
        .from(analyzedEmails)
        .where(eq(analyzedEmails.sender, contactEmail))
        .orderBy(desc(analyzedEmails.emailDate))
        .limit(50);

      // Check multi-matter
      const matterIds = contact.matterIds as string[];
      let mattersList: any[] = [];
      if (matterIds && matterIds.length > 0) {
        mattersList = await db
          .select({ id: matters.id, name: matters.name, caseNumber: matters.caseNumber, status: matters.status })
          .from(matters)
          .where(inArray(matters.id, matterIds));
      }

      res.json({
        contact,
        emails,
        matters: mattersList,
        multiMatter: mattersList.length > 1,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contact intelligence" });
    }
  });

  // ════════════════════════════════════
  // DASHBOARD & TIMELINE
  // ════════════════════════════════════

  /** GET /api/email-intel/dashboard — aggregate stats */
  app.get("/api/email-intel/dashboard", async (_req: Request, res: Response) => {
    try {
      const [emailCount] = await db.select({ count: sql<number>`count(*)::int` }).from(analyzedEmails);
      const [alertCount] = await db.select({ count: sql<number>`count(*)::int` }).from(adminAlerts).where(eq(adminAlerts.acknowledged, false));
      const [highRisk] = await db.select({ count: sql<number>`count(*)::int` }).from(analyzedEmails).where(sql`${analyzedEmails.riskLevel} IN ('high','critical')`);
      const [lawyerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(analyzedEmails).where(eq(analyzedEmails.isLawyerComm, true));
      const [contactCount] = await db.select({ count: sql<number>`count(*)::int` }).from(emailContacts);

      // Sentiment breakdown
      const sentimentBreakdown = await db
        .select({ sentiment: analyzedEmails.sentiment, count: sql<number>`count(*)::int` })
        .from(analyzedEmails)
        .groupBy(analyzedEmails.sentiment);

      // Recent emails
      const recentEmails = await db
        .select()
        .from(analyzedEmails)
        .orderBy(desc(analyzedEmails.emailDate))
        .limit(10);

      // Pending alerts
      const pendingAlerts = await db
        .select()
        .from(adminAlerts)
        .where(eq(adminAlerts.acknowledged, false))
        .orderBy(desc(adminAlerts.createdAt))
        .limit(10);

      res.json({
        totalEmails: emailCount?.count || 0,
        pendingAlerts: alertCount?.count || 0,
        highRiskEmails: highRisk?.count || 0,
        lawyerComms: lawyerCount?.count || 0,
        totalContacts: contactCount?.count || 0,
        sentimentBreakdown: Object.fromEntries(sentimentBreakdown.map(s => [s.sentiment, s.count])),
        recentEmails,
        alerts: pendingAlerts,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  /** GET /api/email-intel/timeline — chronological events */
  app.get("/api/email-intel/timeline", async (req: Request, res: Response) => {
    try {
      const matterId = req.query.matterId as string | undefined;
      const where = matterId ? eq(analyzedEmails.matterId, matterId) : undefined;

      const emails = await db
        .select()
        .from(analyzedEmails)
        .where(where)
        .orderBy(desc(analyzedEmails.emailDate))
        .limit(100);

      const events = emails.map(e => ({
        type: "email",
        date: e.emailDate?.toISOString(),
        subject: e.subject,
        sender: e.senderName || e.sender,
        urgency: e.urgency,
        sentiment: e.sentiment,
        riskLevel: e.riskLevel,
        emailId: e.id,
        matterId: e.matterId,
        hasAlerts: false, // will be enriched below
      }));

      // Mark which have alerts
      if (events.length > 0) {
        const emailIds = events.map(e => e.emailId);
        const alertEmails = await db
          .select({ emailId: adminAlerts.emailId })
          .from(adminAlerts)
          .where(inArray(adminAlerts.emailId, emailIds));
        const alertSet = new Set(alertEmails.map(a => a.emailId));
        events.forEach(e => { e.hasAlerts = alertSet.has(e.emailId); });
      }

      res.json({ events, total: events.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch timeline" });
    }
  });

  /** GET /api/email-intel/matter/:matterId/emails — all emails for a matter */
  app.get("/api/email-intel/matter/:matterId/emails", async (req: Request, res: Response) => {
    try {
      const mId = req.params.matterId as string;
      const emails = await db
        .select()
        .from(analyzedEmails)
        .where(eq(analyzedEmails.matterId, mId))
        .orderBy(desc(analyzedEmails.emailDate));

      const alerts = await db
        .select()
        .from(adminAlerts)
        .where(eq(adminAlerts.matterId, mId))
        .orderBy(desc(adminAlerts.createdAt));

      res.json({ emails, alerts, total: emails.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter emails" });
    }
  });

  // ════════════════════════════════════
  // REFERENCE DATA
  // ════════════════════════════════════

  /** GET /api/email-intel/reference/utah-rules */
  app.get("/api/email-intel/reference/utah-rules", (_req: Request, res: Response) => {
    res.json(UTAH_RULES);
  });

  /** GET /api/email-intel/search — search emails */
  app.get("/api/email-intel/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q) return res.json([]);

      const results = await db
        .select()
        .from(analyzedEmails)
        .where(or(
          ilike(analyzedEmails.subject, `%${q}%`),
          ilike(analyzedEmails.bodyText, `%${q}%`),
          ilike(analyzedEmails.sender, `%${q}%`),
          ilike(analyzedEmails.senderName, `%${q}%`),
        ))
        .orderBy(desc(analyzedEmails.emailDate))
        .limit(25);

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search" });
    }
  });
}

// ── HELPER: Upsert contact intelligence ──
async function upsertContact(
  emailAddr: string,
  name: string,
  domain: string,
  analysis: EmailAnalysis,
  matterId: string | null,
) {
  if (!emailAddr) return;

  const [existing] = await db
    .select()
    .from(emailContacts)
    .where(eq(emailContacts.email, emailAddr.toLowerCase()));

  if (existing) {
    const names = new Set(([...(existing.names as string[] || []), name] as string[]).filter(Boolean));
    const domains = new Set(([...(existing.domains as string[] || []), domain] as string[]).filter(Boolean));
    const matterIds = new Set(([...(existing.matterIds as string[] || []), matterId] as string[]).filter(Boolean));
    const timeline = [...(existing.behaviorTimeline as any[] || []), {
      date: new Date().toISOString(),
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      deceptionScore: analysis.deceptionScore,
    }].slice(-50); // keep last 50

    const totalEmails = (existing.totalEmails || 0) + 1;
    const alertCount = (existing.alertCount || 0) + analysis.adminAlerts.length;

    // Recalculate dominant sentiment
    const sentiments = timeline.map((t: any) => t.sentiment).filter(Boolean);
    const counts: Record<string, number> = {};
    sentiments.forEach((s: string) => { counts[s] = (counts[s] || 0) + 1; });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";

    const avgDeception = timeline.reduce((sum: number, t: any) => sum + (t.deceptionScore || 0), 0) / timeline.length;

    await db.update(emailContacts).set({
      names: Array.from(names),
      domains: Array.from(domains),
      isLawyer: existing.isLawyer || analysis.isLawyerComm,
      totalEmails,
      matterIds: Array.from(matterIds),
      dominantSentiment: dominant,
      avgDeceptionScore: Math.round(avgDeception * 100) / 100,
      alertCount,
      riskAssessment: avgDeception > 3 || alertCount > 2 ? "high" : avgDeception > 1 ? "medium" : "low",
      behaviorTimeline: timeline,
      lastSeen: new Date(),
      updatedAt: new Date(),
    }).where(eq(emailContacts.id, existing.id));
  } else {
    await db.insert(emailContacts).values({
      email: emailAddr.toLowerCase(),
      names: [name].filter(Boolean),
      domains: [domain].filter(Boolean),
      isLawyer: analysis.isLawyerComm,
      totalEmails: 1,
      matterIds: [matterId].filter(Boolean) as string[],
      dominantSentiment: analysis.sentiment,
      avgDeceptionScore: analysis.deceptionScore,
      alertCount: analysis.adminAlerts.length,
      riskAssessment: analysis.deceptionScore > 3 ? "high" : analysis.deceptionScore > 1 ? "medium" : "low",
      behaviorTimeline: [{
        date: new Date().toISOString(),
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        deceptionScore: analysis.deceptionScore,
      }],
      firstSeen: new Date(),
      lastSeen: new Date(),
    });
  }
}
