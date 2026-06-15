// IndustrySignal — Mission relationship map. "Kdo s kým."
// Radial: M2C center → competitors (inner) → their clients (outer) + partners.
// Readable diagram, light interactivity (hover/click highlights connections).
// Exports: MissionGraph

const missionGraphStyles = {
  roleColor: {
    client:     { fill: 'var(--amber-100)', ring: 'var(--amber-400)', text: 'var(--fg-on-amber)' },
    competitor: { fill: 'var(--signal-down-bg)', ring: 'var(--signal-down)', text: 'var(--signal-down)' },
    target:     { fill: 'var(--signal-info-bg)', ring: 'var(--signal-info)', text: 'var(--signal-info)' },
    partner:    { fill: 'var(--signal-up-bg)', ring: 'var(--signal-up)', text: 'var(--signal-up)' },
  },
  roleLabel: { client: 'KLIENT', competitor: 'KONKURENT', target: 'CÍL · ODBĚRATEL', partner: 'PARTNER · KANÁL' },
};

function MissionGraph({ entities, selectedId, onSelect }) {
  const [hovered, setHovered] = React.useState(null);
  const W = 780, H = 560, cx = W / 2, cy = H / 2;

  const layout = React.useMemo(() => {
    const byId = {};
    entities.forEach(e => { byId[e.id] = e; });
    const center = entities.find(e => e.role === 'client');
    const competitors = entities.filter(e => e.role === 'competitor');
    const partners = entities.filter(e => e.role === 'partner');
    const targets = entities.filter(e => e.role === 'target');

    const pos = {};
    if (center) pos[center.id] = { x: cx, y: cy };

    // competitors spread across the top arc
    const rIn = 168;
    const arcStart = -160 * Math.PI / 180, arcEnd = -20 * Math.PI / 180;
    competitors.forEach((c, i) => {
      const t = competitors.length === 1 ? 0.5 : i / (competitors.length - 1);
      const a = arcStart + (arcEnd - arcStart) * t;
      pos[c.id] = { x: cx + Math.cos(a) * rIn, y: cy + Math.sin(a) * rIn, angle: a };
    });

    // targets: anchored near the competitor that serves them
    const rOut = 300;
    const placedAngles = {};
    const orphanTargets = [];
    targets.forEach(tg => {
      const owner = competitors.find(c => (c.worksWith || []).includes(tg.id) || (tg.worksWith || []).includes(c.id));
      if (owner && pos[owner.id]) {
        const base = pos[owner.id].angle;
        const n = (placedAngles[owner.id] = (placedAngles[owner.id] || 0) + 1);
        const fan = (n % 2 === 1 ? 1 : -1) * Math.ceil(n / 2) * (14 * Math.PI / 180);
        const a = base + fan;
        pos[tg.id] = { x: cx + Math.cos(a) * rOut, y: cy + Math.sin(a) * rOut };
      } else orphanTargets.push(tg);
    });
    orphanTargets.forEach((tg, i) => {
      const a = (-90 + (i - (orphanTargets.length - 1) / 2) * 22) * Math.PI / 180;
      pos[tg.id] = { x: cx + Math.cos(a) * rOut, y: cy + Math.sin(a) * rOut };
    });

    // partners along the bottom arc
    const rP = 150;
    partners.forEach((p, i) => {
      const a = (60 + (partners.length === 1 ? 60 : i / (partners.length - 1) * 60)) * Math.PI / 180;
      pos[p.id] = { x: cx + Math.cos(a) * rP, y: cy + Math.sin(a) * rP };
    });

    // edges
    const edges = [];
    if (center) {
      competitors.forEach(c => edges.push({ from: center.id, to: c.id, kind: 'replicate' }));
      partners.forEach(p => edges.push({ from: center.id, to: p.id, kind: 'channel' }));
    }
    // "serves" edges from ANY entity's worksWith (deduped by unordered pair) —
    // so both competitor→target and target→competitor links render once.
    const seen = new Set();
    entities.forEach(e => (e.worksWith || []).forEach(t => {
      if (!pos[t] || e.id === t) return;
      const key = [e.id, t].sort().join('|');
      if (seen.has(key)) return; seen.add(key);
      edges.push({ from: e.id, to: t, kind: 'serves' });
    }));

    return { pos, edges, byId };
  }, [entities]);

  const active = hovered || selectedId;
  const isConnected = (id) => {
    if (!active) return true;
    if (id === active) return true;
    return layout.edges.some(e =>
      (e.from === active && e.to === id) || (e.to === active && e.from === id));
  };
  const edgeActive = (e) => !active || e.from === active || e.to === active;

  const edgeStyle = {
    replicate: { stroke: 'var(--amber-300)', dash: '5 4', w: 1.5 },
    serves:    { stroke: 'var(--ln-strong)', dash: 'none', w: 1.25 },
    channel:   { stroke: 'var(--signal-up)', dash: '2 4', w: 1.25 },
  };

  return (
    <div style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--ln-divider)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--ln-divider)' }}>
        <MonoLabel>Vztahová mapa · kdo s kým</MonoLabel>
        <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: 'var(--fg-tertiary)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, borderTop: '1.5px dashed var(--amber-300)' }} />REPLIKACE</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, borderTop: '1.5px solid var(--ln-strong)' }} />OBSLUHUJE</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, borderTop: '1.5px dotted var(--signal-up)' }} />KANÁL</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', background: 'var(--bg-canvas)' }}
        className="scanline">
        {/* edges */}
        {layout.edges.map((e, i) => {
          const a = layout.pos[e.from], b = layout.pos[e.to];
          if (!a || !b) return null;
          const st = edgeStyle[e.kind];
          const on = edgeActive(e);
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={st.stroke} strokeWidth={st.w}
              strokeDasharray={st.dash === 'none' ? undefined : st.dash}
              opacity={on ? 0.85 : 0.12}
              style={{ transition: 'opacity 160ms var(--ease-out)' }} />
          );
        })}
        {/* nodes */}
        {entities.map(e => {
          const p = layout.pos[e.id];
          if (!p) return null;
          const c = missionGraphStyles.roleColor[e.role] || missionGraphStyles.roleColor.target;
          const isCenter = e.role === 'client';
          const r = isCenter ? 30 : (e.role === 'partner' ? 9 : 12);
          const on = isConnected(e.id);
          const sel = selectedId === e.id;
          return (
            <g key={e.id}
              onMouseEnter={() => setHovered(e.id)} onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect && onSelect(e.id === selectedId ? null : e.id)}
              style={{ cursor: 'pointer', opacity: on ? 1 : 0.28, transition: 'opacity 160ms var(--ease-out)' }}>
              <circle cx={p.x} cy={p.y} r={r}
                fill={c.fill} stroke={c.ring} strokeWidth={sel ? 3 : 1.5} />
              {e.verify && (
                <circle cx={p.x + r * 0.72} cy={p.y - r * 0.72} r={4} fill="var(--signal-warn)" stroke="var(--bg-canvas)" strokeWidth={1.5} />
              )}
              {isCenter && (
                <text x={p.x} y={p.y + 5} textAnchor="middle"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, fill: c.text, letterSpacing: '0.02em' }}>
                  {e.name}
                </text>
              )}
              {!isCenter && (
                <text x={p.x} y={p.y + r + 14} textAnchor="middle"
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, fill: 'var(--fg-primary)' }}>
                  {e.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

Object.assign(window, { MissionGraph, missionGraphStyles });
