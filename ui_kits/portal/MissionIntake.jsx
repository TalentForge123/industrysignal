// IndustrySignal — Client Data Intake (HANDOFF §23). "Mission Fuel".
// Operator drops/pastes the client's own list → heuristic column mapping (editable)
// → candidate review (brain-in-the-loop) → merge into the map. Client's "current
// supplier" column auto-wires targets to the competitor graph. Tier A (private) default.
// Exports: MissionIntake

const SAMPLE_CSV = `Firma,Město,Segment,Stávající FM dodavatel,Kontakt,Poznámka
Otto Group,Hamburg,Retail / logistika,Apleona,Leiter Gebäudemanagement,Velké distribuční centrum
Vonovia SE,Bochum,Real estate,Piepenbrock,Head of Procurement,Tisíce bytových jednotek
SAP SE,Walldorf,Technologie,Sodexo,Facility Director,Kampus Walldorf
Klinikum München,München,Healthcare,Dussmann,Verwaltungsleiter,Smlouva FM končí 2027
Knorr-Bremse,München,Automotive,—,Werkleiter,Český vlastnický link — door opener`;

// canonical fields the operator can map columns onto
const CANON = [
  { id: 'ignore', label: '— ignorovat —' },
  { id: 'name', label: 'Firma (name)' },
  { id: 'city', label: 'Lokalita (city)' },
  { id: 'supplier', label: 'Stávající dodavatel → vazba' },
  { id: 'contact', label: 'Kontakt / oddělení' },
  { id: 'note', label: 'Poznámka / segment' },
];

function parseCSV(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line) => {
    const out = []; let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cells = split(l); const o = {};
    headers.forEach((h, i) => { o[h] = cells[i] || ''; });
    return o;
  });
  return { headers, rows };
}

function autoMap(header) {
  const h = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/firma|spolecnost|company|name|nazev/.test(h)) return 'name';
  if (/mesto|city|lokalita|sidlo|ort/.test(h)) return 'city';
  if (/dodavatel|supplier|fm|provider|konkuren/.test(h)) return 'supplier';
  if (/kontakt|contact|osoba|role|oddeleni|ansprech/.test(h)) return 'contact';
  if (/pozn|note|segment|obor|comment|popis/.test(h)) return 'note';
  return 'ignore';
}

function MissionIntake({ entities, onAdd }) {
  const [stage, setStage] = React.useState('input'); // input | mapping | review
  const [raw, setRaw] = React.useState('');
  const [parsed, setParsed] = React.useState({ headers: [], rows: [] });
  const [mapping, setMapping] = React.useState({});
  const [candidates, setCandidates] = React.useState([]);
  const [privacy, setPrivacy] = React.useState('private');
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef(null);

  function ingest(text, label) {
    const p = parseCSV(text);
    if (!p.headers.length) return;
    const m = {}; p.headers.forEach(h => { m[h] = autoMap(h); });
    setRaw(text); setParsed(p); setMapping(m); setStage('mapping'); setSourceLabel(label || 'vložená data');
  }
  const [sourceLabel, setSourceLabel] = React.useState('');

  function onFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => ingest(String(r.result), file.name);
    r.readAsText(file);
  }

  function buildCandidates() {
    const col = (field) => parsed.headers.find(h => mapping[h] === field);
    const cN = col('name'), cC = col('city'), cS = col('supplier'), cK = col('contact'), cP = col('note');
    const comps = entities.filter(e => e.role === 'competitor');
    const matchComp = (val) => {
      if (!val || val === '—') return null;
      const v = val.toLowerCase();
      return comps.find(c => {
        const first = c.name.toLowerCase().split(' ')[0];
        return v.includes(first) || c.name.toLowerCase().includes(v);
      });
    };
    const cands = parsed.rows.map(r => {
      const name = cN ? r[cN] : '';
      if (!name) return null;
      const sup = cS ? r[cS] : '';
      const comp = matchComp(sup);
      const noteParts = [cP ? r[cP] : '', sup && sup !== '—' ? `stávající dodavatel: ${sup}` : ''].filter(Boolean);
      return {
        name, city: cC ? r[cC] : '—', decisionMaker: cK ? r[cK] : '',
        note: noteParts.join(' · '), supplierRaw: sup, worksWith: comp ? [comp.id] : [],
        linked: comp ? comp.name : null,
      };
    }).filter(Boolean);
    setCandidates(cands); setStage('review');
  }

  function accept(c) {
    onAdd({
      id: 'cl-' + Math.random().toString(36).slice(2, 6), role: 'target',
      name: c.name, city: c.city, note: c.note, decisionMaker: c.decisionMaker,
      source: `Data klienta · ${sourceLabel}${privacy === 'pooled' ? ' · sdíleno' : ''}`,
      verify: true, worksWith: c.worksWith,
    });
    setCandidates(cs => cs.filter(x => x !== c));
  }

  function reset() { setStage('input'); setRaw(''); setParsed({ headers: [], rows: [] }); setCandidates([]); }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 12,
    background: 'var(--bg-input)', color: 'var(--fg-primary)',
    border: '1px solid var(--ln-border)', borderRadius: 'var(--r-sm)', padding: '8px 10px', outline: 'none',
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--ln-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <MonoLabel accent>Data klienta · nasype mapu jejich daty</MonoLabel>
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>
            Klient pošle seznam, vy ho nahrajete. Sloupec „stávající dodavatel" automaticky napojí cíle na graf konkurentů.
          </div>
        </div>
        {stage !== 'input' && <Button kind="ghost" icon="x" onClick={reset} style={{ fontSize: 12, padding: '5px 10px' }}>Zrušit</Button>}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* privacy tier */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <MonoLabel>Režim:</MonoLabel>
          {[['private', 'Soukromé · jen tato mise'], ['pooled', 'Přispět do poolu']].map(([v, l]) => (
            <button key={v} onClick={() => setPrivacy(v)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', cursor: 'pointer',
              padding: '4px 10px', borderRadius: 'var(--r-pill)',
              border: '1px solid ' + (privacy === v ? 'var(--accent)' : 'var(--ln-border)'),
              background: privacy === v ? 'var(--accent-soft)' : 'transparent',
              color: privacy === v ? 'var(--accent-text)' : 'var(--fg-tertiary)',
            }}>{l}</button>
          ))}
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            {privacy === 'private' ? 'Tier A — bez sdílení, stačí Data Processing klauzule.' : 'Tier B — anonymizace + Data Sharing Agreement (§2.5).'}
          </span>
        </div>

        {stage === 'input' && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current && fileRef.current.click()}
              style={{
                border: '1.5px dashed ' + (drag ? 'var(--accent)' : 'var(--ln-border)'),
                borderRadius: 'var(--r-sm)', padding: '22px 16px', textAlign: 'center', cursor: 'pointer',
                background: drag ? 'var(--accent-soft)' : 'var(--bg-canvas)', transition: 'all 120ms var(--ease-out)',
              }}>
              <Icon name="download" size={20} color="var(--fg-tertiary)" style={{ transform: 'rotate(180deg)' }} />
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 6 }}>Přetáhněte CSV / XLSX nebo klikněte pro výběr</div>
              <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
            </div>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={4}
              placeholder="…nebo vložte CSV sem (první řádek = hlavičky sloupců)"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="secondary" onClick={() => ingest(SAMPLE_CSV, 'M2C — DE leady.csv')}>Vložit ukázku (M2C DE leady)</Button>
              <Button kind="primary" icon="chevron-right" disabled={!raw.trim()} onClick={() => ingest(raw, 'vložená data')}>Načíst</Button>
            </div>
          </>
        )}

        {stage === 'mapping' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MonoLabel>Mapování sloupců · {parsed.rows.length} řádků · {sourceLabel}</MonoLabel>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>(zkontrolujte, opravte)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {parsed.headers.map(h => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                  <Icon name="chevron-right" size={13} color="var(--fg-muted)" />
                  <select value={mapping[h]} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))} style={inputStyle}>
                    {CANON.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <Button kind="primary" icon="radio" onClick={buildCandidates}>Vytvořit kandidáty</Button>
          </>
        )}

        {stage === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MonoLabel>Návrhy z dat klienta · {candidates.length} · přijměte do mapy</MonoLabel>
            {candidates.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Vše zpracováno. <span className="is-link" style={{ cursor: 'pointer' }} onClick={reset}>Nahrát další</span></div>}
            {candidates.map((c, i) => (
              <div key={i} style={{ border: '1px solid var(--ln-divider)', borderRadius: 'var(--r-sm)', padding: 12, background: 'var(--bg-canvas)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{c.name}</span>
                      <Pill tone="info" style={{ fontSize: 9 }}>CÍL · ODBĚRATEL</Pill>
                      {c.city && <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{c.city}</span>}
                    </div>
                    {c.note && <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{c.note}</div>}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>
                      {c.decisionMaker && <span>KONTAKT: {c.decisionMaker}</span>}
                      {c.linked
                        ? <span style={{ color: 'var(--accent-text)' }}>↳ napojí na: {c.linked}</span>
                        : <span>bez vazby na konkurenta v mapě</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Button kind="primary" icon="plus" onClick={() => accept(c)} style={{ fontSize: 12, padding: '6px 10px' }}>Přidat</Button>
                    <Button kind="ghost" onClick={() => setCandidates(cs => cs.filter(x => x !== c))} style={{ fontSize: 12, padding: '6px 10px' }}>Zahodit</Button>
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

Object.assign(window, { MissionIntake });
