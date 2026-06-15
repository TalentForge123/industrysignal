import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndustrySignal Studio',
  description: 'Editorial CMS — interní nástroj pro analytiky.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" data-theme="graphite">
      <body>{children}</body>
    </html>
  );
}
