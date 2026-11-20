// Builds the app as one offline HTML file. Usage: node scripts/standalone.mjs [out]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBAPP = join(HERE, '..');
const DIST = join(WEBAPP, 'dist');
const OUT = resolve(process.argv[2] ?? join(WEBAPP, '..', 'docs', 'index.html'));

const node = (args, opts = {}) =>
  execFileSync(process.execPath, args, { cwd: WEBAPP, ...opts });

node([join(WEBAPP, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, PW_STANDALONE: '1' },
});

const html = readFileSync(join(DIST, 'index.html'), 'utf8');

const one = (re, what) => {
  const m = html.match(re);
  if (!m) throw new Error(`${what} nicht in dist/index.html gefunden`);
  return m;
};
const jsTag = one(/<script[^>]*src="\/([^"]+\.js)"[^>]*><\/script>/, 'Script-Tag');
const cssTag = one(/<link[^>]*href="\/([^"]+\.css)"[^>]*>/, 'Stylesheet-Tag');

const chunks = readdirSync(join(DIST, 'assets')).filter(f => f.endsWith('.js'));
if (chunks.length !== 1) {
  throw new Error(`Erwartet genau einen JS-Chunk, gefunden: ${chunks.join(', ')}`);
}

const dataUri = (path, mime) =>
  `data:${mime};base64,${readFileSync(path).toString('base64')}`;

const css = readFileSync(join(DIST, cssTag[1]), 'utf8').replace(
  /url\(["']?\/fonts\/([^"')]+)["']?\)/g,
  (_, file) => `url(${dataUri(join(DIST, 'fonts', file), 'font/woff2')})`
);

const logo = dataUri(join(DIST, 'pocketwatch.svg'), 'image/svg+xml');
let js = readFileSync(join(DIST, jsTag[1]), 'utf8');
if (!js.includes('/pocketwatch.svg')) throw new Error('Logo-Pfad nicht im Bundle gefunden');
js = js.replaceAll('/pocketwatch.svg', logo);

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

const safe = s => s.replaceAll('</script', '<\\/script');
const embedded = JSON.stringify(demo).replaceAll('<', '\\u003c');

const shim = `<script>
(function () {
  var DEMO = ${embedded};
  var WEEK = 604800000;
  // Shift demo data by whole weeks so it stays current.
  var shift = Math.round((Date.now() - DEMO.builtAt) / WEEK) * WEEK;
  var times = DEMO.times.map(function (e) {
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
  navigator.sendBeacon = function () { return true; };

  console.info('pocketwatch demo - changes live in memory only and reset on reload. https://github.com/winnicodes/pocketwatch');
})();
</script>`;

const out = html
  .replace('<title>pocketwatch</title>', '<title>pocketwatch - Demo</title>')
  .replace(
    '</title>',
    '</title>\n  <meta name="description" content="pocketwatch - minimal, self-hosted time tracking for freelancers. Interactive demo, all data stays in your browser." />'
  )
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${logo}" type="image/svg+xml" />`)
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(cssTag[0], () => `<style>\n${css}\n</style>`)
  .replace(jsTag[0], () => `${shim}\n  <script type="module">\n${safe(js)}\n  </script>`);

writeFileSync(OUT, out);

const kb = n => `${(n / 1024).toFixed(0)} kB`;
console.log(
  `\n${times.length} Demo-Eintraege, ${kb(css.length)} CSS, ${kb(js.length)} JS\n` +
  `geschrieben nach ${OUT} (${kb(Buffer.byteLength(out))})`
);
