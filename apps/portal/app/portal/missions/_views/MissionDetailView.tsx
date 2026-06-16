'use client';

// Mission detail (operator tool) — production port of the prototype's
// MissionView.jsx. Ties together brief · relationship map · editable
// players · rubric · opportunities · client deliverable, now backed by the
// mission_entity table. Entity edits persist through server actions
// (brain-in-the-loop): local state updates instantly for a snappy feel,
// text fields commit on blur, role/verify commit on change.
//
// AI research (MissionResearch) and client CSV intake (MissionIntake) slot
// into the left column in Sprint C / D — see the placeholder comment below.

import { useMemo, useState, useTransition, type CSSProperties } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { Button, Card, Icon, IconButton, MonoLabel, Pill, type PillTone } from '@industrysignal/ui';
import { MissionGraph, roleLabel } from './MissionGraph';
import { MissionResearch } from './MissionResearch';
import {
  addEntityAction,
  deleteEntityAction,
  updateEntityAction,
  type EntityRole,
  type LinkVM as ActionLinkVM,
} from '../[code]/actions';

// ----- View models (serializable, from the server page) -----

export interface MissionBriefVM {
  code: string;
  clientName: string;
  clientLegal: string | null;
  clientSector: string | null;
  clientNace: string | null;
  intent: string;
  sourceMarket: string | null;
  targetMarket: string | null;
  ask: string | null;
  deadline: string | null;
  status: string;
  deliverableNote: string | null;
  trendQuarter: string | null;
  nextRefresh: string | null;
}
export interface RubricVM {
  id: string;
  text: string;
  weight: string;
}
export interface EntityVM {
  id: string;
  name: string;
  role: EntityRole;
  city: string | null;
  note: string | null;
  decisionMaker: string | null;
  source: string | null;
  verify: boolean;
  priority: string | null;
}
export interface LinkVM {
  id: string;
  fromEntity: string;
  toEntity: string;
  kind: string;
}
export interface OpportunityVM {
  id: string;
  tag: string | null;
  title: string | null;
  body: string | null;
  tone: string;
}
export interface TrendVM {
  id: string;
  territory: string | null;
  sector: string | null;
  quarter: string | null;
  title: string | null;
  body: string | null;
  metric: string | null;
  source: string | null;
  validated: boolean;
  tone: string;
}

const ROLE_TONE: Record<string, PillTone> = {
  client: 'amber',
  competitor: 'down',
  target: 'info',
  partner: 'up',
};

interface MissionDetailViewProps {
  brief: MissionBriefVM;
  rubric: RubricVM[];
  entities: EntityVM[];
  links: LinkVM[];
  opportunities: OpportunityVM[];
  trends: TrendVM[];
}

export function MissionDetailView({
  brief,
  rubric,
  entities: initialEntities,
  links: initialLinks,
  opportunities,
  trends,
}: MissionDetailViewProps) {
  const [lang] = useLang();
  const [entities, setEntities] = useState<EntityVM[]>(initialEntities);
  const [links, setLinks] = useState<LinkVM[]>(initialLinks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDeliverable, setShowDeliverable] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const code = brief.code;
  const selected = entities.find((e) => e.id === selectedId) ?? null;

  // --- mutations (optimistic local + persisted) ---
  function commitField(id: string, patch: Partial<EntityVM>) {
    startTransition(async () => {
      const res = await updateEntityAction(code, id, patch);
      if (!res.ok) setError(t(lang, 'msn_err_internal'));
      else setError(null);
    });
  }
  function changeField(id: string, patch: Partial<EntityVM>) {
    setEntities((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function addBlank() {
    startTransition(async () => {
      const res = await addEntityAction(code, {
        name: t(lang, 'md_new_name'),
        role: 'target',
        city: '—',
        note: '',
        source: 'OVĚŘIT',
        verify: true,
      });
      if (res.ok && res.entity) {
        setEntities((es) => [...es, res.entity as EntityVM]);
        setSelectedId(res.entity.id);
        setError(null);
      } else {
        setError(t(lang, 'msn_err_internal'));
      }
    });
  }

  function onResearchAccepted(entity: EntityVM, newLinks: ActionLinkVM[]) {
    setEntities((es) => (es.some((e) => e.id === entity.id) ? es : [...es, entity]));
    setLinks((ls) => [...ls, ...newLinks.filter((nl) => !ls.some((l) => l.id === nl.id))]);
    setError(null);
  }

  function deleteEntity(id: string) {
    startTransition(async () => {
      const res = await deleteEntityAction(code, id);
      if (res.ok) {
        setEntities((es) => es.filter((e) => e.id !== id));
        setLinks((ls) => ls.filter((l) => l.fromEntity !== id && l.toEntity !== id));
        setSelectedId(null);
        setError(null);
      } else {
        setError(t(lang, 'msn_err_internal'));
      }
    });
  }

  const counts = (['competitor', 'target', 'partner'] as const).map((r) => ({
    r,
    n: entities.filter((e) => e.role === r).length,
  }));
  const verifyCount = entities.filter((e) => e.verify).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 64px' }}>
      <BriefBar brief={brief} lang={lang} onExport={() => setShowDeliverable(true)} />

      {error && (
        <div style={{ color: 'var(--signal-down)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Stats + OVĚŘIT counter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {counts.map((c) => (
          <div key={c.r} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill tone={ROLE_TONE[c.r]} style={{ fontSize: 10 }}>
              {roleLabel(lang, c.r)}
            </Pill>
            <span style={statNumStyle()}>{c.n}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill tone="warn" style={{ fontSize: 10 }}>
            {t(lang, 'md_verify')}
          </Pill>
          <span style={statNumStyle()}>{verifyCount}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t(lang, 'md_verify_waiting')}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(300px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* MissionIntake (Sprint D — CSV client data) mounts here next. */}
          <MissionResearch code={code} onAccepted={onResearchAccepted} />
          <MissionGraph entities={entities} links={links} selectedId={selectedId} onSelect={setSelectedId} />
          <PlayersTable
            entities={entities}
            lang={lang}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddBlank={addBlank}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20 }}>
          {selected ? (
            <DetailPanel
              entity={selected}
              entities={entities}
              links={links}
              lang={lang}
              onChange={changeField}
              onCommit={commitField}
              onDelete={deleteEntity}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <RubricCard rubric={rubric} lang={lang} />
          )}
          <Opportunities items={opportunities} lang={lang} />
        </div>
      </div>

      {trends.length > 0 && <TrendReport trends={trends} brief={brief} lang={lang} />}

      {showDeliverable && (
        <Deliverable
          brief={brief}
          entities={entities}
          opportunities={opportunities}
          lang={lang}
          onClose={() => setShowDeliverable(false)}
        />
      )}
    </div>
  );
}

// ---------- Brief bar ----------
function BriefBar({
  brief,
  lang,
  onExport,
}: {
  brief: MissionBriefVM;
  lang: 'cs' | 'en';
  onExport: () => void;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--ln-border)', paddingBottom: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-tertiary)', letterSpacing: '0.06em' }}>
              {brief.code}
            </span>
            <Pill tone="amber">{t(lang, `intent_${brief.intent}`).toUpperCase()}</Pill>
            <Pill tone="neutral" pulse={brief.status === 'active'}>
              {t(lang, `mstatus_${brief.status}`).toUpperCase()}
            </Pill>
          </div>
          <div className="is-h1" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span>{brief.clientName}</span>
            {brief.sourceMarket && <span style={{ color: 'var(--fg-muted)', fontWeight: 300 }}>{brief.sourceMarket}</span>}
            <Icon name="chevron-right" size={22} color="var(--accent)" />
            {brief.targetMarket && <span style={{ color: 'var(--fg-muted)', fontWeight: 300 }}>{brief.targetMarket}</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 6 }}>
            {[brief.clientSector, brief.clientNace ? `NACE ${brief.clientNace}` : null, brief.deadline ? `${t(lang, 'md_deadline_label')} ${formatDate(brief.deadline, lang)}` : null, brief.deliverableNote]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <Button kind="primary" icon="download" onClick={onExport}>
          {t(lang, 'md_export')}
        </Button>
      </div>
      {brief.ask && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--accent-soft)', borderLeft: '2px solid var(--accent)', borderRadius: '0 var(--r-sm) var(--r-sm) 0' }}>
          <MonoLabel style={{ marginBottom: 4 }}>{t(lang, 'md_brief_ask')}</MonoLabel>
          <div style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>„{brief.ask}"</div>
        </div>
      )}
    </div>
  );
}

// ---------- Rubric ----------
function RubricCard({ rubric, lang }: { rubric: RubricVM[]; lang: 'cs' | 'en' }) {
  return (
    <Card pad={false}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)' }}>
        <MonoLabel>{t(lang, 'md_rubric_title')}</MonoLabel>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rubric.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', marginTop: 1 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.45 }}>{c.text}</div>
            </div>
            <Pill tone={c.weight === 'vysoká' ? 'amber' : 'neutral'} style={{ fontSize: 9 }}>
              {weightLabel(lang, c.weight)}
            </Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Detail panel ----------
function DetailPanel({
  entity,
  entities,
  links,
  lang,
  onChange,
  onCommit,
  onDelete,
  onClose,
}: {
  entity: EntityVM;
  entities: EntityVM[];
  links: LinkVM[];
  lang: 'cs' | 'en';
  onChange: (id: string, patch: Partial<EntityVM>) => void;
  onCommit: (id: string, patch: Partial<EntityVM>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const tone = ROLE_TONE[entity.role] ?? 'neutral';
  const linkedIds = new Set<string>();
  for (const l of links) {
    if (l.fromEntity === entity.id) linkedIds.add(l.toEntity);
    else if (l.toEntity === entity.id) linkedIds.add(l.fromEntity);
  }
  const linked = entities.filter((e) => linkedIds.has(e.id));

  // Text field: change updates local, blur persists the single field.
  const textField = (key: keyof EntityVM, extra?: CSSProperties) => ({
    value: (entity[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(entity.id, { [key]: e.target.value } as Partial<EntityVM>),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onCommit(entity.id, { [key]: e.target.value } as Partial<EntityVM>),
    style: { ...inputStyle(), ...extra },
  });

  return (
    <Card pad={false} style={{ borderColor: 'var(--ln-border)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill tone={tone} style={{ fontSize: 9 }}>
            {roleLabel(lang, entity.role)}
          </Pill>
          {entity.verify && (
            <Pill tone="warn" style={{ fontSize: 9 }}>
              {t(lang, 'md_verify')}
            </Pill>
          )}
        </div>
        <IconButton name="x" onClick={onClose} title={t(lang, 'md_close')} />
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>{t(lang, 'md_col_company')}</MonoLabel>
          <input {...textField('name', { fontSize: 15, fontWeight: 600 })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <MonoLabel style={{ marginBottom: 5 }}>{t(lang, 'md_col_role')}</MonoLabel>
            <select
              value={entity.role}
              onChange={(e) => {
                const role = e.target.value as EntityRole;
                onChange(entity.id, { role });
                onCommit(entity.id, { role });
              }}
              style={inputStyle()}
            >
              <option value="competitor">{t(lang, 'md_opt_competitor')}</option>
              <option value="target">{t(lang, 'md_opt_target')}</option>
              <option value="partner">{t(lang, 'md_opt_partner')}</option>
              <option value="client">{t(lang, 'md_opt_client')}</option>
            </select>
          </div>
          <div>
            <MonoLabel style={{ marginBottom: 5 }}>{t(lang, 'md_f_city')}</MonoLabel>
            <input {...textField('city')} />
          </div>
        </div>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>{t(lang, 'md_f_relevance')}</MonoLabel>
          <textarea
            value={entity.note ?? ''}
            onChange={(e) => onChange(entity.id, { note: e.target.value })}
            onBlur={(e) => onCommit(entity.id, { note: e.target.value })}
            rows={3}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>{t(lang, 'md_f_dm')}</MonoLabel>
          <input {...textField('decisionMaker')} placeholder={t(lang, 'md_f_dm_ph')} />
        </div>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>{t(lang, 'md_f_source')}</MonoLabel>
          <input {...textField('source')} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={entity.verify}
            onChange={(e) => {
              onChange(entity.id, { verify: e.target.checked });
              onCommit(entity.id, { verify: e.target.checked });
            }}
          />
          {t(lang, 'md_f_verify')}
        </label>
        {linked.length > 0 && (
          <div>
            <MonoLabel style={{ marginBottom: 6 }}>{t(lang, 'md_links')}</MonoLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {linked.map((l) => (
                <Pill key={l.id} tone="neutral" style={{ fontSize: 10 }}>
                  {l.name}
                </Pill>
              ))}
            </div>
          </div>
        )}
        {entity.role !== 'client' && (
          <Button kind="danger" icon="x" onClick={() => onDelete(entity.id)}>
            {t(lang, 'md_remove')}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---------- Players table ----------
function PlayersTable({
  entities,
  lang,
  selectedId,
  onSelect,
  onAddBlank,
}: {
  entities: EntityVM[];
  lang: 'cs' | 'en';
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddBlank: () => void;
}) {
  const order: Record<string, number> = { client: 0, competitor: 1, target: 2, partner: 3 };
  const rank = (role: string) => order[role] ?? 99;
  // Deterministic, locale-independent name compare: localeCompare() relies
  // on runtime ICU, which differs between Node (SSR) and the browser and
  // would reorder rows → hydration mismatch. Code-unit order is identical
  // on both sides.
  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const rows = [...entities].sort(
    (a, b) => rank(a.role) - rank(b.role) || byName(a.name, b.name),
  );
  return (
    <Card pad={false}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonoLabel>
          {t(lang, 'md_players')} · {entities.length}
        </MonoLabel>
        <Button kind="ghost" icon="plus" onClick={onAddBlank} style={{ fontSize: 12, padding: '5px 10px' }}>
          {t(lang, 'md_add_manual')}
        </Button>
      </div>
      <table className="bbg-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: '24%' }}>{t(lang, 'md_col_company')}</th>
            <th style={{ width: '13%' }}>{t(lang, 'md_col_role')}</th>
            <th>{t(lang, 'md_col_relevance')}</th>
            <th style={{ width: '18%' }}>{t(lang, 'md_col_source')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const tone = ROLE_TONE[e.role] ?? 'neutral';
            const sel = e.id === selectedId;
            return (
              <tr
                key={e.id}
                onClick={() => onSelect(e.id)}
                style={{ cursor: 'pointer', background: sel ? 'var(--accent-soft)' : undefined }}
              >
                <td style={{ verticalAlign: 'top' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{e.city}</div>
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  <Pill tone={tone} style={{ fontSize: 9 }}>
                    {roleLabel(lang, e.role)}
                  </Pill>
                  {e.priority && (
                    <div style={{ marginTop: 4 }}>
                      <Pill tone={priorityTone(e.priority)} style={{ fontSize: 8, padding: '1px 5px' }}>
                        {priorityLabel(lang, e.priority)}
                      </Pill>
                    </div>
                  )}
                </td>
                <td style={{ verticalAlign: 'top', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.45, whiteSpace: 'normal' }}>
                  {e.note}
                </td>
                <td style={{ verticalAlign: 'top', fontSize: 11 }}>
                  <span style={{ color: 'var(--fg-tertiary)' }}>{e.source}</span>
                  {e.verify && (
                    <div style={{ marginTop: 3 }}>
                      <Pill tone="warn" style={{ fontSize: 8, padding: '1px 5px' }}>
                        {t(lang, 'md_verify')}
                      </Pill>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ---------- Opportunities ----------
function Opportunities({ items, lang }: { items: OpportunityVM[]; lang: 'cs' | 'en' }) {
  return (
    <Card pad={false}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)' }}>
        <MonoLabel>{t(lang, 'md_opportunities')}</MonoLabel>
      </div>
      <div>
        {items.map((o, i) => (
          <div key={o.id} style={{ padding: 16, borderBottom: i < items.length - 1 ? '1px solid var(--ln-divider)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {o.tag && <Pill tone={(o.tone as PillTone) ?? 'neutral'}>{o.tag}</Pill>}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{o.title}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.55 }}>{o.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Trend report ----------
function TrendReport({
  trends,
  brief,
  lang,
}: {
  trends: TrendVM[];
  brief: MissionBriefVM;
  lang: 'cs' | 'en';
}) {
  return (
    <Card pad={false} style={{ marginTop: 20 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <MonoLabel>
          {t(lang, 'md_trends_title')}
          {brief.trendQuarter ? ` · ${brief.trendQuarter}` : ''}
        </MonoLabel>
        {brief.nextRefresh && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)' }}>
            {t(lang, 'md_trend_next_refresh')} {brief.nextRefresh}
          </span>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 1,
          background: 'var(--ln-divider)',
        }}
      >
        {trends.map((tr) => (
          <div key={tr.id} style={{ padding: 16, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <Pill tone={(tr.tone as PillTone) ?? 'info'} style={{ fontSize: 9 }}>
                {[tr.territory, tr.sector].filter(Boolean).join(' · ')}
              </Pill>
              {tr.metric && tr.metric !== '—' && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>
                  {tr.metric}
                </span>
              )}
              <Pill
                tone={tr.validated ? 'up' : 'warn'}
                style={{ fontSize: 8, padding: '1px 5px', marginLeft: 'auto' }}
              >
                {tr.validated ? t(lang, 'md_trend_validated') : t(lang, 'md_verify')}
              </Pill>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 4 }}>{tr.title}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{tr.body}</div>
            {tr.source && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{tr.source}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Deliverable (client-facing, print) ----------
function Deliverable({
  brief,
  entities,
  opportunities,
  lang,
  onClose,
}: {
  brief: MissionBriefVM;
  entities: EntityVM[];
  opportunities: OpportunityVM[];
  lang: 'cs' | 'en';
  onClose: () => void;
}) {
  // PDF + read-only share links (Block C). Generated server-side from the
  // public /share/<token> page; the result links render below the toolbar.
  const [shareBusy, setShareBusy] = useState<'pdf' | 'teaser' | null>(null);
  const [shareInfo, setShareInfo] = useState<{ pdfUrl?: string; shareUrl: string; mode: 'full' | 'teaser' } | null>(null);
  async function generatePdf() {
    setShareBusy('pdf');
    try {
      const res = await fetch(`/api/missions/${encodeURIComponent(brief.code)}/pdf`, { method: 'POST' });
      if (res.ok) {
        const r = (await res.json()) as { pdfUrl: string; shareUrl: string };
        setShareInfo({ ...r, mode: 'full' });
      }
    } finally {
      setShareBusy(null);
    }
  }
  async function generateTeaser() {
    setShareBusy('teaser');
    try {
      const res = await fetch(`/api/missions/${encodeURIComponent(brief.code)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'teaser' }),
      });
      if (res.ok) {
        const r = (await res.json()) as { shareUrl: string; mode: 'teaser' };
        setShareInfo({ shareUrl: r.shareUrl, mode: 'teaser' });
      }
    } finally {
      setShareBusy(null);
    }
  }

  const group = (title: string, role: EntityRole) => {
    const list = entities.filter((e) => e.role === role);
    if (!list.length) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={dlvSectionStyle()}>{title}</div>
        {list.map((e) => (
          <div key={e.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>
              {e.name} <span style={{ fontWeight: 400, color: 'var(--fg-muted)', fontSize: 12 }}>· {e.city}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>{e.note}</div>
            {e.decisionMaker && (
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>
                {t(lang, 'md_dlv_contact')} {e.decisionMaker}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  const subtitle = [brief.clientSector, `${t(lang, `intent_${brief.intent}`)} → ${brief.targetMarket ?? ''}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 50, overflow: 'auto', padding: '40px 20px' }}
      onClick={onClose}
    >
      <div
        className="deliverable"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--ln-border)', borderRadius: 'var(--r-md)', padding: 40 }}
      >
        {shareInfo && (
          <div
            className="no-print"
            style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--accent-soft)', borderLeft: '2px solid var(--accent)', borderRadius: '0 var(--r-sm) var(--r-sm) 0', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {shareInfo.pdfUrl && (
              <a href={shareInfo.pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent-text)' }}>
                ↓ {t(lang, 'md_dlv_share_pdf')}
              </a>
            )}
            <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
              {shareInfo.mode === 'teaser' ? t(lang, 'md_dlv_share_teaser_link') : t(lang, 'md_dlv_share_link')}
            </div>
            <input
              readOnly
              value={shareInfo.shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{ ...inputStyle(), fontSize: 11, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        )}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <Button kind="ghost" icon="external-link" onClick={generateTeaser} disabled={shareBusy !== null}>
            {shareBusy === 'teaser' ? t(lang, 'md_dlv_share_busy') : t(lang, 'md_dlv_share_teaser')}
          </Button>
          <Button kind="ghost" icon="file-text" onClick={generatePdf} disabled={shareBusy !== null}>
            {shareBusy === 'pdf' ? t(lang, 'md_dlv_share_busy') : t(lang, 'md_dlv_share')}
          </Button>
          <Button kind="primary" icon="download" onClick={() => window.print()}>
            {t(lang, 'md_dlv_print')}
          </Button>
          <Button kind="ghost" icon="x" onClick={onClose}>
            {t(lang, 'md_close')}
          </Button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--fg-tertiary)', marginBottom: 6 }}>
          {t(lang, 'md_dlv_header')} · {brief.code}
        </div>
        <div className="is-h1" style={{ marginBottom: 4 }}>
          {brief.clientName} → {brief.targetMarket}
        </div>
        <div style={{ fontSize: 14, color: 'var(--fg-tertiary)', marginBottom: 8 }}>{subtitle}</div>
        {brief.ask && (
          <div style={{ fontSize: 14, color: 'var(--fg-secondary)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 28, paddingLeft: 14, borderLeft: '2px solid var(--accent)' }}>
            „{brief.ask}"
          </div>
        )}
        {group(t(lang, 'md_dlv_competitors'), 'competitor')}
        {group(t(lang, 'md_dlv_targets'), 'target')}
        {group(t(lang, 'md_dlv_channels'), 'partner')}
        {opportunities.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={dlvSectionStyle()}>{t(lang, 'md_dlv_opps')}</div>
            {opportunities.map((o) => (
              <div key={o.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{o.title}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.55 }}>{o.body}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid var(--ln-divider)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>
          {t(lang, 'md_dlv_footer')}
        </div>
      </div>
    </div>
  );
}

// ----- helpers + styles -----

function weightLabel(lang: 'cs' | 'en', w: string): string {
  return w === 'vysoká' ? t(lang, 'weight_high') : w === 'střední' ? t(lang, 'weight_med') : t(lang, 'weight_low');
}

function priorityLabel(lang: 'cs' | 'en', p: string): string {
  return p === 'high' ? t(lang, 'md_prio_high') : p === 'medium' ? t(lang, 'md_prio_med') : t(lang, 'md_prio_low');
}

function priorityTone(p: string): PillTone {
  return p === 'high' ? 'amber' : p === 'medium' ? 'info' : 'neutral';
}

function formatDate(iso: string, lang: 'cs' | 'en'): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

function statNumStyle(): CSSProperties {
  return { fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)' };
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    background: 'var(--bg-input)',
    color: 'var(--fg-primary)',
    border: '1px solid var(--ln-border)',
    borderRadius: 'var(--r-sm)',
    padding: '7px 10px',
    outline: 'none',
  };
}

function dlvSectionStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--accent-text)',
    borderBottom: '1px solid var(--ln-border)',
    paddingBottom: 6,
    marginBottom: 10,
  };
}
