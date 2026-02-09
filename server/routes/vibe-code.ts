import type { Express } from "express";
import { generateCompletion } from "../ai/providers";
import { storage } from "../storage";

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

interface BoardConfig {
  name: string;
  description: string;
  color: string;
  icon: string;
  columns: TemplateColumn[];
  groups: TemplateGroup[];
}

interface VibeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: "legal" | "business" | "operations" | "finance";
  config: BoardConfig;
}

const VIBE_TEMPLATES: VibeTemplate[] = [
  {
    id: "case-intake",
    name: "Case Intake Tracker",
    description: "Track and manage new case intake from initial contact through engagement",
    icon: "clipboard-list",
    color: "#3B82F6",
    category: "legal",
    config: {
      name: "Case Intake Tracker",
      description: "Track and manage new case intake from initial contact through engagement",
      color: "#3B82F6",
      icon: "clipboard-list",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-client-name", title: "Client Name", type: "text", width: 180, visible: true, order: 2 },
        { id: "col-practice-area", title: "Practice Area", type: "dropdown", width: 150, visible: true, order: 3 },
        { id: "col-intake-date", title: "Intake Date", type: "date", width: 120, visible: true, order: 4 },
        { id: "col-assigned", title: "Assigned To", type: "person", width: 130, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "New Inquiries",
          color: "#3B82F6",
          tasks: [
            { title: "Initial consultation - Johnson matter", status: "not-started", priority: "high" },
            { title: "Phone screening - Smith family dispute", status: "not-started", priority: "medium" },
            { title: "Review referral from partner firm", status: "not-started", priority: "low" },
          ],
        },
        {
          title: "Under Review",
          color: "#F59E0B",
          tasks: [
            { title: "Conflict check - Davis v. Corp Inc", status: "working-on-it", priority: "high" },
            { title: "Fee agreement draft - Williams estate", status: "working-on-it", priority: "medium" },
          ],
        },
        {
          title: "Engaged",
          color: "#10B981",
          tasks: [
            { title: "Retainer received - Thompson case", status: "done", priority: "medium" },
            { title: "Engagement letter signed - Park LLC", status: "done", priority: "high" },
          ],
        },
      ],
    },
  },
  {
    id: "deposition-scheduler",
    name: "Deposition Scheduler",
    description: "Schedule, prepare for, and track depositions across all active cases",
    icon: "calendar-clock",
    color: "#8B5CF6",
    category: "legal",
    config: {
      name: "Deposition Scheduler",
      description: "Schedule, prepare for, and track depositions across all active cases",
      color: "#8B5CF6",
      icon: "calendar-clock",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-deponent", title: "Deponent", type: "text", width: 180, visible: true, order: 1 },
        { id: "col-date", title: "Deposition Date", type: "date", width: 130, visible: true, order: 2 },
        { id: "col-location", title: "Location", type: "location", width: 180, visible: true, order: 3 },
        { id: "col-attorney", title: "Lead Attorney", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Upcoming Depositions",
          color: "#8B5CF6",
          tasks: [
            { title: "Deposition of Dr. Elena Martinez - expert witness", status: "not-started", priority: "critical" },
            { title: "Deposition of CFO - financial records review", status: "working-on-it", priority: "high" },
            { title: "Prepare outline for plaintiff deposition", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Preparation Required",
          color: "#F59E0B",
          tasks: [
            { title: "Review medical records for Dr. Lee deposition", status: "working-on-it", priority: "high" },
            { title: "Draft deposition notice for third-party witness", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Completed",
          color: "#10B981",
          tasks: [
            { title: "Deposition of John Harper - summarize key testimony", status: "done", priority: "medium" },
            { title: "Transcript review - Rivera deposition", status: "done", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "discovery-tracker",
    name: "Discovery Tracker",
    description: "Manage discovery requests, responses, and production deadlines",
    icon: "search",
    color: "#EF4444",
    category: "legal",
    config: {
      name: "Discovery Tracker",
      description: "Manage discovery requests, responses, and production deadlines",
      color: "#EF4444",
      icon: "search",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-type", title: "Discovery Type", type: "dropdown", width: 150, visible: true, order: 2 },
        { id: "col-deadline", title: "Response Deadline", type: "date", width: 140, visible: true, order: 3 },
        { id: "col-assigned", title: "Assigned To", type: "person", width: 130, visible: true, order: 4 },
        { id: "col-docs", title: "Documents", type: "files", width: 120, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "Outgoing Requests",
          color: "#3B82F6",
          tasks: [
            { title: "First set of interrogatories to defendant", status: "working-on-it", priority: "high" },
            { title: "Request for production - financial records", status: "not-started", priority: "critical" },
            { title: "Subpoena duces tecum - hospital records", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Incoming Requests",
          color: "#EF4444",
          tasks: [
            { title: "Respond to defendant's first interrogatories", status: "working-on-it", priority: "critical" },
            { title: "Produce documents per RFP Set 2", status: "stuck", priority: "high" },
            { title: "Review requests for admission", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Completed Discovery",
          color: "#10B981",
          tasks: [
            { title: "Initial disclosures filed", status: "done", priority: "medium" },
            { title: "Supplemental responses to interrogatories", status: "done", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "client-onboarding",
    name: "Client Onboarding",
    description: "Streamline the new client onboarding process from intake to active representation",
    icon: "user-plus",
    color: "#10B981",
    category: "business",
    config: {
      name: "Client Onboarding",
      description: "Streamline the new client onboarding process from intake to active representation",
      color: "#10B981",
      icon: "user-plus",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-client", title: "Client Name", type: "text", width: 180, visible: true, order: 1 },
        { id: "col-deadline", title: "Target Date", type: "date", width: 120, visible: true, order: 2 },
        { id: "col-assigned", title: "Responsible", type: "person", width: 130, visible: true, order: 3 },
        { id: "col-checkbox", title: "Completed", type: "checkbox", width: 100, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Initial Setup",
          color: "#10B981",
          tasks: [
            { title: "Conflict of interest check", status: "not-started", priority: "critical" },
            { title: "Prepare and send engagement letter", status: "not-started", priority: "high" },
            { title: "Collect client identification documents", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Documentation",
          color: "#3B82F6",
          tasks: [
            { title: "Open client file in system", status: "not-started", priority: "medium" },
            { title: "Set up billing and trust account", status: "not-started", priority: "high" },
            { title: "Schedule initial strategy meeting", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Active Onboarding",
          color: "#F59E0B",
          tasks: [
            { title: "Send welcome packet and portal credentials", status: "not-started", priority: "medium" },
            { title: "Assign team members and set permissions", status: "not-started", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "billing-dashboard",
    name: "Billing Dashboard",
    description: "Track billable hours, invoices, and payment collection across matters",
    icon: "dollar-sign",
    color: "#059669",
    category: "finance",
    config: {
      name: "Billing Dashboard",
      description: "Track billable hours, invoices, and payment collection across matters",
      color: "#059669",
      icon: "dollar-sign",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-client", title: "Client / Matter", type: "text", width: 200, visible: true, order: 1 },
        { id: "col-amount", title: "Amount", type: "number", width: 120, visible: true, order: 2 },
        { id: "col-due-date", title: "Due Date", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Unbilled Time",
          color: "#F59E0B",
          tasks: [
            { title: "Review and finalize October time entries", status: "working-on-it", priority: "high" },
            { title: "Prepare pre-bill for Anderson matter", status: "not-started", priority: "medium" },
            { title: "Reconcile paralegal time entries", status: "not-started", priority: "low" },
          ],
        },
        {
          title: "Outstanding Invoices",
          color: "#EF4444",
          tasks: [
            { title: "Invoice #1042 - 60 days overdue", status: "stuck", priority: "critical" },
            { title: "Follow up on partial payment - Chen Corp", status: "working-on-it", priority: "high" },
          ],
        },
        {
          title: "Collected",
          color: "#10B981",
          tasks: [
            { title: "Payment received - Martinez retainer", status: "done", priority: "medium" },
            { title: "Trust replenishment processed - Davis", status: "done", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "litigation-timeline",
    name: "Litigation Timeline",
    description: "Track litigation milestones, deadlines, and key dates for active cases",
    icon: "calendar-range",
    color: "#6366F1",
    category: "legal",
    config: {
      name: "Litigation Timeline",
      description: "Track litigation milestones, deadlines, and key dates for active cases",
      color: "#6366F1",
      icon: "calendar-range",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-deadline", title: "Deadline", type: "date", width: 120, visible: true, order: 2 },
        { id: "col-timeline", title: "Date Range", type: "timeline", width: 180, visible: true, order: 3 },
        { id: "col-assigned", title: "Responsible", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Pre-Trial Phase",
          color: "#6366F1",
          tasks: [
            { title: "File initial complaint", status: "done", priority: "critical" },
            { title: "Serve defendant within 90 days", status: "working-on-it", priority: "critical" },
            { title: "Answer/response deadline", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Discovery Phase",
          color: "#F59E0B",
          tasks: [
            { title: "Written discovery cutoff", status: "not-started", priority: "high" },
            { title: "Expert disclosure deadline", status: "not-started", priority: "high" },
            { title: "Deposition period closes", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Trial Preparation",
          color: "#EF4444",
          tasks: [
            { title: "Pre-trial conference", status: "not-started", priority: "critical" },
            { title: "Submit jury instructions", status: "not-started", priority: "high" },
            { title: "Trial date", status: "not-started", priority: "critical" },
          ],
        },
      ],
    },
  },
  {
    id: "contract-review",
    name: "Contract Review Pipeline",
    description: "Manage contract review workflow from submission through execution",
    icon: "file-check",
    color: "#0EA5E9",
    category: "legal",
    config: {
      name: "Contract Review Pipeline",
      description: "Manage contract review workflow from submission through execution",
      color: "#0EA5E9",
      icon: "file-check",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-contract-type", title: "Contract Type", type: "dropdown", width: 150, visible: true, order: 2 },
        { id: "col-counterparty", title: "Counterparty", type: "text", width: 180, visible: true, order: 3 },
        { id: "col-deadline", title: "Review Deadline", type: "date", width: 130, visible: true, order: 4 },
        { id: "col-reviewer", title: "Reviewer", type: "person", width: 130, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "Awaiting Review",
          color: "#F59E0B",
          tasks: [
            { title: "NDA with TechVentures Inc.", status: "not-started", priority: "medium" },
            { title: "Master Services Agreement - CloudPro", status: "not-started", priority: "high" },
            { title: "Lease amendment - Office Suite B", status: "not-started", priority: "low" },
          ],
        },
        {
          title: "In Review / Redlining",
          color: "#0EA5E9",
          tasks: [
            { title: "Employment agreement - new VP hire", status: "working-on-it", priority: "critical" },
            { title: "Vendor SLA review - DataSecure Corp", status: "working-on-it", priority: "medium" },
          ],
        },
        {
          title: "Executed",
          color: "#10B981",
          tasks: [
            { title: "Partnership agreement - Johnson & Co", status: "done", priority: "high" },
            { title: "Software license - CaseMaster Pro", status: "done", priority: "medium" },
          ],
        },
      ],
    },
  },
  {
    id: "compliance-checklist",
    name: "Compliance Checklist",
    description: "Track regulatory compliance requirements and audit readiness",
    icon: "shield-check",
    color: "#14B8A6",
    category: "operations",
    config: {
      name: "Compliance Checklist",
      description: "Track regulatory compliance requirements and audit readiness",
      color: "#14B8A6",
      icon: "shield-check",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-regulation", title: "Regulation / Rule", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-due-date", title: "Due Date", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-assigned", title: "Responsible", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Annual Requirements",
          color: "#14B8A6",
          tasks: [
            { title: "IOLTA trust account audit", status: "not-started", priority: "critical" },
            { title: "Continuing legal education compliance", status: "working-on-it", priority: "high" },
            { title: "Professional liability insurance renewal", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Ongoing Compliance",
          color: "#F59E0B",
          tasks: [
            { title: "Client fund segregation review", status: "working-on-it", priority: "critical" },
            { title: "Data privacy policy update (CCPA/GDPR)", status: "not-started", priority: "high" },
            { title: "Conflict of interest system check", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Completed",
          color: "#10B981",
          tasks: [
            { title: "Anti-money laundering training", status: "done", priority: "medium" },
            { title: "Ethics hotline verification", status: "done", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "court-filing",
    name: "Court Filing Tracker",
    description: "Track court filings, deadlines, and submission statuses across cases",
    icon: "gavel",
    color: "#DC2626",
    category: "legal",
    config: {
      name: "Court Filing Tracker",
      description: "Track court filings, deadlines, and submission statuses across cases",
      color: "#DC2626",
      icon: "gavel",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-case", title: "Case / Matter", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-filing-date", title: "Filing Deadline", type: "date", width: 130, visible: true, order: 3 },
        { id: "col-court", title: "Court", type: "text", width: 160, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Urgent Filings",
          color: "#DC2626",
          tasks: [
            { title: "Motion to compel - discovery dispute", status: "working-on-it", priority: "critical" },
            { title: "Opposition to summary judgment", status: "working-on-it", priority: "critical" },
            { title: "Emergency TRO application", status: "not-started", priority: "critical" },
          ],
        },
        {
          title: "Upcoming Filings",
          color: "#F59E0B",
          tasks: [
            { title: "Amended complaint - add new defendant", status: "not-started", priority: "high" },
            { title: "Status report due to court", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Filed & Confirmed",
          color: "#10B981",
          tasks: [
            { title: "Answer to cross-complaint filed", status: "done", priority: "medium" },
            { title: "Proof of service filed", status: "done", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "witness-management",
    name: "Witness Management",
    description: "Manage witness information, statements, and preparation for testimony",
    icon: "users",
    color: "#7C3AED",
    category: "legal",
    config: {
      name: "Witness Management",
      description: "Manage witness information, statements, and preparation for testimony",
      color: "#7C3AED",
      icon: "users",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-witness", title: "Witness Name", type: "text", width: 180, visible: true, order: 1 },
        { id: "col-type", title: "Witness Type", type: "dropdown", width: 140, visible: true, order: 2 },
        { id: "col-contact", title: "Contact Info", type: "email", width: 180, visible: true, order: 3 },
        { id: "col-assigned", title: "Attorney", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Identified - Not Contacted",
          color: "#7C3AED",
          tasks: [
            { title: "Contact eyewitness James Park", status: "not-started", priority: "critical" },
            { title: "Locate former employee Sarah Chen", status: "not-started", priority: "high" },
            { title: "Identify potential character witnesses", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Statement Collection",
          color: "#F59E0B",
          tasks: [
            { title: "Schedule interview with Dr. Ramirez", status: "working-on-it", priority: "high" },
            { title: "Prepare declaration for Officer Thompson", status: "working-on-it", priority: "high" },
          ],
        },
        {
          title: "Trial Ready",
          color: "#10B981",
          tasks: [
            { title: "Expert report finalized - forensic accountant", status: "done", priority: "critical" },
            { title: "Witness prep completed - Maria Lopez", status: "done", priority: "high" },
          ],
        },
      ],
    },
  },
  {
    id: "legal-research",
    name: "Legal Research Board",
    description: "Organize and track legal research projects, case law, and analysis",
    icon: "book-open",
    color: "#2563EB",
    category: "legal",
    config: {
      name: "Legal Research Board",
      description: "Organize and track legal research projects, case law, and analysis",
      color: "#2563EB",
      icon: "book-open",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-topic", title: "Research Topic", type: "text", width: 220, visible: true, order: 2 },
        { id: "col-deadline", title: "Deadline", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-assigned", title: "Researcher", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Active Research",
          color: "#2563EB",
          tasks: [
            { title: "Research duty of care standards - medical malpractice", status: "working-on-it", priority: "critical" },
            { title: "Survey jurisdiction-specific statute of limitations", status: "working-on-it", priority: "high" },
            { title: "Analyze recent appellate decisions on spoliation", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Pending Review",
          color: "#F59E0B",
          tasks: [
            { title: "Memo on admissibility of digital evidence", status: "pending-review", priority: "high" },
            { title: "Research brief on punitive damages cap", status: "pending-review", priority: "medium" },
          ],
        },
        {
          title: "Completed",
          color: "#10B981",
          tasks: [
            { title: "Case law summary - employment discrimination", status: "done", priority: "medium" },
            { title: "Statutory analysis - data breach notification", status: "done", priority: "low" },
          ],
        },
      ],
    },
  },
  {
    id: "motion-tracker",
    name: "Motion Tracker",
    description: "Manage motions, briefs, and responses throughout litigation",
    icon: "file-text",
    color: "#D946EF",
    category: "legal",
    config: {
      name: "Motion Tracker",
      description: "Manage motions, briefs, and responses throughout litigation",
      color: "#D946EF",
      icon: "file-text",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-motion-type", title: "Motion Type", type: "dropdown", width: 160, visible: true, order: 2 },
        { id: "col-filing-date", title: "Filing Date", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-assigned", title: "Drafter", type: "person", width: 130, visible: true, order: 4 },
        { id: "col-docs", title: "Attachments", type: "files", width: 120, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "Drafting",
          color: "#D946EF",
          tasks: [
            { title: "Motion for summary judgment", status: "working-on-it", priority: "critical" },
            { title: "Motion in limine - exclude expert testimony", status: "working-on-it", priority: "high" },
            { title: "Brief in support of class certification", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Filed - Awaiting Ruling",
          color: "#F59E0B",
          tasks: [
            { title: "Motion to dismiss - lack of jurisdiction", status: "pending-review", priority: "critical" },
            { title: "Motion for protective order", status: "pending-review", priority: "medium" },
          ],
        },
        {
          title: "Decided",
          color: "#10B981",
          tasks: [
            { title: "Motion to compel - GRANTED", status: "done", priority: "high" },
            { title: "Motion for continuance - GRANTED", status: "done", priority: "medium" },
          ],
        },
      ],
    },
  },
  {
    id: "settlement-negotiation",
    name: "Settlement Negotiation",
    description: "Track settlement discussions, offers, and negotiation progress",
    icon: "handshake",
    color: "#EA580C",
    category: "legal",
    config: {
      name: "Settlement Negotiation",
      description: "Track settlement discussions, offers, and negotiation progress",
      color: "#EA580C",
      icon: "handshake",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-case", title: "Case / Matter", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-amount", title: "Amount", type: "number", width: 130, visible: true, order: 3 },
        { id: "col-date", title: "Target Date", type: "date", width: 120, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Initial Offers",
          color: "#EA580C",
          tasks: [
            { title: "Draft demand letter - Henderson v. MegaCorp", status: "working-on-it", priority: "high" },
            { title: "Review initial offer from opposing counsel", status: "not-started", priority: "critical" },
            { title: "Calculate damages assessment", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Active Negotiations",
          color: "#F59E0B",
          tasks: [
            { title: "Mediation session preparation", status: "working-on-it", priority: "critical" },
            { title: "Counter-offer analysis and strategy", status: "working-on-it", priority: "high" },
          ],
        },
        {
          title: "Resolved",
          color: "#10B981",
          tasks: [
            { title: "Settlement agreement executed - Park v. BuildCo", status: "done", priority: "high" },
            { title: "Dismissal with prejudice filed", status: "done", priority: "medium" },
          ],
        },
      ],
    },
  },
  {
    id: "ip-portfolio",
    name: "IP Portfolio Manager",
    description: "Track intellectual property assets including patents, trademarks, and copyrights",
    icon: "lightbulb",
    color: "#CA8A04",
    category: "legal",
    config: {
      name: "IP Portfolio Manager",
      description: "Track intellectual property assets including patents, trademarks, and copyrights",
      color: "#CA8A04",
      icon: "lightbulb",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-ip-type", title: "IP Type", type: "dropdown", width: 130, visible: true, order: 1 },
        { id: "col-title", title: "Title / Mark", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-filing-date", title: "Filing Date", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-renewal", title: "Renewal Date", type: "date", width: 120, visible: true, order: 4 },
        { id: "col-assigned", title: "Responsible", type: "person", width: 130, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "Pending Applications",
          color: "#CA8A04",
          tasks: [
            { title: "Patent application - smart contract system", status: "working-on-it", priority: "high" },
            { title: "Trademark filing - brand logo refresh", status: "not-started", priority: "medium" },
            { title: "Copyright registration - software platform", status: "not-started", priority: "low" },
          ],
        },
        {
          title: "Active / Registered",
          color: "#10B981",
          tasks: [
            { title: "Patent #US12345 - renewal due Q2", status: "not-started", priority: "high" },
            { title: "Trademark monitoring - annual search", status: "working-on-it", priority: "medium" },
          ],
        },
        {
          title: "Enforcement Actions",
          color: "#EF4444",
          tasks: [
            { title: "Cease and desist - trademark infringement", status: "working-on-it", priority: "critical" },
            { title: "DMCA takedown request - copied content", status: "done", priority: "high" },
          ],
        },
      ],
    },
  },
  {
    id: "employee-handbook",
    name: "Employee Handbook Tracker",
    description: "Manage HR policies, procedures, and employee handbook updates",
    icon: "book-marked",
    color: "#0891B2",
    category: "operations",
    config: {
      name: "Employee Handbook Tracker",
      description: "Manage HR policies, procedures, and employee handbook updates",
      color: "#0891B2",
      icon: "book-marked",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-section", title: "Handbook Section", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-last-updated", title: "Last Updated", type: "date", width: 130, visible: true, order: 3 },
        { id: "col-assigned", title: "Owner", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Needs Update",
          color: "#EF4444",
          tasks: [
            { title: "Update remote work policy", status: "working-on-it", priority: "high" },
            { title: "Revise PTO and leave policies", status: "not-started", priority: "medium" },
            { title: "Update anti-harassment training requirements", status: "not-started", priority: "critical" },
          ],
        },
        {
          title: "Under Review",
          color: "#F59E0B",
          tasks: [
            { title: "Social media policy draft review", status: "pending-review", priority: "medium" },
            { title: "Benefits enrollment section update", status: "working-on-it", priority: "low" },
          ],
        },
        {
          title: "Current & Approved",
          color: "#10B981",
          tasks: [
            { title: "Code of conduct - approved Jan 2026", status: "done", priority: "high" },
            { title: "IT security policy - current", status: "done", priority: "medium" },
          ],
        },
      ],
    },
  },
  {
    id: "real-estate-closings",
    name: "Real Estate Closings",
    description: "Manage property transactions from contract through closing",
    icon: "building",
    color: "#059669",
    category: "business",
    config: {
      name: "Real Estate Closings",
      description: "Manage property transactions from contract through closing",
      color: "#059669",
      icon: "building",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-property", title: "Property Address", type: "text", width: 220, visible: true, order: 2 },
        { id: "col-closing-date", title: "Closing Date", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-assigned", title: "Attorney", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Due Diligence",
          color: "#3B82F6",
          tasks: [
            { title: "Title search and examination", status: "working-on-it", priority: "critical" },
            { title: "Environmental assessment review", status: "not-started", priority: "high" },
            { title: "Survey review and boundary confirmation", status: "not-started", priority: "medium" },
          ],
        },
        {
          title: "Pre-Closing",
          color: "#F59E0B",
          tasks: [
            { title: "Draft closing documents", status: "not-started", priority: "high" },
            { title: "Coordinate with lender for loan docs", status: "not-started", priority: "high" },
            { title: "Obtain title insurance commitment", status: "not-started", priority: "critical" },
          ],
        },
        {
          title: "Closed",
          color: "#10B981",
          tasks: [
            { title: "Record deed - 123 Oak Street", status: "done", priority: "high" },
            { title: "Disburse funds and close escrow", status: "done", priority: "critical" },
          ],
        },
      ],
    },
  },
  {
    id: "probate-case",
    name: "Probate Case Manager",
    description: "Track estate and probate case proceedings from filing to distribution",
    icon: "scroll-text",
    color: "#78716C",
    category: "legal",
    config: {
      name: "Probate Case Manager",
      description: "Track estate and probate case proceedings from filing to distribution",
      color: "#78716C",
      icon: "scroll-text",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-estate", title: "Estate / Decedent", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-deadline", title: "Deadline", type: "date", width: 120, visible: true, order: 3 },
        { id: "col-assigned", title: "Attorney", type: "person", width: 130, visible: true, order: 4 },
      ],
      groups: [
        {
          title: "Initial Filing",
          color: "#78716C",
          tasks: [
            { title: "File petition for probate", status: "working-on-it", priority: "critical" },
            { title: "Publish notice to creditors", status: "not-started", priority: "high" },
            { title: "Inventory and appraisal of assets", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Administration",
          color: "#F59E0B",
          tasks: [
            { title: "Pay outstanding debts and claims", status: "not-started", priority: "high" },
            { title: "File estate tax return", status: "not-started", priority: "critical" },
            { title: "Manage ongoing property maintenance", status: "working-on-it", priority: "medium" },
          ],
        },
        {
          title: "Distribution & Closing",
          color: "#10B981",
          tasks: [
            { title: "Prepare final accounting", status: "not-started", priority: "high" },
            { title: "Distribute assets per will/trust", status: "not-started", priority: "critical" },
          ],
        },
      ],
    },
  },
  {
    id: "immigration-pipeline",
    name: "Immigration Case Pipeline",
    description: "Track immigration cases from initial filing through adjudication",
    icon: "globe",
    color: "#0284C7",
    category: "legal",
    config: {
      name: "Immigration Case Pipeline",
      description: "Track immigration cases from initial filing through adjudication",
      color: "#0284C7",
      icon: "globe",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-visa-type", title: "Visa / Case Type", type: "dropdown", width: 150, visible: true, order: 2 },
        { id: "col-petitioner", title: "Petitioner", type: "text", width: 180, visible: true, order: 3 },
        { id: "col-deadline", title: "Filing Deadline", type: "date", width: 130, visible: true, order: 4 },
        { id: "col-assigned", title: "Attorney", type: "person", width: 130, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "Document Collection",
          color: "#0284C7",
          tasks: [
            { title: "Gather supporting docs - H-1B petition", status: "working-on-it", priority: "critical" },
            { title: "Obtain labor certification - PERM", status: "not-started", priority: "high" },
            { title: "Collect evidence for I-140 petition", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Filed - Pending",
          color: "#F59E0B",
          tasks: [
            { title: "I-485 adjustment of status - awaiting interview", status: "pending-review", priority: "critical" },
            { title: "N-400 naturalization application - biometrics scheduled", status: "working-on-it", priority: "high" },
          ],
        },
        {
          title: "Approved / Completed",
          color: "#10B981",
          tasks: [
            { title: "H-1B transfer approved - Tech Solutions Inc", status: "done", priority: "high" },
            { title: "EAD renewal received", status: "done", priority: "medium" },
          ],
        },
      ],
    },
  },
];

const VALID_COLUMN_TYPES = [
  "text", "long-text", "status", "date", "person", "progress", "timeline", "files", "time",
  "priority", "number", "numbers", "label", "tags", "checkbox", "dropdown", "email", "phone",
  "rating", "link", "vote", "approval", "location", "world-clock", "item-id", "creation-log",
  "last-updated", "auto-number", "progress-tracking", "button", "dependency", "week", "formula",
  "country", "color-picker", "time-tracking", "hour", "date-status", "timeline-status",
  "timeline-numeric", "ai-improve", "ai-write", "ai-extract", "ai-summarize", "ai-translate",
  "ai-sentiment", "ai-categorize",
];

const VALID_STATUSES = ["not-started", "working-on-it", "stuck", "done", "pending-review"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

async function generateBoardConfigWithAI(prompt: string): Promise<BoardConfig> {
  const systemPrompt = `You are a board configuration generator for a legal project management system similar to Monday.com. Given a natural language description, generate a board configuration as JSON.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "name": "Board Name",
  "description": "Board description",
  "color": "#hex",
  "icon": "lucide-icon-name",
  "columns": [
    { "id": "col-1", "title": "Column Name", "type": "column-type", "width": 200, "visible": true, "order": 0 }
  ],
  "groups": [
    {
      "title": "Group Name",
      "color": "#hex",
      "tasks": [
        { "title": "Sample task", "status": "not-started", "priority": "medium" }
      ]
    }
  ]
}

Valid column types: ${VALID_COLUMN_TYPES.join(", ")}

Valid task statuses: ${VALID_STATUSES.join(", ")}
Valid priorities: ${VALID_PRIORITIES.join(", ")}

Guidelines:
- Always include a "status" and "priority" column
- Create 3-6 relevant columns for the board type
- Create 2-3 groups with 2-4 sample tasks each
- Use realistic, contextual sample data relevant to legal practice
- Choose appropriate lucide icon names (e.g., "clipboard-list", "gavel", "scale", "file-text", "users", "calendar", "search", "shield-check")
- Use visually distinct hex colors for groups
- Column widths should be between 100 and 250 based on content type`;

  const responseText = await generateCompletion(
    [{ role: "user", content: `Generate a board configuration for: ${prompt}` }],
    { model: "claude-sonnet-4-20250514", maxTokens: 4096, system: systemPrompt, caller: "vibe_code_board_gen" }
  );

  if (!responseText) {
    throw new Error("No text response from AI");
  }

  let jsonStr = responseText.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const config: BoardConfig = JSON.parse(jsonStr);

  if (!config.name || !config.columns || !config.groups) {
    throw new Error("Invalid board configuration generated by AI");
  }

  config.columns = config.columns.map((col) => ({
    ...col,
    type: VALID_COLUMN_TYPES.includes(col.type) ? col.type : "text",
  }));

  config.groups = config.groups.map((group) => ({
    ...group,
    tasks: group.tasks.map((task) => ({
      ...task,
      status: VALID_STATUSES.includes(task.status) ? task.status : "not-started",
      priority: VALID_PRIORITIES.includes(task.priority) ? task.priority : "medium",
    })),
  }));

  return config;
}

async function createBoardFromConfig(config: BoardConfig): Promise<{ boardId: string; name: string }> {
  const board = await storage.createBoard({
    name: config.name,
    description: config.description || "",
    color: config.color || "#6366f1",
    icon: config.icon || "layout-grid",
    columns: config.columns,
  });

  for (let i = 0; i < config.groups.length; i++) {
    const groupConfig = config.groups[i];
    const group = await storage.createGroup({
      title: groupConfig.title,
      color: groupConfig.color || "#6366f1",
      collapsed: false,
      boardId: board.id,
      order: i,
    });

    for (const taskConfig of groupConfig.tasks) {
      await storage.createTask({
        title: taskConfig.title,
        description: taskConfig.description || "",
        status: taskConfig.status as any,
        priority: taskConfig.priority as any,
        progress: 0,
        boardId: board.id,
        groupId: group.id,
        tags: [],
        assignees: [],
        notes: "",
        customFields: {},
        subtasks: [],
      });
    }
  }

  return { boardId: board.id, name: board.name };
}

export function registerVibeCodeRoutes(app: Express): void {
  app.post("/api/vibe/generate", async (req, res) => {
    try {
      const { prompt, templateId } = req.body;

      if (!prompt && !templateId) {
        return res.status(400).json({ error: "Either prompt or templateId is required" });
      }

      let config: BoardConfig;

      if (templateId) {
        const template = VIBE_TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        config = template.config;
      } else {
        config = await generateBoardConfigWithAI(prompt);
      }

      const result = await createBoardFromConfig(config);
      res.json(result);
    } catch (error: any) {
      console.error("Vibe code generation error:", error);
      if (error instanceof SyntaxError) {
        return res.status(500).json({ error: "Failed to parse AI-generated board configuration" });
      }
      res.status(500).json({ error: error.message || "Failed to generate board" });
    }
  });

  app.get("/api/vibe/templates", async (_req, res) => {
    try {
      const templates = VIBE_TEMPLATES.map(({ config, ...metadata }) => metadata);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });
}
