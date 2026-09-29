import { deriveAddress, deriveKey, mnemonicToSeed, signMessage, verifyMessage } from '../packages/digiid-core/src/index.ts';

// Prints a deterministic, verifiable example callback payload from the public test mnemonic.
const MNEMONIC = 'myth glimpse mystery abstract embark net faint hospital catch hint develop state';
const uri = process.argv[2] || 'digiid://digiid.digibyteprojects.com/callback?x=c6140375e5bae71e';
const key = deriveKey(mnemonicToSeed(MNEMONIC), uri);
const address = deriveAddress(key.publicKey!);
const signature = signMessage(uri, key.privateKey!);
console.log(JSON.stringify({ address, uri, signature, verified: verifyMessage(address, signature, uri) }, null, 2));
