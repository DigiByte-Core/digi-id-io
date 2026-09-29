import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { createBase58check } from '@scure/base';

export const DIGIBYTE_P2PKH_VERSION = 0x1e;

const base58check = createBase58check(sha256);

export function deriveAddress(publicKey: Uint8Array): string {
  const payload = new Uint8Array(21);
  payload[0] = DIGIBYTE_P2PKH_VERSION;
  payload.set(ripemd160(sha256(publicKey)), 1);
  return base58check.encode(payload);
}

export function decodeAddress(address: string): Uint8Array | null {
  try {
    const payload = base58check.decode(address);
    return payload.length === 21 && payload[0] === DIGIBYTE_P2PKH_VERSION ? payload : null;
  } catch {
    return null;
  }
}
