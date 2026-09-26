// Verify in the browser or any JS runtime with digiid-core (packages/digiid-core in the digi-id.io repo)
import { verifyCallback } from './digiid-core/src/index.ts';

const result = verifyCallback(
  { address, uri, signature },                          // POST body from the wallet
  { callback: 'https://www.example.com/digiid/callback' }
);

if (result.valid) {
  // result.nonce -> look up and consume the pending challenge
  // result.address -> the user's Digi-ID for your site
} else {
  console.warn('Rejected:', result.reason); // bad_request | uri_mismatch | unsecure | bad_signature
}
