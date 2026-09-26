import { checkItem } from './lib/dom.js';

const EXAMPLE = {
  uri: 'digiid://digiid.digibyteprojects.com/callback?x=c6140375e5bae71e',
  address: 'DJDAkjie6nrW6RpFZSTpNUXsZ9JE2x6p1o',
  signature: 'H3tlK3RciMR60PuE0jE6JuClqgh+E8MmMz+n+4+P7FAIVuUccs+npnIa6Gz8XAJeOilTWpLNbomXtVDe4gR0CNk=',
  callback: 'https://digiid.digibyteprojects.com/callback'
};

async function run(form, output) {
  // Crypto code is only needed once someone verifies, so keep it off the initial page load.
  const { decodeAddress, parseUri, verifyCallback, verifyMessage } = await import('digiid-core');
  const data = Object.fromEntries(new FormData(form).entries());
  const uri = String(data.uri || '').trim();
  const address = String(data.address || '').trim();
  const signature = String(data.signature || '').trim();
  const callback = String(data.callback || '').trim();

  const list = document.createElement('ul');
  list.className = 'mt-2 space-y-2';
  const parsed = parseUri(uri);
  list.append(checkItem('Valid digiid:// challenge URI', parsed ? 'pass' : 'fail', parsed ? `host ${parsed.host}, path ${parsed.path}, nonce ${parsed.nonce}` : 'Expected digiid://host/path?x=NONCE'));
  if (parsed) {
    list.append(checkItem(parsed.unsecure ? 'Unsecure callback (u=1)' : 'HTTPS callback', parsed.unsecure ? 'warn' : 'pass', parsed.unsecure ? 'Only acceptable during local development.' : ''));
  }
  const addressOk = !!decodeAddress(address);
  list.append(checkItem('DigiByte address', addressOk ? 'pass' : 'fail', addressOk ? '' : 'Expected a base58check P2PKH address starting with D.'));
  const sigOk = addressOk && verifyMessage(address, signature, uri);
  list.append(checkItem('Signature matches address and URI', sigOk ? 'pass' : 'fail', sigOk ? '' : 'The signature was not produced by this address over this exact URI.'));
  if (callback && parsed) {
    const result = verifyCallback({ address, uri, signature }, { callback, allowUnsecure: true });
    const matches = result.valid || result.reason !== 'uri_mismatch';
    list.append(checkItem('URI matches expected callback', matches ? 'pass' : 'fail', matches ? '' : `Signed for ${parsed.host}${parsed.path}, not ${callback}.`));
  }

  const allOk = [...list.children].every((li) => !li.querySelector('use[href$="circle-x"]'));
  const heading = document.createElement('p');
  heading.className = `font-medium ${allOk ? 'text-accent-strong dark:text-accent' : 'text-red-700 dark:text-red-300'}`;
  heading.textContent = allOk ? 'Valid Digi-ID callback' : 'Rejected';
  output.replaceChildren(heading, list);
}

for (const form of document.querySelectorAll('[data-playground]')) {
  const output = form.querySelector('[data-playground-result]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(form, output);
  });
  form.querySelector('[data-playground-example]')?.addEventListener('click', () => {
    for (const [name, value] of Object.entries(EXAMPLE)) form.elements.namedItem(name).value = value;
    run(form, output);
  });
}
