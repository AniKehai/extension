# Development

Set up, run, test.

## Setup

Install [Node.js](https://nodejs.org/) **>= 26**, [Bun](https://bun.sh/) **>= 1.4.3** (Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`) and Git.

```bash
git clone https://github.com/<you>/AniKehai.git
cd AniKehai
bun install               # also runs `wxt prepare`
bunx lefthook install     # git hooks
```

## Run

```bash
bun run dev:chrome        # opens a browser with the extension loaded
```

Use `dev:firefox` or `dev:edge` for the others. If no browser opens, load `.output/chrome-mv3-dev` by hand:

- **Chrome / Edge:** `chrome://extensions` (or `edge://extensions`), turn on Developer mode, **Load unpacked**, pick `.output/chrome-mv3-dev` (Edge: the `edge-mv3-dev` folder).
- **Firefox:** `about:debugging#/runtime/this-firefox`, **Load Temporary Add-on**, pick `manifest.json` inside the `.output/firefox-*-dev` folder.

Saving a file reloads the extension.

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
| `bun run validate`                                | `lint` + `typecheck`                                         |

## CI & Hooks

Lefthook (`bunx lefthook install`) runs on your machine; CI runs the same checks again.

| When         | What                                                       |
| ------------ | ---------------------------------------------------------- |
| `git commit` | Biome fix on staged files, typecheck, commit message check |
| `git push`   | (no pre-push hooks currently)                              |
| PR           | `ci.yml`: lint, typecheck, build (Chrome, Firefox, Edge)   |
| PR & weekly  | `security.yml`: `bun audit` and Gitleaks                   |

Please do not use `--no-verify`. CI will fail anyway.

## Releases (maintainers)

Bump `version` in `package.json` only (the build test checks the manifest matches). Push a tag `vX.Y.Z` that equals it, and `release.yml` builds the Chrome, Firefox and Edge zips and publishes the release.
