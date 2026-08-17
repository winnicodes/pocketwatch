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

// Kaputter Body darf eine gute Datei nicht leeren. Der Typ wird mitgeprueft:
// ein Skalar waere gueltiges JSON, aber times.json enthaelt danach einen String,
// den der Client beim naechsten Lesen als "leer" liest.
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

// Ungueltiges UTF-8 laesst json_encode false zurueckgeben. file_put_contents
// schriebe daraus einen leeren String und meldete 0 statt false - die alte
// Datei waere weg, die Antwort trotzdem "success".
$json = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    http_response_code(400);
    echo json_encode(["error" => "Data is not encodable as JSON"]);
    exit;
}

// Temp + rename: ein Absturz mitten im Schreiben darf die alte Datei nicht zerstoeren.
// Der Temp-Pfad haengt an der Prozess-ID: bei einem gemeinsamen schreiben zwei
// parallele php-fpm-Worker ineinander, und das Ergebnis wird sauber atomar an
// die richtige Stelle geschoben.
$tmp = $path . '.' . getmypid() . '.tmp';
if (file_put_contents($tmp, $json) === false || !rename($tmp, $path)) {
    @unlink($tmp);
    http_response_code(500);
    echo json_encode(["error" => "Write failed - check permissions on the data directory"]);
    exit;
}

echo json_encode(["success" => true]);
