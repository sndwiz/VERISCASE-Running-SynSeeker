export interface Client {
  id: string;
  name: string;
  type?: "individual" | "business";
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  title?: string;
  barNumber?: string;
  department?: string;
  isActive: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatterParty {
  name: string;
  role: "plaintiff" | "defendant" | "third-party" | "cross-defendant" | "intervenor" | "other" | string;
  counsel?: string;
}

export interface TriggerDates {
  filingDate?: string;
  serviceDate?: string;
  schedulingOrderDate?: string;
  discoveryCutoff?: string;
  expertDeadline?: string;
  trialDate?: string;
  mediationDate?: string;
}

export interface MatterPhase {
  id: string;
  name: string;
  order: number;
  description: string;
  advanceTrigger?: string;
  status: "not-started" | "in-progress" | "completed";
}

export interface Matter {
  id: string;
  clientId: string;
  name: string;
  caseNumber: string;
  matterType: string;
  status: string;
  description: string;
  practiceArea: string;
  responsiblePartyId?: string;
  assignedAttorneys?: string[];
  assignedParalegals?: string[];
  courtName?: string;
  judgeAssigned?: string;
  opposingCounsel?: string;
  venue?: string;
  parties?: MatterParty[];
  claims?: string[];
  litigationTemplateId?: string;
  currentPhase?: string;
  phases?: MatterPhase[];
  triggerDates?: TriggerDates;
  openedDate: string;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LitigationTemplateInfo {
  id: string;
  name: string;
  description: string;
  caseType: string;
  phases: { id: string; name: string; order: number; description: string }[];
}

export interface MatterDocument {
  id: string;
  matterId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface MatterContact {
  id: string;
  matterId: string;
  name: string;
  role: string;
  organization?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface Thread {
  id: string;
  matterId: string;
  subject: string;
  status: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  matterId: string;
  title: string;
  description: string;
  eventType: string;
  eventDate: string;
  createdAt: string;
}
