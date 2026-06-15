// Public, read-only deliverable for a mission — reached by share token, no
// auth (BUILD-HANDOFF §0). `full` renders the whole relationship map; `teaser`
// shows a blurred preview (client + markets + counts + sectors + a couple of
// obscured leads) to qualify a prospect before revealing the full map. This
// is also the page Playwright prints to PDF (?print=1 strips the share chrome).

import { notFound } from 'next/navigation';
import { findMissionShareByToken, findMissionById, getMissionDetail } from '@industrysignal/db';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  client: 'Klient',
  competitor: 'Konkurent',
  target: 'Cíl',
  partner: 'Partner',
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
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: isPrint ? '24px 28px' : '40px 24px 80px',
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'var(--fg-primary, #e8e6e1)',
        background: 'var(--bg-base, #14140f)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--ln-border, #333)', paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--fg-tertiary, #888)', marginBottom: 6 }}>
          INDUSTRYSIGNAL · vztahová mapa · {m.code}
          {isTeaser ? ' · NÁHLED' : ''}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>
          {m.clientName} <span style={{ color: 'var(--fg-muted, #999)', fontWeight: 300 }}>→ {m.targetMarket ?? '—'}</span>
        </h1>
        <div style={{ fontSize: 13, color: 'var(--fg-tertiary, #888)' }}>
          {[m.clientSector, m.clientNace ? `NACE ${m.clientNace}` : null, m.deliverableNote]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          ['Konkurenti', competitors.length],
          ['Cíle', targets.length],
          ['Partneři', partners.length],
        ].map(([label, n]) => (
          <div key={label as string}>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 24, fontWeight: 700 }}>{n as number}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary, #888)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label as string}</div>
          </div>
        ))}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary, #888)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Sektory / lokality</div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary, #ccc)', lineHeight: 1.5 }}>{sectors.join(' · ') || '—'}</div>
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
                  <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-text, #f2bb54)', borderBottom: '1px solid var(--ln-border, #333)', paddingBottom: 6, marginBottom: 12 }}>
                    {ROLE_LABEL[role]} · {list.length}
                  </div>
                  {list.map((e) => (
                    <div key={e.id} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {e.name}{' '}
                        <span style={{ fontWeight: 400, color: 'var(--fg-muted, #999)', fontSize: 12 }}>· {e.city ?? ''}</span>
                        {e.verify && (
                          <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--signal-warn, #d8a13a)', border: '1px solid', padding: '1px 4px', borderRadius: 2 }}>OVĚŘIT</span>
                        )}
                      </div>
                      {e.note && <div style={{ fontSize: 13, color: 'var(--fg-secondary, #ccc)', lineHeight: 1.5 }}>{e.note}</div>}
                      {(e.decisionMaker || e.source) && (
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-tertiary, #888)' }}>
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
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-text, #f2bb54)', borderBottom: '1px solid var(--ln-border, #333)', paddingBottom: 6, marginBottom: 12 }}>
                Příležitosti
              </div>
              {detail.opportunities.map((o) => (
                <div key={o.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-secondary, #ccc)', lineHeight: 1.5 }}>{o.body}</div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {!isPrint && (
        <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid var(--ln-border, #333)', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-muted, #999)' }}>
          IndustrySignal · sdílený náhled jen pro čtení{share.expiresAt ? ` · platí do ${share.expiresAt.toISOString().slice(0, 10)}` : ''}
        </div>
      )}
    </div>
  );
}

// Teaser: a couple of blurred leads + a qualification CTA. Names/details are
// obscured (blur + no selection) so a prospect sees the shape, not the data.
function TeaserBody({ targets }: { targets: { id: string; name: string; city: string | null }[] }) {
  const preview = targets.slice(0, 4);
  return (
    <section>
      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-text, #f2bb54)', borderBottom: '1px solid var(--ln-border, #333)', paddingBottom: 6, marginBottom: 12 }}>
        Ukázka cílů (náhled)
      </div>
      {preview.map((e) => (
        <div key={e.id} style={{ marginBottom: 10, filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }} aria-hidden>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {e.name} <span style={{ color: 'var(--fg-muted, #999)', fontSize: 12 }}>· {e.city ?? ''}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary, #ccc)' }}>Relevance, rozhodovací osoba a zdroj jsou v plné verzi mapy.</div>
        </div>
      ))}
      <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--accent-soft, rgba(242,187,84,0.1))', borderLeft: '2px solid var(--accent, #f2bb54)', borderRadius: '0 4px 4px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Toto je náhled vztahové mapy.</div>
        <div style={{ fontSize: 13, color: 'var(--fg-secondary, #ccc)', lineHeight: 1.5 }}>
          Plná verze obsahuje konkrétní firmy, rozhodovací osoby, ozdrojované vazby na mapě a příležitosti. Pro přístup k plné mapě nás kontaktujte.
        </div>
      </div>
    </section>
  );
}
