import { sha256 } from '@noble/hashes/sha2.js';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { callbackUrlFromUri } from './uri.ts';

const HARDENED = 0x80000000;
const DIGIID_PURPOSE = 13;

// SLIP-0013-style path: m/13'/A'/B'/C'/D' from sha256(index_le32 || callbackUrl).
export function derivationPath(uri: string, index = 0): number[] {
  const input = new TextEncoder().encode(callbackUrlFromUri(uri));
  const data = new Uint8Array(4 + input.length);
  new DataView(data.buffer).setUint32(0, index >>> 0, true);
  data.set(input, 4);
  const hash = sha256(data);
  const view = new DataView(hash.buffer, hash.byteOffset, 16);
  const parts = [0, 4, 8, 12].map((offset) => (view.getUint32(offset, true) | HARDENED) >>> 0);
  return [(DIGIID_PURPOSE | HARDENED) >>> 0, ...parts];
}

export function deriveKey(seed: Uint8Array, uri: string, index = 0): HDKey {
  return derivationPath(uri, index).reduce((key, i) => key.deriveChild(i), HDKey.fromMasterSeed(seed));
}

export function mnemonicToSeed(mnemonic: string): Uint8Array {
  return mnemonicToSeedSync(mnemonic);
}
