// Landing — Sprint 1 smoke test.
// Proves that workspace packages (tokens, ui, i18n) resolve through Next's
// transpilePackages, that webfonts load, and that the editorial DNA holds in
// a real bundler (not the Babel CDN). Wordmark + a row of primitives only —
// no auth, no data, no views. Those land in subsequent commits.

import { Pill, Tile, MonoLabel, Button } from '@industrysignal/ui';
import { t, DEFAULT_LANG } from '@industrysignal/i18n';

export default function HomePage() {
  const lang = DEFAULT_LANG;
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 64px',
        gap: 48,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--amber-300)',
            color: 'var(--fg-on-amber)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: '-0.02em',
            borderRadius: 'var(--r-xs)',
          }}
        >
          B
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 28,
            letterSpacing: '-0.015em',
            color: 'var(--fg-primary)',
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Industry</span>
          <strong style={{ fontWeight: 700 }}>Signal</strong>
        </h1>
        <Pill tone="warn" dot>
          Sprint 1 · skeleton online
        </Pill>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
        <MonoLabel accent>{t(lang, 'app_subtitle')}</MonoLabel>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            lineHeight: 1.45,
            fontWeight: 400,
            color: 'var(--fg-secondary)',
          }}
        >
          B2B intelligence platforma pro český průmysl. Mission engine pro expanzi a
          replikaci konkurenčních vztahů, kvartální reporty, supplier risk score, alerty.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          maxWidth: 960,
        }}
      >
        <Tile label="Tokens" value="OK" delta="loaded" dir="up" />
        <Tile label="Webfonts" value="IBM Plex" delta="serif · sans · mono" dir="up" />
        <Tile label="i18n" value="CS / EN" delta="dictionary ready" dir="up" />
        <Tile label="DB" value="—" delta="Sprint 1 commit 2" dir="warn" />
      </section>

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderTop: '1px solid var(--ln-divider)',
          paddingTop: 24,
        }}
      >
        <MonoLabel>Build · 0.0.0</MonoLabel>
        <span style={{ flex: 1 }} />
        <Button kind="ghost" icon="external-link">
          HANDOFF.md
        </Button>
        <Button kind="primary" icon="lock" disabled>
          {t(lang, 'login_submit')}
        </Button>
      </footer>
    </main>
  );
}
