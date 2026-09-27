const STORAGE_PREFIX = 'tabs:';

function select(tabset, tab, { focus = false, persist = true } = {}) {
  for (const t of tabset.tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
  const group = tabset.el.dataset.tabsGroup;
  if (group && persist) {
    try {
      localStorage.setItem(STORAGE_PREFIX + group, tab.dataset.tabKey);
    } catch {}
    for (const other of registry) {
      if (other !== tabset && other.el.dataset.tabsGroup === group) {
        const match = other.tabs.find((t) => t.dataset.tabKey === tab.dataset.tabKey);
        if (match) select(other, match, { persist: false });
      }
    }
  }
}

const registry = [];

// Panels stay visible in the HTML so content is readable without JavaScript; hiding happens here.
export function initTabs(root = document) {
  for (const el of root.querySelectorAll('[data-tabs]')) {
    const tabs = [...el.querySelectorAll('[role="tab"]')].filter((t) => t.closest('[data-tabs]') === el);
    if (!tabs.length) continue;
    const tabset = { el, tabs };
    registry.push(tabset);

    let initial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    const group = el.dataset.tabsGroup;
    if (group) {
      try {
        const key = localStorage.getItem(STORAGE_PREFIX + group);
        initial = tabs.find((t) => t.dataset.tabKey === key) || initial;
      } catch {}
    }
    select(tabset, initial, { persist: false });
    el.setAttribute('data-tabs-ready', '');

    el.addEventListener('click', (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab && tabs.includes(tab)) select(tabset, tab);
    });
    el.addEventListener('keydown', (e) => {
      const index = tabs.indexOf(document.activeElement);
      if (index === -1) return;
      const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select(tabset, tabs[(keys[e.key] + tabs.length) % tabs.length], { focus: true });
    });
  }
}
