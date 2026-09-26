export function announce(message) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function initCopy(root = document) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const target = btn.dataset.copyTarget ? document.getElementById(btn.dataset.copyTarget) : btn.closest('[data-code-block]')?.querySelector('pre');
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.innerText.trimEnd());
      const original = btn.textContent;
      btn.textContent = 'Copied';
      announce('Copied to clipboard');
      setTimeout(() => {
        btn.textContent = original;
      }, 1600);
    } catch {
      announce('Copy failed. Select the text and copy it manually.');
    }
  });
}
