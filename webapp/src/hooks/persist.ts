const DELAY_MS = 500;

const timers: Record<string, number> = {};
const pending: Record<string, unknown> = {};

export function reportStorageError(message: string, err?: unknown) {
  console.error(message, err ?? "");
  window.dispatchEvent(new CustomEvent("pw-storage-error"));
}

function flush(file: string, useBeacon = false) {
  if (!(file in pending)) return;

  const body = JSON.stringify({ file, data: pending[file] });
  delete pending[file];
  clearTimeout(timers[file]);

  if (useBeacon) {
    navigator.sendBeacon("/api/write.php", new Blob([body], { type: "application/json" }));
    return;
  }

  fetch("/api/write.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  })
    .then(res => {
      if (!res.ok) reportStorageError(`Speichern von ${file} fehlgeschlagen: HTTP ${res.status}`);
    })
    .catch(err => reportStorageError(`Speichern von ${file} fehlgeschlagen:`, err));
}

export function save(file: string, data: unknown) {
  pending[file] = data;
  clearTimeout(timers[file]);
  timers[file] = window.setTimeout(() => flush(file), DELAY_MS);
}

window.addEventListener("pagehide", () => {
  for (const file of Object.keys(pending)) flush(file, true);
});
