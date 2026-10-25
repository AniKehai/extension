# Development

Set up, run, test. Pick **Docker** (same environment as CI) or **manual**.

## Option A: Docker (recommended)

You need [Docker](https://www.docker.com/products/docker-desktop/) (Windows: WSL 2 backend) and Git.

```bash
git clone https://github.com/<you>/AniKehai.git
cd AniKehai
bun run docker:dev            # Chrome dev server (no Bun yet? docker compose up --build dev)
```

Also available: `docker:dev:firefox` and `docker:dev:edge`. The first run is slow because it builds the image.

The container cannot open a browser, so load the build yourself from `.output/`:

- **Chrome / Edge:** `chrome://extensions` (or `edge://extensions`), turn on Developer mode, **Load unpacked**, pick `.output/chrome-mv3-dev` (Edge: the `edge-mv3-dev` folder).
- **Firefox:** `about:debugging#/runtime/this-firefox`, **Load Temporary Add-on**, pick `manifest.json` inside the `.output/firefox-*-dev` folder.

Saving a file reloads the extension. On Linux, run `export HOST_UID=$(id -u) HOST_GID=$(id -g)` first so files are not owned by root (or copy `.env.example` to `.env`).

| Command                 | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `bun run docker:shell`  | Shell inside the container                    |
| `bun run docker:lint`   | Biome + typecheck                             |
| `bun run docker:test`   | Unit tests with coverage                      |
| `bun run docker:e2e`    | Build, then Chromium E2E tests                |
| `bun run docker:health` | Live site selector checks                     |
| `bun run docker:build`  | Chrome, Firefox and Edge zips into `.output/` |
| `bun run docker:ci`     | **Everything CI does.** Run this before a PR. |
| `bun run docker:clean`  | Remove containers, volumes and images         |

## Option B: Manual

Install [Node.js](https://nodejs.org/) **>= 26**, [Bun](https://bun.sh/) **>= 1.4.3** (Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`) and Git.

```bash
bun install               # also runs `wxt prepare`
bunx lefthook install     # git hooks
bun run dev:chrome        # opens a browser with the extension loaded
```

Use `dev:firefox` or `dev:edge` for the others. If no browser opens, load `.output/chrome-mv3-dev` by hand as above.

## Try it

1. Click the extension icon, then **Link with Discord**.
2. Open an episode on a [supported site](https://anikehai.vercel.app/#sites).
3. Check your Discord status. To see what the extension reads, [turn on logs](./troubleshooting.md#how-to-turn-on-logs).

## Commands

| Command                                           | What it does                                                 |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `bun run dev:chrome` / `dev:firefox` / `dev:edge` | Dev server with hot reload                                   |
| `bun run build:<browser>` / `zip:<browser>`       | Production build / release zip (`chrome`, `firefox`, `edge`) |
| `bun run lint` / `lint:fix`                       | Check / auto-fix style and lint                              |
| `bun run typecheck`                               | TypeScript check                                             |
| `bun run test` / `test:watch` / `test:coverage`   | Unit tests (coverage enforces the minimums)                  |
| `bun run test:e2e:install`                        | One time: install Playwright's Chromium                      |
| `bun run test:e2e`                                | Build, then run E2E tests                                    |
| `bun run test:health`                             | Check the live sites' selectors (needs internet)             |
| `bun run validate`                                | `lint` + `typecheck` + `test`                                |

## Tests

Everything lives in `tests/` and mirrors `src/`.

| Kind                 | Where                                                                                                       | Tool                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Unit and popup tests | `tests/core`, `tests/scraper`, `tests/shared`, `tests/entrypoints`, `tests/popup`, `tests/manifest.test.ts` | Vitest + happy-dom                                                                                                             |
| E2E                  | `tests/e2e/`                                                                                                | Playwright with the built extension. Discord hosts are mapped to localhost, so the popup shows "Connecting". That is expected. |
| Live health          | `tests/health/`                                                                                             | Playwright against the real sites (Sunday and Wednesday in CI). A Cloudflare block is skipped, not failed.                     |

Run one file: `bunx vitest run tests/scraper/sites/hianime.test.ts`. Run by name: `bunx vitest run -t "paused"`.

Good to know:
- `tests/setup.ts` resets WXT's `fakeBrowser` (storage, tabs, runtime) before every test, so just use `browser.storage.local.set(...)`.
- Mocks and stubbed globals reset automatically.
- Helpers: `tests/helpers/dom.ts` (`setBody`, `setHead`, `visit`, `loadFixture`, `mockVideo`), `fake-websocket.ts` (fake Discord gateway), `status.ts` (popup status objects).
- Timers: `vi.useFakeTimers()`. Module-level caches: `vi.resetModules()` then `await import(...)` in `beforeEach`.
- Query the popup by role or label, not by CSS class.
- Keep tests offline and deterministic.

When a live health check fails, a site changed its HTML: fix the selector in the strategy, refresh its fixture, and re-run the unit tests.
