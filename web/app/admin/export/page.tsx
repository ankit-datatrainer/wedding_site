'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { ErrorNote, Pager, Panel, SearchBox, TableWrap, Tabs, btnPrimary } from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi, exportBiodata, type ExportRequest } from '@/lib/adminApi';
import { mediaUrl } from '@/lib/api';

type Dataset = ExportRequest['dataset'];
type Format = ExportRequest['format'];
type Column = { key: string; label: string; group: string };
type Catalog = { columns: Record<Dataset, Column[]>; defaults: Record<Dataset, string[]> };
type Preview = {
  columns: { key: string; label: string }[];
  rows: { id: string; photo?: string | null; values: string[] }[];
  allIds: string[];
  total: number;
};

const PAGE_SIZE = 25;

const FORMATS: { value: Format; label: string; icon: string; note: string }[] = [
  { value: 'xlsx', label: 'Excel', icon: 'table_view', note: 'Branded .xlsx with filters' },
  { value: 'pdf', label: 'PDF', icon: 'picture_as_pdf', note: 'Branded, print-ready' },
  { value: 'csv', label: 'CSV', icon: 'description', note: 'Plain data, any tool' },
];

/**
 * Biodata export centre: browse every biodata in a table, tick the rows and
 * the columns you want, and download them as a branded Excel or PDF file, or
 * a CSV. The table is rendered by the same formatter as the export itself.
 */
export default function ExportPage() {
  const [dataset, setDataset] = useState<Dataset>('profiles');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [columns, setColumns] = useState<Record<Dataset, string[]>>({ members: [], profiles: [] });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState<Format>('xlsx');
  const [layout, setLayout] = useState<'table' | 'sheets'>('table');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    adminApi<Catalog>('/api/admin/export/columns')
      .then((c) => {
        setCatalog(c);
        setColumns({ members: c.defaults.members, profiles: c.defaults.profiles });
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const filters = useMemo(
    () => ({ search: search || undefined, gender: dataset === 'profiles' ? gender || undefined : undefined, status: dataset === 'profiles' ? status || undefined : undefined }),
    [search, gender, status, dataset]
  );
  const activeColumns = columns[dataset];

  const load = useCallback(async () => {
    if (!catalog || !activeColumns.length) return;
    setLoading(true);
    setError('');
    try {
      setPreview(
        await adminApi<Preview>('/api/admin/export/preview', {
          method: 'POST',
          body: JSON.stringify({ dataset, columns: activeColumns, filters, page, pageSize: PAGE_SIZE }),
        })
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [catalog, dataset, activeColumns, filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function switchDataset(d: Dataset) {
    setDataset(d);
    setSelected(new Set());
    setPage(1);
    setSearch('');
    setPreview(null);
  }

  const pageIds = preview?.rows.map((r) => r.id) ?? [];
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (pageAllSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function toggleColumn(key: string) {
    setColumns((prev) => {
      const list = prev[dataset];
      const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
      return { ...prev, [dataset]: next };
    });
  }

  function setGroup(keys: string[], on: boolean) {
    setColumns((prev) => {
      const list = prev[dataset].filter((k) => !keys.includes(k));
      return { ...prev, [dataset]: on ? [...list, ...keys] : list };
    });
  }

  const groups = useMemo(() => {
    const out: { group: string; cols: Column[] }[] = [];
    for (const c of catalog?.columns[dataset] ?? []) {
      const g = out.find((x) => x.group === c.group);
      if (g) g.cols.push(c);
      else out.push({ group: c.group, cols: [c] });
    }
    return out;
  }, [catalog, dataset]);

  const rowCount = selected.size || preview?.total || 0;

  async function runExport() {
    if (!activeColumns.length) {
      setError('Pick at least one column.');
      return;
    }
    setExporting(true);
    setError('');
    setNotice('');
    try {
      await exportBiodata({
        dataset,
        format,
        layout,
        columns: activeColumns,
        ids: [...selected],
        filters,
      });
      setNotice(`Downloaded ${rowCount} record${rowCount === 1 ? '' : 's'} as ${format.toUpperCase()}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminShell title="Export Biodata" description="Select rows and columns, then export to Excel, PDF or CSV" permission="export.data">
      <ErrorNote message={error} />
      {notice && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-[#e3f4ea] px-3 py-2.5 font-body text-label-md text-[#1b6b3a]">
          <Icon name="download_done" className="text-[16px]" />
          {notice}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Dataset>
          value={dataset}
          onChange={switchDataset}
          tabs={[
            { value: 'profiles', label: 'Directory profiles' },
            { value: 'members', label: 'Registered members' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          {dataset === 'profiles' && (
            <>
              <select
                value={gender}
                onChange={(e) => {
                  setPage(1);
                  setGender(e.target.value);
                }}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body text-body-md focus:border-secondary focus:outline-none"
              >
                <option value="">All genders</option>
                <option value="female">Brides</option>
                <option value="male">Grooms</option>
              </select>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body text-body-md focus:border-secondary focus:outline-none"
              >
                <option value="">Any status</option>
                <option value="approved">Live</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </>
          )}
          <SearchBox
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder={dataset === 'members' ? 'Search name or email…' : 'Search name or city…'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Data table */}
        <Panel
          title={preview ? `${preview.total} biodata record${preview.total === 1 ? '' : 's'}` : 'Biodata'}
          actions={
            <div className="flex flex-wrap items-center gap-3 font-body text-label-md">
              <span className="text-on-surface-variant">
                {selected.size ? `${selected.size} selected` : 'None selected — all matching rows will export'}
              </span>
              {preview && preview.total > 0 && selected.size < preview.total && (
                <button onClick={() => setSelected(new Set(preview.allIds))} className="uppercase text-secondary hover:underline">
                  Select all {preview.total}
                </button>
              )}
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="uppercase text-on-surface-variant hover:text-error">
                  Clear
                </button>
              )}
            </div>
          }
        >
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/60">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={pageAllSelected}
                      onChange={togglePage}
                      className="h-4 w-4 accent-[#b02559]"
                    />
                  </th>
                  <th className="w-10 px-2" />
                  {preview?.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-left font-body text-label-md uppercase tracking-wide text-on-surface-variant">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(loading || !preview) && (
                  <tr>
                    <td colSpan={99} className="px-4 py-12 text-center font-body text-on-surface-variant">
                      {activeColumns.length ? 'Loading…' : 'Pick at least one column to see the data.'}
                    </td>
                  </tr>
                )}
                {!loading && preview?.rows.length === 0 && (
                  <tr>
                    <td colSpan={99} className="px-4 py-12 text-center font-body text-on-surface-variant">
                      No records match these filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  preview?.rows.map((r) => {
                    const on = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => toggleRow(r.id)}
                        className={`cursor-pointer border-b border-outline-variant/20 last:border-0 ${on ? 'bg-secondary-fixed/30' : 'hover:bg-surface-container-low/60'}`}
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={on}
                            onChange={() => toggleRow(r.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 accent-[#b02559]"
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          {r.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- mixed-origin photos
                            <img src={mediaUrl(r.photo)} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low">
                              <Icon name="person" className="text-[16px] text-on-surface-variant" />
                            </span>
                          )}
                        </td>
                        {r.values.map((v, i) => (
                          <td key={i} className="max-w-[260px] truncate whitespace-nowrap px-4 py-2.5 font-body text-body-md text-on-surface" title={v}>
                            {v || <span className="text-outline">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </TableWrap>
          {preview && <Pager page={page} total={preview.total} pageSize={PAGE_SIZE} onPage={setPage} busy={loading} />}
        </Panel>

        {/* Export settings */}
        <div className="flex flex-col gap-5 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Export">
            <div className="flex flex-col gap-4 p-5">
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    aria-pressed={format === f.value}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-colors ${
                      format === f.value ? 'border-secondary bg-secondary-fixed/40 text-secondary' : 'border-outline-variant/50 text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <Icon name={f.icon} className="text-[24px]" />
                    <span className="font-body text-label-lg">{f.label}</span>
                    <span className="font-body text-[10px] leading-tight opacity-80">{f.note}</span>
                  </button>
                ))}
              </div>

              {format === 'pdf' && (
                <div className="flex flex-col gap-2">
                  <p className="font-body text-label-md uppercase tracking-wide text-on-surface-variant">PDF layout</p>
                  {([
                    ['table', 'Table', 'All records in one landscape table'],
                    ['sheets', 'Biodata sheets', 'One branded page per person, with photo'],
                  ] as const).map(([v, label, note]) => (
                    <label
                      key={v}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border-[1.5px] px-3 py-2.5 ${
                        layout === v ? 'border-secondary bg-secondary-fixed/30' : 'border-outline-variant/60'
                      }`}
                    >
                      <input type="radio" name="layout" checked={layout === v} onChange={() => setLayout(v)} className="mt-1 accent-[#b02559]" />
                      <span>
                        <span className="block font-body text-body-md text-on-surface">{label}</span>
                        <span className="block font-body text-label-md text-on-surface-variant">{note}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-surface-container-low px-3 py-2.5 font-body text-label-md text-on-surface-variant">
                <strong className="text-on-surface">{rowCount}</strong> row{rowCount === 1 ? '' : 's'} ×{' '}
                <strong className="text-on-surface">{activeColumns.length}</strong> column{activeColumns.length === 1 ? '' : 's'}
                {format !== 'csv' && ' · with EverAfter branding'}
              </div>

              <button onClick={runExport} disabled={exporting || !activeColumns.length || !rowCount} className={`${btnPrimary} py-3`}>
                {exporting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary/40 border-t-on-secondary" />
                ) : (
                  <Icon name="download" className="text-[18px]" />
                )}
                {exporting ? 'Preparing file…' : `Export ${format.toUpperCase()}`}
              </button>
            </div>
          </Panel>

          <Panel
            title="Columns"
            actions={
              <div className="flex gap-3 font-body text-label-md uppercase">
                <button onClick={() => setColumns((p) => ({ ...p, [dataset]: (catalog?.columns[dataset] ?? []).map((c) => c.key) }))} className="text-secondary hover:underline">
                  All
                </button>
                <button onClick={() => setColumns((p) => ({ ...p, [dataset]: catalog?.defaults[dataset] ?? [] }))} className="text-on-surface-variant hover:underline">
                  Default
                </button>
              </div>
            }
          >
            <div className="flex max-h-[520px] flex-col gap-4 overflow-y-auto p-5">
              {groups.map(({ group, cols }) => {
                const keys = cols.map((c) => c.key);
                const allOn = keys.every((k) => activeColumns.includes(k));
                return (
                  <div key={group}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="font-body text-label-md uppercase tracking-wide text-primary">{group}</p>
                      <button onClick={() => setGroup(keys, !allOn)} className="font-body text-[11px] uppercase text-secondary hover:underline">
                        {allOn ? 'None' : 'All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-1">
                      {cols.map((c) => (
                        <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-container-low">
                          <input
                            type="checkbox"
                            checked={activeColumns.includes(c.key)}
                            onChange={() => toggleColumn(c.key)}
                            className="h-4 w-4 accent-[#b02559]"
                          />
                          <span className="font-body text-body-md text-on-surface">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
