/** Browser-facing API base. Baked into the client bundle at build time. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Base URL for fetches made on the server (RSC, generateMetadata).
 *
 * In production the public URL points at Nginx, so a server-side fetch would
 * leave the box, terminate TLS and come back — slow, and it breaks before the
 * certificate exists. INTERNAL_API_URL lets the server talk to the API over
 * localhost instead. Falls back to the public URL when unset.
 */
export const SERVER_API_URL = process.env.INTERNAL_API_URL || API_URL;

export const TOKEN_KEY = 'everafter_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

type Options = RequestInit & { auth?: boolean };

/** Thin fetch wrapper that unwraps the API's `{ error }` envelope. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { auth, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

/**
 * Server-component fetch. Content endpoints are revalidated periodically;
 * anything list-like stays dynamic so filters always reflect the API.
 */
export async function serverApi<T>(path: string, revalidate: number | false = 60): Promise<T> {
  const res = await fetch(`${SERVER_API_URL}${path}`, {
    next: revalidate === false ? undefined : { revalidate },
    cache: revalidate === false ? 'no-store' : undefined,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`);
  return (await res.json()) as T;
}

export function buildQuery(params: Record<string, string | number | string[] | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' ) continue;
    if (Array.isArray(value)) {
      if (value.length) sp.set(key, value.join(','));
    } else {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Formats paise as rupees with Indian digit grouping (1,00,000).
 *
 * Deliberately hand-rolled rather than using Intl.NumberFormat: prices render
 * during SSR and again on the client, and Node's ICU build can disagree with
 * the browser's on currency symbol spacing, which surfaces as a hydration
 * mismatch. Plain string work is identical everywhere.
 */
export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100).toString();
  const last3 = rupees.slice(-3);
  const rest = rupees.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `₹${grouped}`;
}
