/**
 * VERICASE Email Intelligence Engine
 * 
 * Analyzes emails for: urgency, sentiment, deception, deadlines, case numbers,
 * psychological profiling, lawyer detection, and Lauren admin alert triggers.
 * 
 * Drop-in service — no DB dependency, pure analysis functions.
 */

// ── PATTERN LIBRARIES ──

const CASE_NUMBER_PATTERNS = [
  /\b\d{4}-[A-Z]{2,4}-\d{3,6}\b/gi,
  /\b\d{2}-\d{1,2}-\d{4,8}\b/g,
  /\bCase\s*(?:No\.?|#)\s*[\w-]+\b/gi,
];

const MONEY_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|M|B|K))?/g,
];

const DATE_PATTERNS = [
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
];

const DEADLINE_KEYWORDS = [
  'deadline', 'due date', 'due by', 'respond by', 'file by', 'must be filed',
  'statute of limitations', 'SOL', 'expires', 'expiration', 'time-barred',
  'last day', 'final day', 'no later than', 'on or before', 'by close of business',
  'COB', 'EOD', 'hearing date', 'trial date', 'motion deadline',
  'discovery cutoff', 'dispositive motion', 'pretrial', 'scheduling order',
];

const URGENCY_INDICATORS: Record<string, { keywords: string[]; weight: number }> = {
  critical: {
    keywords: ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'time-sensitive',
               'right away', 'without delay', 'expedite', 'rush', 'top priority'],
    weight: 3,
  },
  high: {
    keywords: ['important', 'priority', 'soon', 'promptly', 'at your earliest', 'pressing',
               'time is of the essence', 'please advise'],
    weight: 2,
  },
  normal: {
    keywords: ['when you get a chance', 'at your convenience', 'fyi', 'for your review'],
    weight: 0,
  },
  low: {
    keywords: ['no rush', 'whenever', 'low priority', 'back burner', 'when time permits'],
    weight: -1,
  },
};

const SENTIMENT_INDICATORS: Record<string, string[]> = {
  hostile: ['demand', 'failure to', 'violat', 'breach', 'compel', 'sanctions',
            'contempt', 'bad faith', 'frivolous', 'cease and desist', 'will pursue',
            'legal action', 'consequences', 'liable', 'negligent'],
  angry: ['unacceptable', 'outraged', 'furious', 'ridiculous', 'absurd', 'incompetent',
          'disgusted', 'fed up', 'had enough', 'worst', 'terrible', 'awful', 'pathetic',
          'waste of', 'rip off', 'scam', 'never again', 'fire you', 'sue you',
          'not paying', 'refund', 'complaint', 'report you', 'bar association',
          'malpractice', 'negligence'],
  upset: ['frustrated', 'disappointed', 'concerned', 'worried', 'unhappy', 'confused',
          "don't understand", "why hasn't", 'still waiting', 'no response',
          'ignored', 'nobody called', 'feel like', 'not being heard', 'anxious',
          'scared', 'stressed', 'overwhelmed', 'abandoned', 'lost', 'helpless'],
  problem: ['problem', 'issue', 'error', 'mistake', 'wrong', 'incorrect', 'missing',
            'lost', 'overcharged', 'overbilled', 'never received', "didn't get",
            'broken', 'failed', "doesn't work", "can't access", 'locked out'],
  cooperative: ['agree', 'stipulat', 'cooperat', 'mutual', 'resolve', 'settlement',
                'mediat', 'compromise', 'work together', 'good faith'],
  positive: ['pleased', 'thank', 'appreciate', 'grateful', 'excellent', 'well done',
             'happy to', 'glad to', 'great job', 'wonderful'],
  formal_neutral: ['pursuant to', 'hereby', 'enclosed', 'attached hereto',
                   'for your records', 'please find', 'as discussed'],
};

// ── LAUREN ALERT TRIGGERS ──
// These fire admin notifications when detected

interface AlertTriggerConfig {
  keywords: string[];
  threshold: number;
  priority: 'critical' | 'high' | 'medium';
  message: string;
}

const ADMIN_ALERT_TRIGGERS: Record<string, AlertTriggerConfig> = {
  angry_client: {
    keywords: ['unacceptable', 'furious', 'fire you', 'malpractice', 'bar association',
               'sue you', 'not paying', 'worst attorney', 'incompetent', 'refund',
               'report you', 'negligence', 'complaint against', 'had enough',
               'terrible service', 'never again', 'rip off', 'disgusted'],
    threshold: 1,
    priority: 'critical',
    message: '🚨 Angry/hostile client detected — immediate attention required',
  },
  upset_client: {
    keywords: ['frustrated', 'disappointed', 'concerned', 'worried', 'still waiting',
               'no response', 'ignored', 'nobody called', 'not being heard',
               'feel abandoned', 'scared', 'anxious', 'overwhelmed', 'confused',
               "don't understand", 'unhappy', 'helpless'],
    threshold: 2,
    priority: 'high',
    message: '⚠️ Client expressing distress — follow up recommended',
  },
  billing_dispute: {
    keywords: ['overcharged', 'overbilled', 'too expensive', 'not paying',
               'billing error', 'invoice wrong', "didn't authorize", 'refund',
               'excessive fees', 'unreasonable', 'cost too much'],
    threshold: 1,
    priority: 'high',
    message: '💰 Billing dispute detected — review and respond promptly',
  },
  deadline_risk: {
    keywords: ['statute of limitations', 'expires tomorrow', 'expires today',
               'final day to file', 'last chance', 'time-barred', 'missed deadline',
               'forgot to file', 'late filing'],
    threshold: 1,
    priority: 'critical',
    message: '⏰ Deadline risk detected — verify filing status immediately',
  },
  opposing_threat: {
    keywords: ['sanctions', 'contempt', 'default judgment', 'compel', 'report to court',
               'emergency motion', 'bad faith', 'disciplinary'],
    threshold: 1,
    priority: 'high',
    message: '⚖️ Opposing counsel threat detected — review and prepare response',
  },
};

const DECEPTION_FLAGS: Record<string, string[]> = {
  gaslighting: ['as you know', 'as we discussed', 'you agreed', 'per our conversation',
                'as previously stated', 'you acknowledged', 'you confirmed'],
  pressure_tactics: ['final notice', 'last chance', 'if you fail to', 'we will have no choice',
                     'force us to', 'leave us no alternative', 'compelled to'],
  minimizing: ['minor issue', 'simple matter', 'merely', 'just a', 'only',
               'nothing more than', 'routine', 'standard'],
  blame_shifting: ['your failure', 'your refusal', 'your delay', 'you caused',
                   "your client's", 'responsibility lies with', 'fault of'],
  stalling: ['need more time', 'extension', 'continuance', 'postpone', 'adjourn',
             'not yet prepared', 'still reviewing', 'additional time'],
};

const LAWYER_PATTERNS = [
  /\b(?:Esq\.?|J\.?D\.?|Attorney|Counsel|Partner|Associate)\b/i,
  /\bBar\s+(?:No\.?|#|Number)\s*:?\s*\d+/i,
];

const LAWYER_DOMAINS = ['.law', 'legal', 'attorney', 'counsel', 'lawfirm'];

// ── ACTION ITEM PATTERNS ──
const ACTION_PATTERNS = [
  /please\s+(?:provide|send|review|file|prepare|draft|respond|advise|confirm|sign|submit)\b[^.!?\n]{5,120}/gi,
  /(?:need|require|request)\s+(?:you|your)\s+(?:to\s+)?[^.!?\n]{5,120}/gi,
];

// ── KEY LEGAL PHRASES ──
const KEY_PHRASES = [
  'good cause', 'without prejudice', 'with prejudice', 'attorney-client privilege',
  'work product', 'spoliation', 'fiduciary duty', 'due diligence', 'pro se',
  'ex parte', 'motion in limine', 'summary judgment', 'default judgment',
  'res judicata', 'collateral estoppel', 'statute of limitations',
];

// ── UTAH LAW REFERENCE ──
export const UTAH_RULES = {
  civil_complaint: { days: 21, rule: 'URCP 12(a)', desc: 'Answer to complaint' },
  motion_response: { days: 14, rule: 'URCP 7(d)', desc: 'Response to motion' },
  discovery_response: { days: 28, rule: 'URCP 33/34', desc: 'Interrogatories/RFP response' },
  summary_judgment: { days: 28, rule: 'URCP 56', desc: 'Response to MSJ' },
  appeal_notice: { days: 30, rule: 'URA 4(a)', desc: 'Notice of appeal from final order' },
  opening_brief: { days: 40, rule: 'URA 24(a)', desc: 'Opening brief after docketing' },
  response_brief: { days: 30, rule: 'URA 24(b)', desc: 'Response brief' },
  protective_order: { days: 14, rule: 'URCP 26(c)', desc: 'Motion for protective order' },
};

// ════════════════════════════════════════
// ANALYSIS TYPES
// ════════════════════════════════════════

export interface EmailAnalysis {
  urgency: string;
  urgencyScore: number;
  sentiment: string;
  sentimentScores: Record<string, number>;
  deceptionFlags: Array<{ tactic: string; indicators: string[]; count: number }>;
  deceptionScore: number;
  datesMentioned: string[];
  deadlines: Array<{ keyword: string; date: string | null; context: string }>;
  caseNumbers: string[];
  moneyAmounts: string[];
  isLawyerComm: boolean;
  actionItems: string[];
  keyPhrases: string[];
  psychologicalProfile: PsychProfile;
  riskLevel: string;
  adminAlerts: AdminAlertResult[];
}

export interface PsychProfile {
  communicationStyle: string;
  powerDynamics: string;
  emotionalState: string;
  credibilityIndicators: string[];
  manipulationRisk: string;
  behavioralNotes: string[];
}

export interface AdminAlertResult {
  type: string;
  priority: string;
  message: string;
  triggers: string[];
}

// ════════════════════════════════════════
// CORE ANALYSIS FUNCTION
// ════════════════════════════════════════

export function analyzeEmail(subject: string, body: string, senderDomain?: string): EmailAnalysis {
  const text = `${subject} ${body}`.toLowerCase();
  const original = `${subject} ${body}`;

  // 1. Case numbers
  const caseNumbers: string[] = [];
  for (const pat of CASE_NUMBER_PATTERNS) {
    const matches = original.match(new RegExp(pat.source, pat.flags));
    if (matches) caseNumbers.push(...matches);
  }
  const uniqueCaseNumbers = Array.from(new Set(caseNumbers));

  // 2. Money amounts
  const moneyAmounts: string[] = [];
  for (const pat of MONEY_PATTERNS) {
    const matches = original.match(new RegExp(pat.source, pat.flags));
    if (matches) moneyAmounts.push(...matches);
  }

  // 3. Dates mentioned
  const datesMentioned: string[] = [];
  for (const pat of DATE_PATTERNS) {
    const matches = original.match(new RegExp(pat.source, pat.flags));
    if (matches) datesMentioned.push(...matches);
  }

  // 4. Deadlines
  const deadlines: Array<{ keyword: string; date: string | null; context: string }> = [];
  for (const kw of DEADLINE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      const idx = text.indexOf(kw.toLowerCase());
      const ctx = original.slice(Math.max(0, idx - 50), Math.min(original.length, idx + kw.length + 100)).trim();
      let dateNear: string | null = null;
      for (const dp of DATE_PATTERNS) {
        const dm = ctx.match(new RegExp(dp.source, dp.flags));
        if (dm) { dateNear = dm[0]; break; }
      }
      deadlines.push({ keyword: kw, date: dateNear, context: ctx });
    }
  }

  // 5. Urgency scoring
  let uScore = 0;
  for (const [, config] of Object.entries(URGENCY_INDICATORS)) {
    for (const kw of config.keywords) {
      if (text.includes(kw.toLowerCase())) uScore += config.weight;
    }
  }
  if (deadlines.length > 0) uScore += 2;
  uScore = Math.min(10, Math.max(0, uScore));
  const urgency = uScore >= 5 ? 'critical' : uScore >= 3 ? 'high' : uScore >= 1 ? 'elevated' : 'normal';

  // 6. Sentiment analysis
  const sentimentScores: Record<string, number> = {};
  for (const [sent, keywords] of Object.entries(SENTIMENT_INDICATORS)) {
    const score = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    if (score > 0) sentimentScores[sent] = score;
  }
  const sentiment = Object.keys(sentimentScores).length > 0
    ? Object.entries(sentimentScores).sort((a, b) => b[1] - a[1])[0][0]
    : 'formal_neutral';

  // 7. Deception flags
  const deceptionFlags: Array<{ tactic: string; indicators: string[]; count: number }> = [];
  let dScore = 0;
  for (const [tactic, indicators] of Object.entries(DECEPTION_FLAGS)) {
    const hits = indicators.filter(i => text.includes(i.toLowerCase()));
    if (hits.length > 0) {
      deceptionFlags.push({ tactic, indicators: hits, count: hits.length });
      dScore += hits.length;
    }
  }
  const deceptionScore = Math.min(10, dScore);

  // 8. Lawyer detection
  let isLawyerComm = LAWYER_PATTERNS.some(p => p.test(original));
  if (!isLawyerComm && senderDomain) {
    isLawyerComm = LAWYER_DOMAINS.some(d => senderDomain.toLowerCase().includes(d));
  }

  // 9. Action items
  const actionItems: string[] = [];
  for (const pat of ACTION_PATTERNS) {
    const matches = text.match(new RegExp(pat.source, pat.flags));
    if (matches) actionItems.push(...matches.slice(0, 5).map(m => m.trim()));
  }

  // 10. Key legal phrases
  const keyPhrases = KEY_PHRASES.filter(p => text.includes(p));

  // 11. Psychological profile
  const psychologicalProfile = buildPsychProfile(body, sentiment, deceptionFlags);

  // 12. Risk level
  let rScore = deceptionScore * 2 + uScore;
  if (['hostile', 'angry'].includes(sentiment)) rScore += 4;
  if (sentiment === 'upset') rScore += 2;
  if (moneyAmounts.length > 0) rScore += 1;
  const riskLevel = rScore >= 10 ? 'critical' : rScore >= 6 ? 'high' : rScore >= 3 ? 'medium' : 'low';

  // 13. Admin alerts (Lauren)
  const adminAlerts = checkAdminAlerts(text, deceptionScore, deceptionFlags);

  return {
    urgency, urgencyScore: uScore,
    sentiment, sentimentScores,
    deceptionFlags, deceptionScore,
    datesMentioned: Array.from(new Set(datesMentioned)),
    deadlines,
    caseNumbers: uniqueCaseNumbers,
    moneyAmounts: Array.from(new Set(moneyAmounts)),
    isLawyerComm, actionItems, keyPhrases,
    psychologicalProfile, riskLevel, adminAlerts,
  };
}

function buildPsychProfile(
  body: string,
  sentiment: string,
  deceptionFlags: Array<{ tactic: string; indicators: string[] }>
): PsychProfile {
  const text = body.toLowerCase();
  const original = body;
  const profile: PsychProfile = {
    communicationStyle: 'professional',
    powerDynamics: 'neutral',
    emotionalState: 'controlled',
    credibilityIndicators: [],
    manipulationRisk: 'low',
    behavioralNotes: [],
  };

  // Communication style
  if (['hereby', 'pursuant', 'aforementioned'].some(w => text.includes(w)))
    profile.communicationStyle = 'highly_formal';
  else if (['hey', 'just wanted', 'quick note'].some(w => text.includes(w)))
    profile.communicationStyle = 'casual';
  else if (['respectfully', 'please be advised'].some(w => text.includes(w)))
    profile.communicationStyle = 'professional';

  // Power dynamics
  if (['demand', 'require', 'must', 'compel'].some(w => text.includes(w))) {
    profile.powerDynamics = 'dominant';
    profile.behavioralNotes.push('Asserting authority/control in communication');
  } else if (['we can agree', 'mutual', 'work together'].some(w => text.includes(w))) {
    profile.powerDynamics = 'collaborative';
  }

  // Emotional state
  const exclamations = (text.match(/!/g) || []).length;
  const capsWords = (original.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (exclamations > 3 || capsWords > 5) {
    profile.emotionalState = 'agitated';
    profile.behavioralNotes.push(`${exclamations} exclamation marks, ${capsWords} ALL-CAPS words detected`);
  } else if (['hostile', 'angry'].includes(sentiment)) {
    profile.emotionalState = 'adversarial';
  } else if (sentiment === 'upset') {
    profile.emotionalState = 'distressed';
  } else if (sentiment === 'cooperative') {
    profile.emotionalState = 'amenable';
  }

  // Credibility
  if (deceptionFlags.length > 0) {
    for (const f of deceptionFlags) {
      profile.credibilityIndicators.push(`${f.tactic}: ${f.indicators.slice(0, 3).join(', ')}`);
    }
    profile.manipulationRisk = deceptionFlags.length >= 3 ? 'high' : 'medium';
  }

  // Sentence analysis
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const avg = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
    if (avg > 30) {
      profile.behavioralNotes.push(`Long avg sentence length (${Math.round(avg)} words) — may be burying information`);
    }
  }

  return profile;
}

function checkAdminAlerts(
  text: string,
  deceptionScore: number,
  deceptionFlags: Array<{ tactic: string }>
): AdminAlertResult[] {
  const alerts: AdminAlertResult[] = [];

  for (const [alertType, config] of Object.entries(ADMIN_ALERT_TRIGGERS)) {
    const hits = config.keywords.filter(kw => text.includes(kw.toLowerCase()));
    if (hits.length >= config.threshold) {
      alerts.push({
        type: alertType,
        priority: config.priority,
        message: config.message,
        triggers: hits,
      });
    }
  }

  // High manipulation score also triggers alert
  if (deceptionScore >= 4) {
    alerts.push({
      type: 'manipulation_detected',
      priority: 'high',
      message: `🎭 High manipulation score (${deceptionScore}/10) — review communication patterns`,
      triggers: deceptionFlags.map(f => f.tactic),
    });
  }

  return alerts;
}

// ── UTILITY: Auto-match email to matter by case number ──
export function extractCaseNumbers(text: string): string[] {
  const results: string[] = [];
  for (const pat of CASE_NUMBER_PATTERNS) {
    const matches = text.match(new RegExp(pat.source, pat.flags));
    if (matches) results.push(...matches);
  }
  return Array.from(new Set(results));
}

// ── UTILITY: Extract sender info ──
export function parseSenderAddress(sender: string): { name: string; email: string; domain: string } {
  const match = sender.match(/"?([^"<]*)"?\s*<?([^>]*)>?/);
  if (match) {
    const name = match[1].trim();
    const emailAddr = match[2].trim();
    const domain = emailAddr.includes('@') ? emailAddr.split('@')[1] : '';
    return { name, email: emailAddr || sender, domain };
  }
  return { name: sender, email: sender, domain: '' };
}
