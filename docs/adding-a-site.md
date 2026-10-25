# Adding a Streaming Site

The most common contribution. Each site is a **strategy**: a small file that knows where the title, episode, cover and video are on that site. You touch about six files.

Before you start: check `src/scraper/sites/` and open issues so it is not already supported, [set up](./development.md), and open an episode page with DevTools (F12).

## 1. Find the domains

- **`domains`**: the site's own hostnames, including mirrors. Bare hostnames only: `example.com`, not `https://example.com/watch`. A subdomain also matches.
- **`iframe_src`**: the video player's hostname. In DevTools, find the `<iframe>` that contains the `<video>` and note its `src` host. Use `[]` if the video is on the main page.

The registry test (`tests/scraper/sites/index.test.ts`) enforces: bare hostnames, no duplicates inside a strategy, no domain shared by two strategies, and no site domain that is also a player domain.

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

## 5. Fixture and unit test

1. Create `tests/fixtures/mysite/watch.html.fixture`: a trimmed copy of the page with only the elements your selectors use.
2. Create `tests/scraper/sites/mysite.test.ts` (model it on `hianime.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { mysiteStrategy } from "../../../src/scraper/sites/mysite";
import { loadFixture, setBody } from "../../helpers/dom";

describe("mysiteStrategy", () => {
	it("scrapes a full watch page", () => {
		setBody(loadFixture("mysite/watch.html.fixture"));
		expect(mysiteStrategy.getAnimeMetadata()).toEqual({
			title: "My Anime",
			episode: "Episode 3",
			episodeName: "The Name",
			coverUrl: "https://mysite.example/poster.jpg",
		});
	});

	it("returns nulls on a non-watch page", () => {
		setBody("<div>home</div>");
		expect(mysiteStrategy.getAnimeMetadata()).toMatchObject({
			title: null,
			episode: null,
		});
	});
});
```

Helpers in `tests/helpers/dom.ts`: `setBody`, `setHead`, `visit(url, title)`, `loadFixture`, `mockVideo`.

## 6. Update the shared tests

- `tests/scraper/sites/index.test.ts`: change the `toHaveLength(...)` number to the new site count.
- `tests/e2e/content-script.spec.ts`: add an entry to `SITES` (`id` matches your fixture folder, plus `url`, `pageTitle`, `expectedTitle`, `expectedEpisode` such as `Episode 3: The Name`).
- `tests/health/live-dom.spec.ts`: add an entry with a real episode URL and the title and cover selectors. This weekly job tells us when the site changes its HTML.

## 7. Try it

Run `bun run dev:chrome` (or the Docker dev server), open an episode and check your Discord status. [Turn on logs](./troubleshooting.md#how-to-turn-on-logs) to see exactly what is read and sent.

## Checklist

- [ ] Strategy returns `null` safely and is registered in `index.ts`
- [ ] Fixture, unit test, E2E entry, health entry and site count updated
- [ ] `bun run validate` passes
- [ ] Screenshot of the Discord status in the PR

## Common mistakes

| Mistake                                 | Result                          |
| --------------------------------------- | ------------------------------- |
| `https://site.com` in `domains`         | Registry test fails             |
| Player domain missing from `iframe_src` | Title shows but no progress bar |
| Throwing on a missing element           | Nothing updates                 |
| Selectors that also match the home page | Junk status on non-watch pages  |
| Not trimming text                       | Titles like `" Frieren "`       |
