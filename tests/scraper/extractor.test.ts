import { describe, expect, it } from "vitest";
import { extractMatches } from "../../src/scraper/extractor";
import { strategies } from "../../src/scraper/sites";
import type { AnimeSite } from "../../src/shared/types";

const site = (domains: string[], iframe_src: string[]): AnimeSite => ({
	domains,
	iframe_src,
	getAnimeMetadata: () => ({ title: null, episode: null, coverUrl: null }),
	getProgressStats: () => ({
		currentMs: 0,
		remainingMs: 0,
		durationMs: 0,
		isPaused: null,
	}),
});

describe("extractMatches", () => {
	it("returns an empty list for no strategies", () => {
		expect(extractMatches([])).toEqual([]);
	});

	it("builds *://host/* patterns for domains, then for iframe sources", () => {
		const result = extractMatches([
			site(["a.com", "b.com"], ["player-a.net"]),
			site(["c.com"], ["player-c.net", "player-d.net"]),
		]);

		expect(result).toEqual([
			"*://a.com/*",
			"*://b.com/*",
			"*://player-a.net/*",
			"*://c.com/*",
			"*://player-c.net/*",
			"*://player-d.net/*",
		]);
	});

	it("removes duplicate domains and iframe sources automatically", () => {
		const result = extractMatches([
			site(["a.com"], ["shared.net"]),
			site(["b.com"], ["shared.net"]),
		]);

		expect(result.filter((m) => m === "*://shared.net/*")).toHaveLength(1);
	});

	it("produces valid match patterns for every real strategy", () => {
		const pattern = /^\*:\/\/[a-z0-9.-]+\/\*$/i;
		for (const match of extractMatches(strategies)) {
			expect(match).toMatch(pattern);
		}
	});
});
