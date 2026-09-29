import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

async function resolveFile(urlPath) {
  let decoded = decodeURIComponent(urlPath.split('?')[0]);
  if (BASE_PATH) {
    if (decoded !== BASE_PATH && !decoded.startsWith(BASE_PATH + '/')) return null;
    decoded = decoded.slice(BASE_PATH.length) || '/';
  }
  const candidate = path.resolve(ROOT, '.' + decoded);
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) return null;
  try {
    const info = await stat(candidate);
    return info.isDirectory() ? path.join(candidate, 'index.html') : candidate;
  } catch {
    return null;
  }
}

export function serve(port = Number(process.env.PORT) || 8080) {
  const server = createServer(async (req, res) => {
    try {
      const file = await resolveFile(req.url || '/');
      const body = file ? await readFile(file).catch(() => null) : null;
      if (!body) {
        // Mirror GitHub Pages: unknown paths get the site's 404 page.
        const notFound = await readFile(path.join(ROOT, '404.html')).catch(() => 'Not found');
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFound);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
    }
  });
  server.listen(port, () => console.log(`Serving _site at http://localhost:${port}${BASE_PATH}/`));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  serve();
}
