'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { generateSegmentDraftAction } from '@/lib/report-actions';

const SEGMENTS = [
  { key: 'energy', label: 'Energetika' },
  { key: 'automotive', label: 'Automotive' },
];

export function LlmDraftPanel({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(ev: FormEvent<HTMLFormElement>, segment: string) {
    ev.preventDefault();
    setBusy(segment);
    setError(null);
    setInfo(null);
    try {
      const fd = new FormData();
      fd.set('segment', segment);
      const result = await generateSegmentDraftAction(reportId, fd);
      if (!result.ok) {
        setError(result.error ?? 'Generace selhala.');
      } else {
        setInfo(`Sekce "${segment}" vložena. Obnovte editor pro nový JSON.`);
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="studio-card">
      <div className="studio-label">LLM draft</div>
      <p
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg-muted)',
          margin: '6px 0 10px',
          lineHeight: 1.45,
        }}
      >
        Vygeneruje sekci ze stávajících makro + insolvenčních dat. V dev
        používá stub runner — produkční Claude Sonnet 4.5 wiring přijde
        ve Sprintu 6.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SEGMENTS.map((seg) => (
          <form key={seg.key} onSubmit={(ev) => submit(ev, seg.key)}>
            <button
              type="submit"
              className="studio-btn"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              disabled={busy !== null}
            >
              {busy === seg.key ? 'Generuji…' : `Generovat: ${seg.label}`}
            </button>
          </form>
        ))}
      </div>

      {error ? (
        <div
          style={{
            color: 'var(--signal-down)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            marginTop: 10,
          }}
        >
          {error}
        </div>
      ) : null}
      {info ? (
        <div
          style={{
            color: 'var(--signal-up)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            marginTop: 10,
          }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}
