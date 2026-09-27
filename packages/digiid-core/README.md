# digiid-core

Digi-ID passwordless authentication for JavaScript and TypeScript. Build `digiid://` challenges, derive per-site keys, sign like a wallet and verify wallet callbacks. Works in browsers and Node.js 20+, with no DigiByte node or network access required.

This is the code behind the [digi-id.io](https://www.digi-id.io) demo and signature playground, tested against the published Digi-ID derivation vector.

```sh
npm install digiid-core
```

## Verify a wallet callback (server)

```js
import { verifyCallback } from 'digiid-core';

app.post('/digiid/callback', express.json(), (req, res) => {
  const result = verifyCallback(req.body, { callback: 'https://www.example.com/digiid/callback' });
  if (!result.valid) return res.status(401).json({ error: result.reason });

  // result.nonce: look up the pending challenge, check it hasn't expired, then consume it.
  // result.address: the user's Digi-ID for your site.
  res.json({ message: 'Digi-ID verified' });
});
```

`verifyCallback` checks the URI scheme, host and path against your callback, rejects `u=1` (plain HTTP) unless `allowUnsecure: true`, and verifies the DigiByte message signature. Nonce storage, expiry and single use are up to your app. See [Nonces, timeouts and replay protection](https://www.digi-id.io/guides/nonce-replay.html).

## Issue a challenge

```js
import { buildUri, createNonce } from 'digiid-core';

const nonce = createNonce(); // 128-bit hex from crypto.getRandomValues
const uri = buildUri({ callback: 'https://www.example.com/digiid/callback', nonce });
// digiid://www.example.com/digiid/callback?x=…  -> show as a QR code and a link
```

## Wallet side

```js
import { deriveKey, deriveAddress, signMessage, mnemonicToSeed } from 'digiid-core';

const key = deriveKey(mnemonicToSeed(mnemonic), uri); // m/13'/A'/B'/C'/D' for this site
const address = deriveAddress(key.publicKey);
const signature = signMessage(uri, key.privateKey);
```

## API

| Function | Purpose |
| --- | --- |
| `buildUri({ callback, nonce, unsecure? })` | Create a `digiid://` challenge URI |
| `parseUri(uri)` | Parse a challenge into `{ host, path, nonce, unsecure }`, or `null` |
| `callbackUrlFromUri(uri)` | The callback URL wallets post to and derive keys from |
| `createNonce(bytes = 16)` | Random hex nonce |
| `derivationPath(uri, index = 0)` | BIP32 path numbers for a site |
| `deriveKey(seed, uri, index = 0)` | BIP32 `HDKey` for a site |
| `deriveAddress(publicKey)` | DigiByte P2PKH address (`D…`) |
| `mnemonicToSeed(mnemonic)` | BIP39 seed bytes |
| `signMessage(message, privateKey)` | Base64 DigiByte signed-message signature |
| `verifyMessage(address, signature, message)` | `true` if the signature matches |
| `verifyCallback(payload, { callback, allowUnsecure? })` | Full callback check with a reason on failure |

Built on the audited [@noble](https://paulmillr.com/noble/) and [@scure](https://github.com/paulmillr/scure-bip32) libraries. MIT licensed.
