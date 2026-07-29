import Link from 'next/link';
import { Icon } from './Icon';

/** Windowed pager: first, neighbours of the current page, last. */
export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | 'gap')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap');
  }

  const arrow =
    'flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-primary transition-colors hover:border-secondary hover:text-secondary';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} aria-label="Previous page" className={arrow}>
          <Icon name="chevron_left" className="text-[20px]" />
        </Link>
      ) : (
        <span className={`${arrow} pointer-events-none opacity-40`}>
          <Icon name="chevron_left" className="text-[20px]" />
        </span>
      )}

      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-2 font-body text-label-md text-on-surface-variant">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={makeHref(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-lg font-body text-label-md transition-colors ${
              p === page
                ? 'bg-secondary text-on-secondary'
                : 'border border-outline-variant text-primary hover:border-secondary hover:text-secondary'
            }`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={makeHref(page + 1)} aria-label="Next page" className={arrow}>
          <Icon name="chevron_right" className="text-[20px]" />
        </Link>
      ) : (
        <span className={`${arrow} pointer-events-none opacity-40`}>
          <Icon name="chevron_right" className="text-[20px]" />
        </span>
      )}
    </nav>
  );
}
