import { ADMIN_TOKEN_KEY, api, API_URL, getToken } from './api';

/** api() bound to the admin token — every admin screen goes through this. */
export function adminApi<T>(path: string, options: RequestInit = {}) {
  return api<T>(path, { ...options, auth: true, tokenKey: ADMIN_TOKEN_KEY });
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
