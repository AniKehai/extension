# Contributing to AniKehai

First off, thank you for considering contributing to AniKehai!

Contributions are the heart of the open-source community. Whether you are reporting bugs, requesting support for new streaming sites, or submitting code changes, your help is greatly appreciated.

---

## Reporting Bugs & Requesting Sites

We use GitHub issues to track feature requests and bugs. Before opening a new issue, please check the existing open issues to ensure it has not already been reported.

* **Found a Bug?** Open a Bug Report using our issue template. Please provide as much detail as possible, including screenshots, steps to reproduce, and console logs from the extension.
  * **Tip for debugging:** You can enable verbose developer logging by opening the extension's background worker console and running `enable_logs = true`.
* **Want a new site supported?** Open a New Site Request. Please include the main URL and any alternate regional domains or iframe sources the site uses.

---

## Local Development Setup

AniKehai is a purely standalone browser extension built with **WXT**. The extension connects directly to Discord's Gateway via WebSockets natively right from the browser background worker.

### Prerequisites

* [Node.js](https://nodejs.org/) (Required)
* [bun](https://bun.sh/) (Our preferred package manager and task runner)

### Installation & Running

1. Clone the repository and install dependencies:
   ```bash
   bun install
   ```
2. Run the development server for your preferred browser (with hot-reloading):
   * For Chrome: `bun dev:chrome`
   * For Firefox: `bun dev:firefox`
3. The browser will open automatically with the extension loaded as an unpacked extension.

---

## Adding Support for a New Site

We use a modular **Strategy Pattern** to support different streaming sites. All site strategies are located in the `src/scraper/sites/` directory. 

1. Create a new TypeScript file inside `src/scraper/sites/` (e.g., `crunchyroll.ts`).
2. Implement the `AnimeSite` interface (defined in `src/shared/types.ts`). You will need to provide:
   * `domains`: An array of the target domains for the site's metadata.
   * `iframe_src`: An array of domains used by the video players/iframes.
   * `getAnimeMetadata`: A function returning the anime `title`, `episode`, and `coverUrl` by querying the DOM.
   * `getProgressStats`: A function returning playback progress. **Note:** In most cases, you can simply return our built-in `getStandardVideoStats()` helper from `src/scraper/parser.ts`, which automatically handles standard `<video>` elements and JWPlayer UI logic.
3. Export your new strategy and append it to the `strategies` array in `src/scraper/sites/index.ts`.

**Handling Protected Cover Images:**
If a site's cover images are protected (e.g., Cloudflare), you can utilize our AniList API helper (`fetchAnilistCover` from `src/core/anilist/api.ts`). Extract the `anilistId` from the site's DOM (e.g., a `<meta>` tag) and trigger a background message to fetch the high-resolution `extraLarge` cover. Reference the `animepaheStrategy` for an example.

---

## Pull Request Process

When you are ready to submit your code, please follow these steps to ensure a smooth review process:

1. **Format your code:** We use [Biome](https://biomejs.dev/) for linting and code formatting to maintain consistency. Run `bun check:fix` before committing.
2. **Type Check:** Run `bun typecheck` to ensure no TypeScript errors exist.
3. **Test your changes locally:**
   * Ensure the extension compiles and loads cleanly.
   * Verify the direct WebSocket connection to Discord succeeds.
   * Check your background worker logs (using `enable_logs = true`) to ensure metadata and time updates are being parsed correctly without DOM errors.
4. **Submit the PR:** Fill out the Pull Request template comprehensively. If your PR resolves an open issue, link to it using keywords (e.g., `Closes #12`).
