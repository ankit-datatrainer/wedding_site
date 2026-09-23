'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Badge, EmptyRow, Pager, Panel, TableWrap, Td, Th } from '@/components/admin/ui';
import { adminApi } from '@/lib/adminApi';
import { formatINR } from '@/lib/api';

const PAGE_SIZE = 25;

type Order = {
  id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_id: string | null;
  created_at: string;
  users: { email: string; first_name: string; last_name: string } | null;
};

type Paged = { items: Order[]; total: number; page: number; pageSize: number };

export default function AdminPaymentsPage() {
  const [result, setResult] = useState<Paged | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await adminApi<Paged>(`/api/admin/orders?page=${page}&pageSize=${PAGE_SIZE}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const paidTotal = (result?.items ?? [])
    .filter((o) => o.status === 'paid')
    .reduce((s, o) => s + o.amount, 0);

  return (
    <AdminShell title="Payments" description="Membership orders and their status" permission="payments.view">
      {error && (
        <p role="alert" className="mb-4 font-body text-label-md text-error">
          {error}
        </p>
      )}

      <Panel
        title={result ? `${result.total} order${result.total === 1 ? '' : 's'}` : 'Orders'}
        actions={
          result ? (
            <span className="font-body text-label-md text-on-surface-variant">
              {formatINR(paidTotal)} collected on this page
            </span>
          ) : null
        }
      >
        <TableWrap>
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th>Order ID</Th>
                <Th>Member</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Payment ID</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow colSpan={7} message="Loading…" />}

              {!loading && result?.items.length === 0 && (
                <EmptyRow
                  colSpan={7}
                  message="No orders yet. They appear here when a member buys a membership."
                />
              )}

              {!loading &&
                result?.items.map((o) => (
                  <tr key={o.id} className="border-b border-outline-variant/20 last:border-0">
                    <Td className="font-mono text-label-md text-on-surface-variant">{o.id}</Td>
                    <Td>
                      {o.users ? (
                        <>
                          <span className="block">
                            {o.users.first_name} {o.users.last_name}
                          </span>
                          <span className="block font-body text-label-md text-on-surface-variant">
                            {o.users.email}
                          </span>
                        </>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </Td>
                    <Td className="capitalize">{o.plan_id}</Td>
                    <Td>{formatINR(o.amount)}</Td>
                    <Td>
                      <Badge
                        tone={o.status === 'paid' ? 'success' : o.status === 'failed' ? 'warn' : 'neutral'}
                      >
                        {o.status}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-label-md text-on-surface-variant">
                      {o.payment_id || '—'}
                    </Td>
                    <Td className="text-on-surface-variant">
                      {new Date(o.created_at).toLocaleString()}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableWrap>

        {result && (
          <Pager page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} busy={loading} />
        )}
      </Panel>
    </AdminShell>
  );
}
