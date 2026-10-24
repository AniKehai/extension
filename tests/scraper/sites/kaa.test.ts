import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFixture, setBody, visit } from "../../helpers/dom";

type Strategy = typeof import("../../../src/scraper/sites/kaa")["kaaStrategy"];
let strategy: Strategy;

beforeEach(async () => {
	vi.resetModules();
	({ kaaStrategy: strategy } = await import("../../../src/scraper/sites/kaa"));
});

const TITLE = "KickAssAnime - Magical★Explorer - Episode 03 - English Dub";

describe("kaaStrategy", () => {
	it("declares its domain and iframe", () => {
		expect(strategy.domains).toEqual(["kaa.lt"]);
		expect(strategy.iframe_src).toEqual(["krussdomi.com"]);
	});

	it("returns nulls on non-episode pages", () => {
		visit("/magical-explorer-1a2b3c", TITLE);
		expect(strategy.getAnimeMetadata()).toEqual({
			title: null,
			episode: null,
			coverUrl: null,
		});
	});

	it("scrapes an episode page (h1 title, <title> episode, inline-style poster)", () => {
		visit("/magical-explorer/ep-3-fc60be", TITLE);
		setBody(loadFixture("kaa/watch.html.fixture"));

		expect(strategy.getAnimeMetadata()).toEqual({
			title: "Magical Explorer",
			episode: "Episode 3",
			coverUrl: "https://kaa.example/image/poster/abc.webp",
		});
	});

	it("normalises zero-padded episode numbers ('03' -> 'Episode 3')", () => {
		visit("/x/ep-3-abc", TITLE);
		expect(strategy.getAnimeMetadata().episode).toBe("Episode 3");
	});

	it("keeps decimal episodes (e.g. 5.5)", () => {
		visit("/x/ep-5.5-abc", "KickAssAnime - Show - Episode 5.5 - English Sub");
		expect(strategy.getAnimeMetadata().episode).toBe("Episode 5.5");
	});

	it("falls back to the <title> for the show name when there is no <h1>", () => {
		visit("/x/ep-3-abc", TITLE);
		expect(strategy.getAnimeMetadata().title).toBe("Magical★Explorer");
	});

	it("falls back to the URL for the episode when <title> doesn't match", () => {
		visit("/x/ep-12-abc", "Some other title");
		setBody('<h1 class="text-h6">Show</h1>');
		expect(strategy.getAnimeMetadata()).toMatchObject({
			title: "Show",
			episode: "Episode 12",
		});
	});

	it("reuses the last poster while the new one is still lazy-loading (same title)", () => {
		visit("/magical-explorer/ep-3-a", TITLE);
		setBody(loadFixture("kaa/watch.html.fixture"));
		const first = strategy.getAnimeMetadata();

		setBody('<h1 class="text-h6">Magical Explorer</h1>');
		expect(strategy.getAnimeMetadata().coverUrl).toBe(first.coverUrl);
	});

	it("does NOT reuse a cached poster for a different show", () => {
		visit("/magical-explorer/ep-3-a", TITLE);
		setBody(loadFixture("kaa/watch.html.fixture"));
		strategy.getAnimeMetadata();

		visit(
			"/other/ep-1-b",
			"KickAssAnime - Other Show - Episode 01 - English Sub",
		);
		setBody('<h1 class="text-h6">Other Show</h1>');
		expect(strategy.getAnimeMetadata().coverUrl).toBeNull();
	});
});
