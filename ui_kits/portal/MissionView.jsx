// IndustrySignal — Mission detail (operator tool). M2C → DE · replicate.
// Ties together: brief · AI research · relationship map · editable players · opportunities · export.
// Exports: MissionView

const missionRoleTone = { client: 'amber', competitor: 'down', target: 'info', partner: 'up' };

// ---------- Brief bar ----------
function BriefBar({ brief, onExport }) {
  const intentLabel = { replicate: 'REPLIKACE', expand: 'EXPANZE', scout: 'PRŮZKUM', defend: 'OBRANA', acquire: 'AKVIZICE' };
  return (
    <div style={{ borderBottom: '1px solid var(--ln-border)', paddingBottom: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-tertiary)', letterSpacing: '0.06em' }}>{brief.code}</span>
            <Pill tone="amber">{intentLabel[brief.intent] || brief.intent}</Pill>
            <Pill tone="neutral" pulse>AKTIVNÍ</Pill>
          </div>
          <div className="is-h1" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span>{brief.client.name}</span>
            <span style={{ color: 'var(--fg-muted)', fontWeight: 300 }}>{brief.source_market}</span>
            <Icon name="chevron-right" size={22} color="var(--accent)" />
            <span style={{ color: 'var(--fg-muted)', fontWeight: 300 }}>{brief.target_market}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 6 }}>
            {brief.client.sector} · NACE {brief.segment.nace} · termín dodání {brief.deadline}
          </div>
        </div>
        <Button kind="primary" icon="download" onClick={onExport}>Sestavit klientský report</Button>
      </div>
      <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--accent-soft)', borderLeft: '2px solid var(--accent)', borderRadius: '0 var(--r-sm) var(--r-sm) 0' }}>
        <MonoLabel style={{ marginBottom: 4 }}>Zadání klienta</MonoLabel>
        <div style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>„{brief.ask}"</div>
      </div>
    </div>
  );
}

// ---------- Rubric (the externalized "brain") ----------
function RubricCard({ rubric }) {
  return (
    <Card pad={false}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)' }}>
        <MonoLabel>Kritéria relevance · pravidla, ne intuice</MonoLabel>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rubric.criteria.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', marginTop: 1 }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.45 }}>{c.text}</div>
            </div>
            <Pill tone={c.weight === 'vysoká' ? 'amber' : 'neutral'} style={{ fontSize: 9 }}>{c.weight}</Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Detail panel for selected entity (editable) ----------
function DetailPanel({ entity, entities, onChange, onDelete, onClose }) {
  if (!entity) return null;
  const tone = missionRoleTone[entity.role] || 'neutral';
  const field = (k, v) => onChange({ ...entity, [k]: v });
  const linked = (entity.worksWith || []).map(id => entities.find(e => e.id === id)).filter(Boolean);
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', fontSize: 13,
    background: 'var(--bg-input)', color: 'var(--fg-primary)',
    border: '1px solid var(--ln-border)', borderRadius: 'var(--r-sm)', padding: '7px 10px', outline: 'none',
  };
  return (
    <Card pad={false} style={{ borderColor: 'var(--ln-border)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill tone={tone} style={{ fontSize: 9 }}>{missionGraphStyles.roleLabel[entity.role]}</Pill>
          {entity.verify && <Pill tone="warn" style={{ fontSize: 9 }}>OVĚŘIT</Pill>}
        </div>
        <IconButton name="x" onClick={onClose} title="Zavřít" />
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>Firma</MonoLabel>
          <input value={entity.name} onChange={e => field('name', e.target.value)} style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <MonoLabel style={{ marginBottom: 5 }}>Role</MonoLabel>
            <select value={entity.role} onChange={e => field('role', e.target.value)} style={inputStyle}>
              <option value="competitor">Konkurent</option>
              <option value="target">Cíl · odběratel</option>
              <option value="partner">Partner · kanál</option>
              <option value="client">Klient</option>
            </select>
          </div>
          <div>
            <MonoLabel style={{ marginBottom: 5 }}>Lokalita</MonoLabel>
            <input value={entity.city || ''} onChange={e => field('city', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>Relevance</MonoLabel>
          <textarea value={entity.note || ''} onChange={e => field('note', e.target.value)} rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>Rozhodovací osoba / oddělení</MonoLabel>
          <input value={entity.decisionMaker || ''} onChange={e => field('decisionMaker', e.target.value)} placeholder="např. Leiter Facility Management" style={inputStyle} />
        </div>
        <div>
          <MonoLabel style={{ marginBottom: 5 }}>Zdroj</MonoLabel>
          <input value={entity.source || ''} onChange={e => field('source', e.target.value)} style={inputStyle} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!entity.verify} onChange={e => field('verify', e.target.checked)} />
          Vyžaduje ověření zdroje
        </label>
        {linked.length > 0 && (
          <div>
            <MonoLabel style={{ marginBottom: 6 }}>Vazby</MonoLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {linked.map(l => <Pill key={l.id} tone="neutral" style={{ fontSize: 10 }}>{l.name}</Pill>)}
            </div>
          </div>
        )}
        {entity.role !== 'client' && (
          <Button kind="danger" icon="x" onClick={() => onDelete(entity.id)}>Odebrat z mapy</Button>
        )}
      </div>
    </Card>
  );
}

// ---------- Players table ----------
function PlayersTable({ entities, selectedId, onSelect, onAddBlank }) {
  const order = { client: 0, competitor: 1, target: 2, partner: 3 };
  const rows = [...entities].sort((a, b) => (order[a.role] - order[b.role]) || a.name.localeCompare(b.name));
  return (
    <Card pad={false}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonoLabel>Hráči · {entities.length}</MonoLabel>
        <Button kind="ghost" icon="plus" onClick={onAddBlank} style={{ fontSize: 12, padding: '5px 10px' }}>Přidat ručně</Button>
      </div>
      <table className="bbg-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: '24%' }}>Firma</th>
            <th style={{ width: '13%' }}>Role</th>
            <th>Relevance</th>
            <th style={{ width: '18%' }}>Zdroj</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(e => {
            const tone = missionRoleTone[e.role] || 'neutral';
            const sel = e.id === selectedId;
            return (
              <tr key={e.id} onClick={() => onSelect(e.id)}
                style={{ cursor: 'pointer', background: sel ? 'var(--accent-soft)' : undefined }}>
                <td style={{ verticalAlign: 'top' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{e.city}</div>
                </td>
                <td style={{ verticalAlign: 'top' }}><Pill tone={tone} style={{ fontSize: 9 }}>{missionGraphStyles.roleLabel[e.role]}</Pill></td>
                <td style={{ verticalAlign: 'top', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.45, whiteSpace: 'normal' }}>{e.note}</td>
                <td style={{ verticalAlign: 'top', fontSize: 11 }}>
                  <span style={{ color: 'var(--fg-tertiary)' }}>{e.source}</span>
                  {e.verify && <div style={{ marginTop: 3 }}><Pill tone="warn" style={{ fontSize: 8, padding: '1px 5px' }}>OVĚŘIT</Pill></div>}
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
function Opportunities({ items }) {
  return (
    <Card pad={false}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)' }}>
        <MonoLabel>Příležitosti · gap analysis</MonoLabel>
      </div>
      <div>
        {items.map((o, i) => (
          <div key={o.id} style={{ padding: 16, borderBottom: i < items.length - 1 ? '1px solid var(--ln-divider)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Pill tone={o.tone}>{o.tag}</Pill>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{o.title}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.55 }}>{o.text}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Deliverable (client-facing, print) ----------
function Deliverable({ brief, entities, opportunities, onClose }) {
  const byRole = r => entities.filter(e => e.role === r);
  const group = (title, r) => {
    const list = byRole(r);
    if (!list.length) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-text)', borderBottom: '1px solid var(--ln-border)', paddingBottom: 6, marginBottom: 10 }}>{title}</div>
        {list.map(e => (
          <div key={e.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{e.name} <span style={{ fontWeight: 400, color: 'var(--fg-muted)', fontSize: 12 }}>· {e.city}</span></div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>{e.note}</div>
            {e.decisionMaker && <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>Kontakt: {e.decisionMaker}</div>}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 50, overflow: 'auto', padding: '40px 20px' }} onClick={onClose}>
      <div className="deliverable" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--ln-border)', borderRadius: 'var(--r-md)', padding: 40 }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <Button kind="primary" icon="download" onClick={() => window.print()}>Tisk / PDF</Button>
          <Button kind="ghost" icon="x" onClick={onClose}>Zavřít</Button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--fg-tertiary)', marginBottom: 6 }}>INDUSTRYSIGNAL · DATOVÁ MAPA EXPORTNÍCH VZTAHŮ · {brief.code}</div>
        <div className="is-h1" style={{ marginBottom: 4 }}>{brief.client.name} → {brief.target_market}</div>
        <div style={{ fontSize: 14, color: 'var(--fg-tertiary)', marginBottom: 8 }}>{brief.client.sector} · replikace go-to-market na německém trhu</div>
        <div style={{ fontSize: 14, color: 'var(--fg-secondary)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 28, paddingLeft: 14, borderLeft: '2px solid var(--accent)' }}>„{brief.ask}"</div>
        {group('Konkurenti — vazby k replikaci', 'competitor')}
        {group('Cíloví odběratelé — koho oslovit', 'target')}
        {group('Vstupní kanály', 'partner')}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-text)', borderBottom: '1px solid var(--ln-border)', paddingBottom: 6, marginBottom: 10 }}>Strategické příležitosti</div>
          {opportunities.map(o => (
            <div key={o.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{o.title}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.55 }}>{o.text}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid var(--ln-divider)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>
          Položky označené „OVĚŘIT" vyžadují potvrzení z primárního zdroje před oslovením. Připravil: Smart Connections · IndustrySignal.
        </div>
      </div>
    </div>
  );
}

// ---------- Shell ----------
function MissionView() {
  const seed = window.MissionM2C;
  const [entities, setEntities] = React.useState(seed.entities);
  const [selectedId, setSelectedId] = React.useState(null);
  const [showDeliverable, setShowDeliverable] = React.useState(false);

  const selected = entities.find(e => e.id === selectedId) || null;

  const addEntity = (ent) => setEntities(es => [...es, ent]);
  const updateEntity = (ent) => setEntities(es => es.map(e => e.id === ent.id ? ent : e));
  const deleteEntity = (id) => {
    setEntities(es => es.filter(e => e.id !== id).map(e => ({ ...e, worksWith: (e.worksWith || []).filter(w => w !== id) })));
    setSelectedId(null);
  };
  const addBlank = () => {
    const id = 'manual-' + Math.random().toString(36).slice(2, 6);
    addEntity({ id, role: 'target', name: 'Nová firma', city: '—', note: '', source: 'OVĚŘIT', verify: true, worksWith: [] });
    setSelectedId(id);
  };

  const counts = ['competitor', 'target', 'partner'].map(r => ({ r, n: entities.filter(e => e.role === r).length }));
  const verifyCount = entities.filter(e => e.verify).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 64px' }}>
      <BriefBar brief={seed.brief} onExport={() => setShowDeliverable(true)} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {counts.map(c => (
          <div key={c.r} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill tone={missionRoleTone[c.r]} style={{ fontSize: 10 }}>{missionGraphStyles.roleLabel[c.r]}</Pill>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)' }}>{c.n}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill tone="warn" style={{ fontSize: 10 }}>OVĚŘIT</Pill>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)' }}>{verifyCount}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>položek čeká na potvrzení zdroje</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(300px, 1fr)', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <MissionResearch brief={seed.brief} rubric={seed.rubric} entities={entities} onAdd={addEntity} />
          <MissionIntake entities={entities} onAdd={addEntity} />
          <MissionGraph entities={entities} selectedId={selectedId} onSelect={setSelectedId} />
          <PlayersTable entities={entities} selectedId={selectedId} onSelect={setSelectedId} onAddBlank={addBlank} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20 }}>
          {selected
            ? <DetailPanel entity={selected} entities={entities} onChange={updateEntity} onDelete={deleteEntity} onClose={() => setSelectedId(null)} />
            : <RubricCard rubric={seed.rubric} />}
          <Opportunities items={seed.opportunities} />
        </div>
      </div>

      {showDeliverable && <Deliverable brief={seed.brief} entities={entities} opportunities={seed.opportunities} onClose={() => setShowDeliverable(false)} />}
    </div>
  );
}

Object.assign(window, { MissionView });
