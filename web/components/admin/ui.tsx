'use client';

import { Icon } from '@/components/Icon';

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'accent';
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl bg-surface p-5 shadow-card">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          tone === 'accent' ? 'bg-secondary text-on-secondary' : 'bg-secondary-container/20 text-secondary'
        }`}
      >
        <Icon name={icon} className="text-[22px]" />
      </span>
      <div className="min-w-0">
        <p className="font-body text-label-md uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        <p className="font-heading text-[26px] leading-tight text-primary">{value}</p>
        {sub && <p className="font-body text-label-md text-on-surface-variant">{sub}</p>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-card">
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-outline-variant/30 px-5 py-4">
          {title && <h2 className="font-heading text-[18px] text-primary">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/** Horizontally scrollable table wrapper — admin tables are wide by nature. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-left font-body text-label-md uppercase tracking-wide text-on-surface-variant ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 font-body text-body-md text-on-surface ${className}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center font-body text-on-surface-variant">
        {message}
      </td>
    </tr>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warn' | 'info';
}) {
  const tones = {
    neutral: 'bg-surface-container-high text-on-surface-variant',
    success: 'bg-secondary text-on-secondary',
    warn: 'bg-error-container text-on-error-container',
    info: 'bg-primary-fixed text-on-primary-fixed',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-body text-label-md uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Pager({
  page,
  total,
  pageSize,
  onPage,
  busy,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  busy?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-primary transition-colors hover:border-secondary hover:text-secondary disabled:opacity-40';

  return (
    <div className="flex items-center justify-center gap-4 border-t border-outline-variant/30 px-4 py-4">
      <button className={btn} disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
        <Icon name="chevron_left" />
      </button>
      <span className="font-body text-label-md text-on-surface-variant">
        Page {page} of {totalPages}
      </span>
      <button className={btn} disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)}>
        <Icon name="chevron_right" />
      </button>
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-4 font-body text-body-md focus:border-secondary focus:outline-none sm:w-64"
      />
    </label>
  );
}
