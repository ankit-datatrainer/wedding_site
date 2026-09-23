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
    <div className="group relative flex items-start gap-4 overflow-hidden rounded-2xl bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float">
      {tone === 'accent' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: 'linear-gradient(135deg, #E85283, #2D0312)' }}
        />
      )}
      <span
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
          tone === 'accent'
            ? 'bg-secondary text-on-secondary shadow-[0_6px_16px_-4px_rgba(232,82,131,0.55)]'
            : 'bg-secondary-container/15 text-secondary'
        }`}
      >
        <Icon name={icon} className="text-[22px]" />
      </span>
      <div className="relative min-w-0">
        <p className="font-body text-label-md uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        <p className="mt-0.5 font-heading text-[27px] leading-tight text-primary">{value}</p>
        {sub && <p className="mt-0.5 font-body text-label-md text-on-surface-variant">{sub}</p>}
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
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
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

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 font-body text-label-md uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container disabled:cursor-not-allowed disabled:opacity-50';
export const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-lg border-[1.5px] border-outline-variant bg-surface px-4 py-2.5 font-body text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50';
export const inputBase =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: string }> = {
  approved: { label: 'Live', cls: 'bg-[#e3f4ea] text-[#1b6b3a]', icon: 'check_circle' },
  pending: { label: 'Pending', cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', icon: 'schedule' },
  rejected: { label: 'Rejected', cls: 'bg-error-container text-on-error-container', icon: 'block' },
};

/** Approval state of a directory profile. Legacy rows with no status are live. */
export function StatusBadge({ status }: { status?: string | null }) {
  const s = STATUS_STYLE[status || 'approved'] ?? STATUS_STYLE.approved;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-label-md uppercase tracking-wide ${s.cls}`}>
      <Icon name={s.icon} className="text-[14px]" filled />
      {s.label}
    </span>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-surface-container p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-body text-label-md uppercase tracking-wide transition-colors ${
            value === t.value ? 'bg-surface text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${value === t.value ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Centered dialog with a header, scrollable body and optional footer. */
export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-float ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant/30 px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-heading text-[19px] text-primary">{title}</h2>
            {subtitle && <p className="font-body text-label-md text-on-surface-variant">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant transition-colors hover:text-secondary">
            <Icon name="close" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant/30 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-error-container/50 px-3 py-2.5 font-body text-label-md text-on-error-container">
      <Icon name="error" className="text-[16px]" />
      {message}
    </p>
  );
}
