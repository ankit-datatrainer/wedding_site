import { ADMIN_TOKEN_KEY, api, API_URL, getToken } from './api';

/** api() bound to the admin token — every admin screen goes through this. */
export function adminApi<T>(path: string, options: RequestInit = {}) {
  return api<T>(path, { ...options, auth: true, tokenKey: ADMIN_TOKEN_KEY });
}

export type BiodataImportResult = {
  imported: { filename: string; profile: { id: string; name: string }; warnings: string[] }[];
  failures: { filename: string; error: string }[];
  summary: { total: number; imported: number; failed: number };
};

/**
 * Bulk-imports biodata PDFs as profiles.
 *
 * Resolves on a partial success (HTTP 207) as well as a full one — the caller
 * shows the per-file breakdown either way. Only a request that imported
 * nothing at all throws.
 */
export async function importBiodata(files: File[]): Promise<BiodataImportResult> {
  const token = getToken(ADMIN_TOKEN_KEY);
  const form = new FormData();
  for (const file of files) form.append('biodata', file);

  const res = await fetch(`${API_URL}/api/admin/profiles/import-biodata`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok && !data?.summary) {
    throw new Error(data?.error || `Import failed (${res.status})`);
  }
  return data as BiodataImportResult;
}

/** Streams a file response (CSV export) straight to a browser download. */
export async function adminDownload(path: string, filename: string) {
  const token = getToken(ADMIN_TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
