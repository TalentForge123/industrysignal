'use client';

import { useState, type FormEvent } from 'react';
import { saveReportBodyAction } from '@/lib/report-actions';

interface Props {
  reportId: string;
  titleCs: string;
  titleEn: string;
  bodyCs: unknown;
  bodyEn: unknown;
  disabled: boolean;
}

export function SaveBodyForm({
  reportId,
  titleCs,
  titleEn,
  bodyCs,
  bodyEn,
  disabled,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (disabled) return;
    const fd = new FormData(ev.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const result = await saveReportBodyAction(reportId, fd);
      if (!result.ok) {
        setError(result.error ?? 'Uložení selhalo.');
      } else {
        setSavedAt(new Date().toISOString().slice(11, 19));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const bodyCsPretty = JSON.stringify(bodyCs ?? {}, null, 2);
  const bodyEnPretty = JSON.stringify(bodyEn ?? {}, null, 2);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Titulek CS">
          <input
            className="studio-input"
            name="titleCs"
            defaultValue={titleCs}
            disabled={disabled}
          />
        </Field>
        <Field label="Titulek EN">
          <input
            className="studio-input"
            name="titleEn"
            defaultValue={titleEn}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field label="Tělo CS (JSON)">
        <textarea
          className="studio-textarea"
          name="bodyCs"
          defaultValue={bodyCsPretty}
          rows={18}
          disabled={disabled}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
      </Field>
      <Field label="Tělo EN (JSON)">
        <textarea
          className="studio-textarea"
          name="bodyEn"
          defaultValue={bodyEnPretty}
          rows={18}
          disabled={disabled}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
      </Field>

      {error ? (
        <div
          style={{
            color: 'var(--signal-down)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            border: '1px solid var(--signal-down)',
            padding: '8px 10px',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="studio-btn"
          data-variant="primary"
          type="submit"
          disabled={disabled || saving}
        >
          {saving ? 'Ukládám…' : 'Uložit draft'}
        </button>
        {savedAt ? (
          <span style={{ color: 'var(--fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            uloženo {savedAt}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="studio-label">{label}</span>
      {children}
    </label>
  );
}
