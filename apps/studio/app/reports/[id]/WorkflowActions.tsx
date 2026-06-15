'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveReportAction,
  publishReportAction,
  rejectReportAction,
  submitReportAction,
} from '@/lib/report-actions';

type Status = 'draft' | 'review' | 'published' | 'archived';

interface Props {
  reportId: string;
  status: Status;
}

export function WorkflowActions({ reportId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.error ?? 'Akce selhala.');
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-card">
      <div className="studio-label">Workflow akce</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {status === 'draft' && (
          <button
            className="studio-btn"
            data-variant="primary"
            type="button"
            disabled={busy}
            onClick={() => run(() => submitReportAction(reportId))}
          >
            Odeslat k revizi
          </button>
        )}

        {status === 'review' && (
          <>
            <button
              className="studio-btn"
              data-variant="primary"
              type="button"
              disabled={busy}
              onClick={() => run(() => publishReportAction(reportId))}
            >
              Schválit a publikovat
            </button>
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.currentTarget);
                run(() => rejectReportAction(reportId, fd));
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <textarea
                className="studio-textarea"
                name="note"
                placeholder="Důvod vrácení k autorovi…"
                required
                rows={3}
              />
              <button className="studio-btn" data-variant="danger" type="submit" disabled={busy}>
                Vrátit do draftu
              </button>
            </form>
          </>
        )}

        {status === 'published' && (
          <button
            className="studio-btn"
            type="button"
            disabled={busy}
            onClick={() => run(() => archiveReportAction(reportId))}
          >
            Archivovat
          </button>
        )}

        {status === 'archived' && (
          <span style={{ color: 'var(--fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            Archivováno — bez dalších akcí.
          </span>
        )}
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
    </div>
  );
}
