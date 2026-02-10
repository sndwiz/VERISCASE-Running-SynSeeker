import type { InvestigationTemplate } from '../../shared/types/synseeker';

export const INVESTIGATION_TEMPLATES: Record<string, InvestigationTemplate> = {
  medical_lien: {
    id: 'medical_lien',
    name: 'Medical Lien Company',
    description:
      'Deep investigation into medical lien companies, surgical centers, and provider networks. Checks ownership structure, NPI records, compliance gaps, and related entities.',
    sources: ['web', 'corp', 'domain', 'npi', 'legal', 'reviews'],
    searchTerms: [
      'medical lien',
      'personal injury',
      'surgical center',
      'provider network',
      'lien-based care',
    ],
    checkFor: [
      'ownership conflicts',
      'out-of-state addresses',
      'missing state registrations',
      'provider-owner dual roles',
      'ghost domains',
      'related attorney relationships',
    ],
  },

  opposing_counsel: {
    id: 'opposing_counsel',
    name: 'Opposing Counsel',
    description:
      'Background research on opposing attorneys. Checks bar standing, disciplinary history, case patterns, and potential conflicts.',
    sources: ['web', 'legal', 'social', 'reviews'],
    searchTerms: [
      'bar association',
      'disciplinary action',
      'malpractice',
      'attorney misconduct',
    ],
    checkFor: [
      'bar status & standing',
      'disciplinary history',
      'conflicts of interest',
      'case outcome patterns',
      'firm affiliation changes',
    ],
  },

  corporate: {
    id: 'corporate',
    name: 'Corporate Entity',
    description:
      'Full corporate entity investigation. Maps ownership chains, registered agents, related filings, and potential shell structures.',
    sources: ['web', 'corp', 'domain', 'legal', 'news', 'social'],
    searchTerms: [
      'LLC',
      'registered agent',
      'UCC filing',
      'beneficial owner',
      'corporate structure',
    ],
    checkFor: [
      'shell companies',
      'nominee directors',
      'jurisdiction shopping',
      'shared registered agents across entities',
      'recent name or structure changes',
    ],
  },

  expert_witness: {
    id: 'expert_witness',
    name: 'Expert Witness',
    description:
      'Vets expert witnesses by checking credentials, past testimony, publications, and any credibility challenges.',
    sources: ['web', 'legal', 'social', 'news'],
    searchTerms: [
      'expert testimony',
      'publications',
      'credentials',
      'Daubert challenge',
      'deposition',
    ],
    checkFor: [
      'credibility issues',
      'inconsistent testimony history',
      'credential exaggeration',
      'bias indicators (always testifies for one side)',
      'retracted or challenged publications',
    ],
  },
};

export function getTemplateSources(templateId?: string): string[] {
  if (!templateId || templateId === 'custom') {
    return ['web', 'corp', 'domain', 'legal', 'npi', 'reviews', 'social', 'news'];
  }
  return INVESTIGATION_TEMPLATES[templateId]?.sources ?? [
    'web', 'corp', 'domain', 'legal', 'npi', 'reviews', 'social', 'news',
  ];
}

export function getAllTemplates(): InvestigationTemplate[] {
  return Object.values(INVESTIGATION_TEMPLATES);
}
