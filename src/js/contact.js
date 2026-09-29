import { announce } from './lib/copy.js';

// Submissions go straight from the browser to Web3Forms, which emails them to the inbox tied to the (public) access key.
const ENDPOINT = 'https://api.web3forms.com/submit';

for (const form of document.querySelectorAll('[data-contact-form]')) {
  const button = form.querySelector('[data-contact-submit]');
  const status = form.querySelector('[data-contact-status]');
  const label = button.querySelector('span');

  const setStatus = (message, kind) => {
    status.textContent = message;
    if (kind) status.dataset.kind = kind;
    else delete status.dataset.kind;
    if (message) announce(message);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.elements.namedItem('botcheck').checked) return;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    data.append('access_key', form.dataset.accessKey);
    data.append('subject', `[Digi-ID contact] ${data.get('interest') || 'General'} - ${data.get('name') || ''}`);
    data.append('from_name', 'Digi-ID website');
    data.append('replyto', String(data.get('email') || ''));

    button.disabled = true;
    label.textContent = 'Sending…';
    setStatus('', null);
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.success) {
        form.reset();
        setStatus('Thanks! Your message is on its way. A community member will reply soon.', 'ok');
      } else {
        setStatus(json.message || 'Something went wrong. Please try again in a moment.', 'error');
      }
    } catch {
      setStatus('Network error. Check your connection and try again, or use GitHub Discussions.', 'error');
    } finally {
      button.disabled = false;
      label.textContent = 'Send message';
    }
  });
}
