import { ADMIN_TOKEN_KEY, api, API_URL, getToken } from './api';
import type { MatchCandidate, Profile, ProfileStatus } from './types';

/** api() bound to the admin token — every admin screen goes through this. */
export function adminApi<T>(path: string, options: RequestInit = {}) {
  return api<T>(path, { ...options, auth: true, tokenKey: ADMIN_TOKEN_KEY });
}

const authHeader = (): Record<string, string> => {
  const token = getToken(ADMIN_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type BiodataImportResult = {
  imported: {
    filename: string;
    profile: Profile;
    warnings: string[];
    matches: MatchCandidate[];
  }[];
  failures: { filename: string; error: string }[];
  summary: { total: number; imported: number; failed: number; status: ProfileStatus };
};

/**
 * Bulk-imports biodata PDFs as profiles.
 *
 * Resolves on a partial success (HTTP 207) as well as a full one — the caller
 * shows the per-file breakdown either way. Only a request that imported
 * nothing at all throws.
 */
export async function importBiodata(files: File[], status?: ProfileStatus): Promise<BiodataImportResult> {
  const form = new FormData();
  for (const file of files) form.append('biodata', file);
  if (status) form.append('status', status);

  const res = await fetch(`${API_URL}/api/admin/profiles/import-biodata`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok && !data?.summary) {
    throw new Error(data?.error || `Import failed (${res.status})`);
  }
  return data as BiodataImportResult;
}

export type ParsedBiodata = {
  profile: Partial<Profile>;
  missing: string[];
  warnings: string[];
};

/** Reads one biodata PDF into profile form values. Nothing is saved. */
export async function parseBiodataForAdmin(file: File): Promise<ParsedBiodata> {
  const form = new FormData();
  form.append('biodata', file);
  const res = await fetch(`${API_URL}/api/admin/profiles/parse-biodata`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Could not read that PDF (${res.status})`);
  return data as ParsedBiodata;
}

/** Uploads a directory-profile photo; resolves to its stored URL. */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`${API_URL}/api/admin/uploads/photo`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
  return data.url as string;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filenameFrom(res: Response, fallback: string) {
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  return match?.[1] || fallback;
}

/** Streams a file response (CSV export) straight to a browser download. */
export async function adminDownload(path: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  saveBlob(await res.blob(), filename);
}

export type ExportRequest = {
  dataset: 'members' | 'profiles';
  format: 'xlsx' | 'pdf' | 'csv';
  layout?: 'table' | 'sheets';
  columns: string[];
  ids: string[];
  filters?: { search?: string; gender?: string; status?: string };
};

/** Generates a branded export on the server and downloads it. */
export async function exportBiodata(request: ExportRequest) {
  const res = await fetch(`${API_URL}/api/admin/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Export failed (${res.status})`);
  }
  saveBlob(await res.blob(), filenameFrom(res, `everafter-${request.dataset}.${request.format}`));
}
