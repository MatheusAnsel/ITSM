import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ITSM', template: '%s | ITSM' },
  description: 'Gestão de chamados e ativos de TI',
};

export const viewport: Viewport = { themeColor: '#08080b', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
