import { deriveAddress, deriveKey, derivationPath, signMessage } from 'digiid-core';

// Demo-only wallet: a random seed held in memory for this tab, never persisted and never user-supplied.
export function createSandboxWallet() {
  let seed = new Uint8Array(32);
  crypto.getRandomValues(seed);

  return {
    identityFor(uri) {
      const key = deriveKey(seed, uri);
      return { address: deriveAddress(key.publicKey), path: 'm/' + derivationPath(uri).map((i) => `${i - 0x80000000}'`).join('/') };
    },
    sign(uri) {
      return signMessage(uri, deriveKey(seed, uri).privateKey);
    },
    forget() {
      seed.fill(0);
      seed = null;
    }
  };
}
