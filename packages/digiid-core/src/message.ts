import { sha256 } from '@noble/hashes/sha2.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { base64 } from '@scure/base';
import { decodeAddress, deriveAddress } from './address.ts';
import { parseUri } from './uri.ts';

export const DIGIBYTE_MESSAGE_PREFIX = '\x19DigiByte Signed Message:\n';

function varint(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8);
  const out = new Uint8Array(5);
  out[0] = 0xfe;
  new DataView(out.buffer).setUint32(1, n, true);
  return out;
}

export function messageHash(message: string, prefix = DIGIBYTE_MESSAGE_PREFIX): Uint8Array {
  const enc = new TextEncoder();
  const prefixBytes = enc.encode(prefix);
  const body = enc.encode(message);
  const len = varint(body.length);
  const data = new Uint8Array(prefixBytes.length + len.length + body.length);
  data.set(prefixBytes, 0);
  data.set(len, prefixBytes.length);
  data.set(body, prefixBytes.length + len.length);
  return sha256(sha256(data));
}

export function signMessage(message: string, privateKey: Uint8Array, { prefix = DIGIBYTE_MESSAGE_PREFIX, compressed = true } = {}): string {
  const recovered = secp256k1.sign(messageHash(message, prefix), privateKey, { prehash: false, format: 'recovered' });
  const sig = secp256k1.Signature.fromBytes(recovered, 'recovered');
  const out = new Uint8Array(65);
  out[0] = 27 + sig.recovery! + (compressed ? 4 : 0);
  out.set(sig.toBytes('compact'), 1);
  return base64.encode(out);
}

export function verifyMessage(address: string, signature: string, message: string): boolean {
  try {
    if (!decodeAddress(address)) return false;
    const bytes = base64.decode(signature);
    if (bytes.length !== 65) return false;
    const header = bytes[0] - 27;
    if (header < 0 || header > 7) return false;
    const compressed = (header & 4) !== 0;
    const point = secp256k1.Signature.fromBytes(bytes.slice(1), 'compact')
      .addRecoveryBit(header & 3)
      .recoverPublicKey(messageHash(message));
    return deriveAddress(point.toBytes(compressed)) === address;
  } catch {
    return false;
  }
}

export interface CallbackPayload {
  address?: unknown;
  uri?: unknown;
  signature?: unknown;
}

export type CallbackResult =
  | { valid: true; nonce: string; address: string }
  | { valid: false; reason: 'bad_request' | 'uri_mismatch' | 'unsecure' | 'bad_signature' };

export function verifyCallback(
  payload: CallbackPayload,
  { callback, allowUnsecure = false }: { callback: string; allowUnsecure?: boolean }
): CallbackResult {
  const { address, uri, signature } = payload;
  if (typeof address !== 'string' || typeof uri !== 'string' || typeof signature !== 'string' || !address || !uri || !signature) {
    return { valid: false, reason: 'bad_request' };
  }
  const parsed = parseUri(uri);
  if (!parsed) return { valid: false, reason: 'bad_request' };
  const expected = new URL(/^https?:\/\//i.test(callback) ? callback : 'https://' + callback);
  if (parsed.host !== expected.host || parsed.path !== expected.pathname) return { valid: false, reason: 'uri_mismatch' };
  if (parsed.unsecure && !allowUnsecure) return { valid: false, reason: 'unsecure' };
  if (!verifyMessage(address, signature, uri)) return { valid: false, reason: 'bad_signature' };
  return { valid: true, nonce: parsed.nonce, address };
}
