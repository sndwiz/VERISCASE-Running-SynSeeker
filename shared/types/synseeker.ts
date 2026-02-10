export type InvestigationStatus = 'queued' | 'scanning' | 'analyzing' | 'complete' | 'failed' | 'archived';
export type FindingSeverity = 'critical' | 'warning' | 'info' | 'success';
export type EntityType = 'company' | 'person' | 'domain' | 'address' | 'phone' | 'email' | 'license' | 'case';
export type ConnectionStrength = 'confirmed' | 'suspected' | 'inferred';
export type TemplateId = 'medical_lien' | 'opposing_counsel' | 'corporate' | 'expert_witness' | 'custom';

export interface ScanLogEntry {
  timestamp: string;
  source: string;
  action: string;
  result: 'success' | 'warning' | 'error' | 'info';
  message: string;
  dataFound?: boolean;
}

export interface InvestigationConfig {
  targetName: string;
  targetDomain?: string;
  targetAddress?: string;
  targetState?: string;
  matterId?: string;
  sources?: string[];
  templateId?: TemplateId;
}

export interface InvestigationSummary {
  id: string;
  targetName: string;
  targetDomain: string | null;
  status: InvestigationStatus;
  progress: number;
  totalFindings: number;
  criticalFlags: number;
  entityCount: number;
  connectionCount: number;
  aiRiskScore: number | null;
  createdAt: string;
  completedAt: string | null;
  scanDuration: number | null;
}

export interface InvestigationDetail extends InvestigationSummary {
  targetAddress: string | null;
  targetState: string | null;
  matterId: string | null;
  sources: string[];
  templateId: string | null;
  scanLog: ScanLogEntry[];
  aiSummary: string | null;
  findings: FindingRecord[];
  entities: EntityRecord[];
  connections: ConnectionRecord[];
}

export interface FindingRecord {
  id: string;
  investigationId: string;
  severity: FindingSeverity;
  source: string;
  title: string;
  body: string;
  tags: string[];
  url: string | null;
  aiRelevance: number | null;
  aiNotes: string | null;
  starred: boolean;
  dismissed: boolean;
  userNotes: string | null;
  createdAt: string;
}

export interface EntityRecord {
  id: string;
  investigationId: string;
  type: EntityType;
  name: string;
  role: string | null;
  details: Record<string, unknown> | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  sosId: string | null;
  npi: string | null;
  registrar: string | null;
  registrationDate: string | null;
  createdAt: string;
}

export interface ConnectionRecord {
  id: string;
  investigationId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationship: string;
  strength: ConnectionStrength | null;
  evidence: string | null;
  severity: FindingSeverity | null;
  createdAt: string;
}

export interface InvestigationStreamEvent {
  status: InvestigationStatus;
  progress: number;
  scanLog: ScanLogEntry[];
  totalFindings: number;
  criticalFlags: number;
}

export interface InvestigationTemplate {
  id: TemplateId;
  name: string;
  description: string;
  sources: string[];
  searchTerms: string[];
  checkFor: string[];
}
