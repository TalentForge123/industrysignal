// Placeholder for views that have a route reservation but no content yet.
// Server Component — copy is bilingual via t() with an explicit lang arg
// (set by the route page).

import { t, type Lang } from '@industrysignal/i18n';

interface StubViewProps {
  lang?: Lang;
  titleKey: string;
  sprint: number;
  description: string;
}

export function StubView({ lang = 'cs', titleKey, sprint, description }: StubViewProps) {
  return (
    <div style={{ background: 'var(--bg-app)', color: 'var(--fg-primary)', minHeight: '100%', padding: '48px 64px' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--amber-300)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ width: 18, height: 1, background: 'var(--amber-300)' }} />
        Sprint {sprint} · pending
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 28,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          color: 'var(--fg-primary)',
          margin: '0 0 16px',
        }}
      >
        {t(lang, titleKey)}
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--fg-secondary)',
          maxWidth: 640,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
