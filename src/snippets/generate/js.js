// login.js — show the challenge in the browser
import QRCode from 'qrcode';

const { uri, nonce } = await fetch('/digiid/challenge', { method: 'POST' }).then((r) => r.json());

// Tappable on mobile (opens the wallet), scannable on desktop.
document.querySelector('#digiid-link').href = uri;
await QRCode.toCanvas(document.querySelector('#digiid-qr'), uri, { width: 240 });

// Wait for the wallet to call back, then continue the session.
const poll = setInterval(async () => {
  const { state } = await fetch(`/digiid/status?nonce=${nonce}`).then((r) => r.json());
  if (state === 'verified') {
    clearInterval(poll);
    location.assign('/account');
  }
}, 2000);
