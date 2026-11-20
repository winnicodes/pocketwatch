<?php
header("Content-Type: application/json");
// No CORS headers: same-origin only.

$file = $_GET['file'] ?? '';

$allowed = ['times.json', 'config.json'];
if (!in_array($file, $allowed, true)) {
    http_response_code(403);
    echo json_encode(["error" => "File not allowed"]);
    exit;
}

$path = __DIR__ . '/../data/' . $file;

if (!file_exists($path)) {
    echo json_encode([]);
    exit;
}

echo file_get_contents($path);
