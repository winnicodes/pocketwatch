<?php
header("Content-Type: application/json");

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

// JSON content type forces a CORS preflight (blocks form-based CSRF).
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    http_response_code(415);
    echo json_encode(["error" => "Content-Type must be application/json"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$file = $data['file'] ?? '';
$content = $data['data'] ?? null;

$allowed = ['times.json', 'config.json'];
if (!in_array($file, $allowed, true)) {
    http_response_code(403);
    echo json_encode(["error" => "File not allowed"]);
    exit;
}

if (!is_array($content)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing or malformed data"]);
    exit;
}

$dir = __DIR__ . '/../data';
$path = $dir . '/' . $file;

if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
}

$json = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    http_response_code(400);
    echo json_encode(["error" => "Data is not encodable as JSON"]);
    exit;
}

// Atomic write: temp file + rename.
$tmp = $path . '.' . getmypid() . '.tmp';
if (file_put_contents($tmp, $json) === false || !rename($tmp, $path)) {
    @unlink($tmp);
    http_response_code(500);
    echo json_encode(["error" => "Write failed - check permissions on the data directory"]);
    exit;
}

echo json_encode(["success" => true]);
