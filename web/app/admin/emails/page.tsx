'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Badge, EmptyRow, ErrorNote, Panel, TableWrap, Td, Th } from '@/components/admin/ui';
import { adminApi } from '@/lib/adminApi';

type EmailLog = {
  id: string;
  to_email: string;
  relation: string;
  child_name: string;
  user_email: string;
  subject: string;
  status: 'sent' | 'logged' | 'failed';
  error?: string | null;
  sent_at: string;
};

const STATUS: Record<EmailLog['status'], { label: string; tone: 'success' | 'info' | 'warn'; hint: string }> = {
  sent: { label: 'Sent', tone: 'success', hint: 'Delivered to the mail server' },
  logged: { label: 'Logged only', tone: 'info', hint: 'SMTP is not configured — printed to the API console instead' },
  failed: { label: 'Failed', tone: 'warn', hint: 'The mail server rejected it' },
};

/** Every parent confirmation email the platform has sent (or tried to). */
export default function EmailLogPage() {
  const [items, setItems] = useState<EmailLog[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi<{ items: EmailLog[] }>('/api/admin/email-logs')
      .then((r) => setItems(r.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AdminShell
      title="Parent Emails"
      description="Confirmation emails sent to fathers and mothers when members register"
      permission="emails.view"
    >
      <ErrorNote message={error} />
      <Panel title={items ? `${items.length} email${items.length === 1 ? '' : 's'}` : 'Emails'}>
        <TableWrap>
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th>Sent to</Th>
                <Th>Relation</Th>
                <Th>Member</Th>
                <Th>Status</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {items === null && !error && <EmptyRow colSpan={5} message="Loading…" />}
              {items?.length === 0 && (
                <EmptyRow colSpan={5} message="No parent emails yet — they appear when a member registers with a father's or mother's email." />
              )}
              {items?.map((e) => (
                <tr key={e.id} className="border-b border-outline-variant/20 last:border-0">
                  <Td>{e.to_email}</Td>
                  <Td className="text-on-surface-variant">{e.relation}</Td>
                  <Td>
                    <span className="block">{e.child_name}</span>
                    <span className="block font-body text-[12px] text-on-surface-variant">{e.user_email}</span>
                  </Td>
                  <Td>
                    <span title={e.error || STATUS[e.status]?.hint}>
                      <Badge tone={STATUS[e.status]?.tone ?? 'neutral'}>{STATUS[e.status]?.label ?? e.status}</Badge>
                    </span>
                  </Td>
                  <Td className="text-on-surface-variant">{new Date(e.sent_at).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </AdminShell>
  );
}
