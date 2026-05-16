// IndustrySignal design tokens — typed handle for use in component styles.
//
// The CSS variables themselves live in `./tokens.css`. Import the stylesheet
// once in your app entry (e.g. `app/globals.css`):
//
//     @import '@industrysignal/tokens/tokens.css';
//
// Then reference tokens through `tokens.*` for typo safety:
//
//     style={{ background: tokens.bg.card, color: tokens.fg.primary }}

export const tokens = {
  bg: {
    app: 'var(--bg-app)',
    canvas: 'var(--bg-canvas)',
    panel: 'var(--bg-panel)',
    card: 'var(--bg-card)',
    cardHover: 'var(--bg-card-hover)',
    raised: 'var(--bg-raised)',
    input: 'var(--bg-input)',
    overlay: 'var(--bg-overlay)',
  },
  fg: {
    primary: 'var(--fg-primary)',
    secondary: 'var(--fg-secondary)',
    tertiary: 'var(--fg-tertiary)',
    muted: 'var(--fg-muted)',
    disabled: 'var(--fg-disabled)',
    onAmber: 'var(--fg-on-amber)',
  },
  ln: {
    hairline: 'var(--ln-hairline)',
    divider: 'var(--ln-divider)',
    border: 'var(--ln-border)',
    strong: 'var(--ln-strong)',
    focus: 'var(--ln-focus)',
  },
  accent: {
    base: 'var(--accent)',
    strong: 'var(--accent-strong)',
    soft: 'var(--accent-soft)',
    text: 'var(--accent-text)',
  },
  signal: {
    up: 'var(--signal-up)',
    upBg: 'var(--signal-up-bg)',
    down: 'var(--signal-down)',
    downBg: 'var(--signal-down-bg)',
    warn: 'var(--signal-warn)',
    warnBg: 'var(--signal-warn-bg)',
    info: 'var(--signal-info)',
    infoBg: 'var(--signal-info-bg)',
  },
  amber: {
    100: 'var(--amber-100)',
    200: 'var(--amber-200)',
    300: 'var(--amber-300)',
    400: 'var(--amber-400)',
    500: 'var(--amber-500)',
    600: 'var(--amber-600)',
    700: 'var(--amber-700)',
  },
  font: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    serif: 'var(--font-serif)',
  },
  radius: {
    none: 'var(--r-none)',
    xs: 'var(--r-xs)',
    sm: 'var(--r-sm)',
    md: 'var(--r-md)',
    lg: 'var(--r-lg)',
    xl: 'var(--r-xl)',
    pill: 'var(--r-pill)',
  },
  ease: {
    out: 'var(--ease-out)',
    inOut: 'var(--ease-in-out)',
    fast: 'var(--dur-fast)',
    base: 'var(--dur-base)',
    slow: 'var(--dur-slow)',
  },
} as const;

export type Tokens = typeof tokens;
