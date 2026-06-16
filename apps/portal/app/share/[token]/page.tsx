// Public, read-only deliverable for a mission — reached by share token, no
// auth (BUILD-HANDOFF §0). `full` renders the whole relationship map; `teaser`
// shows a blurred preview (client + markets + counts + sectors + a couple of
// obscured leads) to qualify a prospect before revealing the full map. This
// is also the page Playwright prints to PDF (?print=1 strips the share chrome).
//
// Client-facing surface → a clean LIGHT editorial look (cream background,
// dark text, amber accent), deliberately not the dark operator terminal.

import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { findMissionShareByToken, findMissionById, getMissionDetail } from '@industrysignal/db';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Light editorial palette — explicit hex so the dark portal CSS variables
// don't bleed in. Amber accent kept for brand continuity.
const C = {
  bg: '#f6f3ea',
  panel: '#fffefb',
  fg: '#1b1a16',
  fg2: '#47443d',
  fg3: '#8b8678',
  muted: '#a8a395',
  accent: '#9c6b0e',
  accentSoft: 'rgba(224,173,60,0.16)',
  accentBar: '#e0ad3c',
  border: '#e6e0d2',
  warn: '#a9721a',
};

const ROLE_LABEL: Record<string, string> = {
  client: 'Klient',
  competitor: 'Konkurent',
  target: 'Cíl',
  partner: 'Partner',
};

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: C.accent,
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 6,
  marginBottom: 12,
};

export default async function SharePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { print?: string };
}) {
  const share = await findMissionShareByToken(db, params.token);
  if (!share) notFound();

  const mission = await findMissionById(db, share.missionId);
  if (!mission) notFound();
  const detail = await getMissionDetail(db, mission.code);
  if (!detail) notFound();

  const isTeaser = share.mode === 'teaser';
  const isPrint = searchParams.print === '1';
  const m = detail.mission;

  const byRole = (role: string) => detail.entities.filter((e) => e.role === role);
  const competitors = byRole('competitor');
  const targets = byRole('target');
  const partners = byRole('partner');
  const sectors = Array.from(
    new Set(detail.entities.map((e) => e.city).filter((c): c is string => Boolean(c))),
  ).slice(0, 8);

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: isPrint ? '24px 28px' : '44px 24px 80px',
          fontFamily: 'var(--font-sans, ui-sans-serif, system-ui)',
          color: C.fg,
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.08em', color: C.fg3, marginBottom: 6 }}>
            INDUSTRYSIGNAL · vztahová mapa · {m.code}
            {isTeaser ? ' · NÁHLED' : ''}
          </div>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            {m.clientName} <span style={{ color: C.muted, fontWeight: 300 }}>→ {m.targetMarket ?? '—'}</span>
          </h1>
          <div style={{ fontSize: 13, color: C.fg3 }}>
            {[m.clientSector, m.clientNace ? `NACE ${m.clientNace}` : null, m.deliverableNote]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            ['Konkurenti', competitors.length],
            ['Cíle', targets.length],
            ['Partneři', partners.length],
          ].map(([label, n]) => (
            <div key={label as string}>
              <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 26, fontWeight: 700, color: C.fg }}>{n as number}</div>
              <div style={{ fontSize: 11, color: C.fg3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label as string}</div>
            </div>
          ))}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: C.fg3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Sektory / lokality</div>
            <div style={{ fontSize: 12, color: C.fg2, lineHeight: 1.5 }}>{sectors.join(' · ') || '—'}</div>
          </div>
        </div>

        {isTeaser ? (
          <TeaserBody targets={targets} />
        ) : (
          <>
            {([['competitor', competitors], ['target', targets], ['partner', partners]] as const).map(
              ([role, list]) =>
                list.length > 0 && (
                  <section key={role} style={{ marginBottom: 24 }}>
                    <div style={sectionLabel}>
                      {ROLE_LABEL[role]} · {list.length}
                    </div>
                    {list.map((e) => (
                      <div key={e.id} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {e.name}{' '}
                          <span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}>· {e.city ?? ''}</span>
                          {e.verify && (
                            <span style={{ marginLeft: 8, fontSize: 9, color: C.warn, border: `1px solid ${C.warn}`, padding: '1px 4px', borderRadius: 2 }}>OVĚŘIT</span>
                          )}
                        </div>
                        {e.note && <div style={{ fontSize: 13, color: C.fg2, lineHeight: 1.5 }}>{e.note}</div>}
                        {(e.decisionMaker || e.source) && (
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, ui-monospace, monospace)', color: C.fg3 }}>
                            {[e.decisionMaker, e.source].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                ),
            )}

            {detail.opportunities.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <div style={sectionLabel}>Příležitosti</div>
                {detail.opportunities.map((o) => (
                  <div key={o.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {o.tag && (
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.06em', color: C.accent, background: C.accentSoft, padding: '2px 6px', borderRadius: 3, marginRight: 8 }}>{o.tag}</span>
                      )}
                      {o.title}
                    </div>
                    <div style={{ fontSize: 13, color: C.fg2, lineHeight: 1.55, marginTop: 3 }}>{o.body}</div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {!isPrint && (
          <div style={{ marginTop: 32, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 11, fontFamily: 'var(--font-mono, ui-monospace, monospace)', color: C.muted }}>
            IndustrySignal · sdílený náhled jen pro čtení{share.expiresAt ? ` · platí do ${share.expiresAt.toISOString().slice(0, 10)}` : ''}
          </div>
        )}
      </div>
    </div>
  );

  function TeaserBody({ targets }: { targets: { id: string; name: string; city: string | null }[] }) {
    const preview = targets.slice(0, 4);
    return (
      <section>
        <div style={sectionLabel}>Ukázka cílů (náhled)</div>
        {preview.map((e) => (
          <div key={e.id} style={{ marginBottom: 10, filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }} aria-hidden>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {e.name} <span style={{ color: C.muted, fontSize: 12 }}>· {e.city ?? ''}</span>
            </div>
            <div style={{ fontSize: 13, color: C.fg2 }}>Relevance, rozhodovací osoba a zdroj jsou v plné verzi mapy.</div>
          </div>
        ))}
        <div style={{ marginTop: 20, padding: '16px 20px', background: C.accentSoft, borderLeft: `2px solid ${C.accentBar}`, borderRadius: '0 6px 6px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Toto je náhled vztahové mapy.</div>
          <div style={{ fontSize: 13, color: C.fg2, lineHeight: 1.55 }}>
            Plná verze obsahuje konkrétní firmy, rozhodovací osoby, ozdrojované vazby na mapě a příležitosti. Pro přístup k plné mapě nás kontaktujte.
          </div>
        </div>
      </section>
    );
  }
}
