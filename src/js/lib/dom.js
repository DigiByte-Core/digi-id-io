const SVG_NS = 'http://www.w3.org/2000/svg';
// Resolved from the bundle location so it also works when the site is served from a subpath.
const SPRITE = new URL('../icons.svg', import.meta.url).pathname;

export function iconEl(name, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#${name}`);
  svg.append(use);
  return svg;
}

// Icons referenced here are added to the sprite by the build: icons.svg#circle-check icons.svg#circle-x icons.svg#triangle-alert
export function checkItem(label, state, detail) {
  const li = document.createElement('li');
  li.className = 'flex gap-2';
  const name = state === 'pass' ? 'circle-check' : state === 'warn' ? 'triangle-alert' : 'circle-x';
  const color = state === 'pass' ? 'text-accent-strong dark:text-accent' : state === 'warn' ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300';
  li.append(iconEl(name, `mt-0.5 ${color}`));
  const text = document.createElement('span');
  const strong = document.createElement('strong');
  strong.className = 'font-medium text-navy dark:text-white';
  strong.textContent = label;
  text.append(strong);
  if (detail) {
    const small = document.createElement('span');
    small.className = 'block break-all text-slate-600 dark:text-slate-400';
    small.textContent = detail;
    text.append(small);
  }
  li.append(text);
  return li;
}
