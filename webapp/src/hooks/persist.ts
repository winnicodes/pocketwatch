// Ohne Debounce schickt jeder Tastenanschlag im Taetigkeitsfeld die komplette
// times.json ans Backend - ohne Reihenfolgegarantie, eine verspaetete Antwort
// ueberschreibt dann neuere Daten.
const DELAY_MS = 500;

const timers: Record<string, number> = {};
const pending: Record<string, unknown> = {};

function flush(file: string, useBeacon = false) {
  if (!(file in pending)) return;

  const body = JSON.stringify({ file, data: pending[file] });
  delete pending[file];
  clearTimeout(timers[file]);

  if (useBeacon) {
    // Beim Schliessen des Tabs ueberlebt fetch() nicht mehr zuverlaessig.
    navigator.sendBeacon("/api/write.php", new Blob([body], { type: "application/json" }));
    return;
  }

  fetch("/api/write.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  })
    .then(res => {
      // Nicht stillschweigend schlucken - sonst sieht ein Schreibfehler
      // (z.B. fehlende Rechte auf data/) fuer den Nutzer wie Erfolg aus.
      if (!res.ok) console.error(`Speichern von ${file} fehlgeschlagen: HTTP ${res.status}`);
    })
    .catch(err => console.error(`Speichern von ${file} fehlgeschlagen:`, err));
}

export function save(file: string, data: unknown) {
  pending[file] = data;
  clearTimeout(timers[file]);
  timers[file] = window.setTimeout(() => flush(file), DELAY_MS);
}

// Ausstehende Aenderungen nicht verlieren, wenn der Tab zugeht.
window.addEventListener("pagehide", () => {
  for (const file of Object.keys(pending)) flush(file, true);
});
