import { readdirSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';

// Prints key Lighthouse metrics per URL (and to the GitHub job summary) so budget failures are diagnosable from CI logs.
const DIR = '.lighthouseci';
const reports = readdirSync(DIR).filter((f) => /^lhr-.*\.json$/.test(f)).map((f) => JSON.parse(readFileSync(path.join(DIR, f), 'utf8')));
const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'];

const rows = reports.map((r) => {
  const opportunities = Object.values(r.audits)
    .filter((a) => a.details?.type === 'opportunity' && a.numericValue > 0)
    .sort((a, b) => b.numericValue - a.numericValue)
    .slice(0, 3)
    .map((a) => `${a.id} (${Math.round(a.numericValue)} ms)`);
  const lcpNode = r.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? '';
  return [
    new URL(r.finalUrl).pathname,
    Math.round(r.categories.performance.score * 100),
    ...metrics.map((m) => r.audits[m]?.displayValue ?? ''),
    opportunities.join(', ') || '-',
    lcpNode.slice(0, 80)
  ];
});

const header = ['URL', 'Perf', 'FCP', 'LCP', 'SI', 'TBT', 'CLS', 'Top opportunities', 'LCP element'];
const table = [header, header.map(() => '---'), ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Lighthouse\n\n${table}\n`);
