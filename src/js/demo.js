import { buildUri, createNonce, verifyCallback } from 'digiid-core';
import { createSandboxWallet } from './lib/sandbox-wallet.js';
import { announce } from './lib/copy.js';

const CALLBACK = 'https://www.digi-id.io/demo';
const TTL_MS = 90_000;

const root = document.querySelector('[data-demo]');
if (root) init(root);

function init(root) {
  const $ = (sel) => root.querySelector(sel);
  const els = {
    uri: $('[data-demo-uri]'),
    qr: $('[data-demo-qr]'),
    countdown: $('[data-demo-countdown]'),
    status: $('[data-demo-status]'),
    site: $('[data-demo-site]'),
    address: $('[data-demo-address]'),
    approve: $('[data-demo-approve]'),
    decline: $('[data-demo-decline]'),
    reset: $('[data-demo-reset]'),
    replay: $('[data-demo-replay]'),
    tamper: $('[data-demo-tamper]'),
    steps: [...root.querySelectorAll('[data-demo-step]')]
  };

  const wallet = createSandboxWallet();
  const usedNonces = new Set();
  let state;
  let timer;

  function setStep(n, detail) {
    const step = els.steps[n];
    step.dataset.done = '';
    step.querySelector('[data-detail]').textContent = detail;
  }

  function setStatus(kind, text) {
    els.status.dataset.kind = kind;
    els.status.textContent = text;
    announce(text);
  }

  function drawDecoy(nonce) {
    // Deterministic pattern from the nonce; no finder patterns, so it cannot be scanned as a QR code.
    els.qr.replaceChildren();
    for (let i = 0; i < 121; i++) {
      const cell = document.createElement('span');
      const byte = parseInt(nonce.slice((i * 2) % 32, ((i * 2) % 32) + 2), 16) ^ (i * 37);
      cell.className = byte & 1 ? 'bg-navy dark:bg-navy-950' : 'bg-transparent';
      els.qr.append(cell);
    }
  }

  function newChallenge() {
    clearInterval(timer);
    const nonce = createNonce();
    const uri = buildUri({ callback: CALLBACK, nonce });
    const identity = wallet.identityFor(uri);
    state = { nonce, uri, identity, expires: Date.now() + TTL_MS, phase: 'pending', payload: null };

    els.uri.textContent = uri;
    drawDecoy(nonce);
    els.site.textContent = new URL(CALLBACK).host;
    els.address.textContent = identity.address;
    els.approve.disabled = false;
    els.decline.disabled = false;
    els.replay.hidden = true;
    els.tamper.hidden = true;
    for (const step of els.steps) {
      delete step.dataset.done;
      step.querySelector('[data-detail]').textContent = step.dataset.pending;
    }
    setStep(0, `nonce ${nonce} · expires in 90 s · ${uri}`);
    setStatus('pending', 'Waiting for approval in the simulated wallet');
    tick();
    timer = setInterval(tick, 1000);
  }

  function tick() {
    const left = Math.max(0, Math.ceil((state.expires - Date.now()) / 1000));
    els.countdown.textContent = `${left}s`;
    if (left === 0 && state.phase === 'pending') {
      state.phase = 'expired';
      clearInterval(timer);
      els.approve.disabled = true;
      els.decline.disabled = true;
      setStatus('fail', 'Challenge expired. Generate a new one.');
    }
  }

  function verify(payload, label) {
    if (usedNonces.has(state.nonce)) {
      setStatus('fail', `${label}: rejected — nonce already used (replay blocked)`);
      setStep(3, 'replayed: the server deletes each nonce after first use');
      return;
    }
    if (Date.now() > state.expires) {
      setStatus('fail', `${label}: rejected — challenge expired`);
      return;
    }
    const result = verifyCallback(payload, { callback: CALLBACK });
    if (result.valid) {
      usedNonces.add(result.nonce);
      setStep(3, `verifyCallback() → valid · signed in as ${result.address}`);
      setStatus('ok', `Verified as ${result.address}`);
    } else {
      setStep(3, `verifyCallback() → ${result.reason}`);
      setStatus('fail', `${label}: rejected — ${result.reason.replace('_', ' ')}`);
    }
  }

  els.approve.addEventListener('click', () => {
    if (state.phase !== 'pending') return;
    state.phase = 'approved';
    clearInterval(timer);
    els.approve.disabled = true;
    els.decline.disabled = true;
    setStep(1, `derived ${state.identity.path} → ${state.identity.address}`);
    const signature = wallet.sign(state.uri);
    state.payload = { address: state.identity.address, uri: state.uri, signature };
    setStep(2, `POST ${CALLBACK} ${JSON.stringify(state.payload)}`);
    verify(state.payload, 'Sign-in');
    els.replay.hidden = false;
    els.tamper.hidden = false;
  });

  els.decline.addEventListener('click', () => {
    if (state.phase !== 'pending') return;
    state.phase = 'declined';
    clearInterval(timer);
    els.approve.disabled = true;
    els.decline.disabled = true;
    setStatus('fail', 'Declined in the wallet. Nothing was signed.');
  });

  els.replay.addEventListener('click', () => state.payload && verify(state.payload, 'Replay'));

  els.tamper.addEventListener('click', () => {
    if (!state.payload) return;
    const forged = { ...state.payload, uri: state.uri.replace(/x=[0-9a-f]+/, `x=${createNonce()}`) };
    const result = verifyCallback(forged, { callback: CALLBACK });
    setStep(3, `tampered nonce → ${result.valid ? 'valid' : result.reason}`);
    setStatus('fail', `Tampered request: rejected — ${result.valid ? 'unexpected' : result.reason.replace('_', ' ')}`);
  });

  els.reset.addEventListener('click', newChallenge);
  addEventListener('pagehide', (e) => {
    if (!e.persisted) wallet.forget();
  });

  root.dataset.ready = '';
  newChallenge();
}
