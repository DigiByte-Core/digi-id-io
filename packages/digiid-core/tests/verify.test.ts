import { describe, expect, it } from 'vitest';
import { base64 } from '@scure/base';
import {
  buildUri,
  deriveAddress,
  deriveKey,
  mnemonicToSeed,
  parseUri,
  signMessage,
  verifyCallback,
  verifyMessage
} from '../src/index.ts';

const MNEMONIC = 'myth glimpse mystery abstract embark net faint hospital catch hint develop state';
const CALLBACK = 'https://www.example.com/digiid/callback';

function signedPayload(uri = buildUri({ callback: CALLBACK, nonce: 'c6140375e5bae71e' })) {
  const key = deriveKey(mnemonicToSeed(MNEMONIC), uri);
  return { address: deriveAddress(key.publicKey!), uri, signature: signMessage(uri, key.privateKey!) };
}

describe('URI', () => {
  it('builds and parses secure URIs', () => {
    const uri = buildUri({ callback: CALLBACK, nonce: 'abc123' });
    expect(uri).toBe('digiid://www.example.com/digiid/callback?x=abc123');
    expect(parseUri(uri)).toMatchObject({ host: 'www.example.com', path: '/digiid/callback', nonce: 'abc123', unsecure: false });
  });

  it('marks http callbacks with u=1', () => {
    const uri = buildUri({ callback: 'http://localhost:3000/cb', nonce: 'n1' });
    expect(uri).toBe('digiid://localhost:3000/cb?x=n1&u=1');
    expect(parseUri(uri)?.unsecure).toBe(true);
  });

  it('rejects non-digiid schemes and missing nonces', () => {
    expect(parseUri('https://www.example.com/cb?x=1')).toBeNull();
    expect(parseUri('digiid://www.example.com/cb')).toBeNull();
  });
});

describe('message signatures', () => {
  it('round-trips sign and verify', () => {
    const { address, uri, signature } = signedPayload();
    expect(base64.decode(signature)).toHaveLength(65);
    expect(verifyMessage(address, signature, uri)).toBe(true);
  });

  it('rejects a tampered message', () => {
    const { address, uri, signature } = signedPayload();
    expect(verifyMessage(address, signature, uri + 'x')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const { address, uri, signature } = signedPayload();
    const bytes = base64.decode(signature);
    bytes[40] ^= 0xff;
    expect(verifyMessage(address, base64.encode(bytes), uri)).toBe(false);
  });

  it('rejects a signature over a different message prefix', () => {
    const { address, uri } = signedPayload();
    const key = deriveKey(mnemonicToSeed(MNEMONIC), uri);
    const bitcoinStyle = signMessage(uri, key.privateKey!, { prefix: '\x18Bitcoin Signed Message:\n' });
    expect(verifyMessage(address, bitcoinStyle, uri)).toBe(false);
  });

  it('rejects a non-DigiByte address and malformed input without throwing', () => {
    const { uri, signature } = signedPayload();
    expect(verifyMessage('1BoatSLRHtKNngkdXEeobR76b53LETtpyT', signature, uri)).toBe(false);
    expect(verifyMessage('not-an-address', signature, uri)).toBe(false);
    expect(verifyMessage('DJDAkjie6nrW6RpFZSTpNUXsZ9JE2x6p1o', '%%%', uri)).toBe(false);
  });
});

describe('verifyCallback', () => {
  it('accepts a valid callback for the expected endpoint', () => {
    const payload = signedPayload();
    expect(verifyCallback(payload, { callback: CALLBACK })).toEqual({ valid: true, nonce: 'c6140375e5bae71e', address: payload.address });
  });

  it('rejects a URI for another endpoint', () => {
    const payload = signedPayload(buildUri({ callback: 'https://evil.example/digiid/callback', nonce: 'c6140375e5bae71e' }));
    expect(verifyCallback(payload, { callback: CALLBACK })).toMatchObject({ valid: false, reason: 'uri_mismatch' });
  });

  it('rejects unsecure (u=1) URIs unless explicitly allowed', () => {
    const uri = buildUri({ callback: 'http://www.example.com/digiid/callback', nonce: 'n1' });
    const payload = signedPayload(uri);
    expect(verifyCallback(payload, { callback: 'http://www.example.com/digiid/callback' })).toMatchObject({ valid: false, reason: 'unsecure' });
    expect(verifyCallback(payload, { callback: 'http://www.example.com/digiid/callback', allowUnsecure: true }).valid).toBe(true);
  });

  it('rejects a bad signature and missing fields', () => {
    const payload = signedPayload();
    expect(verifyCallback({ ...payload, address: 'DJDAkjie6nrW6RpFZSTpNUXsZ9JE2x6p1o' }, { callback: CALLBACK })).toMatchObject({ valid: false, reason: 'bad_signature' });
    expect(verifyCallback({ ...payload, signature: '' }, { callback: CALLBACK })).toMatchObject({ valid: false, reason: 'bad_request' });
  });
});
