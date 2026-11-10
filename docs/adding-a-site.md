# Adding a Streaming Site

The most common contribution. Each site is a **strategy**: a small file that knows where the title, episode, cover and video are on that site. You touch about six files.

Before you start: check `src/scraper/sites/` and open issues so it is not already supported, [set up](./development.md), and open an episode page with DevTools (F12).

## 1. Find the domains

- **`domains`**: the site's own hostnames, including mirrors. Bare hostnames only: `example.com`, not `https://example.com/watch`. A subdomain also matches.
- **`iframe_src`**: the video player's hostname. In DevTools, find the `<iframe>` that contains the `<video>` and note its `src` host. Use `[]` if the video is on the main page.

The registry test enforces: bare hostnames, no duplicates inside a strategy, no domain shared by two strategies, and no site domain that is also a player domain.

## 2. Find the selectors

| Data                           | Needed? | Tip                                     |
| ------------------------------ | ------- | --------------------------------------- |
| Anime title                    | Yes     | Prefer stable classes or ids.           |
| Episode label ("Episode 3")    | Yes     |                                         |
| Episode name ("Killing Magic") | No      | Skip it when it only repeats the label. |
| Cover image URL                | No      | Return `null` if there is none.         |

Test in the DevTools console: `document.querySelector("h1.title")?.textContent`. Some sites keep the data in the page `<title>` or the URL instead: see `kaa.ts`, `reanime.ts` and `miruro.ts`.

## 3. Create the strategy

`src/scraper/sites/mysite.ts`:

```ts
import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

export const mysiteStrategy: AnimeSite = {
	domains: ["mysite.example"],
	iframe_src: ["player.example"],

	getAnimeMetadata: () => {
		const title = document.querySelector("h1.title")?.textContent?.trim();
		const episode = document
			.querySelector(".episode-label")
			?.textContent?.trim();
		const episodeName = document
			.querySelector(".ep-list .active .name")
			?.textContent?.trim();
		const cover = document.querySelector<HTMLImageElement>(".poster img")?.src;

		return {
			title: title ?? null,
			episode: episode ?? null,
			// skip names that just repeat the episode label
			episodeName: episodeName && episodeName !== episode ? episodeName : null,
			coverUrl: cover ?? null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
```

Rules:

- Off a watch page, return `null` for title and episode. The content script then sends `STOPPED`. If your selectors also match the home page, check `window.location.pathname` first (see `miruro.ts`).
- Never throw for a missing element. Use `?.` and return `null`.
- `getStandardVideoStats()` handles a normal `<video>` and JW Player. Only write your own `getProgressStats` for an unusual player (see `animex.ts`).
- Protected covers (Cloudflare): read the AniList id and ask the background with `FETCH_ANILIST`, as `animepahe.ts` does. If `og:image` already points to a public CDN, just use it (see `reanime.ts`).

## 4. Register it

In `src/scraper/sites/index.ts`, import it and add it to `strategies`. That is all the wiring: the content-script matches and manifest `host_permissions` are generated from this array.

## 5. Test manually

Run `bun run dev:chrome` (or `dev:firefox` / `dev:edge`), open an episode and check your Discord status. [Turn on logs](./troubleshooting.md#how-to-turn-on-logs) to see exactly what is read and sent.

## 6. Verify

Run `bun run validate` (lint + typecheck) and `bun run build:chrome` to ensure the build works.

## Checklist

- [ ] Strategy returns `null` safely and is registered in `index.ts`
- [ ] `bun run validate` passes
- [ ] `bun run build:chrome` passes
- [ ] Screenshot of the Discord status in the PR

## Common mistakes

| Mistake                                 | Result                          |
| --------------------------------------- | ------------------------------- |
| `https://site.com` in `domains`         | Registry test fails             |
| Player domain missing from `iframe_src` | Title shows but no progress bar |
| Throwing on a missing element           | Nothing updates                 |
| Selectors that also match the home page | Junk status on non-watch pages  |
| Not trimming text                       | Titles like `" Frieren "`       |
