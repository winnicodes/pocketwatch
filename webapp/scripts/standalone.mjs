// Baut die echte App zu einer einzigen, offline lauffaehigen HTML-Datei:
// node scripts/standalone.mjs [zielpfad]
//
// Zweck: Demo fuer README, Praesentation und Werbung. Ein Doppelklick, kein
// Server, kein Docker, kein Netz. Die Datei zeigt immer den aktuellen Stand
// der App - sie wird gebaut, nicht nachgebaut.
//
// Damit das ohne Backend laeuft, wird der Bundle-Datei ein Shim vorangestellt,
// der /api/read.php, /api/write.php und /locales/*.json aus eingebetteten
// Daten bedient. Geschrieben wird nichts: Aenderungen leben im Speicher und
// sind nach einem Neuladen wieder weg. Genau das soll eine Demo tun.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBAPP = join(HERE, '..');
const DIST = join(WEBAPP, 'dist');
const OUT = resolve(process.argv[2] ?? join(WEBAPP, '..', 'Pocketwatch-standalone.html'));

const node = (args, opts = {}) =>
  execFileSync(process.execPath, args, { cwd: WEBAPP, ...opts });

// --- 1. Bauen -------------------------------------------------------------
// Direkt ueber vite statt "npm run build": spart den Typecheck, den die Demo
// nicht braucht, und kommt ohne Shell aus (npm.cmd vs npm).
node([join(WEBAPP, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, PW_STANDALONE: '1' },
});

// --- 2. Bundle einsammeln -------------------------------------------------
const html = readFileSync(join(DIST, 'index.html'), 'utf8');

const one = (re, what) => {
  const m = html.match(re);
  if (!m) throw new Error(`${what} nicht in dist/index.html gefunden`);
  return m;
};
const jsTag = one(/<script[^>]*src="\/([^"]+\.js)"[^>]*><\/script>/, 'Script-Tag');
const cssTag = one(/<link[^>]*href="\/([^"]+\.css)"[^>]*>/, 'Stylesheet-Tag');

// Ein zweiter Chunk hiesse: ein Teil der App liegt ausserhalb dieser Datei und
// laedt spaeter ins Leere. Lieber der Bauabbruch als eine stille halbe Demo.
const chunks = readdirSync(join(DIST, 'assets')).filter(f => f.endsWith('.js'));
if (chunks.length !== 1) {
  throw new Error(`Erwartet genau einen JS-Chunk, gefunden: ${chunks.join(', ')}`);
}

const dataUri = (path, mime) =>
  `data:${mime};base64,${readFileSync(path).toString('base64')}`;

// Fonts liegen in public/ und werden von Vite nicht angefasst - die absoluten
// /fonts/-Pfade gaeben ueber file:// nichts her.
const css = readFileSync(join(DIST, cssTag[1]), 'utf8').replace(
  /url\(["']?\/fonts\/([^"')]+)["']?\)/g,
  (_, file) => `url(${dataUri(join(DIST, 'fonts', file), 'font/woff2')})`
);

const logo = dataUri(join(DIST, 'pocketwatch.svg'), 'image/svg+xml');
let js = readFileSync(join(DIST, jsTag[1]), 'utf8');
if (!js.includes('/pocketwatch.svg')) throw new Error('Logo-Pfad nicht im Bundle gefunden');
js = js.replaceAll('/pocketwatch.svg', logo);

// --- 3. Demodaten ---------------------------------------------------------
// Englisch, weil das README und die Zielgruppe der Demo englisch sind - die
// App selbst startet unveraendert auf Deutsch, das steht nur in dieser Datei.
const times = JSON.parse(node([join(HERE, 'demo-data.mjs'), '--stdout', '--weeks', '10', '--running', '--en'], {
  encoding: 'utf8',
}));

const locales = Object.fromEntries(
  ['de', 'en'].map(l => [l, JSON.parse(readFileSync(join(DIST, 'locales', `${l}.json`), 'utf8'))])
);

const demo = {
  builtAt: Date.now(),
  times,
  config: { name: 'Alex Weber', language: 'en', timeFormat: '24h' },
  locales,
};

// </script> im JSON oder im Bundle beendet sonst den Script-Block der Seite.
// "<\/" ist in JS-Strings wie in Regex-Literalen dasselbe Zeichen.
const safe = s => s.replaceAll('</script', '<\\/script');
const embedded = JSON.stringify(demo).replaceAll('<', '\\u003c');

const shim = `<script>
// Ersatz-Backend der Demo: liest aus eingebetteten Daten, schreibt ins Nichts.
(function () {
  var DEMO = ${embedded};
  var WEEK = 604800000;
  // Die Demodaten sind zum Bauzeitpunkt entstanden. Ohne Verschiebung waere
  // "Diese Woche" ein paar Monate spaeter leer und die Demo wirkte kaputt.
  // Volle Wochen, damit Wochentag und Uhrzeit jedes Eintrags erhalten bleiben.
  var shift = Math.round((Date.now() - DEMO.builtAt) / WEEK) * WEEK;
  var times = DEMO.times.map(function (e) {
    // Der laufende Eintrag wird nicht verschoben, sondern neu angesetzt -
    // sonst zeigt die Stoppuhr beim Oeffnen eine Laufzeit von Wochen.
    if (e.end === null) return Object.assign({}, e, { start: Date.now() - 2760000 });
    return Object.assign({}, e, { start: e.start + shift, end: e.end + shift });
  });

  var json = function (data) {
    return Promise.resolve(new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  };

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = String((input && input.url) || input);
    if (url.indexOf('/api/read.php') !== -1) {
      return json(/config\\.json/.test(url) ? DEMO.config : times);
    }
    if (url.indexOf('/api/write.php') !== -1) return json({ success: true });
    var locale = url.match(/\\/locales\\/(\\w+)\\.json/);
    if (locale) return json(DEMO.locales[locale[1]] || DEMO.locales.de);
    return realFetch(input, init);
  };
  // Beim Schliessen des Tabs speichert die App per Beacon - hier ins Leere.
  navigator.sendBeacon = function () { return true; };

  console.info('pocketwatch demo - changes live in memory only and reset on reload. https://github.com/winnicodes/pocketwatch');
})();
</script>`;

// --- 4. Eine Datei --------------------------------------------------------
const out = html
  .replace('<title>pocketwatch</title>', '<title>pocketwatch - Demo</title>')
  .replace(
    '</title>',
    '</title>\n  <meta name="description" content="pocketwatch - minimal, self-hosted time tracking for freelancers. Interactive demo, all data stays in your browser." />'
  )
  // Icon als Data-URI, Manifest raus: eine einzelne Datei hat kein /.
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${logo}" type="image/svg+xml" />`)
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  // Ersetzung als Funktion, nicht als String: minifiziertes JS enthaelt "$&"
  // und "$'", und die deutet String.replace sonst als Rueckverweise - das
  // Ergebnis war ein Script-Tag, das wieder auf die externe Datei zeigte.
  .replace(cssTag[0], () => `<style>\n${css}\n</style>`)
  .replace(jsTag[0], () => `${shim}\n  <script type="module">\n${safe(js)}\n  </script>`);

writeFileSync(OUT, out);

const kb = n => `${(n / 1024).toFixed(0)} kB`;
console.log(
  `\n${times.length} Demo-Eintraege, ${kb(css.length)} CSS, ${kb(js.length)} JS\n` +
  `geschrieben nach ${OUT} (${kb(Buffer.byteLength(out))})`
);
