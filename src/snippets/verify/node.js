// server.js — verify the wallet callback (Express)
app.post('/digiid/callback', express.json(), express.urlencoded({ extended: false }), (req, res) => {
  const { address, uri, signature } = req.body;
  if (!address || !uri || !signature) return res.status(400).json({ error: 'missing fields' });

  const digiid = new DigiID({ address, uri, signature, callback: CALLBACK });
  const challenge = pending.get(digiid.nonce);

  if (!digiid.uriValid() || !challenge || challenge.expires < Date.now()) {
    return res.status(410).json({ error: 'unknown or expired challenge' });
  }
  if (!digiid.signatureValid()) return res.status(401).json({ error: 'invalid signature' });

  pending.delete(digiid.nonce);            // single use: a replay now fails
  sessions.login(challenge.sessionId, address); // address = the user's ID for your site
  res.json({ message: 'Digi-ID verified' });
});
