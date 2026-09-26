const STORAGE_KEY = 'theme';

function storedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function apply(theme, buttons) {
  document.documentElement.setAttribute('data-theme', theme);
  for (const btn of buttons) btn.setAttribute('aria-pressed', String(theme === 'dark'));
}

export function initTheme(root = document) {
  const buttons = [...root.querySelectorAll('[data-theme-toggle]')];
  const media = matchMedia('(prefers-color-scheme: dark)');
  apply(document.documentElement.getAttribute('data-theme') || 'light', buttons);

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      apply(next, buttons);
    });
  }

  media.addEventListener('change', (e) => {
    if (!storedTheme()) apply(e.matches ? 'dark' : 'light', buttons);
  });
}
