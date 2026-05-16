import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndustrySignal — Klientský portál',
  description:
    'B2B intelligence platforma pro český průmysl. Mission engine, kvartální reporty, supplier risk score, alerty.',
};

// Editorial (cream + ink + deep amber) is the default visual identity for the
// portal. Graphite is the secondary toggle (lands with the TopBar port in
// Sprint 5). This inline script runs before React hydrates, so a previously
// persisted choice in localStorage wins without a flash of the wrong theme.
const themeBootstrapScript = `
(function(){
  try {
    localStorage.removeItem('is.theme');
    var t = localStorage.getItem('is.theme.v2') || 'editorial';
    if (t !== 'editorial' && t !== 'graphite') t = 'editorial';
    document.documentElement.setAttribute('data-theme', t);
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" data-theme="editorial">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
