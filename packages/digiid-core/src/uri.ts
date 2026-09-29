export interface ParsedUri {
  host: string;
  path: string;
  nonce: string;
  unsecure: boolean;
}

export function buildUri({ callback, nonce, unsecure }: { callback: string; nonce: string; unsecure?: boolean }): string {
  const isHttp = /^http:\/\//i.test(callback);
  const target = callback.replace(/^https?:\/\//i, '');
  if (!target || target.includes('?') || target.includes('#')) throw new Error('callback must be host/path without query or fragment');
  if (!/^[0-9a-zA-Z_-]+$/.test(nonce)) throw new Error('nonce must be URL-safe');
  return `digiid://${target}?x=${nonce}${unsecure || isHttp ? '&u=1' : ''}`;
}

export function parseUri(uri: string): ParsedUri | null {
  if (typeof uri !== 'string' || !uri.startsWith('digiid://')) return null;
  let url: URL;
  try {
    url = new URL('https://' + uri.slice('digiid://'.length));
  } catch {
    return null;
  }
  const nonce = url.searchParams.get('x');
  if (!nonce) return null;
  return { host: url.host, path: url.pathname, nonce, unsecure: url.searchParams.get('u') === '1' };
}

// Wallets derive the per-site key from this URL, so one stable callback URL per site keeps user identities stable.
export function callbackUrlFromUri(uri: string): string {
  const parsed = parseUri(uri);
  if (!parsed) throw new Error('invalid digiid:// URI');
  return `${parsed.unsecure ? 'http' : 'https'}://${parsed.host}${parsed.path}`;
}
