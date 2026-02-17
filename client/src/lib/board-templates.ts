import type { ColumnType } from "@shared/schema";

export interface BoardTemplateColumn {
  key: string;
  title: string;
  type: ColumnType;
  width: number;
  options?: string[];
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  groups: { title: string; color: string }[];
  columns: BoardTemplateColumn[];
  category: "case-management" | "operations" | "financials";
}

export const STANDARD_STATUS_OPTIONS = ["Not Started", "Working on it", "Stuck", "Waiting for review", "Done"];
export const STANDARD_PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];

const UNIVERSAL_COLUMNS: BoardTemplateColumn[] = [
  { key: "owner", title: "Owner", type: "person", width: 110 },
  { key: "backup_owner", title: "Backup Owner", type: "person", width: 120 },
  { key: "due_date", title: "Due Date", type: "date", width: 110 },
  { key: "start_date", title: "Start Date", type: "date", width: 110 },
  { key: "status", title: "Status", type: "status", width: 120, options: STANDARD_STATUS_OPTIONS },
  { key: "priority", title: "Priority", type: "priority", width: 100 },
  { key: "last_updated", title: "Last Updated", type: "date", width: 110 },
];

function mergeUniversalColumns(templateCols: BoardTemplateColumn[]): BoardTemplateColumn[] {
  const existingKeys = new Set(templateCols.map(c => c.key));
  const merged = [...templateCols];
  for (const uc of UNIVERSAL_COLUMNS) {
    if (!existingKeys.has(uc.key)) {
      merged.push(uc);
    } else {
      const idx = merged.findIndex(c => c.key === uc.key);
      if (idx !== -1 && uc.key === "status") {
        merged[idx] = { ...merged[idx], options: STANDARD_STATUS_OPTIONS };
      }
    }
  }
  return merged;
}

const GROUP_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

function assignGroupColors(titles: string[]): { title: string; color: string }[] {
  return titles.map((title, i) => ({
    title,
    color: GROUP_COLORS[i % GROUP_COLORS.length],
  }));
}

export const boardTemplates: BoardTemplate[] = [
  {
    id: "clients_parties",
    name: "Clients & Parties",
    description: "Track clients, adverse parties, providers, facilities, and experts with conflict checks and engagement status.",
    icon: "users",
    color: "#3b82f6",
    category: "case-management",
    groups: assignGroupColors(["New Leads", "Active Clients", "Adverse Parties", "Providers/Facilities", "Experts", "Closed/Archived"]),
    columns: [
      { key: "party_type", title: "Party Type", type: "dropdown", width: 130, options: ["Client", "Defendant", "Witness", "Provider", "Facility", "Expert", "Adjuster", "Other"] },
      { key: "full_name", title: "Full Name / Entity", type: "text", width: 180 },
      { key: "role_in_case", title: "Role in Case", type: "text", width: 140 },
      { key: "phone", title: "Phone", type: "phone", width: 120 },
      { key: "email", title: "Email", type: "email", width: 160 },
      { key: "address", title: "Address", type: "text", width: 180 },
      { key: "preferred_contact", title: "Preferred Contact", type: "dropdown", width: 140, options: ["Call", "Text", "Email", "Portal", "Mail"] },
      { key: "dob", title: "DOB", type: "date", width: 100 },
      { key: "conflict_check", title: "Conflict Check", type: "status", width: 130, options: ["Not Run", "Clear", "Potential", "Conflict"] },
      { key: "engagement_status", title: "Engagement Status", type: "status", width: 140, options: ["Prospect", "Signed", "Declined", "Closed"] },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
      { key: "tags", title: "Tags", type: "tags", width: 140 },
    ],
  },
  {
    id: "matters",
    name: "Matters",
    description: "Full lifecycle matter management with case staging, SOL tracking, damages snapshots, and cross-board rollups.",
    icon: "briefcase",
    color: "#6366f1",
    category: "case-management",
    groups: assignGroupColors(["Intake", "Pre-Suit", "Litigation", "Trial Prep", "Post-Trial", "Closed"]),
    columns: [
      { key: "matter_name", title: "Matter Name", type: "text", width: 200 },
      { key: "matter_type", title: "Matter Type", type: "dropdown", width: 120, options: ["PI", "Med Mal", "Contract", "Employment", "Property", "Other"] },
      { key: "stage", title: "Stage", type: "status", width: 130, options: ["Intake", "Demand", "Pre-Suit", "Filed", "Discovery", "Motions", "Settlement", "Trial", "Appeal", "Closed"] },
      { key: "jurisdiction", title: "Jurisdiction", type: "text", width: 120 },
      { key: "court", title: "Court", type: "text", width: 140 },
      { key: "case_number", title: "Case Number", type: "text", width: 120 },
      { key: "filing_date", title: "Filing Date", type: "date", width: 110 },
      { key: "sol_deadline", title: "SOL Deadline", type: "date", width: 110 },
      { key: "primary_attorney", title: "Primary Attorney", type: "person", width: 130 },
      { key: "paralegal", title: "Paralegal", type: "person", width: 110 },
      { key: "opposing_counsel", title: "Opposing Counsel", type: "text", width: 140 },
      { key: "carrier", title: "Insurance/Carrier", type: "text", width: 140 },
      { key: "case_value_range", title: "Case Value Range", type: "dropdown", width: 130, options: ["<$25k", "$25-100k", "$100-250k", "$250-1M", "$1M+"] },
      { key: "fee_type", title: "Fee Type", type: "dropdown", width: 110, options: ["Contingency", "Hourly", "Hybrid"] },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
    ],
  },
  {
    id: "intake",
    name: "Intake & Screening",
    description: "New lead screening with conflict checks, retainer tracking, red flag assessment, and accept/decline workflow.",
    icon: "clipboard-check",
    color: "#10b981",
    category: "case-management",
    groups: assignGroupColors(["New", "Pending Docs", "Reviewing", "Accepted", "Declined", "Referred Out"]),
    columns: [
      { key: "lead_source", title: "Lead Source", type: "dropdown", width: 120, options: ["Referral", "Website", "Ads", "Prior Client", "Other"] },
      { key: "matter_type", title: "Matter Type", type: "dropdown", width: 120, options: ["PI", "Med Mal", "Contract", "Employment", "Property", "Other"] },
      { key: "incident_date", title: "Incident Date", type: "date", width: 110 },
      { key: "sol_estimate", title: "SOL Estimate", type: "date", width: 110 },
      { key: "conflict_check", title: "Conflict Check", type: "status", width: 130, options: ["Not Run", "Clear", "Potential", "Conflict"] },
      { key: "retainer_sent", title: "Retainer Sent", type: "status", width: 120, options: ["Not Started", "Sent", "Resent", "Not Needed", "Done"] },
      { key: "retainer_signed", title: "Retainer Signed", type: "status", width: 120, options: ["No", "Yes"] },
      { key: "initial_interview", title: "Initial Interview", type: "date", width: 120 },
      { key: "red_flags", title: "Red Flags", type: "dropdown", width: 110, options: ["None", "Timing", "Liability", "Damages", "Credibility", "Other"] },
      { key: "decision", title: "Decision", type: "status", width: 110, options: ["Pending", "Accept", "Decline", "Refer"] },
      { key: "reason_declined", title: "Reason Declined", type: "text", width: 160 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "deadlines",
    name: "Deadlines & Calendar",
    description: "Hard/soft deadline tracking with trigger-based calculation, rule references, reminder schedules, and escalation.",
    icon: "alarm-clock",
    color: "#ef4444",
    category: "case-management",
    groups: assignGroupColors(["Immediate", "This Week", "This Month", "Future", "Completed"]),
    columns: [
      { key: "deadline_type", title: "Deadline Type", type: "dropdown", width: 130, options: ["SOL", "Filing", "Response", "Discovery", "Hearing", "Expert", "Mediation", "Trial", "Appeal", "Other"] },
      { key: "trigger_event", title: "Trigger Event", type: "text", width: 140 },
      { key: "trigger_date", title: "Trigger Date", type: "date", width: 110 },
      { key: "due_date", title: "Due Date", type: "date", width: 110 },
      { key: "hard_soft", title: "Hard/Soft", type: "status", width: 100, options: ["Hard", "Soft"] },
      { key: "responsible", title: "Responsible", type: "person", width: 120 },
      { key: "reminder_schedule", title: "Reminders", type: "dropdown", width: 120, options: ["30/14/7/3/1", "Custom"] },
      { key: "rule_reference", title: "Rule Reference", type: "text", width: 140 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
    ],
  },
  {
    id: "pleadings",
    name: "Pleadings & Filings",
    description: "Document drafting pipeline with attorney review, filing/service tracking, and confirmation numbers.",
    icon: "file-text",
    color: "#8b5cf6",
    category: "case-management",
    groups: assignGroupColors(["To Draft", "Drafting", "Attorney Review", "Final", "Filed/Served", "Closed"]),
    columns: [
      { key: "document_type", title: "Document Type", type: "dropdown", width: 130, options: ["Complaint", "Answer", "Motion", "Memo", "Notice", "Disclosure", "Demand", "Settlement", "Other"] },
      { key: "jurisdiction_court", title: "Jurisdiction/Court", type: "text", width: 140 },
      { key: "draft_owner", title: "Draft Owner", type: "person", width: 120 },
      { key: "review_owner", title: "Review Owner", type: "person", width: 120 },
      { key: "version", title: "Version", type: "text", width: 80 },
      { key: "filing_method", title: "Filing Method", type: "dropdown", width: 120, options: ["E-file", "Hand-file", "Email", "Mail"] },
      { key: "service_method", title: "Service Method", type: "dropdown", width: 120, options: ["E-service", "Personal", "Certified", "Email", "Other"] },
      { key: "filing_confirmation", title: "Filing Confirmation #", type: "text", width: 140 },
      { key: "served_date", title: "Served Date", type: "date", width: 110 },
      { key: "due_date", title: "Due Date", type: "date", width: 110 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "attachments", title: "Attachments", type: "files", width: 120 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "discovery",
    name: "Discovery Tracker",
    description: "Track outbound/inbound discovery with response deadlines, deficiency tracking, and motion to compel workflow.",
    icon: "search",
    color: "#f59e0b",
    category: "case-management",
    groups: assignGroupColors(["Outbound (We Send)", "Inbound (We Receive)", "Meet & Confer", "Motions to Compel", "Completed"]),
    columns: [
      { key: "discovery_type", title: "Discovery Type", type: "dropdown", width: 130, options: ["Interrogatories", "RFP", "RFA", "Initial Disclosures", "Subpoena", "Depo Notice", "Other"] },
      { key: "direction", title: "Direction", type: "status", width: 110, options: ["Outbound", "Inbound"] },
      { key: "sent_received_date", title: "Sent/Received", type: "date", width: 120 },
      { key: "response_due", title: "Response Due", type: "date", width: 110 },
      { key: "response_received", title: "Response Received", type: "date", width: 120 },
      { key: "deficiencies", title: "Deficiencies", type: "status", width: 120, options: ["None", "Potential", "Confirmed", "Cured"] },
      { key: "meet_confer_date", title: "Meet & Confer", type: "date", width: 120 },
      { key: "mtc_needed", title: "MTC Needed", type: "status", width: 120, options: ["No", "Maybe", "Yes", "Filed"] },
      { key: "bates_range", title: "Bates Range", type: "text", width: 120 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "medical_records",
    name: "Medical Records & Bills",
    description: "Track authorizations, record requests, provider billing, lien flags, and medical summary completion.",
    icon: "heart-pulse",
    color: "#ec4899",
    category: "case-management",
    groups: assignGroupColors(["Authorizations Needed", "Requests Sent", "Partial Received", "Complete Received", "Summarized", "Issues/Follow-up"]),
    columns: [
      { key: "record_type", title: "Record Type", type: "dropdown", width: 120, options: ["ER", "Hospital", "Imaging", "Primary Care", "Specialist", "PT/OT", "Mental Health", "Pharmacy", "Billing", "EMS", "Other"] },
      { key: "auth_sent", title: "HIPAA/Auth Sent", type: "date", width: 120 },
      { key: "request_sent", title: "Request Sent", type: "date", width: 110 },
      { key: "followup_date", title: "Follow-up Date", type: "date", width: 110 },
      { key: "received_date", title: "Received Date", type: "date", width: 110 },
      { key: "pages_received", title: "Pages", type: "number", width: 80 },
      { key: "cost", title: "Cost", type: "number", width: 90 },
      { key: "billing_total", title: "Billing Total", type: "number", width: 100 },
      { key: "lien_flag", title: "Lien Flag", type: "status", width: 100, options: ["No", "Possible", "Yes"] },
      { key: "summary_completed", title: "Summary", type: "status", width: 110, options: ["Not Started", "In Progress", "Done"] },
      { key: "key_findings", title: "Key Findings", type: "long-text", width: 180 },
      { key: "bates_range", title: "Bates Range", type: "text", width: 120 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
    ],
  },
  {
    id: "treatment_timeline",
    name: "Treatment Timeline",
    description: "Chronological treatment events with objective findings, subjective complaints, and causation analysis.",
    icon: "activity",
    color: "#14b8a6",
    category: "case-management",
    groups: assignGroupColors(["Pre-Incident", "Incident Day", "Acute Care", "Follow-up", "Long-term", "Pre-Existing Conditions"]),
    columns: [
      { key: "date_of_service", title: "Date of Service", type: "date", width: 120 },
      { key: "event_type", title: "Event Type", type: "dropdown", width: 120, options: ["Visit", "Procedure", "Imaging", "Diagnosis", "Medication", "PT", "Surgery", "Other"] },
      { key: "summary", title: "Summary", type: "long-text", width: 200 },
      { key: "objective_findings", title: "Objective Findings", type: "long-text", width: 180 },
      { key: "subjective_complaints", title: "Subjective Complaints", type: "long-text", width: 180 },
      { key: "causation_note", title: "Causation", type: "status", width: 110, options: ["Supports", "Neutral", "Hurts", "Unknown"] },
      { key: "damages_tags", title: "Damages Tag", type: "tags", width: 140 },
      { key: "bates_range", title: "Bates Range", type: "text", width: 120 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "damages",
    name: "Damages & Economic Loss",
    description: "Itemized damages tracking across medical specials, lost wages, future care, property, and lien/subrogation.",
    icon: "dollar-sign",
    color: "#f97316",
    category: "financials",
    groups: assignGroupColors(["Medical Specials", "Lost Wages", "Future Care", "Property", "General Damages", "Liens/Subrogation"]),
    columns: [
      { key: "category", title: "Category", type: "text", width: 120 },
      { key: "line_item", title: "Line Item", type: "text", width: 180 },
      { key: "amount", title: "Amount", type: "number", width: 110 },
      { key: "source", title: "Source", type: "dropdown", width: 110, options: ["Client", "Employer", "Provider", "Expert", "Other"] },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "attachments", title: "Attachments", type: "files", width: 120 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "depositions",
    name: "Depositions & Witnesses",
    description: "Deposition scheduling, preparation, transcript tracking, and key admissions documentation.",
    icon: "mic",
    color: "#84cc16",
    category: "case-management",
    groups: assignGroupColors(["To Schedule", "Noticed", "Prep", "Taken", "Designations", "Completed"]),
    columns: [
      { key: "type", title: "Type", type: "dropdown", width: 120, options: ["Fact", "Treating Provider", "Expert", "Corporate Rep", "Other"] },
      { key: "notice_served", title: "Notice Served", type: "date", width: 110 },
      { key: "depo_date", title: "Depo Date", type: "date", width: 110 },
      { key: "location_platform", title: "Location/Platform", type: "text", width: 160 },
      { key: "court_reporter", title: "Court Reporter", type: "text", width: 130 },
      { key: "videographer", title: "Videographer", type: "text", width: 130 },
      { key: "transcript_received", title: "Transcript Received", type: "date", width: 130 },
      { key: "key_admissions", title: "Key Admissions", type: "long-text", width: 200 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "experts",
    name: "Experts",
    description: "Expert retention, disclosure deadlines, report tracking, fee management, and challenge monitoring.",
    icon: "graduation-cap",
    color: "#8b5cf6",
    category: "case-management",
    groups: assignGroupColors(["Potential", "Retained", "Working", "Report Served", "Deposed", "Trial Ready", "Removed"]),
    columns: [
      { key: "specialty", title: "Specialty", type: "text", width: 140 },
      { key: "scope", title: "Scope", type: "long-text", width: 180 },
      { key: "retention_date", title: "Retention Date", type: "date", width: 120 },
      { key: "fee_structure", title: "Fee Structure", type: "text", width: 130 },
      { key: "disclosure_due", title: "Disclosure Due", type: "date", width: 120 },
      { key: "report_due", title: "Report Due", type: "date", width: 110 },
      { key: "report_served", title: "Report Served", type: "date", width: 120 },
      { key: "challenges", title: "Challenges", type: "status", width: 120, options: ["None", "Anticipated", "Filed", "Won", "Lost"] },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "settlement",
    name: "Settlement & Negotiation",
    description: "Demand/offer tracking, mediation scheduling, counter negotiations, and release/payment status.",
    icon: "handshake",
    color: "#10b981",
    category: "financials",
    groups: assignGroupColors(["Demand Prep", "Demand Sent", "Negotiating", "Mediation Set", "Mediation Done", "Settled", "Impasse"]),
    columns: [
      { key: "demand_amount", title: "Demand Amount", type: "number", width: 120 },
      { key: "demand_sent", title: "Demand Sent", type: "date", width: 110 },
      { key: "offer_amount", title: "Offer Amount", type: "number", width: 120 },
      { key: "offer_date", title: "Offer Date", type: "date", width: 110 },
      { key: "counter_amount", title: "Counter Amount", type: "number", width: 120 },
      { key: "counter_date", title: "Counter Date", type: "date", width: 110 },
      { key: "mediator", title: "Mediator", type: "text", width: 140 },
      { key: "mediation_date", title: "Mediation Date", type: "date", width: 120 },
      { key: "release_docs_status", title: "Release/Docs", type: "status", width: 120, options: ["Not Started", "Drafting", "Review", "Signed", "Paid"] },
      { key: "payment_received", title: "Payment Received", type: "date", width: 120 },
      { key: "status", title: "Status", type: "status", width: 120 },
      { key: "priority", title: "Priority", type: "priority", width: 100 },
      { key: "owner", title: "Owner", type: "person", width: 110 },
      { key: "notes", title: "Notes", type: "long-text", width: 160 },
    ],
  },
  {
    id: "task_library",
    name: "Litigation Task Library",
    description: "Reusable task templates organized by litigation phase with default owner roles and timing guidance.",
    icon: "library",
    color: "#6366f1",
    category: "operations",
    groups: assignGroupColors(["Intake Checklist", "Pre-Suit / Demand", "Filing & Service", "Discovery Phase", "Motions Phase", "Experts Phase", "Mediation Phase", "Trial Prep", "Post-Settlement Closeout"]),
    columns: [
      { key: "phase", title: "Phase", type: "dropdown", width: 120, options: ["Intake", "Demand", "Pre-Suit", "Filed", "Discovery", "Motions", "Settlement", "Trial", "Appeal", "Closed"] },
      { key: "task_name", title: "Task Name", type: "text", width: 200 },
      { key: "default_owner_role", title: "Default Owner Role", type: "dropdown", width: 140, options: ["Attorney", "Paralegal", "Intake", "Records", "Billing", "Admin"] },
      { key: "default_timing", title: "Default Timing", type: "text", width: 130 },
      { key: "dependencies", title: "Dependencies", type: "text", width: 160 },
      { key: "notes", title: "Notes", type: "long-text", width: 200 },
    ],
  },
];

export function getTemplateColumns(template: BoardTemplate): Array<{
  id: string;
  title: string;
  type: ColumnType;
  width: number;
  visible: boolean;
  order: number;
  options?: string[];
}> {
  const merged = mergeUniversalColumns(template.columns);
  return merged.map((col, index) => ({
    id: col.key,
    title: col.title,
    type: col.type,
    width: col.width,
    visible: true,
    order: index,
    ...(col.options ? { options: col.options } : {}),
  }));
}

export function getTemplateById(id: string): BoardTemplate | undefined {
  return boardTemplates.find(t => t.id === id);
}

export const templateCategories = [
  { id: "case-management" as const, label: "Case Management", description: "Core litigation tracking boards" },
  { id: "financials" as const, label: "Financial", description: "Damages, billing, and settlement" },
  { id: "operations" as const, label: "Operations", description: "Task libraries and workflow management" },
];
