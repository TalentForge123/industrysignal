'use client';

// Mission relationship map — "kdo s kým". 1:1 port of the prototype's
// MissionGraph.jsx: radial layout with the client at center, competitors
// on the top arc, their buyers fanned out behind them, partners along the
// bottom. Hover/click highlights an entity's connections.
//
// Edges come from two sources: the persisted `serves` links (competitor ↔
// target) passed in, plus client→competitor (replicate) and client→partner
// (channel) edges derived from roles at render time — exactly as the
// prototype did from worksWith.

import { useMemo, useState } from 'react';
import { t } from '@industrysignal/i18n';
import { useLang } from '@industrysignal/i18n/client';
import { MonoLabel } from '@industrysignal/ui';

export interface GraphEntity {
  id: string;
  name: string;
  role: 'client' | 'competitor' | 'target' | 'partner';
  verify: boolean;
}
export interface GraphLink {
  id: string;
  fromEntity: string;
  toEntity: string;
  kind: string;
}

export const ROLE_COLOR: Record<
  GraphEntity['role'],
  { fill: string; ring: string; text: string }
> = {
  client: { fill: 'var(--amber-100)', ring: 'var(--amber-400)', text: 'var(--fg-on-amber)' },
  competitor: { fill: 'var(--signal-down-bg)', ring: 'var(--signal-down)', text: 'var(--signal-down)' },
  target: { fill: 'var(--signal-info-bg)', ring: 'var(--signal-info)', text: 'var(--signal-info)' },
  partner: { fill: 'var(--signal-up-bg)', ring: 'var(--signal-up)', text: 'var(--signal-up)' },
};

export function roleLabel(lang: 'cs' | 'en', role: string): string {
  return t(lang, `role_${role}`);
}

interface MissionGraphProps {
  entities: GraphEntity[];
  links: GraphLink[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface Edge {
  from: string;
  to: string;
  kind: 'replicate' | 'serves' | 'channel';
}

export function MissionGraph({ entities, links, selectedId, onSelect }: MissionGraphProps) {
  const [lang] = useLang();
  const [hovered, setHovered] = useState<string | null>(null);
  const W = 780;
  const H = 560;
  const cx = W / 2;
  const cy = H / 2;

  const layout = useMemo(() => {
    const center = entities.find((e) => e.role === 'client');
    const competitors = entities.filter((e) => e.role === 'competitor');
    const partners = entities.filter((e) => e.role === 'partner');
    const targets = entities.filter((e) => e.role === 'target');

    const pos: Record<string, { x: number; y: number; angle?: number }> = {};
    if (center) pos[center.id] = { x: cx, y: cy };

    // Adjacency from persisted links (undirected) for target anchoring.
    const neighbors = (id: string): string[] => {
      const out: string[] = [];
      for (const l of links) {
        if (l.fromEntity === id) out.push(l.toEntity);
        else if (l.toEntity === id) out.push(l.fromEntity);
      }
      return out;
    };

    // competitors spread across the top arc
    const rIn = 168;
    const arcStart = (-160 * Math.PI) / 180;
    const arcEnd = (-20 * Math.PI) / 180;
    competitors.forEach((c, i) => {
      const tt = competitors.length === 1 ? 0.5 : i / (competitors.length - 1);
      const a = arcStart + (arcEnd - arcStart) * tt;
      pos[c.id] = { x: cx + Math.cos(a) * rIn, y: cy + Math.sin(a) * rIn, angle: a };
    });

    // targets: anchored near the competitor that serves them
    const rOut = 300;
    const placedAngles: Record<string, number> = {};
    const orphanTargets: GraphEntity[] = [];
    targets.forEach((tg) => {
      const linkedIds = neighbors(tg.id);
      const owner = competitors.find((c) => linkedIds.includes(c.id));
      const ownerPos = owner ? pos[owner.id] : undefined;
      if (owner && ownerPos && ownerPos.angle !== undefined) {
        const base = ownerPos.angle;
        const n = (placedAngles[owner.id] = (placedAngles[owner.id] || 0) + 1);
        const fan = (n % 2 === 1 ? 1 : -1) * Math.ceil(n / 2) * ((14 * Math.PI) / 180);
        const a = base + fan;
        pos[tg.id] = { x: cx + Math.cos(a) * rOut, y: cy + Math.sin(a) * rOut };
      } else orphanTargets.push(tg);
    });
    orphanTargets.forEach((tg, i) => {
      const a = ((-90 + (i - (orphanTargets.length - 1) / 2) * 22) * Math.PI) / 180;
      pos[tg.id] = { x: cx + Math.cos(a) * rOut, y: cy + Math.sin(a) * rOut };
    });

    // partners along the bottom arc
    const rP = 150;
    partners.forEach((p, i) => {
      const a =
        ((60 + (partners.length === 1 ? 60 : (i / (partners.length - 1)) * 60)) * Math.PI) / 180;
      pos[p.id] = { x: cx + Math.cos(a) * rP, y: cy + Math.sin(a) * rP };
    });

    // edges
    const edges: Edge[] = [];
    if (center) {
      competitors.forEach((c) => edges.push({ from: center.id, to: c.id, kind: 'replicate' }));
      partners.forEach((p) => edges.push({ from: center.id, to: p.id, kind: 'channel' }));
    }
    // serves edges from persisted links (deduped by unordered pair)
    const seen = new Set<string>();
    for (const l of links) {
      if (!pos[l.fromEntity] || !pos[l.toEntity] || l.fromEntity === l.toEntity) continue;
      const key = [l.fromEntity, l.toEntity].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: l.fromEntity, to: l.toEntity, kind: 'serves' });
    }

    return { pos, edges };
  }, [entities, links, cx, cy]);

  const active = hovered || selectedId;
  const isConnected = (id: string): boolean => {
    if (!active) return true;
    if (id === active) return true;
    return layout.edges.some(
      (e) => (e.from === active && e.to === id) || (e.to === active && e.from === id),
    );
  };
  const edgeActive = (e: Edge): boolean => !active || e.from === active || e.to === active;

  const edgeStyle: Record<Edge['kind'], { stroke: string; dash: string; w: number }> = {
    replicate: { stroke: 'var(--amber-300)', dash: '5 4', w: 1.5 },
    serves: { stroke: 'var(--ln-strong)', dash: 'none', w: 1.25 },
    channel: { stroke: 'var(--signal-up)', dash: '2 4', w: 1.25 },
  };

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--ln-divider)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--ln-divider)',
        }}
      >
        <MonoLabel>{t(lang, 'md_graph_title')}</MonoLabel>
        <div
          style={{
            display: 'flex',
            gap: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.04em',
            color: 'var(--fg-tertiary)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, borderTop: '1.5px dashed var(--amber-300)' }} />
            {t(lang, 'md_legend_replicate')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, borderTop: '1.5px solid var(--ln-strong)' }} />
            {t(lang, 'md_legend_serves')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, borderTop: '1.5px dotted var(--signal-up)' }} />
            {t(lang, 'md_legend_channel')}
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', background: 'var(--bg-canvas)' }}
      >
        {layout.edges.map((e, i) => {
          const a = layout.pos[e.from];
          const b = layout.pos[e.to];
          if (!a || !b) return null;
          const st = edgeStyle[e.kind];
          const on = edgeActive(e);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={st.stroke}
              strokeWidth={st.w}
              strokeDasharray={st.dash === 'none' ? undefined : st.dash}
              opacity={on ? 0.85 : 0.12}
              style={{ transition: 'opacity 160ms var(--ease-out)' }}
            />
          );
        })}
        {entities.map((e) => {
          const p = layout.pos[e.id];
          if (!p) return null;
          const c = ROLE_COLOR[e.role] ?? ROLE_COLOR.target;
          const isCenter = e.role === 'client';
          const r = isCenter ? 30 : e.role === 'partner' ? 9 : 12;
          const on = isConnected(e.id);
          const sel = selectedId === e.id;
          return (
            <g
              key={e.id}
              onMouseEnter={() => setHovered(e.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(e.id === selectedId ? null : e.id)}
              style={{
                cursor: 'pointer',
                opacity: on ? 1 : 0.28,
                transition: 'opacity 160ms var(--ease-out)',
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={c.fill}
                stroke={c.ring}
                strokeWidth={sel ? 3 : 1.5}
              />
              {e.verify && (
                <circle
                  cx={p.x + r * 0.72}
                  cy={p.y - r * 0.72}
                  r={4}
                  fill="var(--signal-warn)"
                  stroke="var(--bg-canvas)"
                  strokeWidth={1.5}
                />
              )}
              {isCenter ? (
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    fill: c.text,
                    letterSpacing: '0.02em',
                  }}
                >
                  {e.name}
                </text>
              ) : (
                <text
                  x={p.x}
                  y={p.y + r + 14}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: 500,
                    fill: 'var(--fg-primary)',
                  }}
                >
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
