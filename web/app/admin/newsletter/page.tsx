'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { EmptyRow, Panel, TableWrap, Td, Th } from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';

type Subscriber = { email: string; created_at: string };

export default function AdminNewsletterPage() {
  const [items, setItems] = useState<Subscriber[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await adminApi<{ items: Subscriber[] }>('/api/admin/subscribers');
      setItems(res.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(email: string) {
    if (!confirm(`Remove ${email} from the newsletter list?`)) return;
    setBusy(true);
    try {
      await adminApi(`/api/admin/subscribers/${encodeURIComponent(email)}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyAll() {
    if (!items?.length) return;
    navigator.clipboard.writeText(items.map((s) => s.email).join(', '));
  }

  return (
    <AdminShell
      title="Newsletter"
      description="People who subscribed from the site footer"
      permission="newsletter.manage"
      actions={
        <button
          onClick={copyAll}
          disabled={!items?.length}
          className="flex items-center gap-2 rounded-lg border-[1.5px] border-secondary px-4 py-2 font-body text-label-md uppercase text-secondary transition-colors hover:bg-secondary hover:text-on-secondary disabled:opacity-50"
        >
          <Icon name="content_copy" className="text-[18px]" />
          Copy All
        </button>
      }
    >
      {error && (
        <p role="alert" className="mb-4 font-body text-label-md text-error">
          {error}
        </p>
      )}

      <Panel title={items ? `${items.length} subscriber${items.length === 1 ? '' : 's'}` : 'Subscribers'}>
        <TableWrap>
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th>Email</Th>
                <Th>Subscribed</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items === null && <EmptyRow colSpan={3} message="Loading…" />}

              {items?.length === 0 && (
                <EmptyRow
                  colSpan={3}
                  message="No subscribers yet — the signup form is in the site footer."
                />
              )}

              {items?.map((s) => (
                <tr key={s.email} className="border-b border-outline-variant/20 last:border-0">
                  <Td>{s.email}</Td>
                  <Td className="text-on-surface-variant">
                    {new Date(s.created_at).toLocaleString()}
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => remove(s.email)}
                      disabled={busy}
                      className="font-body text-label-md uppercase text-error hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </AdminShell>
  );
}
