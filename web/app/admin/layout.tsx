import { AdminAuthProvider } from '@/lib/adminAuth';

export const metadata = {
  title: 'Admin — EverAfter',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
