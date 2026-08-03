'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

/**
 * Public site chrome. The admin panel ships its own full-screen shell with a
 * sidebar, so the marketing header/footer must not wrap it — otherwise the
 * admin sits below a "Log In / Register" bar, which is both wrong and
 * confusing for a signed-in administrator.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="w-full pt-[80px]">{children}</main>
      <Footer />
    </>
  );
}
