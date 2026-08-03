import type { Metadata } from 'next';
import { Libre_Caslon_Text, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { SiteChrome } from '@/components/SiteChrome';
import { AuthProvider } from '@/lib/auth';

const caslon = Libre_Caslon_Text({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-caslon',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EverAfter — Matrimonial Matchmaking',
  description:
    'Find your forever with someone who truly understands you. Verified profiles, privacy-first matchmaking, and five million members.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caslon.variable} ${jakarta.variable}`}>
      {/*
        Browser extensions commonly add attributes to <body> before React
        hydrates (cz-shortcut-listen, grammarly-*, data-new-gr-*). Suppressing
        the warning here covers only this element's own attributes — mismatches
        anywhere inside the tree are still reported.
      */}
      <body
        suppressHydrationWarning
        className="bg-surface font-body text-body-md text-on-surface antialiased"
      >
        <AuthProvider>
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
