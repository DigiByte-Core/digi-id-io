<?php
// callback.php — verify the wallet callback (digiid-php)
require_once __DIR__ . '/DigiID.php';
$digiid = new DigiID();

// Wallets send JSON; manual signing tools send form fields.
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$address   = (string) ($input['address'] ?? '');
$signature = (string) ($input['signature'] ?? '');
$uri       = (string) ($input['uri'] ?? '');

$nonce = $digiid->extractNonce($uri);
$row = $db->prepare('SELECT session_id FROM digiid_nonces WHERE nonce = ? AND expires_at > ? AND address IS NULL');
$row->execute([$nonce, time()]);
$challenge = $row->fetch();

$expectedUri = $digiid->buildURI('https://www.example.com/digiid/callback.php', $nonce);

if (!$challenge || $uri !== $expectedUri
    || !$digiid->isMessageSignatureValidSafe($address, $signature, $uri)) {
    http_response_code(401);
    exit(json_encode(['error' => 'invalid or expired Digi-ID challenge']));
}

// Consume the nonce and attach the verified address to the waiting session.
$db->prepare('UPDATE digiid_nonces SET address = ? WHERE nonce = ?')->execute([$address, $nonce]);
echo json_encode(['message' => 'Digi-ID verified']);
