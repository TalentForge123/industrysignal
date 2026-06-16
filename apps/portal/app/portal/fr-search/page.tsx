'use client';

// Operator tool — search the French company registry by segment and get real
// companies with their public statutory contacts + sources. Calls
// /api/fr/search (recherche-entreprises backbone). Internal/dark-theme.

import { useState, type CSSProperties } from 'react';

interface Contact {
  role: string | null;
  name: string | null;
  kind: string;
}
interface Company {
  siren: string;
  name: string;
  naf: string | null;
  category: string | null;
  employeeBand: string | null;
  city: string | null;
  status: string | null;
  source: string;
  contacts: Contact[];
}
interface SearchResult {
  companies: Company[];
  count: number;
  suggestedTargetRoles: string[];
  note: string;
  error?: string;
}

const SIZES = ['PME', 'ETI', 'GE'] as const;

export default function FrSearchPage() {
  const [q, setQ] = useState('');
  const [naf, setNaf] = useState('');
  const [department, setDepartment] = useState('');
  const [sizes, setSizes] = useState<string[]>(['ETI', 'GE']);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SearchResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleSize(s: string) {
    setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() && !naf.trim()) {
      setErr('Zadej klíčové slovo nebo NAF kód.');
      return;
    }
    setErr(null);
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch('/api/fr/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: q.trim() || undefined,
          naf: naf.trim() || undefined,
          department: department.trim() || undefined,
          sizes,
          limit: 15,
        }),
      });
      const data = (await r.json()) as SearchResult;
      if (!r.ok || data.error) setErr(data.error ?? 'Hledání selhalo.');
      else setRes(data);
    } catch {
      setErr('Hledání selhalo (síť).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 32px 64px' }}>
      <div style={{ marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--fg-tertiary)' }}>
        FR · REJSTŘÍK FIREM
      </div>
      <h1 className="is-h1" style={{ marginBottom: 4 }}>Hledat francouzské firmy</h1>
      <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginBottom: 20 }}>
        Segment → reálné firmy + veřejní statutáři + zdroj (recherche-entreprises).
      </div>

      <form onSubmit={run} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <Field label="Klíčové slovo (aktivita / název)">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="np. aéronautique, usinage" style={inputStyle()} />
        </Field>
        <Field label="NAF / APE kód">
          <input value={naf} onChange={(e) => setNaf(e.target.value)} placeholder="np. 30.30Z, 25.40Z" style={inputStyle()} />
        </Field>
        <Field label="Departement (kód)">
          <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="np. 69, 75" style={inputStyle()} />
        </Field>
        <Field label="Velikost firmy">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 36 }}>
            {SIZES.map((s) => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--fg-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={sizes.includes(s)} onChange={() => toggleSize(s)} /> {s}
              </label>
            ))}
          </div>
        </Field>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" disabled={busy} style={btnStyle(busy)}>
            {busy ? 'Hledám…' : 'Hledat'}
          </button>
          {err && <span style={{ color: 'var(--signal-down)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{err}</span>}
        </div>
      </form>

      {res && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>{res.count}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>firem</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)' }}>
              Oslovit funkce: {res.suggestedTargetRoles.join(' · ')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {res.companies.map((c) => (
              <div key={c.siren} style={cardStyle()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-primary)' }}>
                    {c.name}{' '}
                    <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--fg-muted)' }}>· {c.city ?? ''}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-tertiary)' }}>
                    {[c.naf, c.category, c.employeeBand].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {c.contacts.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {c.contacts.slice(0, 4).map((k, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
                        <span style={{ color: 'var(--fg-tertiary)' }}>{k.role ?? '?'}:</span> {k.name}
                      </div>
                    ))}
                  </div>
                )}
                <a href={c.source} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-text)', marginTop: 6, display: 'inline-block' }}>
                  zdroj · SIREN {c.siren}
                </a>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{res.note}</div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  );
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
function btnStyle(busy: boolean): CSSProperties {
  return {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    color: '#14140f',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--r-sm)',
    padding: '9px 18px',
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.6 : 1,
  };
}
function cardStyle(): CSSProperties {
  return {
    background: 'var(--bg-card)',
    border: '1px solid var(--ln-border)',
    borderRadius: 'var(--r-sm)',
    padding: '12px 16px',
  };
}
