// ISIR_CUZK_WS SOAP client.
//
// The upstream service is plain document-literal SOAP 1.1 with no auth
// (it's the public read-replica). The wire shape is fiddly: the request
// wrapper element lives in `http://isirws.cca.cz/types/`, but inner
// elements are *unqualified* (the upstream XSD uses the default
// elementFormDefault). We learned that the hard way against a live
// endpoint — the server returns a SOAP Fault if `<ic>` is emitted with
// the types namespace.
//
// Parsing uses fast-xml-parser. We do not pull in a generic SOAP
// library (jsforce-style autogen, node-soap, etc.) — they all add
// XML signing, WSSE, and other surface we don't need, and they fight
// JS-native fetch. A 40-line builder + a strict parser is the right
// scope for one operation.

import { XMLParser } from 'fast-xml-parser';
import { normalizeIsirResponse } from './normalize';
import type { IsirRawData, IsirRawResponse, IsirResult } from './types';

const DEFAULT_ENDPOINT =
  'https://isir.justice.cz:8443/isir_cuzk_ws/IsirWsCuzkService';
const DEFAULT_USER_AGENT =
  'IndustrySignal-Bot/1.0 (kontakt@industrysignal.cz; https://industrysignal.cz/bot)';
const DEFAULT_TIMEOUT_MS = 20_000;
// Hard upper bound enforced by the upstream service.
const ISIR_MAX_RESULTS = 200;

export class IsirSoapFaultError extends Error {
  constructor(
    public readonly faultCode: string,
    public readonly faultString: string,
  ) {
    super(`ISIR SOAP fault: ${faultCode} — ${faultString}`);
    this.name = 'IsirSoapFaultError';
  }
}

export class IsirHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`ISIR: HTTP ${status} for ${url} — ${body.slice(0, 200)}`);
    this.name = 'IsirHttpError';
  }
}

export interface IsirQuery {
  /** IČO — Czech business registration ID for legal entities. */
  ic?: string;
  /** Rodné číslo — birth number for natural persons. */
  rc?: string;
  nazevOsoby?: string;
  jmeno?: string;
  datumNarozeni?: string; // YYYY-MM-DD
  maxPocetVysledku?: number;
  filtrAktualniRizeni?: boolean;
  vyhledatPresnouShoduJmen?: boolean;
  vyhledatBezDiakritiky?: boolean;
}

export interface IsirClientOptions {
  endpoint?: string;
  userAgent?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

/**
 * Fetch insolvency events for a single Czech legal entity by IČO.
 * Thin wrapper over `fetchIsirEvents({ ic })` — by far the dominant use.
 */
export async function fetchIsirByIco(
  ic: string,
  options: IsirClientOptions = {},
): Promise<IsirResult> {
  const clean = ic.replace(/\D/g, '');
  if (!clean) throw new Error(`fetchIsirByIco: invalid IČO "${ic}"`);
  return fetchIsirEvents({ ic: clean }, options);
}

export async function fetchIsirEvents(
  query: IsirQuery,
  options: IsirClientOptions = {},
): Promise<IsirResult> {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const userAgent = options.userAgent ?? process.env.ARES_USER_AGENT ?? DEFAULT_USER_AGENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());

  const body = buildSoapEnvelope(query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""',
        'User-Agent': userAgent,
        Accept: 'text/xml,application/xml,application/soap+xml',
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new IsirHttpError(response.status, endpoint, text);
  }

  const parsed = parseSoapResponse(text);
  return normalizeIsirResponse(parsed, { fetchedAt: now() });
}

// ----- SOAP envelope builder ------------------------------------------

export function buildSoapEnvelope(query: IsirQuery): string {
  const inner: string[] = [];
  if (query.ic) inner.push(`<ic>${xmlEscape(query.ic)}</ic>`);
  if (query.rc) inner.push(`<rc>${xmlEscape(query.rc)}</rc>`);
  if (query.nazevOsoby) inner.push(`<nazevOsoby>${xmlEscape(query.nazevOsoby)}</nazevOsoby>`);
  if (query.jmeno) inner.push(`<jmeno>${xmlEscape(query.jmeno)}</jmeno>`);
  if (query.datumNarozeni) inner.push(`<datumNarozeni>${query.datumNarozeni}</datumNarozeni>`);
  const max = clamp(query.maxPocetVysledku ?? ISIR_MAX_RESULTS, 1, ISIR_MAX_RESULTS);
  inner.push(`<maxPocetVysledku>${max}</maxPocetVysledku>`);
  if (query.filtrAktualniRizeni !== undefined) {
    inner.push(`<filtrAktualniRizeni>${query.filtrAktualniRizeni ? 'T' : 'F'}</filtrAktualniRizeni>`);
  }
  if (query.vyhledatPresnouShoduJmen !== undefined) {
    inner.push(
      `<vyhledatPresnouShoduJmen>${query.vyhledatPresnouShoduJmen ? 'T' : 'F'}</vyhledatPresnouShoduJmen>`,
    );
  }
  if (query.vyhledatBezDiakritiky !== undefined) {
    inner.push(
      `<vyhledatBezDiakritiky>${query.vyhledatBezDiakritiky ? 'T' : 'F'}</vyhledatBezDiakritiky>`,
    );
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    '<soap:Body>',
    '<ns0:getIsirWsCuzkDataRequest xmlns:ns0="http://isirws.cca.cz/types/">',
    inner.join(''),
    '</ns0:getIsirWsCuzkDataRequest>',
    '</soap:Body>',
    '</soap:Envelope>',
  ].join('');
}

// ----- SOAP response parser -------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: true,
  // Strip xmlns prefixes from tag names — we don't care which namespace
  // each element lives in, only the local name (e.g. ns2:data ⇒ data).
  removeNSPrefix: true,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  // Force `data` to always be an array, even when there's exactly one
  // result. fast-xml-parser otherwise collapses single elements into
  // objects, which would force a branch every time we read it.
  isArray: (name) => name === 'data',
});

export function parseSoapResponse(xml: string): IsirRawResponse {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const envelope = parsed.Envelope as Record<string, unknown> | undefined;
  const body = envelope?.Body as Record<string, unknown> | undefined;
  if (!body) {
    throw new Error('ISIR: response is missing SOAP Envelope/Body');
  }
  const fault = body.Fault as
    | { faultcode?: string; faultstring?: string }
    | undefined;
  if (fault) {
    throw new IsirSoapFaultError(
      String(fault.faultcode ?? 'unknown'),
      String(fault.faultstring ?? ''),
    );
  }
  const response = body.getIsirWsCuzkDataResponse as
    | { data?: unknown[]; stav?: unknown }
    | undefined;
  if (!response) {
    throw new Error('ISIR: response is missing getIsirWsCuzkDataResponse');
  }
  return {
    data: ((response.data ?? []) as IsirRawData[]).map(coerceData),
    stav: (response.stav ?? {}) as IsirRawResponse['stav'],
  };
}

// fast-xml-parser yields numbers for `cisloSenatu`, but XML datatypes are
// stringly-typed in transit. Coerce defensively in case parseTagValue
// returns a string for any of the integer columns (e.g. leading zeros
// like "060" would be preserved as strings by the parser).
function coerceData(d: IsirRawData): IsirRawData {
  return {
    ...d,
    cisloSenatu: toInt(d.cisloSenatu),
    bcVec: toInt(d.bcVec),
    rocnik: toInt(d.rocnik),
  };
}

function toInt(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10);
  return 0;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
