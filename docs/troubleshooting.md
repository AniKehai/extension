# Troubleshooting

Still stuck? Ask on the [Discord server](https://discord.gg/w9Q7YUrzpn) or open a [bug report](https://github.com/minkxx/AniKehai/issues/new?template=bug_report.md).

## How to turn on logs

The extension is silent by default.

- **Chrome / Edge:** open `chrome://extensions` (or `edge://extensions`), turn on Developer mode, click **service worker** under AniKehai, and in the Console run `enable_logs = true`.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Inspect** next to AniKehai, and in the Console run `enable_logs = true`.

You will see `[INFO]`, `[WARN]` and `[ERROR]` lines, including the exact presence payload sent to Discord. The setting is saved; run `enable_logs = false` to stop. Content-script messages appear in DevTools (F12) on the streaming site's tab. Remove your token before pasting logs into a bug report.

## For users

| Symptom                                  | Likely cause and fix                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Popup asks to "Link with Discord" again  | The token expired or was rejected. Log in again.                                                                                       |
| Popup shows "Connecting" for a long time | Not connected to Discord's gateway. Check your internet or VPN/firewall (`gateway.discord.gg`), then log out and in.                   |
| Nothing on my Discord profile            | **Broadcast to Discord** must be on. Discord's own Activity Privacy must allow sharing. Use the Discord account you linked.            |
| Shows "Anime / Private Session"          | Privacy mode is on. Turn it off in settings.                                                                                           |
| No progress bar                          | The player's domain is missing from the strategy's `iframe_src`, or the video is paused. Report the site.                              |
| Wrong or missing cover                   | The site changed its HTML or blocks images. A default cover is the fallback. Report it.                                                |
| Status stays after closing the tab       | It clears after about 10 seconds without updates.                                                                                      |
| Works on one site but not another        | That site probably changed its HTML. Open a bug report.                                                                                |
| Login stuck on Android / Firefox / Edge  | Let the new tab finish: Discord redirects to a `127.0.0.1` page that the extension closes by itself. Try again if you closed it early. |

## For contributors

| Symptom                                         | Fix                                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Cannot find module '.wxt/tsconfig.json'`       | `bunx wxt prepare`                                                                                               |
| Install fails on the Node version               | Use Node >= 26 (the Docker image already does)                                                                   |
| Biome complains about everything                | `bun run lint:fix`. Check your editor uses LF endings and tabs.                                                  |
| Hooks do not run                                | `bunx lefthook install`                                                                                          |
| Commit rejected                                 | Use `type: message`, see [CONTRIBUTING](../.github/CONTRIBUTING.md#rules).                                       |
| Dev browser does not open                       | Load `.output/chrome-mv3-dev` by hand, see [Development](./development.md).                                      |
| Docker: files owned by root (Linux)             | `export HOST_UID=$(id -u) HOST_GID=$(id -g)` before running compose.                                             |
| Docker: port 3000 busy or stale dependencies    | `docker compose down`, or `bun run docker:clean` and rebuild.                                                    |
| E2E: "run `bun run build:chrome` first"         | Use `bun run test:e2e`, which builds first.                                                                      |
| E2E cannot find Chromium                        | `bun run test:e2e:install`                                                                                       |
| Coverage below the minimum                      | `bun run test:coverage`, open `coverage/index.html`, cover the red lines.                                        |
| Version test fails                              | The manifest version does not match `package.json`. Bump only `package.json`.                                    |
| `index.test.ts` count fails                     | You added or removed a site. Update the `toHaveLength(...)` number.                                              |
| "domain is shared" or "site and player" failure | Two strategies overlap. Use a more specific hostname.                                                            |
| Health check fails for one site                 | A selector probably broke. Fix the strategy and refresh the fixture. "Skipped" means Cloudflare blocked the run. |
| A test leaks state into another                 | `vi.resetModules()` for module-level caches; restore fake timers in `afterEach`.                                 |

## Debugging a site strategy

1. Open the episode page (F12) and test your selectors in the console.
2. Turn on logs and look for `DOM scraping error`.
3. Check that the **player iframe's** domain is in `iframe_src` (right-click the video, Inspect).
4. Make sure it is a _watch_ page. Strategies must return `null` elsewhere.
5. Update the fixture and run `bunx vitest run tests/scraper/sites/<site>.test.ts`.

## Debugging Discord

| Symptom             | Check                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Never reaches READY | Is there a valid `discord_token` in storage? Network or VPN? Logs show `[Gateway] Ready and authenticated!` when OK.   |
| Presence not shown  | Logs should show `Sending presence payload`. If not, nothing changed enough to update, or broadcasting is off.         |
| Cover missing       | Look for `[ExternalAssets] failed`. It falls back to `default_cover`.                                                  |
| Reconnect loop      | Look for `Reconnecting in Ns` (backoff up to 30 s). Close code `4004` refreshes the token and clears it if that fails. |

When you open an issue, include what you expected, what happened, OS and browser, extension version (bottom of the popup), the site URL and logs.
