import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data', 'ecosystem.json');
const SCHEMA = path.join(ROOT, 'src', 'data', 'ecosystem.schema.json');

if (!existsSync(DATA)) {
  console.log('lint:data skipped (src/data/ecosystem.json not present yet)');
  process.exit(0);
}

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(await readFile(SCHEMA, 'utf8')));
const entries = JSON.parse(await readFile(DATA, 'utf8'));
const errors = [];

if (!validate(entries)) {
  for (const e of validate.errors) errors.push(`${e.instancePath || '/'} ${e.message}`);
}

const ids = new Set();
for (const entry of Array.isArray(entries) ? entries : []) {
  if (ids.has(entry.id)) errors.push(`duplicate id "${entry.id}"`);
  ids.add(entry.id);
  if (entry.logo && !existsSync(path.join(ROOT, entry.logo))) errors.push(`${entry.id}: logo file not found (${entry.logo})`);
  else if (entry.logo && statSync(path.join(ROOT, entry.logo)).size > 50 * 1024) errors.push(`${entry.id}: logo is larger than 50 KB`);
}

if (errors.length) {
  console.error('ecosystem.json is invalid:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`ecosystem.json OK (${entries.length} entries)`);
