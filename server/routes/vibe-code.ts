import type { Express } from "express";
import { generateCompletion } from "../ai/providers";
import { storage } from "../storage";
import type { InsertAutomationRule } from "@shared/schema";

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

interface BoardConfig {
  name: string;
  description: string;
  color: string;
  icon: string;
  columns: TemplateColumn[];
  groups: TemplateGroup[];
  automations: AutomationDef[];
  matterId?: string;
  clientId?: string;
}

interface VibeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: "legal" | "business" | "operations" | "finance";
  automationCount: number;
  automationSummary: string[];
  config: BoardConfig;
}

const VIBE_TEMPLATES: VibeTemplate[] = [
  {
    id: "case-intake",
    name: "Case Intake Tracker",
    description: "Track new case intake from contact through engagement with automated notifications and escalation",
    icon: "clipboard-list",
    color: "#3B82F6",
    category: "legal",
    automationCount: 4,
    automationSummary: [
      "Auto-notify when new intake arrives",
      "Escalate priority if stuck > 48hrs",
      "Move to Engaged when status = done",
      "AI categorize practice area on creation",
    ],
    config: {
      name: "Case Intake Tracker",
      description: "Track new case intake from contact through engagement",
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
          ],
        },
      ],
      automations: [
        {
          name: "Notify on new intake",
          description: "Send notification when a new case intake item is created",
          triggerType: "item_created",
          actionType: "send_notification",
          actionConfig: { message: "New case intake item created - review required" },
        },
        {
          name: "Escalate stuck items",
          description: "Bump priority to critical when an item has been stuck",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "stuck",
          actionType: "change_priority",
          actionConfig: { priority: "critical" },
        },
        {
          name: "Auto-complete on engagement",
          description: "Move to done group when status is marked done",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "send_notification",
          actionConfig: { message: "Case intake complete - client engaged" },
        },
        {
          name: "AI categorize practice area",
          description: "Use AI to auto-categorize the practice area based on task title",
          triggerType: "item_created",
          actionType: "ai_categorize",
          actionConfig: { targetColumn: "col-practice-area", categories: ["Family Law", "Criminal Defense", "Personal Injury", "Business Law", "Estate Planning", "Real Estate", "Immigration", "Employment"] },
        },
      ],
    },
  },
  {
    id: "discovery-tracker",
    name: "Discovery Tracker",
    description: "Manage discovery requests and responses with deadline alerts and AI document analysis",
    icon: "folder-search",
    color: "#EF4444",
    category: "legal",
    automationCount: 5,
    automationSummary: [
      "Alert when response deadline approaching",
      "Escalate overdue discovery items",
      "AI extract key terms from documents",
      "Notify when file uploaded",
      "Auto-prioritize incoming requests",
    ],
    config: {
      name: "Discovery Tracker",
      description: "Manage discovery requests, responses, and production deadlines",
      color: "#EF4444",
      icon: "folder-search",
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
          ],
        },
        {
          title: "Completed Discovery",
          color: "#10B981",
          tasks: [
            { title: "Initial disclosures filed", status: "done", priority: "medium" },
          ],
        },
      ],
      automations: [
        {
          name: "Deadline approaching alert",
          description: "Notify assigned attorney when response deadline is within 3 days",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Discovery response deadline approaching - action required within 3 days", daysBeforeDeadline: 3 },
        },
        {
          name: "Escalate overdue items",
          description: "Change priority to critical when deadline has passed",
          triggerType: "due_date_passed",
          actionType: "change_priority",
          actionConfig: { priority: "critical" },
        },
        {
          name: "AI extract key terms",
          description: "Automatically extract key legal terms when a document is uploaded",
          triggerType: "file_uploaded",
          actionType: "ai_extract",
          actionConfig: { targetColumn: "col-type", extractionFields: ["document_type", "parties", "key_dates", "request_numbers"] },
        },
        {
          name: "Notify on file upload",
          description: "Alert team when discovery documents are uploaded",
          triggerType: "file_uploaded",
          actionType: "send_notification",
          actionConfig: { message: "New discovery document uploaded - review needed" },
        },
        {
          name: "Auto-prioritize incoming",
          description: "Set incoming discovery requests to high priority by default",
          triggerType: "item_created",
          actionType: "change_priority",
          actionConfig: { priority: "high" },
        },
      ],
    },
  },
  {
    id: "litigation-timeline",
    name: "Litigation Timeline",
    description: "Track litigation milestones with automated deadline warnings and status escalation",
    icon: "calendar-range",
    color: "#6366F1",
    category: "legal",
    automationCount: 4,
    automationSummary: [
      "Warn 7 days before critical deadlines",
      "Escalate missed deadlines to critical",
      "Notify team on status changes",
      "AI summarize completed milestones",
    ],
    config: {
      name: "Litigation Timeline",
      description: "Track litigation milestones, deadlines, and key dates",
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
          ],
        },
        {
          title: "Trial Preparation",
          color: "#EF4444",
          tasks: [
            { title: "Pre-trial conference", status: "not-started", priority: "critical" },
            { title: "Trial date", status: "not-started", priority: "critical" },
          ],
        },
      ],
      automations: [
        {
          name: "Critical deadline warning",
          description: "Alert 7 days before any critical deadline",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Critical litigation deadline approaching in 7 days", daysBeforeDeadline: 7 },
        },
        {
          name: "Missed deadline escalation",
          description: "Escalate to critical priority when a deadline passes",
          triggerType: "due_date_passed",
          actionType: "change_priority",
          actionConfig: { priority: "critical" },
        },
        {
          name: "Status change notification",
          description: "Notify team when a milestone status changes",
          triggerType: "status_changed",
          actionType: "send_notification",
          actionConfig: { message: "Litigation milestone status updated" },
        },
        {
          name: "AI summarize completed milestone",
          description: "Generate a summary when a milestone is marked done",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "ai_summarize",
          actionConfig: { targetColumn: "col-notes", maxLength: "brief", format: "paragraph" },
        },
      ],
    },
  },
  {
    id: "court-filing",
    name: "Court Filing Tracker",
    description: "Track filings with deadline automation, priority escalation, and approval workflows",
    icon: "gavel",
    color: "#DC2626",
    category: "legal",
    automationCount: 5,
    automationSummary: [
      "Alert 5 days before filing deadline",
      "Auto-escalate overdue filings",
      "Request approval before filing",
      "Notify on document upload",
      "Log compliance on completion",
    ],
    config: {
      name: "Court Filing Tracker",
      description: "Track court filings, deadlines, and submission statuses",
      color: "#DC2626",
      icon: "gavel",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-case", title: "Case / Matter", type: "text", width: 200, visible: true, order: 2 },
        { id: "col-filing-date", title: "Filing Deadline", type: "date", width: 130, visible: true, order: 3 },
        { id: "col-court", title: "Court", type: "text", width: 160, visible: true, order: 4 },
        { id: "col-approval", title: "Approval", type: "approval", width: 130, visible: true, order: 5 },
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
          ],
        },
      ],
      automations: [
        {
          name: "Filing deadline warning",
          description: "Alert 5 days before filing deadline",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Court filing deadline in 5 days - prepare documents", daysBeforeDeadline: 5 },
        },
        {
          name: "Overdue filing escalation",
          description: "Escalate priority when filing deadline passes",
          triggerType: "due_date_passed",
          actionType: "change_priority",
          actionConfig: { priority: "critical" },
        },
        {
          name: "Request approval before filing",
          description: "Require partner approval when filing moves to working-on-it",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "working-on-it",
          actionType: "request_approval",
          actionConfig: { approverRole: "partner", message: "Filing ready for review before submission" },
        },
        {
          name: "Document upload alert",
          description: "Notify when court documents are uploaded",
          triggerType: "file_uploaded",
          actionType: "send_notification",
          actionConfig: { message: "Court filing document uploaded - verify before submission" },
        },
        {
          name: "Log compliance on completion",
          description: "Create compliance log entry when filing is confirmed",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "log_compliance",
          actionConfig: { logType: "court_filing_completed", message: "Filing submitted and confirmed by court" },
        },
      ],
    },
  },
  {
    id: "contract-review",
    name: "Contract Review Pipeline",
    description: "Manage contract lifecycle with AI clause analysis, approval gates, and deadline tracking",
    icon: "file-check",
    color: "#0EA5E9",
    category: "legal",
    automationCount: 4,
    automationSummary: [
      "AI extract key clauses on upload",
      "Require approval before execution",
      "Alert on review deadline approaching",
      "Notify counterparty on status change",
    ],
    config: {
      name: "Contract Review Pipeline",
      description: "Manage contract review from submission through execution",
      color: "#0EA5E9",
      icon: "file-check",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-contract-type", title: "Contract Type", type: "dropdown", width: 150, visible: true, order: 2 },
        { id: "col-counterparty", title: "Counterparty", type: "text", width: 180, visible: true, order: 3 },
        { id: "col-deadline", title: "Review Deadline", type: "date", width: 130, visible: true, order: 4 },
        { id: "col-approval", title: "Approval", type: "approval", width: 130, visible: true, order: 5 },
      ],
      groups: [
        {
          title: "Awaiting Review",
          color: "#F59E0B",
          tasks: [
            { title: "NDA with TechVentures Inc.", status: "not-started", priority: "medium" },
            { title: "Master Services Agreement - CloudPro", status: "not-started", priority: "high" },
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
          ],
        },
      ],
      automations: [
        {
          name: "AI extract contract clauses",
          description: "Extract key clauses and terms when contract document is uploaded",
          triggerType: "file_uploaded",
          actionType: "ai_extract",
          actionConfig: { targetColumn: "col-contract-type", extractionFields: ["contract_type", "key_terms", "termination_clause", "liability_caps", "renewal_terms"] },
        },
        {
          name: "Require execution approval",
          description: "Gate contract execution behind partner approval",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "request_approval",
          actionConfig: { approverRole: "partner", message: "Contract ready for execution - final approval required" },
        },
        {
          name: "Review deadline approaching",
          description: "Alert when contract review deadline is near",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Contract review deadline approaching", daysBeforeDeadline: 3 },
        },
        {
          name: "Status change notification",
          description: "Notify team when contract moves through pipeline stages",
          triggerType: "status_changed",
          actionType: "send_notification",
          actionConfig: { message: "Contract review status updated" },
        },
      ],
    },
  },
  {
    id: "billing-dashboard",
    name: "Billing Dashboard",
    description: "Track billable hours and invoices with overdue alerts, AI categorization, and collection automation",
    icon: "dollar-sign",
    color: "#059669",
    category: "finance",
    automationCount: 4,
    automationSummary: [
      "Alert on overdue invoices",
      "Escalate 60+ day receivables",
      "AI categorize billing entries",
      "Notify on payment received",
    ],
    config: {
      name: "Billing Dashboard",
      description: "Track billable hours, invoices, and payment collection",
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
          ],
        },
      ],
      automations: [
        {
          name: "Overdue invoice alert",
          description: "Alert when invoice payment deadline passes",
          triggerType: "due_date_passed",
          actionType: "send_notification",
          actionConfig: { message: "Invoice payment overdue - follow up required" },
        },
        {
          name: "Escalate aged receivables",
          description: "Bump priority to critical when invoice is stuck (60+ days)",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "stuck",
          actionType: "change_priority",
          actionConfig: { priority: "critical" },
        },
        {
          name: "AI categorize billing",
          description: "Auto-categorize billing entries by matter type",
          triggerType: "item_created",
          actionType: "ai_categorize",
          actionConfig: { targetColumn: "col-client", categories: ["Retainer", "Hourly", "Contingency", "Flat Fee", "Trust Replenishment"] },
        },
        {
          name: "Payment received notification",
          description: "Notify billing team when payment is collected",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "send_notification",
          actionConfig: { message: "Payment collected - update trust accounting" },
        },
      ],
    },
  },
  {
    id: "client-onboarding",
    name: "Client Onboarding",
    description: "Streamline onboarding with automated task sequencing, compliance checks, and AI-powered intake",
    icon: "user-plus",
    color: "#10B981",
    category: "business",
    automationCount: 4,
    automationSummary: [
      "Auto-assign tasks on creation",
      "Compliance check before engagement",
      "Notify client portal setup",
      "AI write welcome email draft",
    ],
    config: {
      name: "Client Onboarding",
      description: "Streamline new client onboarding from intake to active representation",
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
      automations: [
        {
          name: "Auto-assign onboarding tasks",
          description: "Notify responsible person when new onboarding item is created",
          triggerType: "item_created",
          actionType: "send_notification",
          actionConfig: { message: "New onboarding task assigned to you" },
        },
        {
          name: "Compliance gate",
          description: "Run compliance check when conflict check moves to done",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "log_compliance",
          actionConfig: { logType: "conflict_check_completed", message: "Conflict of interest check completed - proceed with onboarding" },
        },
        {
          name: "Portal setup notification",
          description: "Notify admin when onboarding reaches active phase",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "working-on-it",
          actionType: "send_notification",
          actionConfig: { message: "Client onboarding active - set up portal access" },
        },
        {
          name: "AI draft welcome email",
          description: "Auto-generate welcome email draft when client is engaged",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "ai_write",
          actionConfig: { targetColumn: "col-notes", customInstructions: "Write a professional welcome email to a new legal client. Include next steps, what to expect, and how to reach their attorney." },
        },
      ],
    },
  },
  {
    id: "compliance-checklist",
    name: "Compliance Checklist",
    description: "Track regulatory compliance with automated deadline alerts, audit logging, and escalation",
    icon: "shield",
    color: "#14B8A6",
    category: "operations",
    automationCount: 4,
    automationSummary: [
      "Alert 14 days before compliance deadline",
      "Log all compliance completions",
      "Escalate overdue compliance items",
      "Notify leadership on critical items",
    ],
    config: {
      name: "Compliance Checklist",
      description: "Track regulatory compliance requirements and audit readiness",
      color: "#14B8A6",
      icon: "shield",
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
            { title: "Data privacy policy update", status: "not-started", priority: "high" },
          ],
        },
        {
          title: "Completed",
          color: "#10B981",
          tasks: [
            { title: "Anti-money laundering training", status: "done", priority: "medium" },
          ],
        },
      ],
      automations: [
        {
          name: "Compliance deadline warning",
          description: "Alert 14 days before compliance deadline",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Compliance deadline approaching in 14 days", daysBeforeDeadline: 14 },
        },
        {
          name: "Compliance completion log",
          description: "Create audit log when compliance item is marked done",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "log_compliance",
          actionConfig: { logType: "compliance_completed", message: "Compliance requirement satisfied" },
        },
        {
          name: "Overdue compliance escalation",
          description: "Escalate overdue compliance items to critical",
          triggerType: "due_date_passed",
          actionType: "change_priority",
          actionConfig: { priority: "critical" },
        },
        {
          name: "Critical item leadership alert",
          description: "Notify leadership when critical compliance item status changes",
          triggerType: "status_changed",
          conditions: [{ field: "priority", operator: "equals", value: "critical" }],
          actionType: "send_notification",
          actionConfig: { message: "Critical compliance item status changed - leadership review required" },
        },
      ],
    },
  },
  {
    id: "witness-management",
    name: "Witness Management",
    description: "Manage witnesses with AI-powered statement analysis, prep tracking, and deposition coordination",
    icon: "users",
    color: "#7C3AED",
    category: "legal",
    automationCount: 3,
    automationSummary: [
      "AI analyze witness statements",
      "Alert when deposition date approaching",
      "Notify attorney on witness contact",
    ],
    config: {
      name: "Witness Management",
      description: "Manage witness information, statements, and preparation",
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
          ],
        },
      ],
      automations: [
        {
          name: "AI analyze witness statement",
          description: "Analyze uploaded witness statement for key facts and contradictions",
          triggerType: "file_uploaded",
          actionType: "ai_summarize",
          actionConfig: { targetColumn: "col-notes", maxLength: "detailed", format: "bullet-points", customInstructions: "Summarize key testimony points, potential contradictions, and credibility factors" },
        },
        {
          name: "Deposition date alert",
          description: "Alert attorney when deposition date is approaching",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Witness deposition date approaching - ensure preparation is complete", daysBeforeDeadline: 5 },
        },
        {
          name: "Witness contact notification",
          description: "Notify lead attorney when witness status changes",
          triggerType: "status_changed",
          actionType: "send_notification",
          actionConfig: { message: "Witness management status updated" },
        },
      ],
    },
  },
  {
    id: "deposition-scheduler",
    name: "Deposition Scheduler",
    description: "Schedule depositions with automated reminders, prep tracking, and transcript management",
    icon: "calendar-range",
    color: "#8B5CF6",
    category: "legal",
    automationCount: 3,
    automationSummary: [
      "Remind 3 days before deposition",
      "Notify on transcript upload",
      "AI summarize deposition notes",
    ],
    config: {
      name: "Deposition Scheduler",
      description: "Schedule, prepare for, and track depositions across all active cases",
      color: "#8B5CF6",
      icon: "calendar-range",
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
          ],
        },
      ],
      automations: [
        {
          name: "Deposition reminder",
          description: "Remind lead attorney 3 days before deposition",
          triggerType: "due_date_approaching",
          actionType: "send_notification",
          actionConfig: { message: "Deposition in 3 days - finalize preparation", daysBeforeDeadline: 3 },
        },
        {
          name: "Transcript upload alert",
          description: "Notify team when deposition transcript is uploaded",
          triggerType: "file_uploaded",
          actionType: "send_notification",
          actionConfig: { message: "Deposition transcript uploaded - review and summarize" },
        },
        {
          name: "AI summarize deposition",
          description: "Auto-summarize deposition when marked complete",
          triggerType: "status_changed",
          triggerField: "status",
          triggerValue: "done",
          actionType: "ai_summarize",
          actionConfig: { targetColumn: "col-notes", maxLength: "moderate", format: "bullet-points" },
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
];

const VALID_STATUSES = ["not-started", "working-on-it", "stuck", "done", "pending-review"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

const VALID_TRIGGER_TYPES = [
  "item_created", "status_changed", "priority_changed", "due_date_approaching", "due_date_passed",
  "assigned", "unassigned", "moved_to_group", "field_changed", "file_uploaded",
  "column_changed", "item_name_changed", "update_created", "button_clicked", "email_received", "custom",
];

const VALID_ACTION_TYPES = [
  "change_status", "change_priority", "move_to_group", "assign_person", "unassign_person",
  "send_notification", "create_subtask", "update_field", "trigger_webhook", "create_item",
  "set_date", "start_time_tracking", "stop_time_tracking",
  "ai_fill_column", "ai_summarize", "ai_categorize", "ai_detect_language", "ai_translate",
  "ai_sentiment", "ai_improve", "ai_extract", "ai_write",
  "send_slack", "send_sms", "send_email", "custom",
  "request_approval", "create_approval_record", "notify_approver", "escalate_review",
  "generate_confirmation", "log_compliance", "adjust_date", "connect_boards",
  "synseekr_analyze_document", "synseekr_extract_entities", "synseekr_rag_query",
  "synseekr_run_investigation", "synseekr_detect_contradictions", "synseekr_classify_document",
  "synseekr_run_agent", "synseekr_search_documents", "synseekr_timeline_events",
  "route_to_detective", "assign_reviewer",
];

async function generateBoardConfigWithAI(prompt: string): Promise<BoardConfig> {
  const systemPrompt = `You are a board + automation configuration generator for a legal project management system. Given a natural language description, generate a board with columns, groups, tasks, AND automation rules.

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
  ],
  "automations": [
    {
      "name": "Rule name",
      "description": "What this automation does",
      "triggerType": "status_changed",
      "triggerField": "status",
      "triggerValue": "done",
      "actionType": "send_notification",
      "actionConfig": { "message": "Task completed" }
    }
  ]
}

Valid column types: ${VALID_COLUMN_TYPES.join(", ")}
Valid task statuses: ${VALID_STATUSES.join(", ")}
Valid priorities: ${VALID_PRIORITIES.join(", ")}
Valid trigger types: ${VALID_TRIGGER_TYPES.join(", ")}
Valid action types: ${VALID_ACTION_TYPES.join(", ")}

Guidelines:
- Always include "status" and "priority" columns
- Create 3-6 relevant columns
- Create 2-3 groups with 2-4 sample tasks each
- Create 3-5 automations that are actually useful for the board type
- Automations should include: deadline warnings, status-based notifications, AI-powered analysis, priority escalation, and approval workflows where relevant
- Use realistic legal practice sample data
- Choose appropriate lucide icon names
- Use visually distinct hex colors for groups`;

  const responseText = await generateCompletion(
    [{ role: "user", content: `Generate a board with automations for: ${prompt}` }],
    { model: "claude-sonnet-4-5", maxTokens: 6000, system: systemPrompt, caller: "vibe_automator_gen" }
  );

  if (!responseText) {
    throw new Error("No response from AI");
  }

  let jsonStr = responseText.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const config: BoardConfig = JSON.parse(jsonStr);

  if (!config.name || !config.columns || !config.groups) {
    throw new Error("Invalid board configuration from AI");
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

  config.automations = (config.automations || []).map((auto) => ({
    ...auto,
    triggerType: VALID_TRIGGER_TYPES.includes(auto.triggerType) ? auto.triggerType : "item_created",
    actionType: VALID_ACTION_TYPES.includes(auto.actionType) ? auto.actionType : "send_notification",
  }));

  return config;
}

async function createBoardFromConfig(config: BoardConfig): Promise<{ boardId: string; name: string; automationsCreated: number }> {
  const board = await storage.createBoard({
    name: config.name,
    description: config.description || "",
    color: config.color || "#6366f1",
    icon: config.icon || "layout-grid",
    columns: config.columns,
    matterId: config.matterId,
    clientId: config.clientId,
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

  let automationsCreated = 0;
  for (const autoDef of (config.automations || [])) {
    try {
      await storage.createAutomationRule({
        boardId: board.id,
        name: autoDef.name,
        description: autoDef.description || "",
        isActive: true,
        triggerType: autoDef.triggerType as any,
        triggerField: autoDef.triggerField,
        triggerValue: autoDef.triggerValue,
        conditions: (autoDef.conditions as any) || [],
        actionType: autoDef.actionType as any,
        actionConfig: autoDef.actionConfig || {},
      });
      automationsCreated++;
    } catch (err) {
      console.error(`[VibeAutomator] Failed to create automation "${autoDef.name}":`, err);
    }
  }

  return { boardId: board.id, name: board.name, automationsCreated };
}

export function registerVibeCodeRoutes(app: Express): void {
  app.post("/api/vibe/generate", async (req, res) => {
    try {
      const { prompt, templateId, matterId, clientId } = req.body;

      if (!prompt && !templateId) {
        return res.status(400).json({ error: "Either prompt or templateId is required" });
      }

      let config: BoardConfig;

      if (templateId) {
        const template = VIBE_TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        config = { ...template.config };
      } else {
        config = await generateBoardConfigWithAI(prompt);
      }

      if (matterId) config.matterId = matterId;
      if (clientId) config.clientId = clientId;

      const result = await createBoardFromConfig(config);
      res.json(result);
    } catch (error: any) {
      console.error("[VibeAutomator] Generation error:", error);
      if (error instanceof SyntaxError) {
        return res.status(500).json({ error: "Failed to parse AI-generated configuration" });
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

  app.get("/api/vibe/templates/:id/preview", async (req, res) => {
    try {
      const template = VIBE_TEMPLATES.find((t) => t.id === req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({
        ...template,
        columns: template.config.columns,
        groups: template.config.groups.map((g) => ({
          title: g.title,
          color: g.color,
          taskCount: g.tasks.length,
        })),
        automations: template.config.automations.map((a) => ({
          name: a.name,
          description: a.description,
          triggerType: a.triggerType,
          actionType: a.actionType,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template preview" });
    }
  });
}
