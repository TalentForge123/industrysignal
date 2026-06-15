'use client';

// Mission brief wizard — captures the 5-field brief (client · intent ·
// markets · segment · ask) plus the relevance rubric, then calls
// createMissionAction. On success it navigates to the new mission's detail
// view. Editorial styling (cream/ink/amber via data-theme="editorial").
//
// The rubric is a dynamic list of (text, weight) rows held in component
// state and serialized into a hidden `rubric` field on submit, so the
// server action receives it as one JSON payload.

import { useRef, useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { createMissionAction } from '../actions';

const INTENTS = ['replicate', 'expand', 'scout', 'defend', 'acquire'] as const;
type Weight = 'vysoká' | 'střední' | 'nízká';
interface RubricRow {
  text: string;
  weight: Weight;
}

export function MissionWizard() {
  const [lang] = useLang();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rubric, setRubric] = useState<RubricRow[]>([{ text: '', weight: 'vysoká' }]);

  const weightLabel = (w: Weight) =>
    w === 'vysoká' ? t(lang, 'weight_high') : w === 'střední' ? t(lang, 'weight_med') : t(lang, 'weight_low');

  function onSubmit(formData: FormData) {
    setError(null);
    const cleanRubric = rubric.filter((r) => r.text.trim().length > 0);
    formData.set('rubric', JSON.stringify(cleanRubric));
    startTransition(async () => {
      const result = await createMissionAction(formData);
      if (result.ok && result.code) {
        router.push(`/portal/missions/${encodeURIComponent(result.code)}` as never);
      } else {
        setError(translateErr(result.error, lang));
      }
    });
  }

  function updateRubric(i: number, patch: Partial<RubricRow>) {
    setRubric((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRubric() {
    setRubric((rs) => [...rs, { text: '', weight: 'střední' }]);
  }
  function removeRubric(i: number) {
    setRubric((rs) => rs.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 32px 64px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href={'/portal/missions' as never}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-tertiary)',
            textDecoration: 'none',
            letterSpacing: '0.06em',
          }}
        >
          ← {t(lang, 'missions_back')}
        </Link>
        <div className="is-h1" style={{ marginTop: 8 }}>
          {t(lang, 'missions_new_title')}
        </div>
      </div>

      <form ref={formRef} action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ----- Klient ----- */}
        <section style={cardStyle()}>
          <div style={cardHeaderStyle()}>{t(lang, 'msn_w_section_client')}</div>
          <div style={cardBodyStyle()}>
            <Field label={t(lang, 'msn_w_client_name')}>
              <input name="clientName" required disabled={isPending} style={inputStyle()} placeholder="M2C" />
            </Field>
            <div style={gridTwo()}>
              <Field label={t(lang, 'msn_w_client_legal')}>
                <input name="clientLegal" disabled={isPending} style={inputStyle()} placeholder="Mark2 Corporation Czech a.s." />
              </Field>
              <Field label={t(lang, 'msn_w_client_nace')}>
                <input name="clientNace" disabled={isPending} style={inputStyle()} placeholder="81.10" />
              </Field>
            </div>
            <Field label={t(lang, 'msn_w_client_sector')}>
              <input name="clientSector" disabled={isPending} style={inputStyle()} placeholder="Integrovaný facility management" />
            </Field>
            <Field label={t(lang, 'msn_w_client_products')} hint={t(lang, 'msn_w_list_hint')}>
              <input name="clientProducts" disabled={isPending} style={inputStyle()} placeholder="Úklid, Technická správa budov, Ostraha…" />
            </Field>
          </div>
        </section>

        {/* ----- Mise ----- */}
        <section style={cardStyle()}>
          <div style={cardHeaderStyle()}>{t(lang, 'msn_w_section_mission')}</div>
          <div style={cardBodyStyle()}>
            <div style={gridTwo()}>
              <Field label={t(lang, 'msn_w_intent')}>
                <select name="intent" required disabled={isPending} defaultValue="replicate" style={inputStyle()}>
                  {INTENTS.map((i) => (
                    <option key={i} value={i}>
                      {t(lang, `intent_${i}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t(lang, 'msn_w_deadline')}>
                <input type="date" name="deadline" disabled={isPending} style={inputStyle()} />
              </Field>
            </div>
            <div style={gridTwo()}>
              <Field label={t(lang, 'msn_w_source_market')}>
                <input name="sourceMarket" disabled={isPending} style={inputStyle()} placeholder="CZ" />
              </Field>
              <Field label={t(lang, 'msn_w_target_market')}>
                <input name="targetMarket" disabled={isPending} style={inputStyle()} placeholder="DE" />
              </Field>
            </div>
            <Field label={t(lang, 'msn_w_segment_nace')}>
              <input name="segmentNace" disabled={isPending} style={inputStyle()} placeholder="81.10" />
            </Field>
            <Field label={t(lang, 'msn_w_segment_keywords')} hint={t(lang, 'msn_w_list_hint')}>
              <input name="segmentKeywords" disabled={isPending} style={inputStyle()} placeholder="integrated facility management, Gebäudemanagement…" />
            </Field>
            <Field label={t(lang, 'msn_w_ask')}>
              <textarea name="ask" disabled={isPending} rows={3} style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }} placeholder={t(lang, 'msn_w_ask_ph')} />
            </Field>
          </div>
        </section>

        {/* ----- Kritéria relevance ----- */}
        <section style={cardStyle()}>
          <div style={cardHeaderStyle()}>{t(lang, 'msn_w_section_rubric')}</div>
          <div style={cardBodyStyle()}>
            <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', lineHeight: 1.5, marginBottom: 4 }}>
              {t(lang, 'msn_w_rubric_hint')}
            </div>
            {rubric.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', marginTop: 9 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <input
                  value={r.text}
                  onChange={(e) => updateRubric(i, { text: e.target.value })}
                  disabled={isPending}
                  placeholder={t(lang, 'msn_w_rubric_text_ph')}
                  style={{ ...inputStyle(), flex: 1 }}
                />
                <select
                  value={r.weight}
                  onChange={(e) => updateRubric(i, { weight: e.target.value as Weight })}
                  disabled={isPending}
                  style={{ ...inputStyle(), width: 120 }}
                >
                  <option value="vysoká">{weightLabel('vysoká')}</option>
                  <option value="střední">{weightLabel('střední')}</option>
                  <option value="nízká">{weightLabel('nízká')}</option>
                </select>
                {rubric.length > 1 && (
                  <button type="button" onClick={() => removeRubric(i)} disabled={isPending} style={ghostButtonStyle()} title={t(lang, 'msn_w_rubric_remove')}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addRubric} disabled={isPending} style={{ ...ghostButtonStyle(), alignSelf: 'flex-start' }}>
              + {t(lang, 'msn_w_rubric_add')}
            </button>
          </div>
        </section>

        {error && (
          <div style={{ color: 'var(--signal-down)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={isPending} style={primaryButtonStyle()}>
            {isPending ? '…' : t(lang, 'msn_w_submit')}
          </button>
          <Link href={'/portal/missions' as never} style={secondaryButtonStyle()}>
            {t(lang, 'msn_w_cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={monoLabelStyle()}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{hint}</span>}
    </div>
  );
}

function translateErr(err: string | undefined, lang: 'cs' | 'en'): string {
  switch (err) {
    case 'invalid_client':
      return t(lang, 'msn_err_client');
    case 'invalid_intent':
      return t(lang, 'msn_err_intent');
    case 'unauthenticated':
      return t(lang, 'msn_err_unauth');
    default:
      return t(lang, 'msn_err_internal');
  }
}

// ----- Styles -----------------------------------------------------------

function cardStyle(): CSSProperties {
  return {
    background: 'var(--bg-card)',
    border: '1px solid var(--ln-border)',
    borderRadius: 'var(--r-md)',
    overflow: 'hidden',
  };
}
function cardHeaderStyle(): CSSProperties {
  return {
    padding: '12px 16px',
    borderBottom: '1px solid var(--ln-divider)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--accent-text)',
  };
}
function cardBodyStyle(): CSSProperties {
  return { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 };
}
function gridTwo(): CSSProperties {
  return { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
}
function monoLabelStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--fg-tertiary)',
  };
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
    padding: '8px 10px',
    outline: 'none',
  };
}
function primaryButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    padding: '9px 18px',
    borderRadius: 'var(--r-sm)',
    border: '1px solid transparent',
    background: 'var(--amber-300)',
    color: 'var(--fg-on-amber)',
    cursor: 'pointer',
  };
}
function secondaryButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    padding: '9px 18px',
    borderRadius: 'var(--r-sm)',
    border: '1px solid var(--ln-border)',
    background: 'var(--bg-card)',
    color: 'var(--fg-primary)',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  };
}
function ghostButtonStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    padding: '7px 12px',
    borderRadius: 'var(--r-sm)',
    border: '1px solid var(--ln-border)',
    background: 'transparent',
    color: 'var(--fg-secondary)',
    cursor: 'pointer',
  };
}
