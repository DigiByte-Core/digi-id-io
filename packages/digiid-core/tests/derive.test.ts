import { describe, expect, it } from 'vitest';
import { callbackUrlFromUri, derivationPath, deriveAddress, deriveKey, mnemonicToSeed } from '../src/index.ts';

// Test vector published in the original digi-id.io integration guide.
const MNEMONIC = 'myth glimpse mystery abstract embark net faint hospital catch hint develop state';
const URI = 'digiid://digiid.digibyteprojects.com/callback?x=c6140375e5bae71e';

describe('HD derivation', () => {
  it('uses the callback URL (scheme + host + path, no query) as derivation input', () => {
    expect(callbackUrlFromUri(URI)).toBe('https://digiid.digibyteprojects.com/callback');
  });

  it('matches the published BIP32 path', () => {
    expect(derivationPath(URI)).toEqual([2147483661, 4256894534, 2168583965, 3241006598, 3925279480]);
  });

  it('matches the published Digi-ID address', () => {
    const key = deriveKey(mnemonicToSeed(MNEMONIC), URI);
    expect(deriveAddress(key.publicKey!)).toBe('DJDAkjie6nrW6RpFZSTpNUXsZ9JE2x6p1o');
  });

  it('derives the same identity for any nonce on the same callback', () => {
    const seed = mnemonicToSeed(MNEMONIC);
    const a = deriveAddress(deriveKey(seed, URI).publicKey!);
    const b = deriveAddress(deriveKey(seed, 'digiid://digiid.digibyteprojects.com/callback?x=00ff').publicKey!);
    expect(a).toBe(b);
  });

  it('derives a different identity for a different site', () => {
    const seed = mnemonicToSeed(MNEMONIC);
    const other = deriveAddress(deriveKey(seed, 'digiid://example.com/callback?x=c6140375e5bae71e').publicKey!);
    expect(other).not.toBe('DJDAkjie6nrW6RpFZSTpNUXsZ9JE2x6p1o');
  });
});
