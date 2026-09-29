<?php
// login.php — issue a challenge (digiid-php)
require_once __DIR__ . '/DigiID.php';
session_start();

$digiid = new DigiID();
$nonce  = $digiid->generateNonce();          // 32 hex chars from a CSPRNG

// Bind the nonce to this session with a short expiry (see "Nonces & replay").
$db->prepare('INSERT INTO digiid_nonces (nonce, session_id, expires_at) VALUES (?, ?, ?)')
   ->execute([$nonce, session_id(), time() + 90]);

$uri = $digiid->buildURI('https://www.example.com/digiid/callback.php', $nonce);
// Render $uri as a link and as a QR code (e.g. with endroid/qr-code).
