import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { serve } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({ minify: false });

const tailwind = spawn('npx', ['tailwindcss', '-i', 'src/css/app.css', '-o', '_site/assets/css/site.css', '--watch'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
process.on('exit', () => tailwind.kill());

let timer;
let building = false;
let queued = false;
// Run one build at a time; overlapping builds each load Shiki's WASM and can exhaust its memory.
async function rebuild() {
  if (building) { queued = true; return; }
  building = true;
  try {
    await build({ clean: false, minify: false });
  } catch (err) {
    console.error(err.message);
  } finally {
    building = false;
    if (queued) { queued = false; rebuild(); }
  }
}

watch(path.join(ROOT, 'src'), { recursive: true }, (_event, file) => {
  if (!file || file.startsWith('css')) return;
  clearTimeout(timer);
  timer = setTimeout(rebuild, 150);
});

serve();
