import { db } from "../db";
import { eq, and } from "drizzle-orm";
import {
  deadlineRules,
  caseDeadlines,
  caseFilings,
  jurisdictionProfiles,
  matters,
} from "@shared/models/tables";
import type { CaseFiling, DeadlineRule, JurisdictionProfile, InsertCaseDeadline } from "@shared/models/tables";

export interface ComputedDeadline {
  title: string;
  dueDate: string;
  anchorEvent: string;
  anchorDate: string;
  ruleSource: string;
  criticality: string;
  requiredAction: string;
  resultDocType: string | null;
  ruleId: string;
}

function addCalendarDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() + 1);
  else if (day === 6) date.setDate(date.getDate() + 2);
  return date.toISOString().split("T")[0];
}

export async function getJurisdictionForMatter(matterId: string): Promise<JurisdictionProfile | null> {
  const [matter] = await db.select().from(matters).where(eq(matters.id, matterId)).limit(1);
  if (!matter) return null;

  const courtName = (matter.courtName || "").toLowerCase();
  let state = "utah";
  if (/federal|u\.s\.\s*district/i.test(courtName)) {
    state = "federal";
  }

  const profiles = await db.select().from(jurisdictionProfiles)
    .where(eq(jurisdictionProfiles.state, state));

  if (profiles.length > 0) return profiles[0];

  const [defaultProfile] = await db.select().from(jurisdictionProfiles)
    .where(eq(jurisdictionProfiles.isDefault, true)).limit(1);

  return defaultProfile || null;
}

export async function computeDeadlinesForFiling(
  filing: CaseFiling,
  jurisdictionId?: string
): Promise<ComputedDeadline[]> {
  const results: ComputedDeadline[] = [];

  let rules: DeadlineRule[];
  if (jurisdictionId) {
    rules = await db.select().from(deadlineRules).where(
      and(
        eq(deadlineRules.triggerDocType, filing.docType),
        eq(deadlineRules.isActive, true),
        eq(deadlineRules.jurisdictionId, jurisdictionId)
      )
    );
  } else {
    rules = await db.select().from(deadlineRules).where(
      and(
        eq(deadlineRules.triggerDocType, filing.docType),
        eq(deadlineRules.isActive, true)
      )
    );
  }

  if (rules.length === 0) {
    rules = await db.select().from(deadlineRules).where(
      and(
        eq(deadlineRules.triggerDocType, filing.docType),
        eq(deadlineRules.isActive, true)
      )
    );
  }

  let profile: JurisdictionProfile | null = null;
  if (jurisdictionId) {
    const [p] = await db.select().from(jurisdictionProfiles)
      .where(eq(jurisdictionProfiles.id, jurisdictionId)).limit(1);
    profile = p || null;
  }

  for (const rule of rules) {
    const anchorFieldMap: Record<string, string | null> = {
      filed_date: filing.filedDate,
      served_date: filing.servedDate,
      hearing_date: filing.hearingDate,
      response_deadline_anchor: filing.responseDeadlineAnchor,
    };

    const anchorDate = anchorFieldMap[rule.anchorDateField] || filing.servedDate || filing.filedDate;
    if (!anchorDate) continue;

    const dueDate = addCalendarDays(anchorDate, rule.offsetDays);

    results.push({
      title: rule.resultAction,
      dueDate,
      anchorEvent: `${rule.triggerDocType} - ${rule.anchorDateField}`,
      anchorDate,
      ruleSource: rule.ruleSource || rule.name,
      criticality: rule.criticality || "hard",
      requiredAction: rule.resultAction,
      resultDocType: rule.resultDocType || null,
      ruleId: rule.id,
    });
  }

  return results;
}

export async function createDeadlinesFromFiling(
  filing: CaseFiling,
  jurisdictionId?: string,
  assignedTo?: string
): Promise<string[]> {
  const computed = await computeDeadlinesForFiling(filing, jurisdictionId);
  const deadlineIds: string[] = [];

  for (const d of computed) {
    const [created] = await db.insert(caseDeadlines).values({
      matterId: filing.matterId,
      filingId: filing.id,
      ruleId: d.ruleId,
      title: d.title,
      dueDate: d.dueDate,
      anchorEvent: d.anchorEvent,
      anchorDate: d.anchorDate,
      ruleSource: d.ruleSource,
      criticality: d.criticality,
      requiredAction: d.requiredAction,
      resultDocType: d.resultDocType,
      assignedTo: assignedTo || null,
      status: "pending",
    }).returning();

    deadlineIds.push(created.id);
  }

  return deadlineIds;
}

export async function seedDefaultDeadlineRules(): Promise<void> {
  const existing = await db.select().from(deadlineRules).limit(1);
  if (existing.length > 0) return;

  const defaultRules = [
    {
      name: "Answer to Complaint (Utah)",
      triggerDocType: "Complaint/Petition",
      anchorDateField: "served_date",
      offsetDays: 21,
      resultAction: "File Answer to Complaint",
      resultDocType: "Answer",
      criticality: "hard",
      ruleSource: "URCP 12(a)",
    },
    {
      name: "Answer to Complaint (Federal)",
      triggerDocType: "Complaint/Petition",
      anchorDateField: "served_date",
      offsetDays: 21,
      resultAction: "File Answer to Complaint",
      resultDocType: "Answer",
      criticality: "hard",
      ruleSource: "FRCP 12(a)(1)(A)",
    },
    {
      name: "Discovery Response - Interrogatories",
      triggerDocType: "Discovery Request",
      anchorDateField: "served_date",
      offsetDays: 30,
      resultAction: "Serve Discovery Responses (Interrogatories)",
      resultDocType: "Discovery Response",
      criticality: "hard",
      ruleSource: "URCP 33(a)",
    },
    {
      name: "Discovery Response - RFP",
      triggerDocType: "Discovery Request",
      anchorDateField: "served_date",
      offsetDays: 30,
      resultAction: "Serve Discovery Responses (RFP)",
      resultDocType: "Discovery Response",
      criticality: "hard",
      ruleSource: "URCP 34(b)",
    },
    {
      name: "Discovery Response - RFA",
      triggerDocType: "Discovery Request",
      anchorDateField: "served_date",
      offsetDays: 30,
      resultAction: "Serve Responses to Requests for Admission",
      resultDocType: "Discovery Response",
      criticality: "hard",
      ruleSource: "URCP 36(a)",
    },
    {
      name: "Opposition to Motion",
      triggerDocType: "Motion",
      anchorDateField: "filed_date",
      offsetDays: 14,
      resultAction: "File Opposition/Response to Motion",
      resultDocType: "Motion",
      criticality: "hard",
      ruleSource: "URCP 7(d)",
    },
    {
      name: "Reply Memorandum",
      triggerDocType: "Motion",
      anchorDateField: "filed_date",
      offsetDays: 21,
      resultAction: "File Reply Memorandum",
      resultDocType: "Motion",
      criticality: "soft",
      ruleSource: "URCP 7(e)",
    },
    {
      name: "Initial Disclosures",
      triggerDocType: "Answer",
      anchorDateField: "filed_date",
      offsetDays: 14,
      resultAction: "Serve Initial Disclosures",
      resultDocType: "Disclosure/Initial Disclosures",
      criticality: "hard",
      ruleSource: "URCP 26(a)(1)",
    },
    {
      name: "Respond to Scheduling Order",
      triggerDocType: "Scheduling Order",
      anchorDateField: "filed_date",
      offsetDays: 14,
      resultAction: "Review and Calendar Scheduling Order Dates",
      resultDocType: null,
      criticality: "hard",
      ruleSource: "Court Order",
    },
    {
      name: "Prepare for Hearing",
      triggerDocType: "Notice",
      anchorDateField: "hearing_date",
      offsetDays: -3,
      resultAction: "Prepare for Hearing",
      resultDocType: null,
      criticality: "soft",
      ruleSource: "Best Practice",
    },
  ];

  for (const rule of defaultRules) {
    await db.insert(deadlineRules).values(rule);
  }

  const existingProfiles = await db.select().from(jurisdictionProfiles).limit(1);
  if (existingProfiles.length === 0) {
    await db.insert(jurisdictionProfiles).values({
      name: "Utah State Courts",
      state: "utah",
      courtType: "state",
      ruleSet: "URCP",
      discoveryResponseDays: 30,
      motionOppositionDays: 14,
      motionReplyDays: 7,
      initialDisclosureDays: 14,
      answerDays: 21,
      mailServiceExtraDays: 3,
      electronicServiceExtraDays: 0,
      weekendHolidayAdjust: true,
      isDefault: true,
    });

    await db.insert(jurisdictionProfiles).values({
      name: "Federal District Courts",
      state: "federal",
      courtType: "federal",
      ruleSet: "FRCP",
      discoveryResponseDays: 30,
      motionOppositionDays: 14,
      motionReplyDays: 7,
      initialDisclosureDays: 14,
      answerDays: 21,
      mailServiceExtraDays: 3,
      electronicServiceExtraDays: 0,
      weekendHolidayAdjust: true,
      isDefault: false,
    });
  }
}
