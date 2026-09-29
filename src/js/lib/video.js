// Loads the privacy-enhanced YouTube player only after the user asks for it.
export function initVideo(root = document) {
  for (const btn of root.querySelectorAll('[data-video-id]')) {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(btn.dataset.videoId)}?autoplay=1&rel=0`;
      iframe.title = btn.dataset.videoTitle || 'Video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.className = 'absolute inset-0 size-full';
      btn.replaceWith(iframe);
      iframe.focus();
    }, { once: true });
  }
}
