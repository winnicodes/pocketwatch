<?php
// Same-origin only: keine CORS-Header, sonst kann jede fremde Seite die Zeitdaten ueberschreiben.
header("Content-Type: application/json");

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "POST required"]);
    exit;
}

// Blockt CSRF per HTML-Formular: Formulare koennen nur text/plain, multipart/form-data
// oder x-www-form-urlencoded senden, application/json erzwingt einen Preflight.
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

// Kaputter Body darf eine gute Datei nicht leeren.
if ($content === null) {
    http_response_code(400);
    echo json_encode(["error" => "Missing data"]);
    exit;
}

$dir = __DIR__ . '/../data';
$path = $dir . '/' . $file;

if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
}

// Temp + rename: ein Absturz mitten im Schreiben darf die alte Datei nicht zerstoeren.
$tmp = $path . '.tmp';
if (file_put_contents($tmp, json_encode($content, JSON_PRETTY_PRINT)) === false || !rename($tmp, $path)) {
    @unlink($tmp);
    http_response_code(500);
    echo json_encode(["error" => "Write failed - check permissions on the data directory"]);
    exit;
}

echo json_encode(["success" => true]);
