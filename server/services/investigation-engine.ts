import { db } from '../db';
import {
  investigations,
  investigationFindings,
  discoveredEntities,
  entityConnections,
} from '../../shared/models/tables';
import { eq } from 'drizzle-orm';
import * as cheerio from 'cheerio';
import type { ScanLogEntry, FindingSeverity, EntityType } from '../../shared/types/synseeker';

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'VERICASE-SynSeeker/1.0 (Legal Research Tool)',
        ...options.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export class InvestigationEngine {
  private investigationId: string;
  private logEntries: ScanLogEntry[] = [];
  private findingsCount = 0;
  private criticalCount = 0;

  constructor(investigationId: string) {
    this.investigationId = investigationId;
  }

  async run(): Promise<void> {
    const startTime = Date.now();

    try {
      const [inv] = await db
        .select()
        .from(investigations)
        .where(eq(investigations.id, this.investigationId));

      if (!inv) throw new Error('Investigation not found');

      const sources = (inv.sources as string[]) || [];

      await this.updateStatus('scanning');
      await this.updateProgress(5, 'Initializing investigation engine...');

      const tasks: Array<{ source: string; fn: () => Promise<void> }> = [];

      if (sources.includes('web') && inv.targetDomain) {
        tasks.push({ source: 'web', fn: () => this.scrapeWebsite(inv.targetDomain!) });
      }
      if (sources.includes('domain') && inv.targetDomain) {
        tasks.push({ source: 'domain', fn: () => this.lookupDomain(inv.targetDomain!) });
      }
      if (sources.includes('corp')) {
        tasks.push({
          source: 'corp',
          fn: () => this.searchCorporateFilings(inv.targetName, inv.targetState || 'CO'),
        });
      }
      if (sources.includes('legal')) {
        tasks.push({ source: 'legal', fn: () => this.searchLegalRecords(inv.targetName) });
      }
      if (sources.includes('npi')) {
        tasks.push({ source: 'npi', fn: () => this.searchNPI(inv.targetName) });
      }
      if (sources.includes('reviews')) {
        tasks.push({ source: 'reviews', fn: () => this.searchReviews(inv.targetName) });
      }
      if (sources.includes('social')) {
        tasks.push({ source: 'social', fn: () => this.searchSocial(inv.targetName) });
      }
      if (sources.includes('news')) {
        tasks.push({ source: 'news', fn: () => this.searchNews(inv.targetName) });
      }

      const webTask = tasks.find((t) => t.source === 'web');
      if (webTask) {
        await this.safeExecute(webTask.source, webTask.fn);
      }

      const remaining = tasks.filter((t) => t.source !== 'web');
      for (let i = 0; i < remaining.length; i += 3) {
        const batch = remaining.slice(i, i + 3);
        await Promise.allSettled(
          batch.map((task) => this.safeExecute(task.source, task.fn))
        );
      }

      await this.updateStatus('analyzing');
      await this.updateProgress(80, 'Running AI analysis...');
      await this.safeExecute('ai', () => this.runAIAnalysis());

      await this.updateProgress(92, 'Mapping entity connections...');
      await this.safeExecute('connections', () => this.mapConnections());

      const duration = Math.round((Date.now() - startTime) / 1000);

      const [allFindings, allEntities, allConnections] = await Promise.all([
        db.select().from(investigationFindings).where(eq(investigationFindings.investigationId, this.investigationId)),
        db.select().from(discoveredEntities).where(eq(discoveredEntities.investigationId, this.investigationId)),
        db.select().from(entityConnections).where(eq(entityConnections.investigationId, this.investigationId)),
      ]);

      await db
        .update(investigations)
        .set({
          status: 'complete',
          progress: 100,
          scanDuration: duration,
          completedAt: new Date(),
          totalFindings: allFindings.length,
          criticalFlags: allFindings.filter((f) => f.severity === 'critical').length,
          entityCount: allEntities.length,
          connectionCount: allConnections.length,
          scanLog: this.logEntries,
        })
        .where(eq(investigations.id, this.investigationId));

      await this.log('engine', `Investigation complete. ${allFindings.length} findings, ${allEntities.length} entities, ${allConnections.length} connections in ${duration}s`, 'success');
    } catch (err: any) {
      await db
        .update(investigations)
        .set({
          status: 'failed',
          scanLog: [
            ...this.logEntries,
            {
              timestamp: new Date().toISOString(),
              source: 'engine',
              action: 'fatal',
              result: 'error' as const,
              message: `Fatal error: ${err.message}`,
            },
          ],
        })
        .where(eq(investigations.id, this.investigationId));
      throw err;
    }
  }

  private async scrapeWebsite(domain: string): Promise<void> {
    await this.log('web', `Scraping https://${domain}...`, 'info');

    const homepageUrl = domain.startsWith('http') ? domain : `https://${domain}`;

    const res = await safeFetch(homepageUrl);
    if (!res.ok) {
      await this.log('web', `HTTP ${res.status} from ${domain}`, 'warning');
      await this.addFinding('warning', 'Website Scrape', `Website returned HTTP ${res.status}`,
        `Attempted to access ${homepageUrl} but received status ${res.status}. The site may be down, blocking automated requests, or the domain may be incorrect.`,
        ['Website', 'Error']);
      return;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').text().trim();

    const links = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      if (href.startsWith('/') && !href.startsWith('//')) {
        links.add(`${homepageUrl}${href}`);
      } else if (href.includes(domain)) {
        links.add(href);
      }
    });

    await this.log('web', `Found ${links.size} internal pages`, 'success');

    const bodyText = $('body').text().replace(/\s+/g, ' ');

    const phones = Array.from(new Set(bodyText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []));
    const emails = Array.from(new Set(bodyText.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g) || []));
    const addressPattern = /\d+\s+[\w\s]+(?:St|Ave|Blvd|Dr|Ln|Rd|Pl|Ct|Way|Cir|Suite|Ste)[\w\s,#]+\d{5}/gi;
    const addresses = Array.from(new Set(bodyText.match(addressPattern) || []));

    for (const addr of addresses.slice(0, 3)) {
      await this.addEntity('address', addr.trim(), 'Discovered on website');
    }
    for (const email of emails.slice(0, 5)) {
      await this.addEntity('email', email, 'Found on website');
    }
    for (const phone of phones.slice(0, 3)) {
      await this.addEntity('phone', phone, 'Found on website');
    }

    const keyPagePatterns = /about|team|staff|provider|service|mission|contact|leadership|our-/i;
    const keyPages = Array.from(links).filter((l) => keyPagePatterns.test(l)).slice(0, 6);

    let teamMembersFound = 0;
    for (const pageUrl of keyPages) {
      try {
        const pageRes = await safeFetch(pageUrl, {}, 10000);
        if (!pageRes.ok) continue;

        const pageHtml = await pageRes.text();
        const page$ = cheerio.load(pageHtml);

        const selectors = [
          '[class*="team"]', '[class*="staff"]', '[class*="bio"]',
          '[class*="member"]', '[class*="doctor"]', '[class*="provider"]',
          '[class*="personnel"]', '[class*="leader"]',
        ];

        page$(selectors.join(', ')).each((_, el) => {
          const nameEl = page$(el).find('h2, h3, h4, [class*="name"], strong').first();
          const name = nameEl.text().trim();
          const roleEl = page$(el).find('[class*="title"], [class*="role"], [class*="position"], em, small').first();
          const role = roleEl.text().trim();

          if (name && name.length > 2 && name.length < 60 && !/menu|nav|footer/i.test(name)) {
            this.addEntity('person', name, role || 'Team member', {
              details: { source: pageUrl },
            });
            teamMembersFound++;
          }
        });

        await this.delay(400);
      } catch {
        // skip failed pages
      }
    }

    if (teamMembersFound > 0) {
      await this.log('web', `Discovered ${teamMembersFound} team members`, 'success');
    }

    await this.addFinding('info', 'Website Scrape', `Website Analysis: ${domain}`,
      `Title: "${title}". ${links.size} internal pages found. Contact info: ${phones.length} phone numbers, ${emails.length} emails, ${addresses.length} addresses. ${teamMembersFound} team members identified from staff pages.`,
      ['Website', 'Overview'], homepageUrl);
  }

  private async lookupDomain(domain: string): Promise<void> {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    await this.log('domain', `WHOIS lookup on ${cleanDomain}...`, 'info');

    const res = await safeFetch(`https://who-dat.as93.net/${cleanDomain}`);
    if (!res.ok) {
      await this.log('domain', `WHOIS lookup returned ${res.status}`, 'warning');
      return;
    }

    const data = await res.json();

    if (data.domain) {
      const created = data.domain?.created_date || data.domain?.creation_date;
      const expires = data.domain?.expiration_date;
      const registrar = data.registrar?.name || data.registrar;

      await this.addEntity('domain', cleanDomain, `Registered: ${created || 'unknown'}`, {
        registrar: typeof registrar === 'string' ? registrar : registrar?.name,
        registrationDate: created ? new Date(created) : null,
      });

      const registrantOrg = data.registrant?.organization?.toLowerCase() || '';
      if (registrantOrg.includes('privacy') || registrantOrg.includes('proxy') || registrantOrg.includes('redacted')) {
        await this.addFinding('warning', 'Domain Intel', 'Domain Uses WHOIS Privacy Protection',
          `${cleanDomain} is registered behind a WHOIS privacy service (${data.registrant?.organization || 'redacted'}). While common for personal sites, this is unusual for a legitimate business that should be transparent about ownership.`,
          ['Domain', 'Privacy', 'WHOIS']);
      }

      if (created) {
        const createdDate = new Date(created);
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        if (createdDate > twoYearsAgo) {
          await this.addFinding('warning', 'Domain Intel', 'Recently Registered Domain',
            `${cleanDomain} was registered on ${created}, which is less than 2 years ago. New domains for established businesses can indicate a recently created entity or rebrand.`,
            ['Domain', 'New', 'WHOIS']);
        }
      }

      if (expires) {
        const expDate = new Date(expires);
        const sixMonths = new Date();
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        if (expDate < sixMonths) {
          await this.addFinding('warning', 'Domain Intel', 'Domain Expiring Soon',
            `${cleanDomain} expires on ${expires}. A domain expiring within 6 months without renewal suggests the entity may not be planning to continue operations.`,
            ['Domain', 'Expiring']);
        }
      }

      await this.addFinding('info', 'Domain Intel', `Domain Record: ${cleanDomain}`,
        `Registrar: ${typeof registrar === 'string' ? registrar : 'Unknown'}. Created: ${created || 'Unknown'}. Expires: ${expires || 'Unknown'}. Registrant: ${data.registrant?.organization || data.registrant?.name || 'Redacted'}.`,
        ['Domain', 'WHOIS'], undefined, data);

      await this.log('domain', `Domain registered ${created || '(date unknown)'}`, 'success');
    }
  }

  private async searchCorporateFilings(name: string, state: string): Promise<void> {
    await this.log('corp', `Searching ${state} corporate filings for "${name}"...`, 'info');

    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(name)}&jurisdiction_code=us_${state.toLowerCase()}&per_page=5`;

    const res = await safeFetch(url);
    if (!res.ok) {
      await this.log('corp', `OpenCorporates returned ${res.status} — may have hit rate limit`, 'warning');
      return;
    }

    const data = await res.json();
    const companies = data.results?.companies || [];

    if (companies.length === 0) {
      await this.log('corp', `No entity found for "${name}" in ${state}`, 'warning');
      await this.addFinding('critical', 'Corporate Filings',
        `No Business Registration Found in ${state}`,
        `"${name}" returned no matching entities in ${state} Secretary of State records via OpenCorporates. This is a significant compliance concern — the entity may be operating without proper state registration, may be registered under a different name, or may be registered in a different state.`,
        ['Corporate', 'Missing', 'Compliance']);
      return;
    }

    for (const item of companies) {
      const company = item.company;
      if (!company) continue;

      const companyStatus = company.current_status || 'Unknown';
      const companyType = company.company_type || 'Unknown';
      const incDate = company.incorporation_date || 'Unknown';
      const agent = company.registered_address?.in_full || 'Unknown';

      await this.addEntity('company', company.name, `${companyType} — ${companyStatus}`, {
        state: state,
        sosId: company.company_number,
        details: {
          opencorporatesUrl: company.opencorporates_url,
          status: companyStatus,
          type: companyType,
        },
      });

      const badStatuses = ['dissolved', 'inactive', 'revoked', 'delinquent', 'suspended', 'withdrawn'];
      if (badStatuses.some((s) => companyStatus.toLowerCase().includes(s))) {
        await this.addFinding('critical', 'Corporate Filings',
          `Entity Status: ${companyStatus.toUpperCase()}`,
          `${company.name} has a status of "${companyStatus}" in ${state}. An entity that is not in good standing may not have authority to conduct business.`,
          ['Corporate', 'Status', 'Compliance']);
      } else {
        await this.addFinding('info', 'Corporate Filings',
          `Corporate Registration: ${company.name}`,
          `Type: ${companyType}. Status: ${companyStatus}. Incorporated: ${incDate}. Registered Agent/Address: ${agent}. Filing #: ${company.company_number || 'N/A'}.`,
          ['Corporate', 'SOS', state], company.opencorporates_url, company);
      }

      await this.log('corp', `Found: ${company.name} (${companyStatus})`, 'success');
    }
  }

  private async searchLegalRecords(name: string): Promise<void> {
    await this.log('legal', `Searching federal court records for "${name}"...`, 'info');

    const apiKey = process.env.COURTLISTENER_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Token ${apiKey}`;
    }

    const url = `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(name)}&type=o&format=json&page_size=10`;

    const res = await safeFetch(url, { headers });
    if (!res.ok) {
      await this.log('legal', `CourtListener returned ${res.status}`, 'warning');
      if (res.status === 401 || res.status === 403) {
        await this.log('legal', 'Missing or invalid COURTLISTENER_API_KEY', 'error');
      }
      return;
    }

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      await this.log('legal', 'No federal court records found', 'info');
      await this.addFinding('success', 'Legal Records', 'No Federal Court Records Found',
        `No cases mentioning "${name}" were found in the CourtListener federal database. This is generally positive but does not cover state courts.`,
        ['Legal', 'Clear']);
      return;
    }

    await this.log('legal', `Found ${results.length} legal records`, 'success');

    for (const result of results.slice(0, 5)) {
      const caseName = result.caseName || result.case_name || 'Unknown Case';
      const court = result.court || result.court_id || 'Unknown Court';
      const dateFiled = result.dateFiled || result.date_filed || 'Unknown Date';
      const snippet = result.snippet || '';
      const absUrl = result.absolute_url
        ? `https://www.courtlistener.com${result.absolute_url}`
        : undefined;

      await this.addFinding('warning', 'Legal Records', `Case: ${caseName}`,
        `Court: ${court}. Filed: ${dateFiled}. ${snippet.replace(/<[^>]+>/g, '').substring(0, 300)}`,
        ['Legal', 'Court Record'], absUrl, result);

      await this.addEntity('case', caseName, `${court} — ${dateFiled}`, {
        details: { url: absUrl, court, dateFiled },
      });
    }
  }

  private async searchNPI(name: string): Promise<void> {
    await this.log('npi', `Querying NPI Registry for "${name}"...`, 'info');

    let url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&organization_name=${encodeURIComponent(name)}&limit=10`;
    let res = await safeFetch(url);
    let data: any = {};

    if (res.ok) {
      data = await res.json();
    }

    if (!data.result_count || data.result_count === 0) {
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts[parts.length - 1];
        url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&limit=10`;
        res = await safeFetch(url);
        if (res.ok) {
          data = await res.json();
        }
      }
    }

    if (!data.result_count || data.result_count === 0) {
      await this.log('npi', 'No NPI records found', 'info');
      return;
    }

    await this.log('npi', `Found ${data.result_count} NPI record(s)`, 'success');

    for (const result of (data.results || []).slice(0, 10)) {
      const basic = result.basic || {};
      const npiAddresses = result.addresses || [];
      const practiceAddr = npiAddresses.find((a: any) => a.address_purpose === 'LOCATION');
      const mailAddr = npiAddresses.find((a: any) => a.address_purpose === 'MAILING');
      const taxonomies = result.taxonomies || [];

      const entityName = basic.organization_name || `${basic.first_name || ''} ${basic.last_name || ''}`.trim();
      const npiNumber = result.number;

      await this.addEntity('license', entityName, `NPI: ${npiNumber}`, {
        npi: String(npiNumber),
        address: practiceAddr
          ? `${practiceAddr.address_1}, ${practiceAddr.city}, ${practiceAddr.state} ${practiceAddr.postal_code}`
          : undefined,
        state: practiceAddr?.state,
      });

      if (practiceAddr && mailAddr && practiceAddr.state !== mailAddr.state) {
        await this.addFinding('warning', 'NPI Registry', 'Out-of-State Mailing Address',
          `${entityName} practices in ${practiceAddr.state} but has a mailing address in ${mailAddr.state} (${mailAddr.city}, ${mailAddr.state} ${mailAddr.postal_code}). This may indicate external management, billing company, or ownership structure outside the practice state.`,
          ['NPI', 'Out-of-State', 'Management'], undefined, result);
      }

      if (basic.status === 'D' || basic.deactivation_date) {
        await this.addFinding('critical', 'NPI Registry', `Deactivated NPI: ${entityName}`,
          `NPI ${npiNumber} for ${entityName} has been deactivated${basic.deactivation_date ? ` on ${basic.deactivation_date}` : ''}. ${basic.deactivation_reason_code ? `Reason code: ${basic.deactivation_reason_code}` : ''}`,
          ['NPI', 'Deactivated', 'Compliance']);
      }

      const specialties = taxonomies
        .map((t: any) => `${t.desc || t.code}${t.primary ? ' (Primary)' : ''}`)
        .join(', ');

      const locationStr = practiceAddr
        ? `${practiceAddr.address_1}, ${practiceAddr.city}, ${practiceAddr.state} ${practiceAddr.postal_code}`
        : 'No practice address listed';

      await this.addFinding('info', 'NPI Registry', `NPI Record: ${entityName}`,
        `NPI: ${npiNumber}. Type: ${basic.enumeration_type === 'NPI-1' ? 'Individual' : 'Organization'}. Status: ${basic.status === 'A' ? 'Active' : basic.status}. Location: ${locationStr}. ${specialties ? `Specialties: ${specialties}` : ''}`,
        ['NPI', 'Provider'], undefined, result);
    }
  }

  private async searchReviews(name: string): Promise<void> {
    await this.log('reviews', `Searching reviews and complaints for "${name}"...`, 'info');

    const cseKey = process.env.GOOGLE_CSE_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (!cseKey || !cseId) {
      await this.log('reviews', 'GOOGLE_CSE_KEY or GOOGLE_CSE_ID not configured — skipping reviews', 'warning');
      return;
    }

    const queries = [
      `"${name}" review OR complaint OR scam`,
      `"${name}" BBB rating OR "Better Business Bureau"`,
    ];

    for (const query of queries) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=5`;
        const res = await safeFetch(url);

        if (!res.ok) {
          if (res.status === 429) {
            await this.log('reviews', 'Google CSE daily quota reached', 'warning');
            return;
          }
          continue;
        }

        const data = await res.json();
        const items = data.items || [];

        for (const item of items.slice(0, 3)) {
          const isBBB = item.link?.includes('bbb.org');
          const isNegative = /complaint|scam|fraud|lawsuit|warning/i.test(`${item.title} ${item.snippet}`);

          await this.addFinding(
            isNegative ? 'warning' : 'info',
            isBBB ? 'BBB' : 'Reviews',
            item.title?.substring(0, 120) || 'Review Found',
            item.snippet?.substring(0, 400) || 'No preview available.',
            ['Reviews', isBBB ? 'BBB' : 'Online'],
            item.link
          );
        }

        if (items.length > 0) {
          await this.log('reviews', `Found ${items.length} review/complaint results`, 'success');
        }

        await this.delay(200);
      } catch {
        // continue
      }
    }
  }

  private async searchSocial(name: string): Promise<void> {
    await this.log('social', `Searching social profiles for "${name}"...`, 'info');

    const cseKey = process.env.GOOGLE_CSE_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (!cseKey || !cseId) {
      await this.log('social', 'GOOGLE_CSE_KEY not configured — skipping social search', 'warning');
      return;
    }

    const query = `site:linkedin.com "${name}"`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=5`;

    const res = await safeFetch(url);
    if (!res.ok) return;

    const data = await res.json();
    const items = data.items || [];

    for (const item of items.slice(0, 5)) {
      const title = item.title || '';
      const nameParts = title.split(' - ');
      const personName = nameParts[0]?.replace(/\s*\|.*/, '').trim();
      const personRole = nameParts.length > 1 ? nameParts.slice(1).join(' - ').replace(/\s*\|.*/, '').trim() : '';

      if (personName && personName.length < 60) {
        await this.addEntity('person', personName, personRole || 'Found on LinkedIn', {
          details: { linkedinUrl: item.link },
        });
      }

      await this.addFinding('info', 'Social', `LinkedIn: ${title.substring(0, 100)}`,
        item.snippet?.substring(0, 300) || '',
        ['Social', 'LinkedIn'], item.link);
    }

    if (items.length > 0) {
      await this.log('social', `Found ${items.length} LinkedIn profiles`, 'success');
    }
  }

  private async searchNews(name: string): Promise<void> {
    await this.log('news', `Searching news coverage for "${name}"...`, 'info');

    const newsApiKey = process.env.NEWSAPI_KEY;

    if (newsApiKey) {
      const url = `https://newsapi.org/v2/everything?q="${encodeURIComponent(name)}"&sortBy=relevancy&pageSize=5&apiKey=${newsApiKey}`;
      const res = await safeFetch(url);

      if (res.ok) {
        const data = await res.json();
        const articles = data.articles || [];

        for (const article of articles.slice(0, 5)) {
          const isNegative = /lawsuit|fraud|investigation|scandal|charged|indicted|sued/i.test(
            `${article.title} ${article.description}`
          );

          await this.addFinding(
            isNegative ? 'warning' : 'info',
            'News',
            article.title?.substring(0, 120) || 'News Article',
            `${article.source?.name || 'Unknown Source'} — ${article.publishedAt?.substring(0, 10) || ''}. ${article.description?.substring(0, 300) || ''}`,
            ['News', article.source?.name || 'Unknown'],
            article.url
          );
        }

        if (articles.length > 0) {
          await this.log('news', `Found ${articles.length} news articles`, 'success');
        }
        return;
      }
    }

    const cseKey = process.env.GOOGLE_CSE_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (cseKey && cseId) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseId}&q=${encodeURIComponent(`"${name}" news`)}&num=5&sort=date`;
      const res = await safeFetch(url);

      if (res.ok) {
        const data = await res.json();
        for (const item of (data.items || []).slice(0, 3)) {
          await this.addFinding('info', 'News', item.title?.substring(0, 120) || 'News Result',
            item.snippet?.substring(0, 300) || '',
            ['News'], item.link);
        }
      }
    } else {
      await this.log('news', 'No news API configured (NEWSAPI_KEY or GOOGLE_CSE_KEY)', 'warning');
    }
  }

  private async runAIAnalysis(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await this.log('ai', 'ANTHROPIC_API_KEY not set — using heuristic scoring', 'warning');
      await this.heuristicAnalysis();
      return;
    }

    const [allFindings, allEntities] = await Promise.all([
      db.select().from(investigationFindings).where(eq(investigationFindings.investigationId, this.investigationId)),
      db.select().from(discoveredEntities).where(eq(discoveredEntities.investigationId, this.investigationId)),
    ]);

    if (allFindings.length === 0) {
      await db.update(investigations).set({
        aiSummary: 'No findings to analyze. The investigation returned no data from any source.',
        aiRiskScore: 0,
      }).where(eq(investigations.id, this.investigationId));
      return;
    }

    const findingsSummary = allFindings
      .map((f) => `[${f.severity?.toUpperCase()}] ${f.title}: ${f.body?.substring(0, 200)}`)
      .join('\n');

    const entitiesSummary = allEntities
      .map((e) => `${e.type}: ${e.name} (${e.role || 'no role'})`)
      .join('\n');

    const prompt = `You are a legal investigation analyst. Analyze these findings and provide a concise assessment.

TARGET: ${allFindings[0]?.source || 'Unknown Entity'}

FINDINGS (${allFindings.length} total):
${findingsSummary}

ENTITIES DISCOVERED (${allEntities.length}):
${entitiesSummary}

Respond in this exact JSON format (no markdown, no backticks):
{
  "riskScore": <0-100>,
  "summary": "<3-4 sentence executive summary of key risks and findings>",
  "topRisks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "nextSteps": ["<recommended action 1>", "<recommended action 2>"]
}`;

    try {
      const res = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      }, 30000);

      if (!res.ok) {
        await this.log('ai', `Anthropic API returned ${res.status}`, 'warning');
        await this.heuristicAnalysis();
        return;
      }

      const aiData = await res.json();
      const text = aiData.content?.[0]?.text || '';

      try {
        const cleaned = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        await db.update(investigations).set({
          aiSummary: `${parsed.summary}\n\nTop Risks:\n${(parsed.topRisks || []).map((r: string) => `- ${r}`).join('\n')}\n\nNext Steps:\n${(parsed.nextSteps || []).map((s: string) => `- ${s}`).join('\n')}`,
          aiRiskScore: Math.min(100, Math.max(0, parsed.riskScore || 0)),
        }).where(eq(investigations.id, this.investigationId));

        await this.log('ai', `AI risk score: ${parsed.riskScore}/100`, 'success');
      } catch {
        await db.update(investigations).set({
          aiSummary: text.substring(0, 2000),
          aiRiskScore: allFindings.filter((f) => f.severity === 'critical').length * 20 +
                       allFindings.filter((f) => f.severity === 'warning').length * 5,
        }).where(eq(investigations.id, this.investigationId));
      }
    } catch (err: any) {
      await this.log('ai', `AI analysis error: ${err.message}`, 'error');
      await this.heuristicAnalysis();
    }
  }

  private async heuristicAnalysis(): Promise<void> {
    const allFindings = await db.select().from(investigationFindings)
      .where(eq(investigationFindings.investigationId, this.investigationId));

    const critical = allFindings.filter((f) => f.severity === 'critical').length;
    const warnings = allFindings.filter((f) => f.severity === 'warning').length;
    const score = Math.min(100, critical * 25 + warnings * 8);

    const criticalTitles = allFindings
      .filter((f) => f.severity === 'critical')
      .map((f) => f.title)
      .slice(0, 3);

    await db.update(investigations).set({
      aiSummary: `Heuristic analysis: ${critical} critical finding(s) and ${warnings} warning(s) detected across ${allFindings.length} total findings. ${criticalTitles.length > 0 ? `Key concerns: ${criticalTitles.join('; ')}.` : 'No critical flags identified.'} Risk score calculated using weighted severity counts.`,
      aiRiskScore: score,
    }).where(eq(investigations.id, this.investigationId));
  }

  private async mapConnections(): Promise<void> {
    const entities = await db.select().from(discoveredEntities)
      .where(eq(discoveredEntities.investigationId, this.investigationId));

    if (entities.length < 2) return;

    const addressMap = new Map<string, typeof entities>();
    for (const entity of entities) {
      if (entity.address) {
        const key = entity.address.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!addressMap.has(key)) addressMap.set(key, []);
        addressMap.get(key)!.push(entity);
      }
    }

    for (const [_, group] of Array.from(addressMap)) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          await this.addConnection(
            group[i].id, group[j].id,
            'shared_address', 'confirmed',
            `Both associated with the same address`, 'warning'
          );
        }
      }
    }

    const stateMap = new Map<string, typeof entities>();
    for (const entity of entities) {
      if (entity.state) {
        if (!stateMap.has(entity.state)) stateMap.set(entity.state, []);
        stateMap.get(entity.state)!.push(entity);
      }
    }

    for (const [state, group] of Array.from(stateMap)) {
      if (group.length < 2) continue;
      for (let i = 0; i < Math.min(group.length - 1, 5); i++) {
        for (let j = i + 1; j < Math.min(group.length, 6); j++) {
          const exists = addressMap.has(
            (group[i].address || '').toLowerCase().replace(/\s+/g, ' ').trim()
          );
          if (!exists) {
            await this.addConnection(
              group[i].id, group[j].id,
              'same_state', 'inferred',
              `Both entities associated with ${state}`, null
            );
          }
        }
      }
    }

    const npiEntities = entities.filter((e) => e.npi);
    if (npiEntities.length > 1) {
      for (let i = 0; i < npiEntities.length - 1; i++) {
        for (let j = i + 1; j < npiEntities.length; j++) {
          await this.addConnection(
            npiEntities[i].id, npiEntities[j].id,
            'npi_network', 'suspected',
            `Both have NPI records (${npiEntities[i].npi}, ${npiEntities[j].npi})`, 'info'
          );
        }
      }
    }
  }

  // ---- Helper Methods ----

  private async safeExecute(source: string, fn: () => Promise<void>): Promise<void> {
    const progressPerSource = 70 / 8;
    try {
      await withTimeout(fn(), 60000, source);
    } catch (err: any) {
      await this.log(source, `Error: ${err.message}`, 'error');
    }
    const currentProgress = await this.getCurrentProgress();
    await this.updateProgress(
      Math.min(75, currentProgress + progressPerSource),
      `Completed ${source} scan`
    );
  }

  private async getCurrentProgress(): Promise<number> {
    const [inv] = await db.select({ progress: investigations.progress })
      .from(investigations)
      .where(eq(investigations.id, this.investigationId));
    return inv?.progress || 0;
  }

  private async updateStatus(status: string): Promise<void> {
    await db.update(investigations)
      .set({ status: status as any })
      .where(eq(investigations.id, this.investigationId));
  }

  private async updateProgress(progress: number, message: string): Promise<void> {
    await this.log('engine', message, 'info');
    await db.update(investigations)
      .set({ progress, scanLog: this.logEntries })
      .where(eq(investigations.id, this.investigationId));
  }

  private async log(source: string, message: string, result: ScanLogEntry['result']): Promise<void> {
    this.logEntries.push({
      timestamp: new Date().toISOString(),
      source,
      action: 'scan',
      result,
      message,
    });
  }

  private async addFinding(
    severity: FindingSeverity,
    source: string,
    title: string,
    body: string,
    tags: string[],
    url?: string,
    rawData?: any
  ): Promise<void> {
    await db.insert(investigationFindings).values({
      investigationId: this.investigationId,
      severity,
      source,
      title,
      body,
      tags,
      url: url || null,
      rawData: rawData || null,
    });
    this.findingsCount++;
    if (severity === 'critical') this.criticalCount++;
  }

  private async addEntity(
    type: EntityType,
    name: string,
    role: string,
    extra: Partial<{
      npi: string;
      address: string;
      state: string;
      sosId: string;
      registrar: string;
      registrationDate: Date | null;
      details: Record<string, unknown>;
    }> = {}
  ): Promise<void> {
    await db.insert(discoveredEntities).values({
      investigationId: this.investigationId,
      type,
      name,
      role,
      npi: extra.npi || null,
      address: extra.address || null,
      state: extra.state || null,
      sosId: extra.sosId || null,
      registrar: extra.registrar || null,
      registrationDate: extra.registrationDate || null,
      details: extra.details || null,
    });
  }

  private async addConnection(
    sourceEntityId: string,
    targetEntityId: string,
    relationship: string,
    strength: string,
    evidence: string,
    severity: FindingSeverity | null
  ): Promise<void> {
    await db.insert(entityConnections).values({
      investigationId: this.investigationId,
      sourceEntityId,
      targetEntityId,
      relationship,
      strength,
      evidence,
      severity,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
