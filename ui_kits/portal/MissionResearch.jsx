// IndustrySignal — AI research assistant. The answer to "jak nakrmím daty, co nemám".
// Encodes Lukáš's pattern (per-intent research moves) + relevance rubric into a
// schema-driven Claude call. Output = structured candidates the operator reviews
// (brain-in-the-loop) and accepts into the map. Honesty: every row needs a source;
// inferred rows are flagged "OVĚŘIT". Exports: MissionResearch

const missionResearchStyles = {
  moves: [
    { id: 'm1', label: 'Němečtí FM konkurenti', role: 'competitor',
      task: 'Najdi 4 další významné německé poskytovatele integrovaného facility managementu, které M2C na trhu potká. Pro každého uveď, čím se odlišuje (enterprise vs Mittelstand fokus).' },
    { id: 'm2', label: 'Klienti konkurentů (palette)', role: 'target',
      task: 'Najdi 5 velkých německých firem/institucí, které jsou typickými odběrateli FM od existujících konkurentů v mapě — "palette mixture" odběratelů, které chce M2C oslovit. U každého přes worksWithNames propoj na konkrétního konkurenta, který ho pravděpodobně obsluhuje.' },
    { id: 'm3', label: 'Příhraniční / CZ-vázané cíle', role: 'target',
      task: 'Najdi 4 odběratele FM v Sasku a Bavorsku (do 150 km od CZ hranic) nebo česky vlastněné provozy v DE, které lze obsluhovat z české základny bez nákladové nevýhody (kritérium c4).' },
    { id: 'm4', label: 'Kanály a door-openery', role: 'partner',
      task: 'Najdi 3 oborové svazy, komory nebo zprostředkovatele, kteří fungují jako vstupní kanál pro českou FM firmu vstupující na německý trh.' },
  ],
};

function buildPrompt(brief, rubric, task) {
  const crit = rubric.criteria.map(c => `- ${c.text} (váha: ${c.weight})`).join('\n');
  const prod = brief.client.products.join(', ');
  return `Jsi analytik exportní intelligence. Pracuješ pro českou firmu ${brief.client.name} (${brief.client.legal}), obor: ${brief.client.sector} (NACE ${brief.client.nace}, služby: ${prod}). Záměr: REPLIKOVAT jejich český go-to-market na německém (DE) trhu.

KRITÉRIA RELEVANCE (aplikuj přísně):
${crit}

ÚKOL: ${task}

PRAVIDLA VÝSTUPU (striktní):
1. Odpověz POUZE validním JSON polem. Žádný úvod, žádný komentář, žádné markdown fences.
2. Vše česky.
3. Každý objekt: {"name": "...", "role": "competitor|target|partner", "city": "...", "note": "1 věta proč je relevantní vůči kritériím", "decisionMaker": "ROLE/oddělení, NE smyšlené jméno osoby (např. 'Leiter Facility Management')", "source": "typ veřejného zdroje kde to lze ověřit (Handelsregister, web firmy, GEFMA, tisk) — pokud jde o odhad z trhu bez tvrdého zdroje, napiš přesně OVĚŘIT", "confidence": "high|med|low", "worksWithNames": ["jméno konkurenta z mapy, pokud relevantní"]}
4. NIKDY si nevymýšlej konkrétní jména lidí ani čísla. Když nevíš, dej confidence "low" a source "OVĚŘIT".
5. Max 5 položek. Žádné duplikáty s tím, co už je v mapě.`;
}

function parseCandidates(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  const arr = JSON.parse(s);
  return Array.isArray(arr) ? arr : [];
}

function slugify(name) {
  return (name || 'e').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 5);
}

function MissionResearch({ brief, rubric, entities, onAdd }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [results, setResults] = React.useState([]);
  const [free, setFree] = React.useState('');
  const [lastTask, setLastTask] = React.useState('');

  async function run(task) {
    if (!task || loading) return;
    setLoading(true); setError(null); setResults([]); setLastTask(task);
    try {
      const out = await window.claude.complete(buildPrompt(brief, rubric, task));
      const cands = parseCandidates(out);
      const existing = new Set(entities.map(e => e.name.toLowerCase()));
      setResults(cands.filter(c => c && c.name && !existing.has(c.name.toLowerCase())));
      if (cands.length === 0) setError('Model nevrátil použitelné kandidáty — zkuste přeformulovat úkol.');
    } catch (e) {
      setError('Rešerši se nepodařilo dokončit (' + (e.message || 'chyba') + '). Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  }

  function accept(c) {
    const nameToId = {};
    entities.forEach(e => { nameToId[e.name.toLowerCase()] = e.id; });
    const verify = (c.confidence !== 'high') || /ověřit/i.test(c.source || '');
    const ent = {
      id: slugify(c.name), role: ['competitor', 'target', 'partner'].includes(c.role) ? c.role : 'target',
      name: c.name, city: c.city || '—', note: c.note || '', decisionMaker: c.decisionMaker || '',
      source: c.source || 'OVĚŘIT', verify,
      worksWith: (c.worksWithNames || []).map(n => nameToId[(n || '').toLowerCase()]).filter(Boolean),
    };
    onAdd(ent);
    setResults(rs => rs.filter(r => r !== c));
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--ln-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <MonoLabel accent>AI rešerše · plní data, která nemáš</MonoLabel>
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>
            Každý návrh nese zdroj. Co je odhad z trhu, je označeno <Pill tone="warn" style={{ fontSize: 9, padding: '1px 6px' }}>OVĚŘIT</Pill> — vy rozhodnete, co pustíte do mapy.
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {missionResearchStyles.moves.map(m => (
            <Button key={m.id} kind="secondary" icon="search" disabled={loading}
              onClick={() => run(m.task)} style={{ fontSize: 12, padding: '6px 11px' }}>
              {m.label}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input value={free} onChange={e => setFree(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run(free); }}
            placeholder="Vlastní úkol pro rešerši · např. „Najdi nemocnice v Bavorsku s outsourcovaným FM“"
            style={{
              flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13,
              background: 'var(--bg-input)', color: 'var(--fg-primary)',
              border: '1px solid var(--ln-border)', borderRadius: 'var(--r-sm)', padding: '9px 12px', outline: 'none',
            }} />
          <Button kind="primary" icon="radio" disabled={loading || !free.trim()} onClick={() => run(free)}>
            {loading ? 'Hledám…' : 'Spustit'}
          </Button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', color: 'var(--fg-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            <span className="is-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', position: 'relative', display: 'inline-block' }} />
            Procházím veřejné zdroje a aplikuji kritéria relevance…
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: 'var(--signal-down)', fontFamily: 'var(--font-mono)' }}>{error}</div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MonoLabel>Návrhy · {results.length} · zkontrolujte a přijměte</MonoLabel>
            {results.map((c, i) => {
              const verify = (c.confidence !== 'high') || /ověřit/i.test(c.source || '');
              const roleTone = { competitor: 'down', target: 'info', partner: 'up' }[c.role] || 'neutral';
              return (
                <div key={i} style={{ border: '1px solid var(--ln-divider)', borderRadius: 'var(--r-sm)', padding: 12, background: 'var(--bg-canvas)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{c.name}</span>
                        <Pill tone={roleTone} style={{ fontSize: 9 }}>{missionGraphStyles.roleLabel[c.role] || c.role}</Pill>
                        {c.city && <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{c.city}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{c.note}</div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>
                        {c.decisionMaker && <span>KONTAKT: {c.decisionMaker}</span>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          ZDROJ: {c.source} {verify && <Pill tone="warn" style={{ fontSize: 8, padding: '1px 5px' }}>OVĚŘIT</Pill>}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Button kind="primary" icon="plus" onClick={() => accept(c)} style={{ fontSize: 12, padding: '6px 10px' }}>Přidat</Button>
                      <Button kind="ghost" onClick={() => setResults(rs => rs.filter(r => r !== c))} style={{ fontSize: 12, padding: '6px 10px' }}>Zahodit</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MissionResearch, missionResearchStyles });
