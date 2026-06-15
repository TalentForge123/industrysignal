'use client';

// Mission AI research — production port of MissionResearch.jsx. The model
// call moved server-side: this component POSTs to /api/missions/research
// (Anthropic key stays server-only) and renders the returned candidates.
// Accepting a candidate persists it through acceptCandidateAction (entity
// + auto-links), then lifts the new rows to the parent via onAccepted so
// the map/table/graph update without a reload. Brain-in-the-loop: nothing
// enters the map until the operator clicks Add.

import { useState, useTransition, type CSSProperties } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { Button, MonoLabel, Pill, type PillTone } from '@industrysignal/ui';
import type { ResearchCandidate } from '@/lib/mission-research';
import { roleLabel } from './MissionGraph';
import { acceptCandidateAction, type EntityVM, type LinkVM } from '../[code]/actions';

const ROLE_TONE: Record<string, PillTone> = { competitor: 'down', target: 'info', partner: 'up' };

const MOVES = [
  { labelKey: 'md_r_move1_label', taskKey: 'md_r_move1_task' },
  { labelKey: 'md_r_move2_label', taskKey: 'md_r_move2_task' },
  { labelKey: 'md_r_move3_label', taskKey: 'md_r_move3_task' },
  { labelKey: 'md_r_move4_label', taskKey: 'md_r_move4_task' },
] as const;

interface MissionResearchProps {
  code: string;
  onAccepted: (entity: EntityVM, links: LinkVM[]) => void;
}

export function MissionResearch({ code, onAccepted }: MissionResearchProps) {
  const [lang] = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResearchCandidate[]>([]);
  const [free, setFree] = useState('');
  const [, startTransition] = useTransition();

  async function run(task: string) {
    const trimmed = task.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch('/api/missions/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, task: trimmed }),
      });
      if (!res.ok) {
        setError(t(lang, 'md_r_failed'));
        return;
      }
      const data = (await res.json()) as { candidates?: ResearchCandidate[] };
      const cands = data.candidates ?? [];
      setResults(cands);
      if (cands.length === 0) setError(t(lang, 'md_r_empty'));
    } catch {
      setError(t(lang, 'md_r_failed'));
    } finally {
      setLoading(false);
    }
  }

  function accept(c: ResearchCandidate) {
    startTransition(async () => {
      const res = await acceptCandidateAction(code, {
        name: c.name,
        role: c.role,
        city: c.city,
        note: c.note,
        decisionMaker: c.decisionMaker || null,
        source: c.source,
        verify: c.verify,
        worksWithNames: c.worksWithNames,
      });
      if (res.ok && res.entity) {
        onAccepted(res.entity, res.links ?? []);
        setResults((rs) => rs.filter((r) => r !== c));
      } else {
        setError(t(lang, 'msn_err_internal'));
      }
    });
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--ln-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ln-divider)' }}>
        <MonoLabel accent>{t(lang, 'md_r_title')}</MonoLabel>
        <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>
          {t(lang, 'md_r_sub_pre')}{' '}
          <Pill tone="warn" style={{ fontSize: 9, padding: '1px 6px' }}>
            {t(lang, 'md_verify')}
          </Pill>{' '}
          {t(lang, 'md_r_sub_post')}
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MOVES.map((m) => (
            <Button
              key={m.labelKey}
              kind="secondary"
              icon="search"
              disabled={loading}
              onClick={() => run(t(lang, m.taskKey))}
              style={{ fontSize: 12, padding: '6px 11px' }}
            >
              {t(lang, m.labelKey)}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={free}
            onChange={(e) => setFree(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(free);
            }}
            placeholder={t(lang, 'md_r_input_ph')}
            style={{
              flex: 1,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              background: 'var(--bg-input)',
              color: 'var(--fg-primary)',
              border: '1px solid var(--ln-border)',
              borderRadius: 'var(--r-sm)',
              padding: '9px 12px',
              outline: 'none',
            }}
          />
          <Button kind="primary" icon="radio" disabled={loading || !free.trim()} onClick={() => run(free)}>
            {loading ? t(lang, 'md_r_loading') : t(lang, 'md_r_run')}
          </Button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', color: 'var(--fg-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            {t(lang, 'md_r_loading_note')}
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--signal-down)', fontFamily: 'var(--font-mono)' }}>{error}</div>}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MonoLabel>{t(lang, 'md_r_results', results.length)}</MonoLabel>
            {results.map((c, i) => (
              <div key={i} style={{ border: '1px solid var(--ln-divider)', borderRadius: 'var(--r-sm)', padding: 12, background: 'var(--bg-canvas)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{c.name}</span>
                      <Pill tone={ROLE_TONE[c.role] ?? 'neutral'} style={{ fontSize: 9 }}>
                        {roleLabel(lang, c.role)}
                      </Pill>
                      {c.city && <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{c.city}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{c.note}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>
                      {c.decisionMaker && (
                        <span>
                          {t(lang, 'md_r_contact')}: {c.decisionMaker}
                        </span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {t(lang, 'md_r_source')}: {c.source}{' '}
                        {c.verify && (
                          <Pill tone="warn" style={{ fontSize: 8, padding: '1px 5px' }}>
                            {t(lang, 'md_verify')}
                          </Pill>
                        )}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Button kind="primary" icon="plus" onClick={() => accept(c)} style={{ fontSize: 12, padding: '6px 10px' }}>
                      {t(lang, 'md_r_accept')}
                    </Button>
                    <Button kind="ghost" onClick={() => setResults((rs) => rs.filter((r) => r !== c))} style={{ fontSize: 12, padding: '6px 10px' }}>
                      {t(lang, 'md_r_discard')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
