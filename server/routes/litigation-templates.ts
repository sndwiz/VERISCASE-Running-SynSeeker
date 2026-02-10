interface TemplateColumn {
  id: string;
  title: string;
  type: string;
  width: number;
  visible: boolean;
  order: number;
}

interface TemplateTask {
  title: string;
  status: string;
  priority: string;
  description?: string;
}

interface TemplateGroup {
  title: string;
  color: string;
  tasks: TemplateTask[];
}

interface AutomationDef {
  name: string;
  description: string;
  triggerType: string;
  triggerField?: string;
  triggerValue?: string;
  conditions?: { field: string; operator: string; value: any }[];
  actionType: string;
  actionConfig: Record<string, any>;
}

export interface LitigationBoardConfig {
  name: string;
  description: string;
  color: string;
  icon: string;
  columns: TemplateColumn[];
  groups: TemplateGroup[];
  automations: AutomationDef[];
}

export interface LitigationTemplate {
  id: string;
  name: string;
  description: string;
  caseType: "civil" | "medical_pi";
  phases: {
    id: string;
    name: string;
    order: number;
    description: string;
    advanceTrigger: string;
  }[];
  boards: LitigationBoardConfig[];
  triggerDateRules: {
    triggerField: string;
    label: string;
    generatedTasks: {
      title: string;
      boardIndex: number;
      groupIndex: number;
      priority: string;
      daysOffset?: number;
      description?: string;
    }[];
  }[];
}

const COMMON_STATUS_COL: TemplateColumn = { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 };
const COMMON_PRIORITY_COL: TemplateColumn = { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 };
const COMMON_DATE_COL = (id: string, title: string, order: number): TemplateColumn => ({ id, title, type: "date", width: 120, visible: true, order });
const COMMON_PERSON_COL = (id: string, title: string, order: number): TemplateColumn => ({ id, title, type: "person", width: 130, visible: true, order });
const COMMON_TEXT_COL = (id: string, title: string, order: number, width = 180): TemplateColumn => ({ id, title, type: "text", width, visible: true, order });

export const LITIGATION_TEMPLATES: LitigationTemplate[] = [
  {
    id: "general-civil-litigation",
    name: "General Civil Litigation",
    description: "Full lifecycle civil litigation workflow: intake through trial with deadline tracking, discovery management, and motion practice",
    caseType: "civil",
    phases: [
      { id: "intake", name: "A - Intake & Pre-suit", order: 0, description: "Decide whether to file; preserve evidence; start damages file", advanceTrigger: "Suit authorized or demand rejected/no response" },
      { id: "pleadings", name: "B - Pleadings & Service", order: 1, description: "Get the case on file correctly and get everyone served", advanceTrigger: "All defendants served + answers in or defaults handled" },
      { id: "case-management", name: "C - Early Case Management", order: 2, description: "Lock the calendar and scope", advanceTrigger: "Scheduling order entered" },
      { id: "discovery", name: "D - Written Discovery", order: 3, description: "Build admissible record; pin down facts; force production", advanceTrigger: "Key responses received and reviewed" },
      { id: "depositions", name: "E - Depositions", order: 4, description: "Lock testimony, build impeachment", advanceTrigger: "Key depositions complete" },
      { id: "experts", name: "F - Experts", order: 5, description: "Admissible opinions, reports, and deposition strategy", advanceTrigger: "Expert discovery closed" },
      { id: "motions", name: "G - Motion Practice", order: 6, description: "Narrow issues, exclude evidence, win early if possible", advanceTrigger: "Dispositive motions resolved" },
      { id: "pretrial", name: "H - Pretrial & Trial", order: 7, description: "Exhibits authenticated, lists filed, story locked", advanceTrigger: "Case concluded or post-trial motions" },
      { id: "settlement", name: "I - Settlement / ADR", order: 8, description: "Resolution on favorable terms (runs parallel)", advanceTrigger: "Settlement reached or ADR concluded" },
    ],
    boards: [
      {
        name: "Case Overview",
        description: "Phase tracking, key deadlines, and case contacts",
        color: "#6366F1",
        icon: "briefcase",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          COMMON_DATE_COL("col-deadline", "Deadline", 2),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 3),
          COMMON_TEXT_COL("col-notes", "Notes", 4),
        ],
        groups: [
          {
            title: "Phase A - Intake & Pre-suit",
            color: "#3B82F6",
            tasks: [
              { title: "Conflict check", status: "not-started", priority: "critical", description: "Run conflict check against all parties" },
              { title: "Engagement letter + fee agreement", status: "not-started", priority: "critical" },
              { title: "Fact intake: timeline, people/orgs, locations", status: "not-started", priority: "high" },
              { title: "Evidence preservation letter / litigation hold", status: "not-started", priority: "critical" },
              { title: "Collect: contracts, emails, photos, recordings, invoices", status: "not-started", priority: "high" },
              { title: "Identify claims + defenses + jurisdiction/venue", status: "not-started", priority: "high" },
              { title: "Pre-suit demand letter (if applicable)", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Phase B - Pleadings & Service",
            color: "#8B5CF6",
            tasks: [
              { title: "Draft complaint/petition with exhibits list", status: "not-started", priority: "critical" },
              { title: "Filing checklist: court format, caption, verification, fees", status: "not-started", priority: "high" },
              { title: "Service package: summons + complaint + instructions", status: "not-started", priority: "high" },
              { title: "Track service returns + proof of service", status: "not-started", priority: "high" },
              { title: "Monitor defendant answer deadline(s)", status: "not-started", priority: "critical" },
            ],
          },
          {
            title: "Phase C - Case Management",
            color: "#F59E0B",
            tasks: [
              { title: "Case management statement / scheduling conference prep", status: "not-started", priority: "high" },
              { title: "Proposed discovery plan / protective order", status: "not-started", priority: "medium" },
              { title: "Initial disclosures (if applicable)", status: "not-started", priority: "high" },
              { title: "Capture scheduling order dates into system", status: "not-started", priority: "critical" },
            ],
          },
          {
            title: "Key Milestones",
            color: "#10B981",
            tasks: [
              { title: "Discovery cutoff", status: "not-started", priority: "critical" },
              { title: "Expert disclosure deadline", status: "not-started", priority: "critical" },
              { title: "Dispositive motion deadline", status: "not-started", priority: "high" },
              { title: "Pretrial conference", status: "not-started", priority: "critical" },
              { title: "Trial date", status: "not-started", priority: "critical" },
            ],
          },
        ],
        automations: [
          { name: "Alert approaching deadlines", description: "Notify when a deadline is within 7 days", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Case milestone deadline approaching - review and prepare", daysBeforeDeadline: 7 } },
          { name: "Escalate overdue items", description: "Set priority to critical when deadline passes", triggerType: "due_date_passed", actionType: "change_priority", actionConfig: { priority: "critical" } },
        ],
      },
      {
        name: "Pleadings & Filings",
        description: "Track all court filings, pleadings, and service documents",
        color: "#3B82F6",
        icon: "file-text",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-type", title: "Filing Type", type: "dropdown", width: 150, visible: true, order: 2 },
          COMMON_DATE_COL("col-filed-date", "Filed Date", 3),
          COMMON_DATE_COL("col-deadline", "Response Due", 4),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 5),
          { id: "col-docs", title: "Documents", type: "files", width: 120, visible: true, order: 6 },
        ],
        groups: [
          {
            title: "Our Filings",
            color: "#3B82F6",
            tasks: [
              { title: "Complaint/Petition", status: "not-started", priority: "critical" },
              { title: "Civil cover sheet", status: "not-started", priority: "high" },
              { title: "Summons", status: "not-started", priority: "high" },
              { title: "Certificate of service", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Opposing Filings",
            color: "#EF4444",
            tasks: [
              { title: "Answer / Response (pending)", status: "not-started", priority: "critical" },
            ],
          },
          {
            title: "Court Orders",
            color: "#F59E0B",
            tasks: [
              { title: "Scheduling order (pending)", status: "not-started", priority: "high" },
            ],
          },
        ],
        automations: [
          { name: "Alert on response deadline", description: "Notify when a response is due within 5 days", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Filing response deadline approaching", daysBeforeDeadline: 5 } },
        ],
      },
      {
        name: "Discovery Tracker",
        description: "Manage discovery requests, responses, deficiencies, and production logs",
        color: "#EF4444",
        icon: "search",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-disc-type", title: "Discovery Type", type: "dropdown", width: 160, visible: true, order: 2 },
          COMMON_DATE_COL("col-served", "Served Date", 3),
          COMMON_DATE_COL("col-due", "Response Due", 4),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 5),
          COMMON_TEXT_COL("col-deficiency", "Deficiency Notes", 6),
        ],
        groups: [
          {
            title: "Outgoing - Interrogatories",
            color: "#3B82F6",
            tasks: [
              { title: "Draft first set of interrogatories", status: "not-started", priority: "high" },
              { title: "Review responses to interrogatories", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Outgoing - Requests for Production",
            color: "#6366F1",
            tasks: [
              { title: "Draft first RFP set", status: "not-started", priority: "high" },
              { title: "Review document production", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Outgoing - Requests for Admission",
            color: "#8B5CF6",
            tasks: [
              { title: "Draft requests for admission", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Incoming Discovery",
            color: "#EF4444",
            tasks: [
              { title: "Respond to interrogatories", status: "not-started", priority: "high" },
              { title: "Respond to RFP", status: "not-started", priority: "high" },
              { title: "Respond to RFA", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Third-Party Subpoenas",
            color: "#F59E0B",
            tasks: [
              { title: "Identify third-party records needed", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Meet-and-Confer / Disputes",
            color: "#DC2626",
            tasks: [
              { title: "Track deficiency letters and deadlines to cure", status: "not-started", priority: "medium" },
            ],
          },
        ],
        automations: [
          { name: "Alert response deadline", description: "Notify when discovery response is due within 5 days", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Discovery response deadline approaching - prepare response", daysBeforeDeadline: 5 } },
          { name: "Escalate overdue discovery", description: "Set priority to critical when response is overdue", triggerType: "due_date_passed", actionType: "change_priority", actionConfig: { priority: "critical" } },
          { name: "AI extract key terms", description: "Extract key terms from uploaded discovery documents", triggerType: "file_uploaded", actionType: "ai_extract", actionConfig: { extractionFields: ["document_type", "parties", "key_dates", "request_numbers"] } },
        ],
      },
      {
        name: "Depositions",
        description: "Deposition planning, scheduling, and summary tracking",
        color: "#F59E0B",
        icon: "users",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-witness-type", title: "Witness Type", type: "dropdown", width: 140, visible: true, order: 2 },
          COMMON_DATE_COL("col-depo-date", "Depo Date", 3),
          COMMON_PERSON_COL("col-assigned", "Preparing Attorney", 4),
          COMMON_TEXT_COL("col-location", "Location", 5, 150),
          { id: "col-docs", title: "Exhibits/Transcript", type: "files", width: 140, visible: true, order: 6 },
        ],
        groups: [
          {
            title: "Party Depositions",
            color: "#EF4444",
            tasks: [
              { title: "Deposition of opposing party", status: "not-started", priority: "high" },
              { title: "Prepare client for deposition", status: "not-started", priority: "critical" },
            ],
          },
          {
            title: "Key Witness Depositions",
            color: "#3B82F6",
            tasks: [
              { title: "Identify key witnesses for deposition", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Expert Depositions",
            color: "#8B5CF6",
            tasks: [
              { title: "Schedule opposing expert deposition", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Depo Prep & Summaries",
            color: "#10B981",
            tasks: [
              { title: "Create deposition outline template", status: "not-started", priority: "medium" },
              { title: "Build impeachment clips list", status: "not-started", priority: "medium" },
            ],
          },
        ],
        automations: [
          { name: "Notify depo approaching", description: "Alert 7 days before scheduled deposition", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Deposition scheduled within 7 days - ensure prep is complete", daysBeforeDeadline: 7 } },
        ],
      },
      {
        name: "Evidence & Exhibits",
        description: "Evidence inventory, authentication status, and exhibit management",
        color: "#10B981",
        icon: "folder-archive",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-exhibit-num", title: "Exhibit #", type: "text", width: 100, visible: true, order: 2 },
          { id: "col-evidence-type", title: "Type", type: "dropdown", width: 130, visible: true, order: 3 },
          { id: "col-authenticated", title: "Authenticated", type: "status", width: 130, visible: true, order: 4 },
          COMMON_TEXT_COL("col-source", "Source", 5, 150),
          { id: "col-docs", title: "Files", type: "files", width: 120, visible: true, order: 6 },
        ],
        groups: [
          {
            title: "Documents",
            color: "#3B82F6",
            tasks: [
              { title: "Contracts / agreements", status: "not-started", priority: "medium" },
              { title: "Correspondence / emails / texts", status: "not-started", priority: "medium" },
              { title: "Financial records / invoices", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Physical Evidence",
            color: "#F59E0B",
            tasks: [
              { title: "Photos / recordings", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Missing / Needed",
            color: "#EF4444",
            tasks: [
              { title: "Identify evidence gaps from fact timeline", status: "not-started", priority: "high" },
            ],
          },
        ],
        automations: [
          { name: "Notify on evidence upload", description: "Alert team when new evidence is uploaded", triggerType: "file_uploaded", actionType: "send_notification", actionConfig: { message: "New evidence item uploaded - review authentication status" } },
        ],
      },
      {
        name: "Motions",
        description: "Motion pipeline, drafting, filing, and oral argument tracking",
        color: "#8B5CF6",
        icon: "gavel",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-motion-type", title: "Motion Type", type: "dropdown", width: 160, visible: true, order: 2 },
          COMMON_DATE_COL("col-file-deadline", "Filing Deadline", 3),
          COMMON_DATE_COL("col-hearing", "Hearing Date", 4),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 5),
          { id: "col-docs", title: "Documents", type: "files", width: 120, visible: true, order: 6 },
        ],
        groups: [
          {
            title: "Pending / Drafting",
            color: "#F59E0B",
            tasks: [
              { title: "Evaluate motion to dismiss grounds", status: "not-started", priority: "medium" },
              { title: "Prepare summary judgment analysis", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Filed - Awaiting Ruling",
            color: "#3B82F6",
            tasks: [],
          },
          {
            title: "Opposing Motions",
            color: "#EF4444",
            tasks: [
              { title: "Monitor for opposing motions", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Resolved",
            color: "#10B981",
            tasks: [],
          },
        ],
        automations: [
          { name: "Alert filing deadline", description: "Notify when motion filing deadline is within 5 days", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Motion filing deadline approaching", daysBeforeDeadline: 5 } },
          { name: "Alert hearing date", description: "Notify 3 days before hearing", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Motion hearing in 3 days - prepare oral argument", daysBeforeDeadline: 3 } },
        ],
      },
      {
        name: "Settlement & ADR",
        description: "Settlement negotiations, mediation prep, and ADR tracking",
        color: "#059669",
        icon: "handshake",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          COMMON_DATE_COL("col-date", "Date", 2),
          { id: "col-amount", title: "Amount", type: "number", width: 120, visible: true, order: 3 },
          COMMON_PERSON_COL("col-assigned", "Assigned To", 4),
          COMMON_TEXT_COL("col-notes", "Notes", 5),
        ],
        groups: [
          {
            title: "Settlement Preparation",
            color: "#3B82F6",
            tasks: [
              { title: "Build settlement demand package (liability + damages + exhibits)", status: "not-started", priority: "high" },
              { title: "Calculate current damages exposure", status: "not-started", priority: "high" },
              { title: "Prepare authority analysis / range", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Offers & Counteroffers",
            color: "#F59E0B",
            tasks: [],
          },
          {
            title: "Mediation / ADR",
            color: "#8B5CF6",
            tasks: [
              { title: "Mediation statement + confidential exhibits", status: "not-started", priority: "medium" },
              { title: "Select mediator", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Resolution",
            color: "#10B981",
            tasks: [
              { title: "Draft settlement agreement + releases", status: "not-started", priority: "medium" },
            ],
          },
        ],
        automations: [
          { name: "Notify mediation approaching", description: "Alert 10 days before mediation", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Mediation date approaching - ensure preparation complete", daysBeforeDeadline: 10 } },
        ],
      },
    ],
    triggerDateRules: [
      {
        triggerField: "filingDate",
        label: "Filing Date",
        generatedTasks: [
          { title: "Serve complaint on all defendants within required period", boardIndex: 1, groupIndex: 0, priority: "critical", description: "Service must be completed per applicable rules" },
          { title: "Prepare service packages (summons + complaint)", boardIndex: 1, groupIndex: 0, priority: "high" },
          { title: "Calendar default deadlines for unserved defendants", boardIndex: 0, groupIndex: 3, priority: "high" },
        ],
      },
      {
        triggerField: "serviceDate",
        label: "Service Date",
        generatedTasks: [
          { title: "Monitor answer/response deadline", boardIndex: 1, groupIndex: 1, priority: "critical", daysOffset: 21, description: "Default 21 days - adjust per jurisdiction" },
          { title: "File proof of service", boardIndex: 1, groupIndex: 0, priority: "high" },
          { title: "Check for default if no response by deadline", boardIndex: 0, groupIndex: 1, priority: "high", daysOffset: 28 },
        ],
      },
      {
        triggerField: "schedulingOrderDate",
        label: "Scheduling Order Date",
        generatedTasks: [
          { title: "Enter all scheduling order deadlines into system", boardIndex: 0, groupIndex: 3, priority: "critical" },
          { title: "Plan discovery strategy based on cutoff dates", boardIndex: 2, groupIndex: 0, priority: "high" },
          { title: "Identify expert needs and begin retention", boardIndex: 0, groupIndex: 2, priority: "high" },
        ],
      },
      {
        triggerField: "discoveryCutoff",
        label: "Discovery Cutoff",
        generatedTasks: [
          { title: "Final discovery requests must be served", boardIndex: 2, groupIndex: 0, priority: "critical", daysOffset: -30, description: "Serve at least 30 days before cutoff" },
          { title: "Complete all meet-and-confer on deficiencies", boardIndex: 2, groupIndex: 5, priority: "high", daysOffset: -14 },
          { title: "File any motions to compel before cutoff", boardIndex: 5, groupIndex: 0, priority: "high", daysOffset: -21 },
        ],
      },
      {
        triggerField: "expertDeadline",
        label: "Expert Disclosure Deadline",
        generatedTasks: [
          { title: "Expert reports must be completed and disclosed", boardIndex: 0, groupIndex: 3, priority: "critical" },
          { title: "Schedule opposing expert depositions", boardIndex: 3, groupIndex: 2, priority: "high", daysOffset: 14 },
          { title: "Evaluate Daubert/Frye challenges", boardIndex: 5, groupIndex: 0, priority: "medium", daysOffset: 7 },
        ],
      },
      {
        triggerField: "trialDate",
        label: "Trial Date",
        generatedTasks: [
          { title: "File final witness list", boardIndex: 1, groupIndex: 0, priority: "critical", daysOffset: -14 },
          { title: "File final exhibit list", boardIndex: 1, groupIndex: 0, priority: "critical", daysOffset: -14 },
          { title: "Prepare pretrial order", boardIndex: 1, groupIndex: 0, priority: "critical", daysOffset: -21 },
          { title: "Prepare trial brief", boardIndex: 5, groupIndex: 0, priority: "high", daysOffset: -7 },
          { title: "File motions in limine", boardIndex: 5, groupIndex: 0, priority: "high", daysOffset: -14 },
          { title: "Prepare jury instructions / voir dire (if jury)", boardIndex: 0, groupIndex: 3, priority: "high", daysOffset: -21 },
          { title: "Build exhibit binders + electronic exhibit set", boardIndex: 4, groupIndex: 0, priority: "high", daysOffset: -10 },
        ],
      },
      {
        triggerField: "mediationDate",
        label: "Mediation Date",
        generatedTasks: [
          { title: "Prepare mediation statement", boardIndex: 6, groupIndex: 2, priority: "high", daysOffset: -14 },
          { title: "Compile confidential exhibits for mediator", boardIndex: 6, groupIndex: 2, priority: "high", daysOffset: -10 },
          { title: "Obtain settlement authority", boardIndex: 6, groupIndex: 0, priority: "critical", daysOffset: -7 },
        ],
      },
    ],
  },
  {
    id: "medical-pi-litigation",
    name: "Medical / PI Litigation",
    description: "Personal injury and medical malpractice litigation with medical records management, expert retention, lien tracking, and damages analysis",
    caseType: "medical_pi",
    phases: [
      { id: "intake-records", name: "A - Intake & Records", order: 0, description: "HIPAA authorizations, medical record collection, screening", advanceTrigger: "Records collected, case screened" },
      { id: "pre-suit", name: "B - Pre-suit Requirements", order: 1, description: "Pre-suit notice, certificate of merit, screening panel", advanceTrigger: "Pre-suit requirements satisfied" },
      { id: "pleadings", name: "C - Filing & Service", order: 2, description: "File and serve with medical-specific exhibits", advanceTrigger: "All defendants served + answers in" },
      { id: "case-management", name: "D - Case Management", order: 3, description: "Scheduling order and discovery plan", advanceTrigger: "Scheduling order entered" },
      { id: "medical-discovery", name: "E - Medical Discovery", order: 4, description: "Subpoenas for complete medical files, imaging, provider depositions", advanceTrigger: "Medical records complete" },
      { id: "discovery", name: "F - Written Discovery", order: 5, description: "Standard discovery plus medical-specific requests", advanceTrigger: "Key responses received" },
      { id: "experts", name: "G - Experts & Causation", order: 6, description: "Standard of care, causation, damages, life care experts", advanceTrigger: "Expert discovery closed" },
      { id: "depositions", name: "H - Depositions", order: 7, description: "Party, witness, and expert depositions", advanceTrigger: "Key depositions complete" },
      { id: "motions", name: "I - Motion Practice", order: 8, description: "Dispositive motions and Daubert challenges", advanceTrigger: "Motions resolved" },
      { id: "pretrial", name: "J - Pretrial & Trial", order: 9, description: "Trial preparation and execution", advanceTrigger: "Case concluded" },
      { id: "settlement-liens", name: "K - Settlement & Liens", order: 10, description: "Settlement, lien negotiation, distribution", advanceTrigger: "Settlement finalized and distributed" },
    ],
    boards: [
      {
        name: "Case Overview",
        description: "Phase tracking, key deadlines, and case contacts for medical/PI matter",
        color: "#6366F1",
        icon: "briefcase",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          COMMON_DATE_COL("col-deadline", "Deadline", 2),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 3),
          COMMON_TEXT_COL("col-notes", "Notes", 4),
        ],
        groups: [
          {
            title: "Phase A - Intake & Records",
            color: "#3B82F6",
            tasks: [
              { title: "Conflict check", status: "not-started", priority: "critical" },
              { title: "Engagement letter + fee agreement", status: "not-started", priority: "critical" },
              { title: "HIPAA authorizations signed by client", status: "not-started", priority: "critical" },
              { title: "Fact intake: accident/incident timeline", status: "not-started", priority: "high" },
              { title: "Evidence preservation letter / litigation hold", status: "not-started", priority: "critical" },
              { title: "Identify potential defendants", status: "not-started", priority: "high" },
              { title: "Check statute of limitations + notice-of-claim rules", status: "not-started", priority: "critical" },
              { title: "Initial standard-of-care + causation theory", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Phase B - Pre-suit Requirements",
            color: "#8B5CF6",
            tasks: [
              { title: "Check jurisdiction pre-suit notice requirements", status: "not-started", priority: "critical" },
              { title: "Certificate of merit / affidavit (if required)", status: "not-started", priority: "critical" },
              { title: "Pre-suit demand / notice letter", status: "not-started", priority: "high" },
              { title: "Medical screening panel (if applicable)", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Phase C - Filing & Service",
            color: "#F59E0B",
            tasks: [
              { title: "Draft complaint with proper entity defendants", status: "not-started", priority: "critical" },
              { title: "Service on all defendants", status: "not-started", priority: "critical" },
              { title: "Add all providers and insurers to contacts", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Key Milestones",
            color: "#10B981",
            tasks: [
              { title: "Discovery cutoff", status: "not-started", priority: "critical" },
              { title: "Expert disclosure deadline", status: "not-started", priority: "critical" },
              { title: "Trial date", status: "not-started", priority: "critical" },
            ],
          },
        ],
        automations: [
          { name: "Alert approaching deadlines", description: "Notify when a deadline is within 7 days", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Case milestone deadline approaching", daysBeforeDeadline: 7 } },
          { name: "Escalate overdue items", description: "Set priority to critical when deadline passes", triggerType: "due_date_passed", actionType: "change_priority", actionConfig: { priority: "critical" } },
        ],
      },
      {
        name: "Pleadings & Filings",
        description: "Court filings and pleadings for medical/PI matter",
        color: "#3B82F6",
        icon: "file-text",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-type", title: "Filing Type", type: "dropdown", width: 150, visible: true, order: 2 },
          COMMON_DATE_COL("col-filed-date", "Filed Date", 3),
          COMMON_DATE_COL("col-deadline", "Response Due", 4),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 5),
          { id: "col-docs", title: "Documents", type: "files", width: 120, visible: true, order: 6 },
        ],
        groups: [
          { title: "Our Filings", color: "#3B82F6", tasks: [
            { title: "Complaint/Petition with medical exhibits", status: "not-started", priority: "critical" },
            { title: "Certificate of merit (if required)", status: "not-started", priority: "critical" },
            { title: "Summons + service", status: "not-started", priority: "high" },
          ]},
          { title: "Opposing Filings", color: "#EF4444", tasks: [
            { title: "Answer / Response (pending)", status: "not-started", priority: "critical" },
          ]},
          { title: "Court Orders", color: "#F59E0B", tasks: [] },
        ],
        automations: [
          { name: "Alert on response deadline", description: "Notify when a response is due within 5 days", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Filing response deadline approaching", daysBeforeDeadline: 5 } },
        ],
      },
      {
        name: "Discovery Tracker",
        description: "Discovery management for medical/PI case",
        color: "#EF4444",
        icon: "search",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-disc-type", title: "Discovery Type", type: "dropdown", width: 160, visible: true, order: 2 },
          COMMON_DATE_COL("col-served", "Served Date", 3),
          COMMON_DATE_COL("col-due", "Response Due", 4),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 5),
        ],
        groups: [
          { title: "Outgoing Discovery", color: "#3B82F6", tasks: [
            { title: "Interrogatories - standard + medical-specific", status: "not-started", priority: "high" },
            { title: "Request for production - medical records, billing", status: "not-started", priority: "high" },
            { title: "Requests for admission", status: "not-started", priority: "medium" },
          ]},
          { title: "Incoming Discovery", color: "#EF4444", tasks: [
            { title: "Respond to interrogatories", status: "not-started", priority: "high" },
            { title: "Respond to RFP", status: "not-started", priority: "high" },
          ]},
          { title: "Meet-and-Confer / Disputes", color: "#DC2626", tasks: [] },
        ],
        automations: [
          { name: "Alert response deadline", description: "Notify 5 days before response due", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Discovery response deadline approaching", daysBeforeDeadline: 5 } },
          { name: "Escalate overdue", description: "Critical priority on overdue", triggerType: "due_date_passed", actionType: "change_priority", actionConfig: { priority: "critical" } },
        ],
      },
      {
        name: "Depositions",
        description: "Deposition management for medical/PI case",
        color: "#F59E0B",
        icon: "users",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-witness-type", title: "Witness Type", type: "dropdown", width: 140, visible: true, order: 2 },
          COMMON_DATE_COL("col-depo-date", "Depo Date", 3),
          COMMON_PERSON_COL("col-assigned", "Preparing Attorney", 4),
          { id: "col-docs", title: "Transcript/Exhibits", type: "files", width: 140, visible: true, order: 5 },
        ],
        groups: [
          { title: "Party Depositions", color: "#EF4444", tasks: [
            { title: "Deposition of plaintiff/client", status: "not-started", priority: "critical" },
            { title: "Deposition of opposing party", status: "not-started", priority: "high" },
          ]},
          { title: "Treating Provider Depositions", color: "#3B82F6", tasks: [
            { title: "Primary treating physician deposition", status: "not-started", priority: "high" },
            { title: "Specialist depositions", status: "not-started", priority: "medium" },
          ]},
          { title: "Expert Depositions", color: "#8B5CF6", tasks: [
            { title: "Opposing medical expert deposition", status: "not-started", priority: "high" },
          ]},
          { title: "Depo Summaries", color: "#10B981", tasks: [] },
        ],
        automations: [
          { name: "Notify depo approaching", description: "Alert 7 days before deposition", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Deposition scheduled within 7 days", daysBeforeDeadline: 7 } },
        ],
      },
      {
        name: "Evidence & Exhibits",
        description: "Evidence inventory and exhibit management for medical/PI",
        color: "#10B981",
        icon: "folder-archive",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-exhibit-num", title: "Exhibit #", type: "text", width: 100, visible: true, order: 2 },
          { id: "col-evidence-type", title: "Type", type: "dropdown", width: 130, visible: true, order: 3 },
          { id: "col-authenticated", title: "Authenticated", type: "status", width: 130, visible: true, order: 4 },
          { id: "col-docs", title: "Files", type: "files", width: 120, visible: true, order: 5 },
        ],
        groups: [
          { title: "Medical Records", color: "#3B82F6", tasks: [
            { title: "Hospital records", status: "not-started", priority: "high" },
            { title: "Imaging / radiology reports", status: "not-started", priority: "high" },
            { title: "Pharmacy records", status: "not-started", priority: "medium" },
          ]},
          { title: "Financial / Damages Documents", color: "#F59E0B", tasks: [
            { title: "Medical bills", status: "not-started", priority: "high" },
            { title: "Lost wage documentation", status: "not-started", priority: "high" },
            { title: "Insurance correspondence", status: "not-started", priority: "medium" },
          ]},
          { title: "Other Evidence", color: "#10B981", tasks: [
            { title: "Photos / video", status: "not-started", priority: "medium" },
            { title: "Police report / incident report", status: "not-started", priority: "high" },
          ]},
        ],
        automations: [
          { name: "Notify on upload", description: "Alert when evidence is uploaded", triggerType: "file_uploaded", actionType: "send_notification", actionConfig: { message: "New evidence uploaded - review and categorize" } },
        ],
      },
      {
        name: "Motions",
        description: "Motion practice for medical/PI case",
        color: "#8B5CF6",
        icon: "gavel",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-motion-type", title: "Motion Type", type: "dropdown", width: 160, visible: true, order: 2 },
          COMMON_DATE_COL("col-file-deadline", "Filing Deadline", 3),
          COMMON_DATE_COL("col-hearing", "Hearing Date", 4),
          COMMON_PERSON_COL("col-assigned", "Assigned To", 5),
          { id: "col-docs", title: "Documents", type: "files", width: 120, visible: true, order: 6 },
        ],
        groups: [
          { title: "Pending / Drafting", color: "#F59E0B", tasks: [
            { title: "Evaluate Daubert/Frye challenge on opposing expert", status: "not-started", priority: "medium" },
          ]},
          { title: "Filed - Awaiting Ruling", color: "#3B82F6", tasks: [] },
          { title: "Opposing Motions", color: "#EF4444", tasks: [] },
          { title: "Resolved", color: "#10B981", tasks: [] },
        ],
        automations: [
          { name: "Alert filing deadline", description: "Notify 5 days before filing deadline", triggerType: "due_date_approaching", actionType: "send_notification", actionConfig: { message: "Motion filing deadline approaching", daysBeforeDeadline: 5 } },
        ],
      },
      {
        name: "Settlement & ADR",
        description: "Settlement negotiations and ADR for medical/PI case",
        color: "#059669",
        icon: "handshake",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          COMMON_DATE_COL("col-date", "Date", 2),
          { id: "col-amount", title: "Amount", type: "number", width: 120, visible: true, order: 3 },
          COMMON_TEXT_COL("col-notes", "Notes", 4),
        ],
        groups: [
          { title: "Settlement Preparation", color: "#3B82F6", tasks: [
            { title: "Build settlement demand package", status: "not-started", priority: "high" },
            { title: "Calculate current damages exposure", status: "not-started", priority: "high" },
          ]},
          { title: "Offers & Counteroffers", color: "#F59E0B", tasks: [] },
          { title: "Mediation / ADR", color: "#8B5CF6", tasks: [
            { title: "Mediation statement + confidential exhibits", status: "not-started", priority: "medium" },
          ]},
          { title: "Resolution", color: "#10B981", tasks: [] },
        ],
        automations: [],
      },
      {
        name: "Medical Records",
        description: "Provider list, record request status, and completeness tracking",
        color: "#EC4899",
        icon: "heart-pulse",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          COMMON_TEXT_COL("col-provider", "Provider / Facility", 2),
          { id: "col-record-type", title: "Record Type", type: "dropdown", width: 140, visible: true, order: 3 },
          COMMON_DATE_COL("col-requested", "Requested Date", 4),
          COMMON_DATE_COL("col-received", "Received Date", 5),
          { id: "col-complete", title: "Complete?", type: "status", width: 110, visible: true, order: 6 },
        ],
        groups: [
          {
            title: "Hospital Records",
            color: "#EF4444",
            tasks: [
              { title: "ED notes + nursing notes", status: "not-started", priority: "critical" },
              { title: "Operative notes", status: "not-started", priority: "high" },
              { title: "Lab results", status: "not-started", priority: "high" },
              { title: "Discharge summary", status: "not-started", priority: "high" },
              { title: "MAR (medication administration record)", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Treating Physicians",
            color: "#3B82F6",
            tasks: [
              { title: "Primary care records", status: "not-started", priority: "high" },
              { title: "Specialist records", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Imaging & Diagnostics",
            color: "#8B5CF6",
            tasks: [
              { title: "Radiology reports", status: "not-started", priority: "high" },
              { title: "DICOM imaging retrieval", status: "not-started", priority: "medium" },
              { title: "MRI/CT/X-ray reports", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Billing & Insurance",
            color: "#F59E0B",
            tasks: [
              { title: "Hospital billing records", status: "not-started", priority: "high" },
              { title: "Provider billing statements", status: "not-started", priority: "high" },
              { title: "Insurance EOBs", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Other Records",
            color: "#10B981",
            tasks: [
              { title: "EMS/ambulance records", status: "not-started", priority: "medium" },
              { title: "Pharmacy records", status: "not-started", priority: "medium" },
              { title: "Physical therapy records", status: "not-started", priority: "medium" },
            ],
          },
        ],
        automations: [
          { name: "Track outstanding requests", description: "Escalate records not received within 30 days", triggerType: "due_date_passed", actionType: "change_priority", actionConfig: { priority: "critical" } },
          { name: "Notify on record receipt", description: "Alert when records are received", triggerType: "status_changed", triggerField: "status", triggerValue: "done", actionType: "send_notification", actionConfig: { message: "Medical records received - review for completeness" } },
        ],
      },
      {
        name: "Medical Timeline",
        description: "Chronological timeline of medical events, visits, procedures, and treatments",
        color: "#F97316",
        icon: "activity",
        columns: [
          COMMON_STATUS_COL,
          COMMON_DATE_COL("col-event-date", "Event Date", 1),
          { id: "col-event-type", title: "Event Type", type: "dropdown", width: 140, visible: true, order: 2 },
          COMMON_TEXT_COL("col-provider", "Provider", 3, 150),
          COMMON_TEXT_COL("col-description", "Description", 4, 250),
          COMMON_TEXT_COL("col-findings", "Key Findings", 5, 200),
        ],
        groups: [
          { title: "Pre-Incident", color: "#94A3B8", tasks: [
            { title: "Prior medical history baseline", status: "not-started", priority: "high" },
          ]},
          { title: "Incident / Injury", color: "#EF4444", tasks: [
            { title: "Date and details of incident", status: "not-started", priority: "critical" },
            { title: "Initial emergency treatment", status: "not-started", priority: "critical" },
          ]},
          { title: "Acute Treatment", color: "#F59E0B", tasks: [
            { title: "Hospital admission / surgery details", status: "not-started", priority: "high" },
          ]},
          { title: "Follow-up / Ongoing Treatment", color: "#3B82F6", tasks: [
            { title: "Follow-up visits and assessments", status: "not-started", priority: "medium" },
            { title: "Physical therapy / rehabilitation", status: "not-started", priority: "medium" },
          ]},
          { title: "Current Status", color: "#10B981", tasks: [
            { title: "Current treatment plan and prognosis", status: "not-started", priority: "high" },
          ]},
        ],
        automations: [],
      },
      {
        name: "Damages & Liens",
        description: "Damages ledger, lien identification and negotiation, settlement distribution",
        color: "#DC2626",
        icon: "dollar-sign",
        columns: [
          COMMON_STATUS_COL,
          COMMON_PRIORITY_COL,
          { id: "col-category", title: "Category", type: "dropdown", width: 140, visible: true, order: 2 },
          { id: "col-amount", title: "Amount", type: "number", width: 120, visible: true, order: 3 },
          { id: "col-negotiated", title: "Negotiated Amount", type: "number", width: 140, visible: true, order: 4 },
          COMMON_TEXT_COL("col-notes", "Notes", 5),
        ],
        groups: [
          {
            title: "Medical Specials",
            color: "#EF4444",
            tasks: [
              { title: "Past medical expenses - compile total", status: "not-started", priority: "critical" },
              { title: "Future medical expenses (life care plan)", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Lost Wages / Earning Capacity",
            color: "#F59E0B",
            tasks: [
              { title: "Past lost wages documentation", status: "not-started", priority: "high" },
              { title: "Future lost earning capacity (economist)", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Non-Economic Damages",
            color: "#8B5CF6",
            tasks: [
              { title: "Pain and suffering analysis", status: "not-started", priority: "medium" },
              { title: "Loss of enjoyment / consortium", status: "not-started", priority: "medium" },
            ],
          },
          {
            title: "Liens",
            color: "#DC2626",
            tasks: [
              { title: "Identify Medicare/Medicaid liens", status: "not-started", priority: "critical" },
              { title: "Identify ERISA/private insurance liens", status: "not-started", priority: "high" },
              { title: "Lien notice requirements", status: "not-started", priority: "high" },
              { title: "Negotiate lien reductions", status: "not-started", priority: "high" },
            ],
          },
          {
            title: "Settlement Distribution",
            color: "#10B981",
            tasks: [
              { title: "Settlement distribution worksheet", status: "not-started", priority: "medium" },
              { title: "Final closing checklist", status: "not-started", priority: "medium" },
            ],
          },
        ],
        automations: [],
      },
    ],
    triggerDateRules: [
      {
        triggerField: "filingDate",
        label: "Filing Date",
        generatedTasks: [
          { title: "Serve complaint on all defendants", boardIndex: 1, groupIndex: 0, priority: "critical" },
          { title: "Calendar service deadlines per defendant", boardIndex: 0, groupIndex: 3, priority: "high" },
        ],
      },
      {
        triggerField: "serviceDate",
        label: "Service Date",
        generatedTasks: [
          { title: "Monitor answer/response deadline", boardIndex: 1, groupIndex: 1, priority: "critical", daysOffset: 21 },
          { title: "File proof of service", boardIndex: 1, groupIndex: 0, priority: "high" },
        ],
      },
      {
        triggerField: "schedulingOrderDate",
        label: "Scheduling Order Date",
        generatedTasks: [
          { title: "Enter all scheduling order deadlines", boardIndex: 0, groupIndex: 3, priority: "critical" },
          { title: "Plan medical discovery strategy", boardIndex: 2, groupIndex: 0, priority: "high" },
          { title: "Begin expert retention process", boardIndex: 0, groupIndex: 3, priority: "high" },
        ],
      },
      {
        triggerField: "discoveryCutoff",
        label: "Discovery Cutoff",
        generatedTasks: [
          { title: "Final discovery requests must be served", boardIndex: 2, groupIndex: 0, priority: "critical", daysOffset: -30 },
          { title: "Complete all medical record subpoenas", boardIndex: 7, groupIndex: 0, priority: "critical", daysOffset: -45 },
        ],
      },
      {
        triggerField: "expertDeadline",
        label: "Expert Disclosure Deadline",
        generatedTasks: [
          { title: "Expert reports completed and disclosed", boardIndex: 0, groupIndex: 3, priority: "critical" },
          { title: "Schedule opposing expert depositions", boardIndex: 3, groupIndex: 2, priority: "high", daysOffset: 14 },
        ],
      },
      {
        triggerField: "trialDate",
        label: "Trial Date",
        generatedTasks: [
          { title: "File final witness list", boardIndex: 1, groupIndex: 0, priority: "critical", daysOffset: -14 },
          { title: "File final exhibit list", boardIndex: 1, groupIndex: 0, priority: "critical", daysOffset: -14 },
          { title: "Prepare pretrial order", boardIndex: 1, groupIndex: 0, priority: "critical", daysOffset: -21 },
          { title: "Prepare life care plan summary for trial", boardIndex: 9, groupIndex: 0, priority: "high", daysOffset: -14 },
        ],
      },
      {
        triggerField: "mediationDate",
        label: "Mediation Date",
        generatedTasks: [
          { title: "Prepare mediation statement with damages summary", boardIndex: 6, groupIndex: 2, priority: "high", daysOffset: -14 },
          { title: "Compile lien status for settlement authority", boardIndex: 9, groupIndex: 3, priority: "critical", daysOffset: -10 },
          { title: "Obtain settlement authority", boardIndex: 6, groupIndex: 0, priority: "critical", daysOffset: -7 },
        ],
      },
    ],
  },
];

export function getLitigationTemplate(id: string): LitigationTemplate | undefined {
  return LITIGATION_TEMPLATES.find(t => t.id === id);
}

export function getAllLitigationTemplates(): Pick<LitigationTemplate, "id" | "name" | "description" | "caseType" | "phases">[] {
  return LITIGATION_TEMPLATES.map(({ triggerDateRules, boards, ...rest }) => rest);
}
