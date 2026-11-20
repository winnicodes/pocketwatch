# pocketwatch: development

## Tech stack

React 19 · TypeScript · Tailwind CSS 4 · Vite 8 · date-fns · react-day-picker ·
jsPDF + jsPDF-AutoTable · PHP 8.5 (FPM) · Nginx · Alpine Linux

## Under the hood

- The app stores the data in `data/times.json` and `data/config.json`.
- Each write goes to a temporary file first. The app then renames the file.
- Writes are debounced. No data is lost when you close the tab.
- A running entry continues after a reload or on a different device.
- The history loads in parts. The totals count all matches, not only the visible rows.
- The container has Nginx and PHP-FPM on Alpine Linux.
- The fonts are in the container. There is no CDN and no telemetry.
- You can operate the app with the keyboard. Switches, lists and dialogs have ARIA roles.

## Project layout

```
pocketwatch/
├── webapp/                 # React frontend (Vite)
│   ├── src/
│   ├── public/
│   │   ├── api/            # PHP API (read.php / write.php)
│   │   ├── fonts/          # Instrument Sans / Space Mono (in the repository)
│   │   └── locales/        # de.json / en.json
│   ├── scripts/            # demo-data.mjs, standalone.mjs
│   ├── dist/               # build output (not in Git)
│   └── package.json
│
├── data/                   # persistent data (not in Git)
│   ├── times.json          # time entries
│   └── config.json         # settings
│
├── docs/                   # published with GitHub Pages
│   ├── index.html          # single-file demo (npm run standalone)
│   ├── dev.md              # this document
│   └── *.png               # screenshots for the README
│
├── dev/                    # start.ps1 / stop.ps1 (Docker helpers for Windows)
├── templates/              # Unraid Community Applications template
├── .github/workflows/      # image build and publish to ghcr.io
├── Dockerfile              # production container (Nginx + PHP + dist)
├── nginx.conf              # Nginx configuration
├── docker-compose.yaml     # the recommended way to start
└── README.md
```

## Local development

You need Node.js 22.12 or later.

```bash
cd webapp
npm ci
npm run dev
```

Vite serves <http://localhost:5173> with hot reload. You do not need a container. Vite
cannot run PHP, but `vite.config.ts` supplies `api/read.php` and `api/write.php` for
development. It uses the same `data/` folder as the container. In production, PHP is
authoritative.

More scripts:

```bash
npm test         # tests for the time validation (node:test, no extra dependencies)
npm run build    # typecheck (tsc) and production build into webapp/dist
npm run demo-data -- --running   # demo data in data/ (--force overwrites, --en for English)
npm run standalone               # single-file demo in docs/index.html
```

### Release

Push a version tag, for example `git tag v1.2.0 && git push origin v1.2.0`. GitHub Actions
builds the image and publishes it as `:1.2.0`, `:1.2` and `:latest` on ghcr.io.

## Docker

### Build the image yourself

The container compiles the frontend. You do not need Node.js on the host.

```bash
git clone https://github.com/winnicodes/pocketwatch.git
cd pocketwatch
docker compose up -d --build
```

The app writes the time entries to the `data/` folder next to `docker-compose.yaml`.

### Without docker-compose

Linux and macOS:

```bash
docker build -t pocketwatch-app .
docker run -d -p 8080:80 -v "$(pwd)/data:/var/www/html/data" --name pocketwatch pocketwatch-app
```

Windows (PowerShell):

```powershell
docker build -t pocketwatch-app .
docker run -d -p 8080:80 -v "${PWD}/data:/var/www/html/data" --name pocketwatch pocketwatch-app
```

> Docker does not accept a relative path such as `./data` for `-v`. Use `$(pwd)` or `${PWD}`.

The container corrects the permissions of `data/` at start. A folder that root made is not
a problem.

### PowerShell helpers

`dev/start.ps1` pulls the latest image and starts the container. `dev/stop.ps1` stops it.
