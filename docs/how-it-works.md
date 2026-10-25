# How AniKehai Works

## The parts

| Part              | File                            | Job                                                                                                  |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Content script    | `src/entrypoints/content.ts`    | Runs in the streaming site **and** its player iframes. Reads the page and the video, sends messages. |
| Background worker | `src/entrypoints/background.ts` | Keeps the current state and the Discord connection.                                                  |
| Popup             | `src/entrypoints/popup/`        | React UI: login, settings, "now playing".                                                            |

```
 site tab:  main page ── content script ── INFO_UPDATE / STOPPED ──┐
            player iframe ─ content script ── TIME_UPDATE ─────────┤
                                                                   ▼
                                      background worker ── WebSocket ──▶ Discord Gateway
                                                                   ▲
                                      popup ── GET_STATUS, LOGIN, toggles
```

The video usually lives in an iframe on another domain, and a script in the main page cannot see inside it. So the content script runs in **both** (`allFrames: true`) and each copy reports what it can see.

## What happens when you watch an episode

1. **Content script.** It checks the hostname. A strategy's `domains` match means a site page (title, episode, cover). An `iframe_src` match means a player (video progress). An iframe is ignored unless its parent page is a supported site. Every 5 seconds (`CHECK_ACTIVITY_INTERVAL`) it sends:
   - site page: `INFO_UPDATE` (title, episode, episode name, cover), or `STOPPED` when title or episode is missing;
   - player: `TIME_UPDATE` (position, duration, paused).
2. **Strategy.** Each site has a file in `src/scraper/sites/` implementing `AnimeSite`: `domains`, `iframe_src`, `getAnimeMetadata()` and `getProgressStats()`. Most use `getStandardVideoStats()` (`src/scraper/parser.ts`), which reads the `<video>` and falls back to JW Player's on-screen time.
3. **Background.** It accepts messages **only from the active tab** and stores them in `currentAnimeState` (`src/core/state/playback.ts`). If updates stop for 10 seconds (`RESET_ACTIVITY_TIMEOUT`) it clears your status.
4. **Should Discord update?** `evaluateDiscordUpdate()` says yes only when something meaningful changed. Discord draws the progress bar from timestamps, so we do not send the time continuously.

   | Change                                               | Update? |
   | ---------------------------------------------------- | ------- |
   | Title, episode or cover changed                      | Yes     |
   | Paused or resumed                                    | Yes     |
   | Duration changed by more than 1 s                    | Yes     |
   | Playback drifted more than 2.5 s (seek or buffering) | Yes     |
   | Normal progress, or only the episode name changed    | No      |

5. **Discord.** `src/core/discord/gateway.ts` sends the presence over a WebSocket to `wss://gateway.discord.gg`. With Privacy on it sends "Anime / Private Session" instead of the real title.

## The Discord connection

- Connects, answers HELLO with heartbeats and IDENTIFY (`Bearer <token>`), and is "connected" after READY. An activity set before READY is cached and sent on READY.
- Unexpected close: reconnect with backoff (1 s, 2 s, 4 s ... up to 30 s). Logout never reconnects.
- Token problems: before connecting, a token that is missing or within 5 minutes of expiry is refreshed. Close code `4004` triggers a refresh; if that fails, or on an invalid session (op 9), the token is removed. When the token disappears (and you did not log out), the background opens the popup so you can log in again.
- Images (`src/core/discord/assets.ts`): the cover URL is registered with Discord as an external asset and cached; if that fails the app's `default_cover` is used. The play/pause icons are the app assets `play` and `pause`.
- Protected covers: AnimePahe hides images behind Cloudflare, so its strategy reads an AniList id from the page and sends `FETCH_ANILIST`. The background asks AniList (`src/core/anilist/api.ts`) and returns the public cover.

## Login

`src/core/discord/auth.ts` uses OAuth2 with PKCE (scope `openid sdk.social_layer_presence`), so your Discord password is never seen. A random verifier is hashed into a challenge, Discord returns a one-time code, and the code plus verifier is exchanged for tokens.

| Flow     | When                                                                              | How                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop  | Browser has the `identity` API (Chrome only, the manifest requests it only there) | `launchWebAuthFlow` handles the redirect                                                                                                             |
| Fallback | No`identity` API (Firefox, Edge, Kiwi)                                            | Opens a tab. Discord redirects to `http://127.0.0.1/discord-auth?code=...`, the background spots that URL, closes the tab and finishes the exchange. |

The access token is refreshed automatically, and simultaneous refreshes share one request.

## The popup

The popup cannot touch the Discord connection. It talks to the background through typed helpers in `src/entrypoints/popup/lib/runtime-messages.ts`, and the `useExtensionStatus` hook polls every 3 seconds. Toggles update instantly and roll back if the background call fails.

| Message                                 | From           | Effect                                                   |
| --------------------------------------- | -------------- | -------------------------------------------------------- |
| `GET_STATUS`                            | Popup          | Token, gateway state, toggles, current anime, auth error |
| `LOGIN_DISCORD` / `LOGOUT_DISCORD`      | Popup          | Start login / disconnect and remove tokens               |
| `SET_ACTIVITY_ENABLED`                  | Popup          | Broadcast on or off (off clears your status)             |
| `SET_PRIVACY_ENABLED`                   | Popup          | Hide the anime name                                      |
| `INFO_UPDATE`, `TIME_UPDATE`, `STOPPED` | Content script | Playback data                                            |
| `FETCH_ANILIST`                         | Content script | Get a cover from AniList                                 |

## Stored data (`browser.storage.local`)

| Key                                                                  | Meaning                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| `discord_token`, `discord_refresh_token`, `discord_token_expires_at` | Discord tokens. **Secret.** Only the background reads them. |
| `activity_enabled`, `privacy_enabled`                                | The two popup toggles                                       |
| `auth_error`                                                         | Last login error to show in the popup                       |
| `mobile_oauth_verifier`                                              | Temporary PKCE verifier during mobile login                 |
| `enable_logs`                                                        | Developer logging on or off                                 |

## Manifest and permissions

`wxt.config.ts` builds the manifest. `host_permissions` and the content-script matches are generated from the strategies (`extractMatches`), so adding a site allows its domains automatically. Discord (`discord.com`, `gateway.discord.gg`) is added too. Permissions: `storage`, `tabs`, `scripting`, plus `identity` on Chrome. Chrome pins a `key` so the extension id (and OAuth redirect) stays stable.

## Security in one minute

The extension holds a Discord token while running on untrusted sites. Content scripts never get the token. Scraped text is untrusted (React escapes it), and only known message types from the active tab are handled. Details and reporting: [SECURITY.md](../.github/SECURITY.md).

## Where things are

```
src/
  entrypoints/   background.ts, content.ts, popup/ (App, components/, hooks/, lib/)
  core/          anilist/, discord/ (auth, gateway, assets), state/playback.ts
  scraper/       extractor.ts, parser.ts, sites/ (one strategy per site + index.ts)
  shared/        constants.ts, logger.ts, types.ts
tests/           mirrors src/, plus e2e/, health/, fixtures/, helpers/, setup.ts
docker/, Dockerfile, docker-compose.yml, wxt.docker.config.ts    Docker setup
.github/         CI workflows, issue and PR templates, community files
```

Tunable values are in `src/shared/constants.ts`: `CHECK_ACTIVITY_INTERVAL` (5 s), `RESET_ACTIVITY_TIMEOUT` (10 s, must stay longer than the interval; a test enforces it), `APPLICATION_ID`, `DISCORD_SERVER_URL`.
