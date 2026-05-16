// IndustrySignal — shared primitives. Loaded as text/babel.
// Exports to window: Icon, Pill, Button, IconButton, Tile, MonoLabel, Card, Sparkline, Hairline.

const isStyles = {};

// ---------- Icon — inline SVG by name. Lucide-shaped, stroke 1.5. ----------
const ICONS = {
  'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></>,
  'archive': <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
  'bookmark': <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
  'bell': <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  'search': <><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></>,
  'user': <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  'chevron-down': <polyline points="6 9 12 15 18 9"/>,
  'chevron-right': <polyline points="9 18 15 12 9 6"/>,
  'chevron-left': <polyline points="15 18 9 12 15 6"/>,
  'arrow-up': <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
  'arrow-down': <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
  'external-link': <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
  'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  'trending-up': <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
  'trending-down': <><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></>,
  'alert-triangle': <><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  'clock': <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
  'lock': <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  'log-out': <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  'plus': <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  'x': <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  'radio': <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></>,
};

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.5, style }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      {path}
    </svg>
  );
}

// ---------- Pill — status badge ----------
function Pill({ tone = 'neutral', children, dot = false, pulse = false, style }) {
  const map = {
    up:    { bg: 'var(--signal-up-bg)',   fg: 'var(--signal-up)' },
    down:  { bg: 'var(--signal-down-bg)', fg: 'var(--signal-down)' },
    dn:    { bg: 'var(--signal-down-bg)', fg: 'var(--signal-down)' },
    warn:  { bg: 'var(--signal-warn-bg)', fg: 'var(--signal-warn)' },
    info:  { bg: 'var(--signal-info-bg)', fg: 'var(--signal-info)' },
    amber: { bg: 'var(--amber-300)',      fg: 'var(--fg-on-amber)' },
    neutral:{bg: 'var(--graphite-800)',   fg: 'var(--fg-tertiary)' },
  };
  const c = map[tone] || map.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 999,
      background: c.bg, color: c.fg,
      border: tone === 'neutral' ? '1px solid var(--ln-border)' : '1px solid transparent',
      ...style
    }}>
      {pulse && <span className="is-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg, position: 'relative', display: 'inline-block' }} />}
      {dot && !pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg }} />}
      {children}
    </span>
  );
}

// ---------- Button — primary/secondary/ghost/danger ----------
function Button({ kind = 'secondary', children, icon, iconRight, disabled, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  const styles = {
    primary:   { bg: hover ? 'var(--amber-400)' : 'var(--amber-300)', fg: 'var(--fg-on-amber)', bd: 'transparent' },
    secondary: { bg: hover ? 'var(--bg-card-hover)' : 'var(--bg-card)', fg: 'var(--fg-primary)', bd: 'var(--ln-border)' },
    ghost:     { bg: hover ? 'var(--bg-card)' : 'transparent', fg: hover ? 'var(--fg-primary)' : 'var(--fg-secondary)', bd: 'transparent' },
    danger:    { bg: 'transparent', fg: 'var(--signal-down)', bd: 'rgba(226,92,92,0.4)' },
  };
  const s = disabled
    ? { bg: 'var(--graphite-800)', fg: 'var(--graphite-500)', bd: 'transparent' }
    : (styles[kind] || styles.secondary);
  return (
    <button onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        padding: '8px 14px', borderRadius: 'var(--r-sm)',
        border: `1px solid ${s.bd}`, background: s.bg, color: s.fg,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms var(--ease-out), border-color 120ms var(--ease-out)',
        ...style,
      }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

function IconButton({ name, onClick, badge, title, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 32, height: 32, padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--r-sm)',
        background: hover ? 'var(--bg-card)' : 'transparent',
        color: hover ? 'var(--fg-primary)' : 'var(--fg-tertiary)',
        border: '1px solid transparent', cursor: 'pointer', position: 'relative',
        transition: 'background 120ms var(--ease-out), color 120ms var(--ease-out)',
        ...style
      }}>
      <Icon name={name} size={16} />
      {badge != null && badge > 0 && (
        <span style={{
          position: 'absolute', top: 4, right: 4,
          minWidth: 14, height: 14, padding: '0 4px',
          background: 'var(--signal-down)', color: 'var(--fg-on-amber)',
          borderRadius: 999, fontSize: 9, fontFamily: 'var(--font-mono)',
          fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--bg-app)'
        }}>{badge}</span>
      )}
    </button>
  );
}

// ---------- MonoLabel — the signature category caption ----------
function MonoLabel({ children, accent, style }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11, fontWeight: 500,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: accent ? 'var(--accent-text)' : 'var(--fg-tertiary)',
      ...style
    }}>{children}</div>
  );
}

// ---------- Card ----------
function Card({ children, pad = true, style, hoverable, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: hoverable && hover ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: '1px solid var(--ln-divider)',
        borderRadius: 'var(--r-md)',
        padding: pad ? 24 : 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms var(--ease-out)',
        ...style
      }}>
      {children}
    </div>
  );
}

// ---------- Tile — KPI primitive ----------
function Tile({ label, value, delta, dir = 'up', sub, big = false }) {
  const dColors = { up: 'var(--signal-up)', dn: 'var(--signal-down)', warn: 'var(--signal-warn)' };
  const arrow   = { up: '▲', dn: '▼', warn: '≈' };
  return (
    <Card style={{ padding: 18 }}>
      <MonoLabel>{label}</MonoLabel>
      <div style={{
        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
        fontSize: big ? 36 : 28, fontWeight: 500, lineHeight: 1.05,
        color: 'var(--fg-primary)', letterSpacing: '-0.01em',
        margin: '10px 0 8px',
      }}>{value}</div>
      {delta && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
          fontSize: 12, color: dColors[dir] || 'var(--fg-tertiary)',
          display: 'inline-flex', gap: 6, alignItems: 'center'
        }}>
          <span>{arrow[dir]}</span><span>{delta}</span>
          {sub && <span style={{ color: 'var(--fg-muted)', marginLeft: 4 }}>{sub}</span>}
        </div>
      )}
    </Card>
  );
}

// ---------- Sparkline (SVG, decorative) ----------
function Sparkline({ data = [3, 5, 4, 7, 6, 9, 8, 5, 7], height = 22, width = 64, accentLast = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const span = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 2) - 1]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke="var(--graphite-500)" strokeWidth="1.25" />
      {accentLast && <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2" fill="var(--amber-300)" />}
    </svg>
  );
}

// ---------- Input ----------
function Input({ label, hint, error, icon, type = 'text', ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <MonoLabel>{label}</MonoLabel>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && <span style={{ position: 'absolute', left: 10, color: 'var(--fg-tertiary)', display: 'flex' }}><Icon name={icon} size={14} /></span>}
        <input
          type={type}
          {...rest}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 13,
            background: 'var(--bg-input)', color: 'var(--fg-primary)',
            border: `1px solid ${error ? 'var(--signal-down)' : focus ? 'var(--amber-400)' : 'var(--ln-border)'}`,
            borderRadius: 'var(--r-sm)',
            padding: icon ? '9px 12px 9px 32px' : '9px 12px',
            width: '100%', boxSizing: 'border-box', outline: 'none',
            boxShadow: focus ? '0 0 0 2px rgba(232,165,43,0.18)' : 'none',
            transition: 'border-color 120ms var(--ease-out), box-shadow 120ms var(--ease-out)',
          }}
        />
      </div>
      {hint && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: error ? 'var(--signal-down)' : 'var(--fg-muted)' }}>{hint}</span>}
    </div>
  );
}

Object.assign(window, { Icon, Pill, Button, IconButton, MonoLabel, Card, Tile, Sparkline, Input });
