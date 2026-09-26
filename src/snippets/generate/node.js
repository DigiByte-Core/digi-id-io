// server.js — issue a challenge (Express)
import crypto from 'node:crypto';
import express from 'express';
import DigiID from 'digiid';

const CALLBACK = 'www.example.com/digiid/callback'; // host + path, no scheme
const pending = new Map(); // nonce -> { sessionId, expires, address }

const app = express();

app.post('/digiid/challenge', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  pending.set(nonce, { sessionId: req.sessionID, expires: Date.now() + 90_000 });
  const { uri } = new DigiID({ nonce, callback: CALLBACK });
  res.json({ uri, nonce }); // digiid://www.example.com/digiid/callback?x=…
});
