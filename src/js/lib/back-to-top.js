export function initBackToTop(root = document) {
  const link = root.querySelector('[data-back-to-top]');
  if (!link) return;

  const toggle = () => link.toggleAttribute('data-visible', scrollY > 600);
  addEventListener('scroll', toggle, { passive: true });
  toggle();

  link.addEventListener('click', (e) => {
    e.preventDefault();
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    // Move focus to the top so keyboard users continue from the start of the page.
    document.querySelector('.skip-link')?.focus({ preventScroll: true });
  });
}
