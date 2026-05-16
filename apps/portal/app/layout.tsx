import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndustrySignal — Klientský portál',
  description:
    'B2B intelligence platforma pro český průmysl. Mission engine, kvartální reporty, supplier risk score, alerty.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
