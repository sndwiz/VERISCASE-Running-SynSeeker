import { db } from "../db";
import { DbStorage } from "../dbStorage";
import * as tables from "@shared/models/tables";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const storage = new DbStorage();

const USER_ID = "45042981";
const WORKSPACE_ID = "28316667-26a4-4bd7-8cac-da697058ffc5";
const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

interface SeedResult {
  step: string;
  status: "ok" | "error";
  id?: string;
  details?: string;
}

const results: SeedResult[] = [];

function log(step: string, status: "ok" | "error", id?: string, details?: string) {
  results.push({ step, status, id, details });
  const icon = status === "ok" ? "✓" : "✗";
  console.log(`  ${icon} ${step}${id ? ` [${id}]` : ""}${details ? ` — ${details}` : ""}`);
}

async function seedTeamMembers() {
  console.log("\n═══ STEP 1: TEAM MEMBERS ═══");
  const members = [
    { firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@synergylaw.com", role: "partner", title: "Managing Partner", phone: "(801) 555-0101", barNumber: "UT-12345", practiceAreas: ["Family Law", "Estate Planning"] },
    { firstName: "David", lastName: "Chen", email: "david.chen@synergylaw.com", role: "associate", title: "Senior Associate", phone: "(801) 555-0102", barNumber: "UT-23456", practiceAreas: ["Personal Injury", "Medical Malpractice"] },
    { firstName: "Maria", lastName: "Rodriguez", email: "maria.rodriguez@synergylaw.com", role: "paralegal", title: "Lead Paralegal", phone: "(801) 555-0103", practiceAreas: ["Litigation Support", "Discovery"] },
    { firstName: "James", lastName: "Thompson", email: "james.thompson@synergylaw.com", role: "associate", title: "Associate Attorney", phone: "(801) 555-0104", barNumber: "UT-34567", practiceAreas: ["Criminal Defense", "DUI"] },
  ];

  const memberIds: string[] = [];
  for (const m of members) {
    try {
      const [existing] = await db.select().from(tables.teamMembers).where(eq(tables.teamMembers.email, m.email));
      if (existing) {
        memberIds.push(existing.id);
        log(`Team member ${m.firstName} ${m.lastName}`, "ok", existing.id, "already exists");
        continue;
      }
      const [created] = await db.insert(tables.teamMembers).values({
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        role: m.role,
        title: m.title,
        phone: m.phone,
        barNumber: m.barNumber || null,
        practiceAreas: m.practiceAreas,
        status: "active",
      }).returning();
      memberIds.push(created.id);
      log(`Team member ${m.firstName} ${m.lastName}`, "ok", created.id);
    } catch (e: any) {
      log(`Team member ${m.firstName} ${m.lastName}`, "error", undefined, e.message);
    }
  }
  return memberIds;
}

async function seedClients() {
  console.log("\n═══ STEP 2: CLIENTS ═══");
  const clientsData = [
    {
      name: "Margaret Wilson",
      email: "margaret.wilson@email.com",
      phone: "(801) 555-2001",
      company: "",
      address: "1847 Pioneer Trail, Salt Lake City, UT 84101",
      notes: "Referred by Judge Henderson. Long-term family law client. Divorced, 2 minor children. Primary custody dispute ongoing.",
    },
    {
      name: "Ridgeline Construction LLC",
      email: "legal@ridgelineconstruction.com",
      phone: "(801) 555-3001",
      company: "Ridgeline Construction LLC",
      address: "4500 Wasatch Blvd, Suite 200, Sandy, UT 84092",
      notes: "Commercial client. Multiple construction defect claims. President: Robert Harmon. General counsel on retainer. Trust account funded.",
    },
    {
      name: "Dr. Amanda Foster",
      email: "amanda.foster@uofuhealth.edu",
      phone: "(801) 555-4001",
      company: "University of Utah Health",
      address: "50 N Medical Drive, Salt Lake City, UT 84132",
      notes: "Medical malpractice defense. Board-certified orthopedic surgeon. Case involves alleged surgical error during knee replacement. Malpractice insurance carrier: UMIA.",
    },
  ];

  const clientIds: string[] = [];
  for (const c of clientsData) {
    try {
      const client = await storage.createClient(c);
      clientIds.push(client.id);
      log(`Client: ${c.name}`, "ok", client.id);
    } catch (e: any) {
      log(`Client: ${c.name}`, "error", undefined, e.message);
    }
  }
  return clientIds;
}

async function seedMattersAndBoards(clientIds: string[], teamMemberIds: string[]) {
  console.log("\n═══ STEP 3: MATTERS + AUTO-CREATED BOARDS ═══");

  const mattersData = [
    {
      clientId: clientIds[0],
      name: "Wilson v. Wilson - Custody Modification",
      caseNumber: "CASE-240301-CUST",
      matterType: "Family Law",
      status: "active" as const,
      description: "Petition to modify custody arrangement. Father (Mark Wilson) seeking increased visitation. Mother (Margaret Wilson, our client) opposing based on father's relocation to Park City and irregular visitation history. Two minor children: Emma (age 12) and Noah (age 9). GAL appointed: Rachel Torres. Evaluator report expected by March 2026.",
      openedDate: oneMonthAgo,
      practiceArea: "Family Law",
      courtName: "Third District Court, Salt Lake County",
      judgeAssigned: "Hon. Patricia Reyes",
      opposingCounsel: "Mark Patterson, Patterson & Associates",
      assignedAttorneys: teamMemberIds.length > 0 ? [teamMemberIds[0]] : [],
      assignedParalegals: teamMemberIds.length > 2 ? [teamMemberIds[2]] : [],
    },
    {
      clientId: clientIds[1],
      name: "Ridgeline v. Apex Plumbing - Construction Defect",
      caseNumber: "CASE-240215-CONST",
      matterType: "Construction Litigation",
      status: "active" as const,
      description: "Construction defect claim against Apex Plumbing for faulty pipe installation in Ridgeline's Cottonwood Heights development (128 units). Water damage discovered in 34 units. Expert reports from Enviro-Tech Engineering documenting $2.4M in damages. Apex's insurer: Liberty Mutual. Mediation scheduled for March 2026.",
      openedDate: twoWeeksAgo,
      practiceArea: "Construction Law",
      courtName: "Third District Court, Salt Lake County",
      judgeAssigned: "Hon. Michael Connors",
      opposingCounsel: "Jennifer Blake, Blake & Associates",
      assignedAttorneys: teamMemberIds.length > 1 ? [teamMemberIds[1]] : [],
      assignedParalegals: teamMemberIds.length > 2 ? [teamMemberIds[2]] : [],
    },
    {
      clientId: clientIds[2],
      name: "Foster - Medical Malpractice Defense",
      caseNumber: "CASE-240201-MED",
      matterType: "Medical Malpractice",
      status: "active" as const,
      description: "Defense of Dr. Amanda Foster in medical malpractice suit brought by plaintiff Thomas Garrett. Alleges negligence during left knee replacement surgery on 01/15/2025. Plaintiff claims improper prosthetic alignment led to chronic pain and inability to work. UMIA insurance limit: $1M per occurrence. Expert retained: Dr. William Park (orthopedic biomechanics).",
      openedDate: oneMonthAgo,
      practiceArea: "Medical Malpractice",
      courtName: "United States District Court, District of Utah",
      judgeAssigned: "Hon. David Barlow",
      opposingCounsel: "Richard Crane, Crane Legal Group",
      assignedAttorneys: teamMemberIds.length > 1 ? [teamMemberIds[1]] : [],
    },
  ];

  const matterIds: string[] = [];
  const boardIds: string[] = [];

  for (const m of mattersData) {
    try {
      const matter = await storage.createMatter(m);
      matterIds.push(matter.id);

      const masterBoard = await storage.createBoard({
        name: m.name,
        description: `Case board for ${m.name} | Opened: ${m.openedDate}`,
        color: "#6366f1",
        icon: "briefcase",
        clientId: m.clientId,
        matterId: matter.id,
        workspaceId: WORKSPACE_ID,
      });
      boardIds.push(masterBoard.id);

      const linkedNames = [`${m.name} - Filings`, `${m.name} - Discovery`, `${m.name} - Motions`, `${m.name} - Deadlines`, `${m.name} - Evidence/Docs`];
      const linkedColors = ["#3b82f6", "#8b5cf6", "#ef4444", "#f59e0b", "#10b981"];
      for (let i = 0; i < linkedNames.length; i++) {
        await storage.createBoard({
          name: linkedNames[i],
          description: `${linkedNames[i]} board for ${m.name}`,
          color: linkedColors[i],
          icon: "file-text",
          clientId: m.clientId,
          matterId: matter.id,
          workspaceId: WORKSPACE_ID,
        });
      }

      const [group] = await db.insert(tables.groups).values({
        title: "Onboarding Tasks",
        color: "#6366f1",
        boardId: masterBoard.id,
        order: 0,
      }).returning();

      const onboardingTasks = [
        { title: "Confirm service date", priority: "high" as const, status: "done" as const },
        { title: "Check for scheduling order", priority: "high" as const, status: "working-on-it" as const },
        { title: "Set discovery plan / disclosures deadline", priority: "medium" as const, status: "not-started" as const },
        { title: "Review opposing counsel filings", priority: "medium" as const, status: "not-started" as const },
        { title: "Upload initial case documents", priority: "medium" as const, status: "not-started" as const },
      ];

      for (const t of onboardingTasks) {
        await storage.createTask({
          title: t.title,
          status: t.status,
          priority: t.priority,
          boardId: masterBoard.id,
          groupId: group.id,
          dueDate: nextWeek,
        });
      }

      log(`Matter: ${m.name}`, "ok", matter.id, `board=${masterBoard.id}, +5 linked boards, +5 tasks`);
    } catch (e: any) {
      log(`Matter: ${m.name}`, "error", undefined, e.message);
    }
  }
  return { matterIds, boardIds };
}

async function seedContacts(matterIds: string[]) {
  console.log("\n═══ STEP 4: MATTER CONTACTS ═══");
  const contactsData = [
    { matterId: matterIds[0], name: "Mark Wilson", role: "defendant" as const, email: "mark.wilson@email.com", phone: "(801) 555-2050", notes: "Opposing party. Father seeking custody modification. Relocated to Park City in Nov 2025." },
    { matterId: matterIds[0], name: "Rachel Torres", role: "other" as const, email: "rtorres@utahgal.org", phone: "(801) 555-2060", company: "Utah GAL Program", notes: "Guardian Ad Litem for minor children Emma and Noah Wilson." },
    { matterId: matterIds[0], name: "Hon. Patricia Reyes", role: "judge" as const, company: "Third District Court", notes: "Presiding judge. Known for favoring mediation in custody disputes." },
    { matterId: matterIds[0], name: "Mark Patterson", role: "opposing-counsel" as const, email: "mpatterson@pattersonlaw.com", phone: "(801) 555-2070", company: "Patterson & Associates" },

    { matterId: matterIds[1], name: "Robert Harmon", role: "client" as const, email: "rharmon@ridgelineconstruction.com", phone: "(801) 555-3010", company: "Ridgeline Construction LLC", notes: "President of Ridgeline. Primary POC." },
    { matterId: matterIds[1], name: "Jennifer Blake", role: "opposing-counsel" as const, email: "jblake@blakelaw.com", phone: "(801) 555-3020", company: "Blake & Associates", notes: "Experienced construction litigation attorney." },
    { matterId: matterIds[1], name: "Dr. Steven Marsh", role: "expert" as const, email: "smarsh@envirotecheng.com", phone: "(801) 555-3030", company: "Enviro-Tech Engineering", notes: "Expert witness. Prepared damage assessment report documenting $2.4M in damages." },

    { matterId: matterIds[2], name: "Thomas Garrett", role: "plaintiff" as const, email: "tgarrett@email.com", phone: "(801) 555-4010", notes: "Plaintiff. 52-year-old construction worker. Claims inability to return to work." },
    { matterId: matterIds[2], name: "Richard Crane", role: "opposing-counsel" as const, email: "rcrane@cranelegal.com", phone: "(801) 555-4020", company: "Crane Legal Group" },
    { matterId: matterIds[2], name: "Dr. William Park", role: "expert" as const, email: "wpark@biomechanics.com", phone: "(801) 555-4030", company: "Park Biomechanics Lab", notes: "Defense expert. Board-certified in orthopedic biomechanics. Retained to review surgical technique." },
  ];

  for (const c of contactsData) {
    try {
      const contact = await storage.createMatterContact(c);
      log(`Contact: ${c.name} (${c.role})`, "ok", contact.id, `matter=${c.matterId.slice(0, 8)}...`);
    } catch (e: any) {
      log(`Contact: ${c.name}`, "error", undefined, e.message);
    }
  }
}

async function seedTimeEntries(matterIds: string[], clientIds: string[]) {
  console.log("\n═══ STEP 5: TIME ENTRIES ═══");
  const entries = [
    { matterId: matterIds[0], userId: USER_ID, userName: "Sarah Mitchell", date: lastWeek, hours: 2.5, description: "Reviewed custody modification petition and prepared initial response strategy. Analyzed father's relocation timeline.", billableStatus: "billable" as const, hourlyRate: 350, activityCode: "L120" },
    { matterId: matterIds[0], userId: USER_ID, userName: "Sarah Mitchell", date: yesterday, hours: 1.5, description: "Telephone conference with GAL Rachel Torres re: children's preferences and school performance.", billableStatus: "billable" as const, hourlyRate: 350, activityCode: "L140" },
    { matterId: matterIds[0], userId: USER_ID, userName: "Maria Rodriguez", date: today, hours: 3.0, description: "Gathered and organized school records, extracurricular activity logs, and medical records for Emma and Noah Wilson.", billableStatus: "billable" as const, hourlyRate: 175, activityCode: "L310" },

    { matterId: matterIds[1], userId: USER_ID, userName: "David Chen", date: twoWeeksAgo, hours: 4.0, description: "Reviewed Enviro-Tech Engineering damage assessment report (147 pages). Identified 12 key deficiency categories in plumbing installation.", billableStatus: "billable" as const, hourlyRate: 300, activityCode: "L210" },
    { matterId: matterIds[1], userId: USER_ID, userName: "David Chen", date: lastWeek, hours: 2.0, description: "Drafted initial discovery requests: 28 interrogatories and 15 document production requests targeting Apex Plumbing work records.", billableStatus: "billable" as const, hourlyRate: 300, activityCode: "L220" },
    { matterId: matterIds[1], userId: USER_ID, userName: "Maria Rodriguez", date: yesterday, hours: 5.0, description: "Organized construction photos (340 images), building permits, and inspection reports for Cottonwood Heights development.", billableStatus: "billable" as const, hourlyRate: 175, activityCode: "L310" },

    { matterId: matterIds[2], userId: USER_ID, userName: "David Chen", date: oneMonthAgo, hours: 3.0, description: "Initial review of medical records and surgical notes from Dr. Foster's knee replacement procedure on Thomas Garrett.", billableStatus: "billable" as const, hourlyRate: 300, activityCode: "L210" },
    { matterId: matterIds[2], userId: USER_ID, userName: "David Chen", date: lastWeek, hours: 2.5, description: "Conference with Dr. William Park (biomechanics expert) to discuss prosthetic alignment standards and review imaging.", billableStatus: "billable" as const, hourlyRate: 300, activityCode: "L140" },
    { matterId: matterIds[2], userId: USER_ID, userName: "Sarah Mitchell", date: today, hours: 1.0, description: "Reviewed UMIA coverage terms and reported case status to claims adjuster Karen Liu.", billableStatus: "non-billable" as const, hourlyRate: 0, activityCode: "A106" },
  ];

  for (const e of entries) {
    try {
      const entry = await storage.createTimeEntry(e);
      await storage.createTimelineEvent({
        matterId: e.matterId,
        eventType: "custom",
        title: `Time Entry: ${e.description.slice(0, 60)}...`,
        description: `${e.hours}h ${e.billableStatus === "billable" ? `(billable @ $${e.hourlyRate}/hr)` : "(non-billable)"} by ${e.userName}`,
        createdBy: e.userId,
        eventDate: e.date,
      });
      log(`Time entry: ${e.hours}h - ${e.description.slice(0, 50)}...`, "ok", entry.id);
    } catch (e2: any) {
      log(`Time entry: ${e.description.slice(0, 50)}...`, "error", undefined, e2.message);
    }
  }
}

async function seedExpenses(matterIds: string[], clientIds: string[]) {
  console.log("\n═══ STEP 6: EXPENSES ═══");
  const expensesData = [
    { matterId: matterIds[0], clientId: clientIds[0], date: lastWeek, amount: 350, description: "Court filing fee - Petition to Modify Custody", category: "filing-fees" as const, createdBy: USER_ID },
    { matterId: matterIds[0], clientId: clientIds[0], date: yesterday, amount: 125, description: "Process server - Service of petition on Mark Wilson", category: "process-serving" as const, createdBy: USER_ID },
    { matterId: matterIds[1], clientId: clientIds[1], date: twoWeeksAgo, amount: 8500, description: "Expert witness fee - Enviro-Tech Engineering damage assessment", category: "expert-witness" as const, createdBy: USER_ID },
    { matterId: matterIds[1], clientId: clientIds[1], date: lastWeek, amount: 450, description: "Copying and binding - Construction photos and inspection reports", category: "copying" as const, createdBy: USER_ID },
    { matterId: matterIds[2], clientId: clientIds[2], date: lastWeek, amount: 5000, description: "Expert retention fee - Dr. William Park biomechanics review", category: "expert-witness" as const, createdBy: USER_ID },
    { matterId: matterIds[2], clientId: clientIds[2], date: yesterday, amount: 275, description: "Medical records retrieval - U of U Health and IHC records", category: "copying" as const, createdBy: USER_ID },
  ];

  for (const exp of expensesData) {
    try {
      const expense = await storage.createExpense(exp);
      log(`Expense: $${exp.amount} - ${exp.description.slice(0, 50)}...`, "ok", expense.id);
    } catch (e: any) {
      log(`Expense: ${exp.description.slice(0, 50)}...`, "error", undefined, e.message);
    }
  }
}

async function seedInvoicesAndPayments(matterIds: string[], clientIds: string[]) {
  console.log("\n═══ STEP 7: INVOICES + PAYMENTS ═══");

  const invoiceData = [
    {
      clientId: clientIds[0],
      matterId: matterIds[0],
      issueDate: lastWeek,
      dueDate: twoWeeks,
      status: "sent" as const,
      lineItems: [
        { id: "li-1", type: "time" as const, description: "Legal services - Custody modification (S. Mitchell, 2.5h @ $350)", quantity: 2.5, rate: 350, amount: 875 },
        { id: "li-2", type: "time" as const, description: "Legal services - GAL conference (S. Mitchell, 1.5h @ $350)", quantity: 1.5, rate: 350, amount: 525 },
        { id: "li-3", type: "expense" as const, description: "Court filing fee", quantity: 1, rate: 350, amount: 350 },
        { id: "li-4", type: "expense" as const, description: "Process server", quantity: 1, rate: 125, amount: 125 },
      ],
      subtotal: 1875,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 1875,
      paidAmount: 0,
      balanceDue: 1875,
      notes: "Payment due within 30 days. Please reference invoice number when remitting.",
      createdBy: USER_ID,
    },
    {
      clientId: clientIds[1],
      matterId: matterIds[1],
      issueDate: yesterday,
      dueDate: nextWeek,
      status: "draft" as const,
      lineItems: [
        { id: "li-5", type: "time" as const, description: "Legal services - Document review (D. Chen, 4h @ $300)", quantity: 4, rate: 300, amount: 1200 },
        { id: "li-6", type: "time" as const, description: "Legal services - Discovery drafting (D. Chen, 2h @ $300)", quantity: 2, rate: 300, amount: 600 },
        { id: "li-7", type: "time" as const, description: "Paralegal services - Document organization (M. Rodriguez, 5h @ $175)", quantity: 5, rate: 175, amount: 875 },
        { id: "li-8", type: "expense" as const, description: "Expert witness fee - Enviro-Tech", quantity: 1, rate: 8500, amount: 8500 },
        { id: "li-9", type: "expense" as const, description: "Copying and binding", quantity: 1, rate: 450, amount: 450 },
      ],
      subtotal: 11625,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 11625,
      paidAmount: 0,
      balanceDue: 11625,
      notes: "Net 30 terms. Includes expert witness fees for Enviro-Tech Engineering.",
      createdBy: USER_ID,
    },
  ];

  const invoiceIds: string[] = [];
  for (const inv of invoiceData) {
    try {
      const invoice = await storage.createInvoice(inv);
      invoiceIds.push(invoice.id);
      log(`Invoice: $${inv.totalAmount} for ${inv.clientId.slice(0, 8)}...`, "ok", invoice.id, `status=${inv.status}`);
    } catch (e: any) {
      log(`Invoice`, "error", undefined, e.message);
    }
  }

  if (invoiceIds.length > 0) {
    try {
      const payment = await storage.createPayment({
        invoiceId: invoiceIds[0],
        clientId: clientIds[0],
        date: today,
        amount: 500,
        method: "check" as const,
        reference: "Check #4521",
        notes: "Partial payment - custody case retainer",
        createdBy: USER_ID,
      });
      log(`Payment: $500 on Invoice ${invoiceIds[0].slice(0, 8)}...`, "ok", payment.id);
    } catch (e: any) {
      log(`Payment`, "error", undefined, e.message);
    }
  }
}

async function seedTrustTransactions(clientIds: string[], matterIds: string[]) {
  console.log("\n═══ STEP 8: TRUST ACCOUNT TRANSACTIONS ═══");
  const trustData = [
    { clientId: clientIds[0], matterId: matterIds[0], date: oneMonthAgo, amount: 5000, type: "deposit" as const, description: "Initial retainer deposit - Wilson custody modification", reference: "Wire transfer #TRF-9922", runningBalance: 5000, createdBy: USER_ID },
    { clientId: clientIds[0], matterId: matterIds[0], date: lastWeek, amount: -350, type: "withdrawal" as const, description: "Court filing fee payment from trust", reference: "Trust withdrawal #TW-001", runningBalance: 4650, createdBy: USER_ID },
    { clientId: clientIds[1], matterId: matterIds[1], date: twoWeeksAgo, amount: 25000, type: "deposit" as const, description: "Initial retainer deposit - Ridgeline construction defect case", reference: "Wire #WRLR-2024-001", runningBalance: 25000, createdBy: USER_ID },
    { clientId: clientIds[1], matterId: matterIds[1], date: lastWeek, amount: -8500, type: "withdrawal" as const, description: "Expert witness fee - Enviro-Tech Engineering", reference: "Trust withdrawal #TW-002", runningBalance: 16500, createdBy: USER_ID },
  ];

  for (const t of trustData) {
    try {
      const tx = await storage.createTrustTransaction(t);
      log(`Trust: ${t.amount > 0 ? "+" : ""}$${t.amount} - ${t.description.slice(0, 50)}...`, "ok", tx.id);
    } catch (e: any) {
      log(`Trust transaction`, "error", undefined, e.message);
    }
  }
}

async function seedEvidenceVault(matterIds: string[]) {
  console.log("\n═══ STEP 9: EVIDENCE VAULT FILES ═══");
  const evidenceData = [
    { matterId: matterIds[0], originalName: "Wilson_CustodyPetition_2024.pdf", originalUrl: "/evidence/wilson_petition.pdf", originalSize: 245000, originalMimeType: "application/pdf", evidenceType: "document" as const, confidentiality: "confidential" as const, description: "Original petition to modify custody filed by Mark Wilson. Includes proposed parenting plan with 50/50 time-sharing.", tags: ["petition", "custody", "filed"], uploadedBy: USER_ID },
    { matterId: matterIds[0], originalName: "Wilson_SchoolRecords_Emma.pdf", originalUrl: "/evidence/wilson_school_emma.pdf", originalSize: 180000, originalMimeType: "application/pdf", evidenceType: "document" as const, confidentiality: "confidential" as const, description: "Emma Wilson (age 12) school records from Wasatch Elementary. Grades, attendance, teacher comments showing stability in current school.", tags: ["school-records", "emma", "exhibit"], uploadedBy: USER_ID },
    { matterId: matterIds[1], originalName: "EnviroTech_DamageReport_v3.pdf", originalUrl: "/evidence/envirotech_report.pdf", originalSize: 5200000, originalMimeType: "application/pdf", evidenceType: "document" as const, confidentiality: "work-product" as const, description: "Enviro-Tech Engineering comprehensive damage assessment. 147 pages covering 34 affected units. Details pipe installation defects, water intrusion patterns, and repair cost estimates totaling $2.4M.", tags: ["expert-report", "damages", "key-evidence"], uploadedBy: USER_ID },
    { matterId: matterIds[1], originalName: "CottonwoodHeights_Unit_14B_WaterDamage.jpg", originalUrl: "/evidence/unit14b_photo.jpg", originalSize: 3400000, originalMimeType: "image/jpeg", evidenceType: "photo" as const, confidentiality: "confidential" as const, description: "Photo of water damage in Unit 14B showing mold growth behind drywall caused by failed pipe joint.", tags: ["photo", "damage", "unit-14b"], uploadedBy: USER_ID },
    { matterId: matterIds[2], originalName: "Garrett_SurgicalNotes_20250115.pdf", originalUrl: "/evidence/garrett_surgical_notes.pdf", originalSize: 890000, originalMimeType: "application/pdf", evidenceType: "document" as const, confidentiality: "privileged" as const, description: "Dr. Foster's surgical notes from Thomas Garrett's left knee replacement surgery on 01/15/2025. Details prosthetic model, alignment measurements, and post-op observations.", tags: ["surgical-notes", "medical-records", "key-evidence"], uploadedBy: USER_ID },
    { matterId: matterIds[2], originalName: "Garrett_PostOp_Xray_Series.dcm", originalUrl: "/evidence/garrett_xrays.dcm", originalSize: 12500000, originalMimeType: "application/dicom", evidenceType: "other" as const, confidentiality: "confidential" as const, description: "Post-operative X-ray series showing prosthetic placement. To be reviewed by Dr. Park for alignment analysis.", tags: ["imaging", "x-ray", "expert-review"], uploadedBy: USER_ID },
  ];

  for (const ev of evidenceData) {
    try {
      const hash = sha256(ev.originalName + ev.originalUrl);
      const file = await storage.createEvidenceVaultFile({ ...ev, originalHash: hash });
      log(`Evidence: ${ev.originalName}`, "ok", file.id, `${ev.evidenceType}, ${ev.confidentiality}`);
    } catch (e: any) {
      log(`Evidence: ${ev.originalName}`, "error", undefined, e.message);
    }
  }
}

async function seedCalendarEvents(matterIds: string[]) {
  console.log("\n═══ STEP 10: CALENDAR EVENTS ═══");
  const calEvents = [
    { matterId: matterIds[0], title: "Wilson Custody Hearing - Temporary Orders", eventType: "hearing" as const, startDate: twoWeeks, endDate: twoWeeks, location: "Third District Court, Courtroom 304", description: "Hearing on temporary custody orders pending final resolution. Judge Reyes presiding.", createdBy: USER_ID, color: "#ef4444" },
    { matterId: matterIds[0], title: "GAL Interview - Emma & Noah Wilson", eventType: "meeting" as const, startDate: nextWeek, description: "GAL Rachel Torres meeting with children at Wasatch Elementary counselor's office.", createdBy: USER_ID, color: "#3b82f6" },
    { matterId: matterIds[0], title: "Discovery Deadline - Wilson v. Wilson", eventType: "deadline" as const, startDate: twoWeeks, allDay: true, description: "Deadline for initial disclosures per URCP 26(a).", createdBy: USER_ID, color: "#f59e0b" },
    { matterId: matterIds[1], title: "Mediation - Ridgeline v. Apex Plumbing", eventType: "meeting" as const, startDate: twoWeeks, location: "Utah Dispute Resolution, 645 S 200 E, SLC", description: "Court-ordered mediation session. Mediator: Judge (Ret.) Clark Thompson.", createdBy: USER_ID, color: "#8b5cf6" },
    { matterId: matterIds[1], title: "Expert Deposition - Dr. Steven Marsh", eventType: "deposition" as const, startDate: nextWeek, location: "Blake & Associates Office", description: "Deposition of plaintiff's expert Dr. Steven Marsh regarding damage assessment.", createdBy: USER_ID, color: "#f97316" },
    { matterId: matterIds[2], title: "Answer Deadline - Garrett v. Foster", eventType: "deadline" as const, startDate: tomorrow, allDay: true, description: "Deadline to file Answer to Complaint. FRCP 12(a)(1)(A).", createdBy: USER_ID, color: "#ef4444" },
    { matterId: matterIds[2], title: "IME - Thomas Garrett", eventType: "meeting" as const, startDate: twoWeeks, location: "Park Biomechanics Lab, 100 Mario Capecchi Dr", description: "Independent medical examination of plaintiff by Dr. William Park.", createdBy: USER_ID, color: "#10b981" },
  ];

  for (const ev of calEvents) {
    try {
      const event = await storage.createCalendarEvent(ev);
      log(`Calendar: ${ev.title}`, "ok", event.id, `${ev.eventType} on ${ev.startDate}`);
    } catch (e: any) {
      log(`Calendar: ${ev.title}`, "error", undefined, e.message);
    }
  }
}

async function seedMeetings(matterIds: string[]) {
  console.log("\n═══ STEP 11: MEETINGS ═══");
  const meetingsData = [
    {
      title: "Wilson Case Strategy Session",
      date: yesterday,
      matterId: matterIds[0],
      duration: 60,
      status: "completed" as const,
      participants: ["Sarah Mitchell", "Maria Rodriguez"],
      summary: "Reviewed custody petition and developed response strategy. Key points: 1) Father's inconsistent visitation history strengthens our position, 2) Children's school stability in SLC vs. Park City commute is compelling, 3) GAL report expected to favor status quo arrangement.",
      mainPoints: [
        "Mark Wilson's Park City relocation creates 45-min commute to children's school",
        "Emma (12) has expressed preference to stay with mother per school counselor",
        "Father missed 8 of last 20 scheduled visitation weekends",
        "GAL Torres meeting with children next week - prepare talking points",
      ],
      actionItems: [
        { text: "Prepare visitation log exhibit showing missed visits", assignee: "Maria Rodriguez", dueDate: nextWeek, completed: false },
        { text: "Draft declaration from school counselor", assignee: "Sarah Mitchell", dueDate: nextWeek, completed: false },
        { text: "Request father's new employment records", assignee: "Maria Rodriguez", dueDate: twoWeeks, completed: false },
      ],
      tags: ["strategy", "custody", "wilson"],
      createdBy: USER_ID,
    },
    {
      title: "Ridgeline Expert Review Meeting",
      date: lastWeek,
      matterId: matterIds[1],
      duration: 90,
      status: "completed" as const,
      participants: ["David Chen", "Maria Rodriguez", "Dr. Steven Marsh"],
      summary: "Reviewed Enviro-Tech damage report with expert. Key findings: systemic failure in soldered pipe joints affecting floors 2-5. Chain of causation clear from building permit records showing Apex was sole plumbing contractor. Recommended additional testing of 12 units not yet inspected.",
      mainPoints: [
        "Damage concentrated on floors 2-5 where Apex installed copper piping",
        "Failed solder joints identified in 34 of 128 units - likely more affected",
        "Building permit records confirm Apex as sole plumbing subcontractor",
        "Repair estimate: $2.4M does not include resident displacement costs",
      ],
      actionItems: [
        { text: "Request inspection of remaining 94 units", assignee: "David Chen", dueDate: nextWeek, completed: false },
        { text: "Subpoena Apex Plumbing work orders and quality control records", assignee: "Maria Rodriguez", dueDate: twoWeeks, completed: false },
      ],
      tags: ["expert-review", "construction", "damages"],
      createdBy: USER_ID,
    },
  ];

  for (const m of meetingsData) {
    try {
      const meeting = await storage.createMeeting(m);
      log(`Meeting: ${m.title}`, "ok", meeting.id, `${m.status}, ${m.duration}min`);
    } catch (e: any) {
      log(`Meeting: ${m.title}`, "error", undefined, e.message);
    }
  }
}

async function seedTimelineEvents(matterIds: string[]) {
  console.log("\n═══ STEP 12: TIMELINE EVENTS ═══");
  const events = [
    { matterId: matterIds[0], eventType: "filing_submitted" as const, title: "Petition to Modify Custody Filed", description: "Mark Wilson filed petition to modify custody arrangement citing relocation and changed circumstances.", createdBy: USER_ID, eventDate: oneMonthAgo },
    { matterId: matterIds[0], eventType: "contact_added" as const, title: "GAL Rachel Torres Appointed", description: "Court appointed Rachel Torres as Guardian Ad Litem for minor children Emma and Noah Wilson.", createdBy: USER_ID, eventDate: twoWeeksAgo },
    { matterId: matterIds[0], eventType: "meeting_scheduled" as const, title: "Strategy Session Scheduled", description: "Internal case strategy meeting scheduled with Sarah Mitchell and Maria Rodriguez.", createdBy: USER_ID, eventDate: lastWeek },
    { matterId: matterIds[1], eventType: "file_uploaded" as const, title: "Expert Damage Report Received", description: "Enviro-Tech Engineering delivered 147-page damage assessment report for Cottonwood Heights development.", createdBy: USER_ID, eventDate: twoWeeksAgo },
    { matterId: matterIds[1], eventType: "discovery_request" as const, title: "Initial Discovery Requests Drafted", description: "28 interrogatories and 15 document production requests drafted targeting Apex Plumbing.", createdBy: USER_ID, eventDate: lastWeek },
    { matterId: matterIds[2], eventType: "filing_submitted" as const, title: "Complaint Filed - Garrett v. Foster", description: "Plaintiff Thomas Garrett filed medical malpractice complaint in USDC District of Utah.", createdBy: USER_ID, eventDate: oneMonthAgo },
    { matterId: matterIds[2], eventType: "research_added" as const, title: "Expert Retained - Dr. William Park", description: "Retained Dr. William Park (orthopedic biomechanics) as defense expert to review surgical technique and prosthetic alignment.", createdBy: USER_ID, eventDate: twoWeeksAgo },
  ];

  for (const ev of events) {
    try {
      const event = await storage.createTimelineEvent(ev);
      log(`Timeline: ${ev.title}`, "ok", event.id, ev.eventType);
    } catch (e: any) {
      log(`Timeline: ${ev.title}`, "error", undefined, e.message);
    }
  }
}

async function seedThreads(matterIds: string[]) {
  console.log("\n═══ STEP 13: DISCUSSION THREADS ═══");
  const threadsData = [
    {
      matterId: matterIds[0],
      subject: "Wilson Custody - GAL Coordination",
      priority: "high" as const,
      createdBy: USER_ID,
      messages: [
        { senderId: USER_ID, senderName: "Sarah Mitchell", content: "GAL Torres has requested to interview both children separately at school. She wants to observe them in their daily environment. I've confirmed this is a standard approach and agreed to facilitate. We should prepare Margaret for what to expect." },
        { senderId: USER_ID, senderName: "Maria Rodriguez", content: "I've pulled Emma's and Noah's school records. Both are performing well academically (Emma: 3.8 GPA, Noah: all A's and B's). Their teachers note stable behavior and good peer relationships. This supports our position that the current arrangement is working." },
      ],
    },
    {
      matterId: matterIds[1],
      subject: "Ridgeline - Mediation Strategy",
      priority: "medium" as const,
      createdBy: USER_ID,
      messages: [
        { senderId: USER_ID, senderName: "David Chen", content: "Mediation with Judge Thompson is in two weeks. I recommend we prepare a settlement demand at $3.2M ($2.4M damages + $800K displacement and business interruption). This gives us room to negotiate down to our actual target of $2.6-2.8M." },
        { senderId: USER_ID, senderName: "Maria Rodriguez", content: "I've compiled the damage timeline showing when each unit was affected and the progression of water intrusion. This visual will be powerful in mediation. I'll have the exhibit boards ready by next week." },
      ],
    },
  ];

  for (const t of threadsData) {
    try {
      const thread = await storage.createThread({
        matterId: t.matterId,
        subject: t.subject,
        priority: t.priority,
        createdBy: t.createdBy,
        linkedFiles: [],
      });
      for (const msg of t.messages) {
        await storage.createThreadMessage({
          threadId: thread.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
        });
      }
      log(`Thread: ${t.subject}`, "ok", thread.id, `+${t.messages.length} messages`);
    } catch (e: any) {
      log(`Thread: ${t.subject}`, "error", undefined, e.message);
    }
  }
}

async function seedAIConversations(matterIds: string[]) {
  console.log("\n═══ STEP 14: AI CONVERSATIONS ═══");
  const convos = [
    {
      title: "Wilson Custody Research - Utah Relocation Standards",
      provider: "anthropic" as const,
      model: "claude-sonnet-4-5",
      matterId: matterIds[0],
      messages: [
        { role: "user" as const, content: "What are the Utah legal standards for modifying custody when a parent relocates? I need to understand the burden of proof and what factors the court considers, specifically under Utah Code § 30-3-37." },
        { role: "assistant" as const, content: "Under Utah law, custody modification due to relocation is governed by Utah Code § 30-3-37 (Relocation statute) and the general modification standards in § 30-3-10.4.\n\n**Key Standards:**\n\n1. **Material Change in Circumstances**: The relocating parent must demonstrate a material and substantial change in circumstances since the last custody order. Relocation alone may constitute such a change (Hudema v. Carpenter, 1999).\n\n2. **Best Interests Analysis**: The court applies the best interests of the child standard under § 30-3-10, considering:\n   - The child's wishes (if sufficiently mature)\n   - The quality of the relationship with each parent\n   - Stability of the child's current environment\n   - Each parent's ability to encourage a relationship with the other parent\n   - The distance of the relocation\n\n3. **150-Mile Rule**: Under § 30-3-37, a parent must provide 60 days' written notice before relocating more than 150 miles from the other parent.\n\n4. **Burden of Proof**: The parent seeking modification bears the burden of proving both a material change and that modification serves the child's best interests.\n\n**Relevant Case Law:**\n- *Hudema v. Carpenter* (1999 UT App): Established that relocation is a significant factor but not determinative.\n- *Becker v. Becker* (2006 UT App): Court emphasized impact on child's school and community ties.\n- *Zavala v. Zavala* (2016 UT App): Highlighted importance of the non-relocating parent's involvement.\n\nFor your case, since the father relocated to Park City (approximately 30 miles from SLC), this is within the 150-mile threshold but may still constitute a material change if it significantly impacts the existing custody arrangement." },
      ],
    },
    {
      title: "Construction Defect - Statute of Limitations Analysis",
      provider: "anthropic" as const,
      model: "claude-sonnet-4-5",
      matterId: matterIds[1],
      messages: [
        { role: "user" as const, content: "Analyze the statute of limitations for construction defect claims in Utah. Our client discovered plumbing defects in November 2025. The construction was completed in March 2022." },
        { role: "assistant" as const, content: "**Utah Construction Defect Statute of Limitations Analysis**\n\nYour client's claim appears to be well within the applicable limitation periods:\n\n**1. Statute of Limitations - Utah Code § 78B-2-307(3)**\n- **6-year limitation** for construction defect claims from the date of discovery or when the defect should have been discovered.\n- Discovery date: November 2025\n- Deadline: November 2031\n- **Status: Well within the limitation period.**\n\n**2. Statute of Repose - Utah Code § 78B-2-225**\n- **6-year statute of repose** from the date of completion of construction.\n- Completion: March 2022\n- Repose deadline: March 2028\n- **Status: Within the repose period.**\n\n**3. Discovery Rule Application**\n- Utah applies the discovery rule to construction defect cases (*Matheson v. Stears*, 2002 UT App).\n- The statute begins to run when the plaintiff discovers or should have discovered the defect.\n- Water damage discovered November 2025 = discovery date.\n\n**4. Key Case Law**\n- *Davencourt at Pilgrims Landing HOA v. Davencourt* (2009 UT): Established that latent defects may not be discoverable until damage manifests.\n- *American Towers Owners Assoc. v. CCI Mechanical* (1996 UT): Hidden plumbing defects qualify as latent defects.\n\n**Conclusion**: Your claim is timely under both the statute of limitations and statute of repose. Filing within the next 2 years provides the most comfortable margin." },
      ],
    },
  ];

  for (const c of convos) {
    try {
      const convo = await storage.createAIConversation({
        title: c.title,
        provider: c.provider,
        model: c.model,
        matterId: c.matterId,
      });
      for (const msg of c.messages) {
        await storage.createAIMessage({
          conversationId: convo.id,
          role: msg.role,
          content: msg.content,
        });
      }
      log(`AI Conversation: ${c.title}`, "ok", convo.id, `+${c.messages.length} messages`);
    } catch (e: any) {
      log(`AI Conversation: ${c.title}`, "error", undefined, e.message);
    }
  }
}

async function seedEFilingData(matterIds: string[], boardIds: string[]) {
  console.log("\n═══ STEP 15: E-FILING (FILINGS, DEADLINES, ACTIONS) ═══");

  const filings = [
    {
      matterId: matterIds[0],
      originalFileName: "Petition_Modify_Custody_Wilson.pdf",
      filePath: "/uploads/efiling/petition-custody-wilson.pdf",
      docType: "Petition",
      docSubtype: "Petition to Modify Custody",
      docCategory: "pleading",
      filedDate: oneMonthAgo,
      servedDate: twoWeeksAgo,
      responseDeadlineAnchor: twoWeeksAgo,
      sourceType: "manual",
      sha256Hash: sha256("Wilson custody petition content"),
      status: "classified",
      classifiedBy: "ai",
      createdBy: USER_ID,
      classificationConfidence: 0.94,
    },
    {
      matterId: matterIds[0],
      originalFileName: "Scheduling_Order_Wilson.pdf",
      filePath: "/uploads/efiling/scheduling-order-wilson.pdf",
      docType: "Order",
      docSubtype: "Scheduling Order",
      docCategory: "order",
      filedDate: twoWeeksAgo,
      hearingDate: twoWeeks,
      sourceType: "manual",
      sha256Hash: sha256("Wilson scheduling order content"),
      status: "classified",
      classifiedBy: "ai",
      createdBy: USER_ID,
      classificationConfidence: 0.97,
    },
    {
      matterId: matterIds[1],
      originalFileName: "Complaint_Ridgeline_v_Apex.pdf",
      filePath: "/uploads/efiling/complaint-ridgeline-apex.pdf",
      docType: "Complaint",
      docSubtype: "Construction Defect Complaint",
      docCategory: "pleading",
      filedDate: twoWeeksAgo,
      servedDate: lastWeek,
      responseDeadlineAnchor: lastWeek,
      sourceType: "manual",
      sha256Hash: sha256("Ridgeline complaint content"),
      status: "classified",
      classifiedBy: "ai",
      createdBy: USER_ID,
      classificationConfidence: 0.92,
    },
    {
      matterId: matterIds[1],
      originalFileName: "Expert_Report_EnviroTech.pdf",
      filePath: "/uploads/efiling/expert-report-envirotech.pdf",
      docType: "Expert Report",
      docSubtype: "Damage Assessment",
      docCategory: "evidence",
      filedDate: lastWeek,
      sourceType: "upload",
      sha256Hash: sha256("EnviroTech expert report content"),
      status: "classified",
      classifiedBy: "ai",
      createdBy: USER_ID,
      classificationConfidence: 0.89,
    },
    {
      matterId: matterIds[2],
      originalFileName: "Complaint_Garrett_v_Foster.pdf",
      filePath: "/uploads/efiling/complaint-garrett-foster.pdf",
      docType: "Complaint",
      docSubtype: "Medical Malpractice Complaint",
      docCategory: "pleading",
      filedDate: oneMonthAgo,
      servedDate: twoWeeksAgo,
      responseDeadlineAnchor: twoWeeksAgo,
      sourceType: "manual",
      sha256Hash: sha256("Garrett complaint content"),
      status: "classified",
      classifiedBy: "ai",
      createdBy: USER_ID,
      classificationConfidence: 0.96,
    },
    {
      matterId: matterIds[2],
      originalFileName: "Subpoena_Medical_Records_Foster.pdf",
      filePath: "/uploads/efiling/subpoena-medical-records.pdf",
      docType: "Subpoena",
      docSubtype: "Medical Records",
      docCategory: "discovery",
      filedDate: lastWeek,
      sourceType: "manual",
      sha256Hash: sha256("Medical records subpoena content"),
      status: "classified",
      classifiedBy: "ai",
      createdBy: USER_ID,
      classificationConfidence: 0.91,
    },
  ];

  const filingIds: string[] = [];
  for (const f of filings) {
    try {
      const [created] = await db.insert(tables.caseFilings).values(f as any).returning();
      filingIds.push(created.id);
      log(`Filing: ${f.originalFileName}`, "ok", created.id, `${f.docType} in ${f.matterId.slice(0, 8)}...`);
    } catch (e: any) {
      log(`Filing: ${f.originalFileName}`, "error", undefined, e.message);
    }
  }

  const deadlines = [
    { matterId: matterIds[0], filingId: filingIds[0], title: "Answer to Custody Modification Petition", dueDate: tomorrow, criticality: "hard", ruleSource: "URCP 12(a)", status: "pending", requiredAction: "File Answer or responsive pleading" },
    { matterId: matterIds[0], filingId: filingIds[1], title: "Initial Disclosures Due - Wilson", dueDate: nextWeek, criticality: "hard", ruleSource: "URCP 26(a)(1)", status: "pending", requiredAction: "Serve initial disclosures on opposing counsel" },
    { matterId: matterIds[0], title: "GAL Report Deadline", dueDate: twoWeeks, criticality: "soft", ruleSource: "Court Order", status: "pending", requiredAction: "Follow up with GAL Torres for report" },
    { matterId: matterIds[1], filingId: filingIds[2], title: "Answer to Construction Defect Complaint", dueDate: nextWeek, criticality: "hard", ruleSource: "URCP 12(a)", status: "pending", requiredAction: "File Answer on behalf of Apex Plumbing" },
    { matterId: matterIds[1], title: "Discovery Cut-off - Ridgeline v. Apex", dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0], criticality: "hard", ruleSource: "Scheduling Order", status: "pending", requiredAction: "Complete all fact discovery" },
    { matterId: matterIds[2], filingId: filingIds[4], title: "Answer to Medical Malpractice Complaint", dueDate: tomorrow, criticality: "hard", ruleSource: "FRCP 12(a)(1)(A)", status: "pending", requiredAction: "File Answer or Motion to Dismiss" },
    { matterId: matterIds[2], title: "Expert Disclosure Deadline - Foster", dueDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0], criticality: "hard", ruleSource: "FRCP 26(a)(2)", status: "pending", requiredAction: "Disclose expert witnesses and reports" },
    { matterId: matterIds[2], title: "IME Completion Deadline", dueDate: twoWeeks, criticality: "soft", ruleSource: "FRCP 35", status: "pending", requiredAction: "Complete independent medical examination of plaintiff" },
  ];

  const deadlineIds: string[] = [];
  for (const d of deadlines) {
    try {
      const [created] = await db.insert(tables.caseDeadlines).values(d as any).returning();
      deadlineIds.push(created.id);
      log(`Deadline: ${d.title}`, "ok", created.id, `due ${d.dueDate}, ${d.criticality}`);
    } catch (e: any) {
      log(`Deadline: ${d.title}`, "error", undefined, e.message);
    }
  }

  const actions = [
    { matterId: matterIds[0], deadlineId: deadlineIds[0], title: "Draft Answer to Custody Petition", actionType: "draft_document", priority: "high", dueDate: today, status: "review", description: "Draft responsive pleading to father's custody modification petition" },
    { matterId: matterIds[0], deadlineId: deadlineIds[1], title: "Prepare Initial Disclosures Package", actionType: "prepare_disclosure", priority: "high", dueDate: nextWeek, status: "draft", description: "Compile initial disclosures including witness list and document inventory" },
    { matterId: matterIds[0], title: "Request School Attendance Records", actionType: "discovery_request", priority: "medium", dueDate: nextWeek, status: "draft", description: "Subpoena school attendance records for Emma and Noah from Wasatch Elementary" },
    { matterId: matterIds[1], deadlineId: deadlineIds[3], title: "File Answer - Ridgeline v. Apex", actionType: "draft_document", priority: "high", dueDate: tomorrow, status: "final", description: "Answer with affirmative defenses and counterclaim" },
    { matterId: matterIds[1], title: "Schedule Unit Inspections", actionType: "coordinate_expert", priority: "medium", dueDate: nextWeek, status: "draft", description: "Coordinate with Enviro-Tech for inspection of remaining 94 units" },
    { matterId: matterIds[2], deadlineId: deadlineIds[5], title: "Draft Answer - Garrett v. Foster", actionType: "draft_document", priority: "high", dueDate: today, status: "review", description: "Answer denying negligence with affirmative defenses of comparative fault" },
    { matterId: matterIds[2], title: "Prepare IME Documents for Dr. Park", actionType: "prepare_expert", priority: "medium", dueDate: nextWeek, status: "draft", description: "Compile surgical records and imaging for Dr. Park's review" },
    { matterId: matterIds[2], title: "Draft Motion for Protective Order", actionType: "draft_motion", priority: "low", dueDate: twoWeeks, status: "draft", description: "Motion to protect Dr. Foster's peer review committee records" },
  ];

  for (const a of actions) {
    try {
      const [created] = await db.insert(tables.caseActions).values(a as any).returning();
      log(`Action: ${a.title}`, "ok", created.id, `${a.actionType}, ${a.status}`);
    } catch (e: any) {
      log(`Action: ${a.title}`, "error", undefined, e.message);
    }
  }
}

async function seedAutomationRules(boardIds: string[]) {
  console.log("\n═══ STEP 16: AUTOMATION RULES ═══");

  const rules = [
    {
      boardId: boardIds[0],
      name: "Auto-assign high priority to overdue tasks",
      description: "When a task status changes to 'stuck', automatically escalate priority to high",
      triggerType: "status_changed",
      triggerField: "status",
      triggerValue: "stuck",
      actionType: "change_priority",
      actionConfig: { priority: "high" },
    },
    {
      boardId: boardIds[0],
      name: "Notify team on task completion",
      description: "Send notification when any task is marked as done",
      triggerType: "status_changed",
      triggerField: "status",
      triggerValue: "done",
      actionType: "send_notification",
      actionConfig: { message: "Task completed!", channel: "team" },
    },
    {
      boardId: boardIds[1],
      name: "Auto-categorize new tasks with AI",
      description: "When a new task is created, use AI to categorize it",
      triggerType: "item_created",
      actionType: "ai_categorize",
      actionConfig: { model: "claude" },
    },
    {
      boardId: boardIds[2],
      name: "Escalate medical malpractice deadlines",
      description: "When deadline approaches within 3 days, escalate to senior attorney",
      triggerType: "date_approaching",
      triggerField: "dueDate",
      triggerValue: "3",
      actionType: "escalate_review",
      actionConfig: { escalateTo: "David Chen", daysThreshold: 3 },
    },
  ];

  for (const r of rules) {
    try {
      const rule = await storage.createAutomationRule(r);
      log(`Automation: ${r.name}`, "ok", rule.id, `${r.triggerType} → ${r.actionType}`);
    } catch (e: any) {
      log(`Automation: ${r.name}`, "error", undefined, e.message);
    }
  }
}

async function runCalendarSync() {
  console.log("\n═══ STEP 17: CALENDAR SYNC ═══");
  try {
    const { fullCalendarSync } = await import("../services/calendar-sync");
    const result = await fullCalendarSync(USER_ID);
    log("Full calendar sync", "ok", undefined, `created=${result.created}, updated=${result.updated}`);
  } catch (e: any) {
    log("Full calendar sync", "error", undefined, e.message);
  }
}

async function verifyDataLinkage(clientIds: string[], matterIds: string[]) {
  console.log("\n═══ STEP 18: DATA LINKAGE VERIFICATION ═══");

  for (let i = 0; i < clientIds.length; i++) {
    const matters = await storage.getMatters(clientIds[i]);
    const matterCount = matters.length;
    log(`Client ${clientIds[i].slice(0, 8)}... → ${matterCount} matter(s)`, matterCount > 0 ? "ok" : "error");
  }

  for (const matterId of matterIds) {
    const boards = await storage.getBoardsByMatter(matterId);
    log(`Matter ${matterId.slice(0, 8)}... → ${boards.length} board(s)`, boards.length > 0 ? "ok" : "error");

    const contacts = await storage.getMatterContacts(matterId);
    log(`Matter ${matterId.slice(0, 8)}... → ${contacts.length} contact(s)`, contacts.length > 0 ? "ok" : "error");

    const timeline = await storage.getTimelineEvents(matterId);
    log(`Matter ${matterId.slice(0, 8)}... → ${timeline.length} timeline event(s)`, timeline.length > 0 ? "ok" : "error");

    const evidence = await storage.getEvidenceVaultFiles(matterId);
    log(`Matter ${matterId.slice(0, 8)}... → ${evidence.length} evidence file(s)`, evidence.length > 0 ? "ok" : "error");

    const timeEntries = await storage.getTimeEntries(matterId);
    log(`Matter ${matterId.slice(0, 8)}... → ${timeEntries.length} time entries`, timeEntries.length > 0 ? "ok" : "error");
  }

  const calEvents = await storage.getCalendarEvents();
  log(`Total calendar events: ${calEvents.length}`, calEvents.length >= 7 ? "ok" : "error");
  const autoSynced = calEvents.filter((e: any) => e.autoSynced);
  log(`  Auto-synced calendar events: ${autoSynced.length}`, autoSynced.length > 0 ? "ok" : "error");

  const expenses = await storage.getExpenses();
  log(`Total expenses: ${expenses.length}`, expenses.length >= 6 ? "ok" : "error");

  const invoices = await storage.getInvoices();
  log(`Total invoices: ${invoices.length}`, invoices.length >= 2 ? "ok" : "error");

  for (const clientId of clientIds) {
    const trust = await storage.getTrustTransactions({ clientId });
    log(`Trust transactions for client ${clientId.slice(0, 8)}...: ${trust.length}`, trust.length > 0 ? "ok" : "error");
  }

  const meetings = await storage.getMeetings();
  log(`Total meetings: ${meetings.length}`, meetings.length >= 2 ? "ok" : "error");

  const allFilings = await db.select().from(tables.caseFilings);
  log(`Total e-filing filings: ${allFilings.length}`, allFilings.length >= 6 ? "ok" : "error");

  const allDeadlines = await db.select().from(tables.caseDeadlines);
  log(`Total e-filing deadlines: ${allDeadlines.length}`, allDeadlines.length >= 8 ? "ok" : "error");

  const allActions = await db.select().from(tables.caseActions);
  log(`Total case actions: ${allActions.length}`, allActions.length >= 8 ? "ok" : "error");

  const automations = await db.select().from(tables.automationRules);
  log(`Total automation rules: ${automations.length}`, automations.length >= 4 ? "ok" : "error");
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  VERICASE / SYNERGY LAW — Full System Seed + Test   ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nTimestamp: ${new Date().toISOString()}`);
  console.log(`User ID: ${USER_ID}`);
  console.log(`Workspace: ${WORKSPACE_ID}`);

  try {
    const teamMemberIds = await seedTeamMembers();
    const clientIds = await seedClients();
    const { matterIds, boardIds } = await seedMattersAndBoards(clientIds, teamMemberIds);
    await seedContacts(matterIds);
    await seedTimeEntries(matterIds, clientIds);
    await seedExpenses(matterIds, clientIds);
    await seedInvoicesAndPayments(matterIds, clientIds);
    await seedTrustTransactions(clientIds, matterIds);
    await seedEvidenceVault(matterIds);
    await seedCalendarEvents(matterIds);
    await seedMeetings(matterIds);
    await seedTimelineEvents(matterIds);
    await seedThreads(matterIds);
    await seedAIConversations(matterIds);
    await seedEFilingData(matterIds, boardIds);
    await seedAutomationRules(boardIds);
    await runCalendarSync();
    await verifyDataLinkage(clientIds, matterIds);

    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║                    SUMMARY                          ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    const ok = results.filter(r => r.status === "ok").length;
    const err = results.filter(r => r.status === "error").length;
    console.log(`  Total operations: ${results.length}`);
    console.log(`  Successful: ${ok}`);
    console.log(`  Errors: ${err}`);
    if (err > 0) {
      console.log("\n  ERRORS:");
      results.filter(r => r.status === "error").forEach(r => {
        console.log(`    ✗ ${r.step}: ${r.details}`);
      });
    }
    console.log(`\n  Client IDs: ${clientIds.join(", ")}`);
    console.log(`  Matter IDs: ${matterIds.join(", ")}`);
    console.log(`  Board IDs: ${boardIds.join(", ")}`);
    console.log("\nSeed complete. Browse the app to verify all data.\n");
  } catch (e: any) {
    console.error("FATAL ERROR:", e.message);
    console.error(e.stack);
  }
}

main();
