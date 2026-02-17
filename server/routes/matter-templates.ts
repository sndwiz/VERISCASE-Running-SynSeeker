import type { Express } from "express";
import { db } from "../db";
import { matterTemplates, boards, groups, tasks, customFieldValues } from "@shared/models/tables";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const BUILT_IN_TEMPLATES = [
  {
    name: "Personal Injury Litigation",
    practiceArea: "Personal Injury",
    matterType: "Litigation",
    description: "Complete workflow for personal injury cases including intake, investigation, discovery, and trial preparation.",
    defaultColumns: [
      { id: "status", title: "Status", type: "status", width: 140 },
      { id: "priority", title: "Priority", type: "priority", width: 120 },
      { id: "assignees", title: "Assignees", type: "person", width: 150 },
      { id: "dueDate", title: "Due Date", type: "date", width: 130 },
      { id: "progress", title: "Progress", type: "progress", width: 130 },
    ],
    defaultGroups: [
      {
        title: "Intake & Investigation",
        color: "#3b82f6",
        tasks: [
          { title: "Initial client interview & case evaluation", status: "not-started", priority: "high" },
          { title: "Obtain signed retainer agreement", status: "not-started", priority: "high" },
          { title: "Request medical records authorization", status: "not-started", priority: "high" },
          { title: "Photograph accident scene & injuries", status: "not-started", priority: "medium" },
          { title: "Obtain police/incident report", status: "not-started", priority: "high" },
          { title: "Identify and interview witnesses", status: "not-started", priority: "medium" },
          { title: "Send preservation letters", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Medical Treatment & Records",
        color: "#10b981",
        tasks: [
          { title: "Collect all medical records", status: "not-started", priority: "high" },
          { title: "Organize medical bills and expenses", status: "not-started", priority: "medium" },
          { title: "Track ongoing treatment", status: "not-started", priority: "medium" },
          { title: "Arrange independent medical examination", status: "not-started", priority: "medium" },
          { title: "Obtain treating physician narrative report", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Discovery",
        color: "#f59e0b",
        tasks: [
          { title: "Draft and serve interrogatories", status: "not-started", priority: "high" },
          { title: "Draft requests for production of documents", status: "not-started", priority: "high" },
          { title: "Draft requests for admissions", status: "not-started", priority: "medium" },
          { title: "Respond to defendant's discovery requests", status: "not-started", priority: "high" },
          { title: "Schedule and prepare for depositions", status: "not-started", priority: "high" },
          { title: "Review deposition transcripts", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Motions & Pre-Trial",
        color: "#8b5cf6",
        tasks: [
          { title: "File motion for summary judgment (if applicable)", status: "not-started", priority: "medium" },
          { title: "Respond to defense motions", status: "not-started", priority: "high" },
          { title: "Prepare pre-trial statement", status: "not-started", priority: "high" },
          { title: "Prepare jury instructions", status: "not-started", priority: "medium" },
          { title: "Prepare exhibit list and trial exhibits", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Settlement / Trial",
        color: "#ef4444",
        tasks: [
          { title: "Prepare demand package", status: "not-started", priority: "high" },
          { title: "Negotiate settlement", status: "not-started", priority: "high" },
          { title: "Attend mediation", status: "not-started", priority: "medium" },
          { title: "Trial preparation and witness prep", status: "not-started", priority: "high" },
          { title: "Post-trial motions / appeals", status: "not-started", priority: "low" },
        ],
      },
    ],
  },
  {
    name: "Family Law / Divorce",
    practiceArea: "Family Law",
    matterType: "Divorce",
    description: "Comprehensive divorce and family law case workflow covering filing, discovery, custody, and settlement.",
    defaultColumns: [
      { id: "status", title: "Status", type: "status", width: 140 },
      { id: "priority", title: "Priority", type: "priority", width: 120 },
      { id: "assignees", title: "Assignees", type: "person", width: 150 },
      { id: "dueDate", title: "Due Date", type: "date", width: 130 },
    ],
    defaultGroups: [
      {
        title: "Initial Filing & Temporary Orders",
        color: "#3b82f6",
        tasks: [
          { title: "Client intake and case assessment", status: "not-started", priority: "high" },
          { title: "Draft and file petition for dissolution", status: "not-started", priority: "high" },
          { title: "Serve respondent", status: "not-started", priority: "high" },
          { title: "File motion for temporary orders", status: "not-started", priority: "high" },
          { title: "Temporary restraining order (if needed)", status: "not-started", priority: "high" },
          { title: "Prepare financial declarations", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Discovery & Financial Analysis",
        color: "#10b981",
        tasks: [
          { title: "Exchange mandatory disclosures", status: "not-started", priority: "high" },
          { title: "Subpoena financial records from third parties", status: "not-started", priority: "medium" },
          { title: "Obtain real property appraisals", status: "not-started", priority: "medium" },
          { title: "Value retirement accounts and pensions", status: "not-started", priority: "medium" },
          { title: "Prepare community property spreadsheet", status: "not-started", priority: "high" },
          { title: "Identify separate vs. community property", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Custody & Support",
        color: "#f59e0b",
        tasks: [
          { title: "Prepare custody/visitation proposal", status: "not-started", priority: "high" },
          { title: "Arrange child custody evaluation", status: "not-started", priority: "medium" },
          { title: "Calculate child support guidelines", status: "not-started", priority: "high" },
          { title: "Calculate spousal support analysis", status: "not-started", priority: "medium" },
          { title: "Prepare parenting plan", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Settlement & Trial",
        color: "#8b5cf6",
        tasks: [
          { title: "Draft marital settlement agreement", status: "not-started", priority: "high" },
          { title: "Attend mandatory mediation", status: "not-started", priority: "high" },
          { title: "Prepare trial brief", status: "not-started", priority: "medium" },
          { title: "Prepare witness and exhibit lists", status: "not-started", priority: "medium" },
          { title: "File final judgment", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Post-Judgment",
        color: "#ef4444",
        tasks: [
          { title: "Prepare QDRO for retirement division", status: "not-started", priority: "medium" },
          { title: "Transfer real property deeds", status: "not-started", priority: "medium" },
          { title: "Update beneficiary designations", status: "not-started", priority: "low" },
          { title: "Close case file", status: "not-started", priority: "low" },
        ],
      },
    ],
  },
  {
    name: "Criminal Defense",
    practiceArea: "Criminal Law",
    matterType: "Criminal Defense",
    description: "Criminal defense case workflow from arraignment through trial and sentencing.",
    defaultColumns: [
      { id: "status", title: "Status", type: "status", width: 140 },
      { id: "priority", title: "Priority", type: "priority", width: 120 },
      { id: "assignees", title: "Assignees", type: "person", width: 150 },
      { id: "dueDate", title: "Due Date", type: "date", width: 130 },
    ],
    defaultGroups: [
      {
        title: "Arraignment & Initial Review",
        color: "#3b82f6",
        tasks: [
          { title: "Review charging documents and police reports", status: "not-started", priority: "high" },
          { title: "Attend arraignment hearing", status: "not-started", priority: "high" },
          { title: "File bail/bond motion", status: "not-started", priority: "high" },
          { title: "Interview client about facts of case", status: "not-started", priority: "high" },
          { title: "Identify potential witnesses", status: "not-started", priority: "medium" },
          { title: "Request body camera and surveillance footage", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Discovery & Investigation",
        color: "#10b981",
        tasks: [
          { title: "Review prosecution discovery materials", status: "not-started", priority: "high" },
          { title: "Hire private investigator (if needed)", status: "not-started", priority: "medium" },
          { title: "Review forensic evidence and lab reports", status: "not-started", priority: "high" },
          { title: "Interview prosecution witnesses", status: "not-started", priority: "medium" },
          { title: "Obtain expert witness consultations", status: "not-started", priority: "medium" },
          { title: "Research applicable case law and defenses", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Pre-Trial Motions",
        color: "#f59e0b",
        tasks: [
          { title: "File motion to suppress evidence", status: "not-started", priority: "high" },
          { title: "File motion to dismiss", status: "not-started", priority: "medium" },
          { title: "Respond to prosecution motions in limine", status: "not-started", priority: "high" },
          { title: "Prepare voir dire questions", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Trial Preparation",
        color: "#8b5cf6",
        tasks: [
          { title: "Prepare opening and closing statements", status: "not-started", priority: "high" },
          { title: "Prepare witness examination outlines", status: "not-started", priority: "high" },
          { title: "Organize trial exhibits", status: "not-started", priority: "high" },
          { title: "Prepare jury instructions", status: "not-started", priority: "medium" },
          { title: "Conduct mock trial/moot court", status: "not-started", priority: "low" },
        ],
      },
      {
        title: "Plea / Sentencing / Appeal",
        color: "#ef4444",
        tasks: [
          { title: "Evaluate plea offer", status: "not-started", priority: "high" },
          { title: "Prepare sentencing memorandum", status: "not-started", priority: "medium" },
          { title: "Gather character references and mitigation evidence", status: "not-started", priority: "medium" },
          { title: "File notice of appeal (if applicable)", status: "not-started", priority: "medium" },
        ],
      },
    ],
  },
  {
    name: "Real Estate Transaction",
    practiceArea: "Real Estate",
    matterType: "Transaction",
    description: "Real estate purchase/sale transaction workflow from contract to closing.",
    defaultColumns: [
      { id: "status", title: "Status", type: "status", width: 140 },
      { id: "priority", title: "Priority", type: "priority", width: 120 },
      { id: "assignees", title: "Assignees", type: "person", width: 150 },
      { id: "dueDate", title: "Due Date", type: "date", width: 130 },
    ],
    defaultGroups: [
      {
        title: "Contract & Due Diligence",
        color: "#3b82f6",
        tasks: [
          { title: "Review and negotiate purchase agreement", status: "not-started", priority: "high" },
          { title: "Order title search and examination", status: "not-started", priority: "high" },
          { title: "Review title commitment for exceptions", status: "not-started", priority: "high" },
          { title: "Coordinate property inspection", status: "not-started", priority: "medium" },
          { title: "Review environmental reports", status: "not-started", priority: "medium" },
          { title: "Review survey and plat", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Financing & Approvals",
        color: "#10b981",
        tasks: [
          { title: "Coordinate with lender on mortgage documents", status: "not-started", priority: "high" },
          { title: "Review loan commitment letter", status: "not-started", priority: "high" },
          { title: "Obtain HOA estoppel certificate", status: "not-started", priority: "medium" },
          { title: "Verify property tax status", status: "not-started", priority: "medium" },
          { title: "Review zoning and land use compliance", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Document Preparation",
        color: "#f59e0b",
        tasks: [
          { title: "Draft deed (warranty/quitclaim)", status: "not-started", priority: "high" },
          { title: "Prepare closing disclosure / HUD-1", status: "not-started", priority: "high" },
          { title: "Draft bill of sale for personal property", status: "not-started", priority: "low" },
          { title: "Prepare transfer tax declarations", status: "not-started", priority: "medium" },
          { title: "Review and approve title insurance policy", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Closing & Post-Closing",
        color: "#8b5cf6",
        tasks: [
          { title: "Schedule and attend closing", status: "not-started", priority: "high" },
          { title: "Disburse funds per closing statement", status: "not-started", priority: "high" },
          { title: "Record deed and mortgage", status: "not-started", priority: "high" },
          { title: "Issue final title insurance policy", status: "not-started", priority: "medium" },
          { title: "Send closing package to client", status: "not-started", priority: "low" },
        ],
      },
    ],
  },
  {
    name: "Corporate / Business Formation",
    practiceArea: "Corporate Law",
    matterType: "Business Formation",
    description: "Business entity formation and organization including corporate governance setup.",
    defaultColumns: [
      { id: "status", title: "Status", type: "status", width: 140 },
      { id: "priority", title: "Priority", type: "priority", width: 120 },
      { id: "assignees", title: "Assignees", type: "person", width: 150 },
      { id: "dueDate", title: "Due Date", type: "date", width: 130 },
    ],
    defaultGroups: [
      {
        title: "Entity Selection & Formation",
        color: "#3b82f6",
        tasks: [
          { title: "Advise on entity type selection (LLC, Corp, Partnership)", status: "not-started", priority: "high" },
          { title: "Conduct name availability search", status: "not-started", priority: "high" },
          { title: "Reserve entity name with Secretary of State", status: "not-started", priority: "high" },
          { title: "Draft and file articles of incorporation/organization", status: "not-started", priority: "high" },
          { title: "Obtain EIN from IRS", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Governance Documents",
        color: "#10b981",
        tasks: [
          { title: "Draft bylaws or operating agreement", status: "not-started", priority: "high" },
          { title: "Draft shareholder/member agreement", status: "not-started", priority: "high" },
          { title: "Prepare initial board resolutions", status: "not-started", priority: "medium" },
          { title: "Draft stock/membership certificates", status: "not-started", priority: "medium" },
          { title: "Prepare organizational consent", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Regulatory & Compliance",
        color: "#f59e0b",
        tasks: [
          { title: "Register for state and local business licenses", status: "not-started", priority: "high" },
          { title: "Register for state tax accounts", status: "not-started", priority: "high" },
          { title: "File BOI report (if applicable)", status: "not-started", priority: "medium" },
          { title: "Set up registered agent service", status: "not-started", priority: "medium" },
          { title: "Advise on insurance requirements", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Operational Setup",
        color: "#8b5cf6",
        tasks: [
          { title: "Open business bank accounts", status: "not-started", priority: "high" },
          { title: "Draft employment agreements", status: "not-started", priority: "medium" },
          { title: "Draft IP assignment agreements", status: "not-started", priority: "medium" },
          { title: "Review initial vendor contracts", status: "not-started", priority: "low" },
          { title: "Prepare corporate minute book", status: "not-started", priority: "low" },
        ],
      },
    ],
  },
  {
    name: "Employment Law / Wrongful Termination",
    practiceArea: "Employment Law",
    matterType: "Wrongful Termination",
    description: "Employment litigation workflow for wrongful termination and workplace discrimination cases.",
    defaultColumns: [
      { id: "status", title: "Status", type: "status", width: 140 },
      { id: "priority", title: "Priority", type: "priority", width: 120 },
      { id: "assignees", title: "Assignees", type: "person", width: 150 },
      { id: "dueDate", title: "Due Date", type: "date", width: 130 },
    ],
    defaultGroups: [
      {
        title: "Intake & Administrative Claims",
        color: "#3b82f6",
        tasks: [
          { title: "Initial client consultation and case evaluation", status: "not-started", priority: "high" },
          { title: "Review employment records and personnel file", status: "not-started", priority: "high" },
          { title: "File EEOC / state agency charge", status: "not-started", priority: "high" },
          { title: "Collect pay stubs, emails, and performance reviews", status: "not-started", priority: "high" },
          { title: "Identify comparable employees for disparate treatment", status: "not-started", priority: "medium" },
          { title: "Send litigation hold letter to employer", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Complaint & Pleadings",
        color: "#10b981",
        tasks: [
          { title: "Draft complaint (state/federal)", status: "not-started", priority: "high" },
          { title: "File complaint and serve defendant", status: "not-started", priority: "high" },
          { title: "Respond to defendant's answer and affirmative defenses", status: "not-started", priority: "high" },
          { title: "File motion to compel arbitration (if applicable)", status: "not-started", priority: "medium" },
        ],
      },
      {
        title: "Discovery",
        color: "#f59e0b",
        tasks: [
          { title: "Propound written discovery to employer", status: "not-started", priority: "high" },
          { title: "Subpoena personnel files and HR documents", status: "not-started", priority: "high" },
          { title: "Depose HR representatives and managers", status: "not-started", priority: "high" },
          { title: "Obtain electronic communications (email, Slack)", status: "not-started", priority: "medium" },
          { title: "Retain vocational rehabilitation expert", status: "not-started", priority: "medium" },
          { title: "Calculate economic damages (back pay, front pay)", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Motions & Pre-Trial",
        color: "#8b5cf6",
        tasks: [
          { title: "Oppose employer's motion for summary judgment", status: "not-started", priority: "high" },
          { title: "File motion for class certification (if applicable)", status: "not-started", priority: "medium" },
          { title: "Prepare expert witness reports", status: "not-started", priority: "medium" },
          { title: "Attend mandatory settlement conference", status: "not-started", priority: "high" },
        ],
      },
      {
        title: "Settlement / Trial",
        color: "#ef4444",
        tasks: [
          { title: "Prepare settlement demand with damages calculation", status: "not-started", priority: "high" },
          { title: "Negotiate severance and settlement terms", status: "not-started", priority: "high" },
          { title: "Draft confidential settlement agreement", status: "not-started", priority: "medium" },
          { title: "Trial preparation and witness preparation", status: "not-started", priority: "high" },
          { title: "Post-trial motions and appeal evaluation", status: "not-started", priority: "low" },
        ],
      },
    ],
  },
];

async function seedBuiltInTemplates(): Promise<void> {
  try {
    const existing = await db.select().from(matterTemplates).where(eq(matterTemplates.isBuiltIn, true));
    if (existing.length >= BUILT_IN_TEMPLATES.length) return;

    const existingNames = new Set(existing.map(t => t.name));

    for (const template of BUILT_IN_TEMPLATES) {
      if (existingNames.has(template.name)) continue;
      await db.insert(matterTemplates).values({
        id: randomUUID(),
        name: template.name,
        practiceArea: template.practiceArea,
        description: template.description,
        matterType: template.matterType,
        defaultGroups: template.defaultGroups as any,
        defaultColumns: template.defaultColumns as any,
        defaultCustomFields: [] as any,
        automationRules: [] as any,
        documentTemplates: [] as any,
        isBuiltIn: true,
        isActive: true,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log("[matter-templates] Built-in templates seeded");
  } catch (error) {
    console.error("[matter-templates] Failed to seed built-in templates:", error);
  }
}

export function registerMatterTemplateRoutes(app: Express): void {
  seedBuiltInTemplates();

  app.get("/api/matter-templates", async (req, res) => {
    try {
      const practiceArea = req.query.practiceArea as string | undefined;
      let rows;
      if (practiceArea) {
        rows = await db.select().from(matterTemplates).where(eq(matterTemplates.practiceArea, practiceArea));
      } else {
        rows = await db.select().from(matterTemplates);
      }
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matter templates" });
    }
  });

  app.post("/api/matter-templates", async (req, res) => {
    try {
      const [row] = await db.insert(matterTemplates).values({
        id: randomUUID(),
        ...req.body,
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(row);
    } catch (error) {
      res.status(500).json({ error: "Failed to create matter template" });
    }
  });

  app.patch("/api/matter-templates/:id", async (req, res) => {
    try {
      const [row] = await db.update(matterTemplates)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(matterTemplates.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: "Matter template not found" });
      res.json(row);
    } catch (error) {
      res.status(500).json({ error: "Failed to update matter template" });
    }
  });

  app.delete("/api/matter-templates/:id", async (req, res) => {
    try {
      const [template] = await db.select().from(matterTemplates).where(eq(matterTemplates.id, req.params.id));
      if (template?.isBuiltIn) {
        return res.status(403).json({ error: "Cannot delete built-in templates" });
      }
      await db.delete(matterTemplates).where(eq(matterTemplates.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete matter template" });
    }
  });

  app.post("/api/matter-templates/:id/apply", async (req, res) => {
    try {
      const { matterId } = req.body;
      if (!matterId) {
        return res.status(400).json({ error: "matterId is required" });
      }

      const [template] = await db.select().from(matterTemplates).where(eq(matterTemplates.id, req.params.id));
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const boardId = randomUUID();
      const now = new Date();

      await db.insert(boards).values({
        id: boardId,
        name: template.name,
        description: template.description || "",
        color: "#6366f1",
        icon: "layout-grid",
        columns: (template.defaultColumns as any) || [],
        matterId,
        createdAt: now,
        updatedAt: now,
      });

      const templateGroups = (template.defaultGroups as any[]) || [];
      for (let gi = 0; gi < templateGroups.length; gi++) {
        const tGroup = templateGroups[gi];
        const groupId = randomUUID();

        await db.insert(groups).values({
          id: groupId,
          title: tGroup.title,
          color: tGroup.color || "#6366f1",
          collapsed: false,
          order: gi,
          boardId,
        });

        const groupTasks = tGroup.tasks || [];
        for (let ti = 0; ti < groupTasks.length; ti++) {
          const tTask = groupTasks[ti];
          await db.insert(tasks).values({
            id: randomUUID(),
            title: tTask.title,
            description: tTask.description || "",
            status: tTask.status || "not-started",
            priority: tTask.priority || "medium",
            dueDate: null,
            startDate: null,
            createdAt: now,
            updatedAt: now,
            assignees: [] as any,
            owner: null,
            progress: 0,
            timeEstimate: null,
            timeTracked: 0,
            timeLogs: [] as any,
            files: [] as any,
            boardId,
            groupId,
            order: ti,
            parentTaskId: null,
            tags: [] as any,
            notes: "",
            lastUpdatedBy: null,
            customFields: {} as any,
            subtasks: [] as any,
          });
        }
      }

      const defaultFields = (template.defaultCustomFields as any[]) || [];
      for (const field of defaultFields) {
        if (field.fieldDefinitionId && field.defaultValue !== undefined) {
          await db.insert(customFieldValues).values({
            id: randomUUID(),
            fieldDefinitionId: field.fieldDefinitionId,
            entityId: matterId,
            value: field.defaultValue,
            updatedBy: "system",
            updatedAt: now,
          });
        }
      }

      res.json({ boardId, message: "Template applied successfully" });
    } catch (error) {
      console.error("[matter-templates] Apply error:", error);
      res.status(500).json({ error: "Failed to apply template" });
    }
  });
}
