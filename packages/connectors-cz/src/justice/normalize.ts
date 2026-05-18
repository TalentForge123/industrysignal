// Justice.cz — HTML → normalized snapshot.
//
// The two upstream pages we parse:
//
//   A) `rejstrik-firma.vysledky?subjektId=X&typ=PLATNY` — current state
//      detail view. Contains nested sections per "rubrika" (chapter):
//      Obchodní firma, Sídlo, Statutární orgán, Dozorčí rada, ...
//
//      The DOM uses div.aunp-udajPolozka rows; within Statutární orgán
//      and Dozorčí rada each member is a sub-block with a function label
//      (.aunp-funkce) and a name + dates. Justice.cz has revised this
//      markup several times — selectors here are written defensively
//      (first match wins, missing data degrades to undefined).
//
//   B) `vypis-sl-firma?subjektId=X` — Sbírka listin. A table where each
//      row is one filing with: doc type label, year, filing date, link
//      to PDF. Filings without PDF links (announced but not yet
//      digitized) are skipped — we record only retrievable documents.
//
// We DO NOT translate Czech labels — they go to `roleLabel` /
// `documentTypeLabel` verbatim so the editorial / data team can refine
// the classifier without re-scraping.

import { load, type Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { contentHash } from '../shared/hash';
import type {
  JusticeFiling,
  JusticeFilingType,
  JusticeOfficer,
  JusticeOfficerRole,
  JusticeSnapshot,
} from './types';

const JUSTICE_BASE = 'https://or.justice.cz';

// ----- Role classification ----------------------------------------------

const ROLE_PATTERNS: Array<{ role: JusticeOfficerRole; pattern: RegExp }> = [
  // Order matters — most specific first. "Předseda dozorčí rady" must
  // match `supervisor`, not `director`, even though both contain words
  // that overlap with `představenstv`.
  { role: 'supervisor', pattern: /doz(orč|orci)/i },
  { role: 'procurator', pattern: /prokurist/i },
  { role: 'director', pattern: /představenstv|člen představenstva|předseda představenstva/i },
  { role: 'executive', pattern: /jednatel|statutár/i },
];

export function classifyOfficerRole(roleLabel: string): JusticeOfficerRole {
  for (const { role, pattern } of ROLE_PATTERNS) {
    if (pattern.test(roleLabel)) return role;
  }
  return 'other';
}

// ----- Filing-type classification ---------------------------------------

const FILING_PATTERNS: Array<{ type: JusticeFilingType; pattern: RegExp }> = [
  { type: 'annual_report', pattern: /výroč/i },
  // Be specific: "auditor" must match before "účet" (auditor reports
  // sometimes include "účetní" in their long label).
  { type: 'auditor_report', pattern: /audit/i },
  { type: 'financial_statement', pattern: /účetní závěrk|rozvah|výkaz|cash[\s-]?flow|příloha/i },
];

export function classifyFilingType(typeLabel: string): JusticeFilingType {
  for (const { type, pattern } of FILING_PATTERNS) {
    if (pattern.test(typeLabel)) return type;
  }
  return 'other';
}

// ----- Officer extraction ------------------------------------------------

/**
 * Extract officers from the PLATNY detail HTML. Selectors target the
 * current (2024+) layout:
 *
 *   <div class="aunp-udajGroup" data-rubrika="statutarni-organ">
 *     <div class="aunp-udajPolozka">
 *       <span class="aunp-funkce">Předseda představenstva</span>
 *       <span class="aunp-jmeno">Jméno Příjmení</span>
 *       <span class="aunp-datumOd">15. 3. 2022</span>
 *       <span class="aunp-datumDo">…</span>     (optional)
 *     </div>
 *   </div>
 *
 * Real-world markup occasionally drops the `data-rubrika` attribute on
 * older snapshots — we fall back to text-based section detection then.
 */
export function extractOfficers(html: string): JusticeOfficer[] {
  const $ = load(html);
  const officers: JusticeOfficer[] = [];

  // Primary path — data-rubrika attribute.
  const officerSections = $(
    '[data-rubrika="statutarni-organ"], [data-rubrika="dozorci-rada"], [data-rubrika="prokurista"]',
  );

  officerSections.each((_, section) => {
    $(section)
      .find('.aunp-udajPolozka')
      .each((_i, item) => {
        const officer = parseOfficerNode($(item));
        if (officer) officers.push(officer);
      });
  });

  // Fallback — when data-rubrika isn't present, look for any block whose
  // header text matches one of our role keywords and read .aunp-udajPolozka
  // children. Defensive; older justice.cz snapshots use this layout.
  if (officers.length === 0) {
    $('.aunp-udajGroup').each((_, group) => {
      const heading = $(group).find('.aunp-rubrika, h3, h4').first().text();
      if (!/statut|dozor|prokurist/i.test(heading)) return;
      $(group)
        .find('.aunp-udajPolozka')
        .each((_i, item) => {
          const officer = parseOfficerNode($(item));
          if (officer) officers.push(officer);
        });
    });
  }

  return officers;
}

function parseOfficerNode(node: Cheerio<AnyNode>): JusticeOfficer | null {
  const name = textOf(node.find('.aunp-jmeno').first());
  if (!name) return null;
  const roleLabel = textOf(node.find('.aunp-funkce').first()) || 'Neuvedeno';
  const appointedAt = parseCzechDate(textOf(node.find('.aunp-datumOd').first()));
  const terminatedAt = parseCzechDate(textOf(node.find('.aunp-datumDo').first()));
  const officer: JusticeOfficer = {
    name,
    role: classifyOfficerRole(roleLabel),
    roleLabel,
  };
  if (appointedAt !== undefined) officer.appointedAt = appointedAt;
  if (terminatedAt !== undefined) officer.terminatedAt = terminatedAt;
  return officer;
}

// ----- Filing extraction -------------------------------------------------

/**
 * Extract filings from the Sbírka listin page. The table shape:
 *
 *   <table class="result-details">
 *     <tr>
 *       <td>Účetní závěrka [2022]</td>      typeLabel + fiscalYear
 *       <td>15. 6. 2023</td>                filedAt
 *       <td><a href="/ias/content/.../docId=NNN">PDF</a></td>
 *     </tr>
 *   </table>
 *
 * justice.cz also exposes a list-style layout for some companies — we
 * additionally try `.documents li`. Whichever path returns rows wins.
 */
export function extractFilings(html: string, subjektId: string): JusticeFiling[] {
  const $ = load(html);
  const filings: JusticeFiling[] = [];

  $('table.result-details tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 3) return; // skip header
    const typeCellHtml = tds.eq(0);
    const filedAtText = tds.eq(1).text().trim();
    const link = tds.eq(2).find('a').first();
    const filing = buildFiling(subjektId, typeCellHtml.text(), filedAtText, link);
    if (filing) filings.push(filing);
  });

  if (filings.length === 0) {
    $('.documents li, .sbirka-listin li').each((_, li) => {
      const $li = $(li);
      const typeText = $li.find('.typ, .typ-listiny').text() || $li.text();
      const filedAtText = $li.find('.datum, .datum-podani').first().text();
      const link = $li.find('a').first();
      const filing = buildFiling(subjektId, typeText, filedAtText, link);
      if (filing) filings.push(filing);
    });
  }

  return filings;
}

function buildFiling(
  subjektId: string,
  typeCellText: string,
  filedAtText: string,
  link: Cheerio<AnyNode>,
): JusticeFiling | null {
  const href = link.attr('href');
  if (!href) return null;
  const documentUrl = href.startsWith('http') ? href : JUSTICE_BASE + href;
  // Pull docId from query string or path. Justice URLs vary across
  // years — these are the two shapes we've seen:
  //   /ias/content/download?id=NNN
  //   /ias/content/listina?docId=NNN
  const docIdMatch = documentUrl.match(/(?:docId|id)=(\d+)/);
  const docId = docIdMatch?.[1];
  if (!docId) return null;

  const typeLabel = typeCellText.trim().replace(/\s+/g, ' ');
  const fiscalYear = extractFiscalYear(typeLabel);
  const filedAt = parseCzechDate(filedAtText);

  const filing: JusticeFiling = {
    upstreamDocId: `${subjektId}-${docId}`,
    documentType: classifyFilingType(typeLabel),
    documentTypeLabel: typeLabel,
    documentUrl,
  };
  if (fiscalYear !== undefined) filing.fiscalYear = fiscalYear;
  if (filedAt !== undefined) filing.filedAt = filedAt;
  return filing;
}

function extractFiscalYear(label: string): number | undefined {
  // Examples we want to catch:
  //   "Účetní závěrka [2022]"
  //   "Výroční zpráva 2021"
  //   "Účetní závěrka za rok 2020"
  const m = label.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
  if (!m?.[1]) return undefined;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : undefined;
}

// ----- Shared helpers ---------------------------------------------------

function textOf(node: Cheerio<AnyNode>): string {
  return node.text().trim().replace(/\s+/g, ' ');
}

/**
 * Parse "15. 3. 2022" or "15.3.2022" → "2022-03-15". Returns undefined
 * for empty / unparseable input. Justice.cz consistently uses Czech
 * dotted dates with optional spaces.
 */
export function parseCzechDate(input: string): string | undefined {
  if (!input) return undefined;
  const m = input.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (!m) return undefined;
  const day = m[1]!.padStart(2, '0');
  const month = m[2]!.padStart(2, '0');
  const year = m[3]!;
  return `${year}-${month}-${day}`;
}

// ----- Subject-ID extraction (search page) ------------------------------

/**
 * Pull subjektId from the search results page. The hit row links to
 * `rejstrik-firma.vysledky?subjektId=NNNNN&typ=PLATNY`. Returns the
 * first match — searches by IČO always return a single subject when
 * the company exists.
 */
export function extractSubjektIdFromSearch(html: string): string | null {
  const $ = load(html);
  const link = $('a[href*="subjektId="]').first();
  const href = link.attr('href');
  if (!href) return null;
  const m = href.match(/subjektId=(\d+)/);
  return m?.[1] ?? null;
}

// ----- Snapshot assembly ------------------------------------------------

export interface AssembleSnapshotInput {
  subjektId: string;
  registryId?: string;
  detailHtml: string;
  filingsHtml: string;
  fetchedAt: Date;
}

export function assembleJusticeSnapshot(input: AssembleSnapshotInput): JusticeSnapshot {
  const officers = extractOfficers(input.detailHtml);
  const filings = extractFilings(input.filingsHtml, input.subjektId);

  // Content hash covers only the data we care about — not the raw HTML
  // bytes — so cosmetic markup changes don't trigger spurious snapshot
  // diffs in the Week-3 worker. Officers + filings are stable-sorted
  // first to make the hash insensitive to row order.
  const stableOfficers = [...officers].sort((a, b) =>
    `${a.role}|${a.name}`.localeCompare(`${b.role}|${b.name}`),
  );
  const stableFilings = [...filings].sort((a, b) =>
    a.upstreamDocId.localeCompare(b.upstreamDocId),
  );

  const hash = contentHash({
    subjektId: input.subjektId,
    officers: stableOfficers,
    filings: stableFilings,
  });

  const snapshot: JusticeSnapshot = {
    countryIso: 'CZ',
    subjektId: input.subjektId,
    sourceKey: 'justice',
    officers,
    filings,
    contentHash: hash,
    fetchedAt: input.fetchedAt.toISOString(),
  };
  if (input.registryId !== undefined) snapshot.registryId = input.registryId;
  return snapshot;
}
